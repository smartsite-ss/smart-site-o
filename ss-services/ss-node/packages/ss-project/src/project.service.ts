// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { pinyin } from 'pinyin-pro';
import { Project } from './entities/project.entity';

import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationDto, PaginatedResult } from '@ss-node/ss-sdk';
import { I18nService } from '@ss-node/ss-i18n';
import {
  EventBusService,
  ProjectDatabaseService,
  ErrorFactory,
  PathResolverService,
} from '@ss-node/ss-core';
import { DeviceService, DeviceStats } from '@ss-node/ss-device';
import { AlarmStatisticsService } from '@ss-node/ss-alarm';

const PROJECT_INFO_FILE = 'projectinfo.json';
const DEFAULT_PROJECT_FILE = '.default-project.json';

const SUBDIRS = ['db', 'rtdb', 'pages', 'template', 'images'];

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);
  private readonly err: ErrorFactory;

  constructor(
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
    private readonly projectDbService: ProjectDatabaseService,
    private readonly eventBus: EventBusService,
    private readonly pathResolver: PathResolverService,
    @Inject(forwardRef(() => DeviceService))
    private readonly deviceService: DeviceService,
    @Inject(forwardRef(() => AlarmStatisticsService))
    private readonly alarmStatsService: AlarmStatisticsService,
  ) {
    this.err = new ErrorFactory(this.i18nService);
  }

  /**
   * 获取项目目录绝对路径
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 3 级 = ss-services/ss-node（.env.dev 中 PROJECTS_DIR=../../ss-run/ss/data/projects 相对于此目录）
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node（.env 中 PROJECTS_DIR=../../data/projects 相对于此目录）
   *
   * 修复历史：v1.4 之前用 process.cwd()，dev 模式下 cwd = apps/ss-node-server，
   * 导致 ../../ss-run/ss/data/projects 被解析为 ss-services/ss-node/ss-run/...（不存在），
   * 项目目录指向错误位置，登录后看不到已有项目。
   * 与 app.module.ts getDatabaseConfig()、database.service.ts getProjectRoot() 保持一致。
   */
  getProjectsDir(): string {
    const configuredDir = this.configService.get<string>('PROJECTS_DIR') || './data/projects';
    return this.pathResolver.resolve(configuredDir);
  }

  private ensureProjectsDir(): void {
    const dir = this.getProjectsDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.logger.log(`Created projects directory: ${dir}`);
    }
  }

  private getProjectDir(projectId: string): string {
    return path.join(this.getProjectsDir(), projectId);
  }

  private getProjectInfoPath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), PROJECT_INFO_FILE);
  }

  private ensureProjectSubdirs(projectId: string): void {
    const projectDir = this.getProjectDir(projectId);
    for (const subdir of SUBDIRS) {
      const subdirPath = path.join(projectDir, subdir);
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true });
      }
    }
  }

  private readProjectInfo(projectId: string): Project {
    const infoPath = this.getProjectInfoPath(projectId);
    if (!fs.existsSync(infoPath)) {
      this.err.notFound('error.project.PROJ_001', { id: projectId });
    }
    const raw = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    const projectDir = this.getProjectDir(projectId);
    const project = new Project({
      // 向后兼容：旧 projectinfo.json 可能含 tid 字段（旧目录名）而非 projectId
      // 注意：旧 pid 是拼音首字母（如 'zwxm'），不是目录名，不应作为 projectId 回退
      projectId: raw.projectId || raw.tid || projectId,
      // 向后兼容：旧 projectinfo.json 可能含 tid 字段而非 tenantId
      tenantId: raw.tenantId || raw.tid || projectId,
      projectName: raw.projectName || raw.name || projectId,
      description: raw.description || '',
      version: raw.version || '1.0.0',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      createdBy: raw.createdBy || '',
      updatedBy: raw.updatedBy || '',
      config: raw.config || {},
      projectPath: projectDir,
      databasePath: path.join(projectDir, 'db'),
      address: raw.address,
      longitude: raw.longitude,
      latitude: raw.latitude,
      owner: raw.owner,
      image: raw.image,
      // enabled 读取：旧 projectinfo.json 无此字段时为 undefined，Project 构造函数会默认 false
      enabled: raw.enabled,
    });
    return project;
  }

  private writeProjectInfo(project: Project): void {
    const infoPath = this.getProjectInfoPath(project.projectId);
    fs.writeFileSync(infoPath, JSON.stringify(project.toProjectInfo(), null, 2), 'utf-8');
  }

  /**
   * 生成项目唯一标识符 projectId（拼音全拼 kebab-case，用作目录名/DB 隔离/InfluxDB bucket/Redis key）。
   *
   * 生成规则：
   * - 拉丁名：转小写，空格和特殊字符替换为连字符
   * 纯中文名（拉丁 slug 为空）时回退到拼音全拼 slug，确保非空
   *
   * 示例："测试工程" → "ce-shi-gong-cheng"，"My Project" → "my-project"
   */
  private generateProjectId(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (slug) {
      return slug;
    }
    // 纯中文/非拉丁名：用拼音全拼生成 slug（如 "测试工程" → "ce-shi-gong-cheng"）
    const py = pinyin(name, { toneType: 'none', type: 'array' })
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return py;
  }

  /**
   * 解析最终 projectId：用户手填则校验唯一性（冲突抛错）；留空则自动生成并在冲突时追加数字后缀。
   */
  private resolveUniqueProjectId(userProjectId: string | undefined, projectName: string): string {
    const existingProjectIds = new Set(this.scanProjects().map((p) => p.projectId));

    if (userProjectId) {
      if (existingProjectIds.has(userProjectId)) {
        throw new BadRequestException(`项目代码 "${userProjectId}" 已存在`);
      }
      return userProjectId;
    }

    const base = this.generateProjectId(projectName);
    if (!existingProjectIds.has(base)) {
      return base;
    }
    let n = 2;
    while (existingProjectIds.has(`${base}${n}`)) {
      n++;
    }
    return `${base}${n}`;
  }

  private scanProjects(options?: { includeDisabled?: boolean }): Project[] {
    const includeDisabled = options?.includeDisabled ?? false;
    const projectsDir = this.getProjectsDir();
    if (!fs.existsSync(projectsDir)) {
      return [];
    }

    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
    const projects: Project[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // 跳过隐藏文件（如 .default-project.json 所在的非项目目录）
      if (entry.name.startsWith('.')) continue;

      const infoPath = path.join(projectsDir, entry.name, PROJECT_INFO_FILE);
      if (fs.existsSync(infoPath)) {
        try {
          // entry.name 即为目录名，迁移后等于 projectId
          const project = this.readProjectInfo(entry.name);
          // 默认排除停用项目（includeDisabled=false 时跳过 enabled=false）
          if (!includeDisabled && !project.enabled) continue;
          projects.push(project);
        } catch (err) {
          this.logger.warn(
            `Failed to read project info for ${entry.name}: ${(err as Error).message}`,
          );
        }
      }
    }

    projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return projects;
  }

  async create(createProjectDto: CreateProjectDto, userId: string): Promise<Project> {
    this.ensureProjectsDir();

    const projectName = createProjectDto.projectName.trim();
    if (!projectName) {
      throw new BadRequestException('项目名称不能为空');
    }

    // 项目名称必须全局唯一（即使 projectId 不同也不允许同名）
    const existingProjects = this.scanProjects();
    if (existingProjects.some((p) => p.projectName === projectName)) {
      throw new BadRequestException(`项目名称 "${projectName}" 已存在`);
    }

    // projectId（项目唯一标识符 + 目录名）：用户指定或从 projectName 自动生成（拼音全拼 kebab-case）
    const projectId = this.resolveUniqueProjectId(createProjectDto.projectId?.trim(), projectName);
    if (!projectId) {
      throw new BadRequestException('项目 projectId 不能为空');
    }

    // 检查 projectId（目录名）是否冲突
    const projectDir = this.getProjectDir(projectId);
    if (fs.existsSync(projectDir)) {
      throw new BadRequestException(`项目 projectId "${projectId}" 已存在`);
    }

    // tenantId：多租户预留，当前 = projectId
    const tenantId = createProjectDto.tenantId?.trim() || projectId;

    const now = new Date().toISOString();
    const project = new Project({
      projectId,
      tenantId,
      projectName,
      description: createProjectDto.description || '',
      version: createProjectDto.version?.trim() || '1.0.0',
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      config: createProjectDto.config || {},
      projectPath: projectDir,
      databasePath: path.join(projectDir, 'db'),
      address: createProjectDto.address?.trim() || undefined,
      longitude: createProjectDto.longitude?.trim() || undefined,
      latitude: createProjectDto.latitude?.trim() || undefined,
      owner: createProjectDto.owner?.trim() || undefined,
      image: createProjectDto.image?.trim() || undefined,
      enabled: createProjectDto.enabled ?? false,
    });

    fs.mkdirSync(projectDir, { recursive: true });
    this.ensureProjectSubdirs(projectId);
    this.writeProjectInfo(project);

    // isolated 模式：初始化项目级数据库 system.db
    if (this.projectDbService.getMode() === 'isolated') {
      await this.projectDbService.initProjectDatabases(projectId);
    }

    this.logger.log(`Project created: ${projectName} (projectId: ${projectId}) by user ${userId}`);
    this.eventBus.emit('project.created', { projectId, tenantId, projectName });
    return project;
  }

  async findAll(
    userId: string,
    query?: PaginationDto,
    includeDisabled = false,
  ): Promise<PaginatedResult<Project>> {
    const allProjects = this.scanProjects({ includeDisabled });
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const keyword = query?.keyword?.trim().toLowerCase();

    let filtered = allProjects;
    if (keyword) {
      filtered = allProjects.filter(
        (p) =>
          p.projectName.toLowerCase().includes(keyword) ||
          p.description.toLowerCase().includes(keyword),
      );
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    // 为当前页的每个项目计算页面数量和文件夹大小（运行时统计，不入 projectinfo.json）
    // 仅计算当前页（最多 pageSize 个），避免全量遍历导致性能问题
    await Promise.all(
      data.map(async (project) => {
        project.pageCount = await this.getPageCount(project.projectId);
        project.folderSize = await this.getProjectFolderSize(project.projectId);
      }),
    );

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(projectId: string, _userId: string): Promise<Project> {
    return this.readProjectInfo(projectId);
  }

  async update(
    projectId: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<Project> {
    const project = this.readProjectInfo(projectId);

    if (updateProjectDto.projectName && updateProjectDto.projectName !== project.projectName) {
      throw new BadRequestException('项目名称不支持修改');
    }
    if (updateProjectDto.description !== undefined) {
      project.description = updateProjectDto.description;
    }
    if (updateProjectDto.version !== undefined) {
      project.version = updateProjectDto.version;
    }
    if (updateProjectDto.config !== undefined) {
      project.config = updateProjectDto.config;
    }
    if (updateProjectDto.address !== undefined) {
      project.address = updateProjectDto.address.trim() || undefined;
    }
    if (updateProjectDto.longitude !== undefined) {
      project.longitude = updateProjectDto.longitude.trim() || undefined;
    }
    if (updateProjectDto.latitude !== undefined) {
      project.latitude = updateProjectDto.latitude.trim() || undefined;
    }
    if (updateProjectDto.owner !== undefined) {
      project.owner = updateProjectDto.owner.trim() || undefined;
    }
    if (updateProjectDto.image !== undefined) {
      project.image = updateProjectDto.image.trim() || undefined;
    }

    // 启用状态变更：检测 false→true / true→false，发 EventBus 通知采集层动态启停
    let enabledChanged = false;
    if (updateProjectDto.enabled !== undefined && updateProjectDto.enabled !== project.enabled) {
      project.enabled = updateProjectDto.enabled;
      enabledChanged = true;
    }

    project.updatedBy = userId;
    project.updatedAt = new Date().toISOString();

    this.writeProjectInfo(project);
    this.logger.log(`Project updated: ${projectId} by user ${userId}`);

    // 动态启停：enabled 变化时通知采集层立即生效
    if (enabledChanged) {
      if (project.enabled) {
        this.eventBus.emit('project:enabled', { projectId });
        this.logger.log(`Project enabled: ${projectId} — collector will start acquiring`);
      } else {
        this.eventBus.emit('project:disabled', { projectId });
        this.logger.log(`Project disabled: ${projectId} — collector will stop acquiring`);
      }
    }

    return project;
  }

  /**
   * 判断 projectId 是否合法（kebab-case 格式，小写字母/数字/连字符）。
   */
  private isValidProjectId(projectId: string | undefined): boolean {
    return !!projectId && /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(projectId);
  }

  /**
   * 为单个项目重新生成 projectId（基于项目名称拼音全拼 kebab-case），确保唯一性。
   * 用于修复历史项目中的 GUID/中文 projectId。
   */
  regenerateProjectId(projectId: string): {
    projectId: string;
    projectName: string;
    oldProjectId: string;
    newProjectId: string;
    changed: boolean;
  } {
    const project = this.readProjectInfo(projectId);
    const oldProjectId = project.projectId || '';

    // 如果当前 projectId 已合法，跳过
    if (this.isValidProjectId(oldProjectId)) {
      return {
        projectId: project.projectId,
        projectName: project.projectName,
        oldProjectId,
        newProjectId: oldProjectId,
        changed: false,
      };
    }

    // 基于项目名称生成唯一 projectId（排除自身）
    const existingProjectIds = new Set(
      this.scanProjects()
        .filter((p) => p.projectId !== project.projectId)
        .map((p) => p.projectId),
    );

    const base = this.generateProjectId(project.projectName);
    let newProjectId = base;
    if (existingProjectIds.has(newProjectId)) {
      let n = 2;
      while (existingProjectIds.has(`${base}${n}`)) {
        n++;
      }
      newProjectId = `${base}${n}`;
    }

    project.projectId = newProjectId;
    this.writeProjectInfo(project);
    this.logger.log(
      `Project projectId migrated: ${projectId} "${oldProjectId}" -> "${newProjectId}"`,
    );

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      oldProjectId,
      newProjectId,
      changed: true,
    };
  }

  /**
   * 批量迁移所有项目的 projectId：扫描全部项目，修复不合法（GUID/中文/缺失）的 projectId。
   * 仅修改 projectinfo.json 中的 projectId 字段，不涉及历史数据关联更新。
   */
  migrateAllProjectIds(): {
    total: number;
    migrated: number;
    skipped: number;
    details: Array<{
      projectId: string;
      projectName: string;
      oldProjectId: string;
      newProjectId: string;
      changed: boolean;
    }>;
  } {
    const allProjects = this.scanProjects();
    const details: Array<{
      projectId: string;
      projectName: string;
      oldProjectId: string;
      newProjectId: string;
      changed: boolean;
    }> = [];

    for (const project of allProjects) {
      try {
        const result = this.regenerateProjectId(project.projectId);
        details.push(result);
      } catch (err) {
        this.logger.warn(
          `Failed to migrate projectId for ${project.projectId}: ${(err as Error).message}`,
        );
        details.push({
          projectId: project.projectId,
          projectName: project.projectName,
          oldProjectId: project.projectId || '',
          newProjectId: project.projectId || '',
          changed: false,
        });
      }
    }

    const migrated = details.filter((d) => d.changed).length;
    this.logger.log(`ProjectId migration complete: ${migrated}/${allProjects.length} migrated`);

    return {
      total: allProjects.length,
      migrated,
      skipped: allProjects.length - migrated,
      details,
    };
  }

  async remove(projectId: string, userId: string): Promise<void> {
    const project = this.readProjectInfo(projectId);
    const projectDir = this.getProjectDir(project.projectId);

    // 通知全局 ProjectDatabaseService 关闭该项目相关的数据库连接
    // 必须在删除文件之前执行，否则 SQLite 文件仍被占用导致 EBUSY
    await this.eventBus.emitAsync('project.beforeDelete', {
      projectId: project.projectId,
      tenantId: project.tenantId,
      timestamp: Date.now(),
    });

    // 再释放本模块的数据库连接（isolated 模式）
    if (this.projectDbService.getMode() === 'isolated') {
      await this.projectDbService.deleteProjectDatabases(project.projectId);
    }

    fs.rmSync(projectDir, { recursive: true, force: true });
    this.logger.log(`Project deleted: ${project.projectId} by user ${userId}`);
  }

  /**
   * 上传项目封面图片到 {projectId}/images/ 目录，返回相对路径。
   * 若项目已有旧封面图片，上传新图时自动删除旧文件。
   */
  uploadProjectImage(projectId: string, buffer: Buffer, originalName: string): string {
    const project = this.readProjectInfo(projectId);
    const projectDir = this.getProjectDir(projectId);
    const imagesDir = path.join(projectDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // 删除旧封面图片（如存在）
    if (project.image) {
      const oldPath = path.join(projectDir, project.image);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (err) {
          this.logger.warn(
            `Failed to delete old project image ${oldPath}: ${(err as Error).message}`,
          );
        }
      }
    }

    // 生成安全文件名：cover-{timestamp}.{ext}
    const ext = path.extname(originalName).toLowerCase() || '.png';
    const fileName = `cover-${Date.now()}${ext}`;
    const relativePath = `images/${fileName}`;
    const filePath = path.join(imagesDir, fileName);

    fs.writeFileSync(filePath, buffer);
    this.logger.log(
      `Project image uploaded: ${projectId}/${relativePath} (${buffer.length} bytes)`,
    );

    // 更新 projectinfo.json 中的 image 字段
    project.image = relativePath;
    this.writeProjectInfo(project);

    return relativePath;
  }

  /**
   * 获取项目封面图片的绝对路径（用于文件流响应）。
   */
  getProjectImagePath(projectId: string): string | null {
    const project = this.readProjectInfo(projectId);
    if (!project.image) {
      return null;
    }
    const filePath = path.join(this.getProjectDir(projectId), project.image);
    return fs.existsSync(filePath) ? filePath : null;
  }

  async exportProject(
    projectId: string,
    _userId: string,
    options?: { includePages?: boolean; includeProjectDb?: boolean; includeRtdb?: boolean },
  ): Promise<{ filePath: string; projectName: string }> {
    const project = this.readProjectInfo(projectId);
    const projectDir = this.getProjectDir(project.projectId);
    const tmpDir = os.tmpdir();
    const zipFileName = `${project.projectId}_${Date.now()}.zip`;
    const zipFilePath = path.join(tmpDir, zipFileName);

    // 选择性导出：未指定参数时默认全部包含（向后兼容）
    const includePages = options?.includePages ?? true;
    const includeProjectDb = options?.includeProjectDb ?? true;
    const includeRtdb = options?.includeRtdb ?? true;
    const isSelective = options !== undefined;

    // isolated 模式且包含项目数据库时：导出前 VACUUM 压缩数据库
    if (
      includeProjectDb &&
      this.projectDbService.getMode() === 'isolated' &&
      this.projectDbService.hasDatabaseFiles(project.projectId)
    ) {
      await this.projectDbService.vacuumProjectDatabases(project.projectId);
    }

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        this.logger.log(
          `Project exported: ${project.projectId} -> ${zipFileName} (${archive.pointer()} bytes)` +
            (isSelective
              ? ` [selective: pages=${includePages}, db=${includeProjectDb}, rtdb=${includeRtdb}]`
              : ''),
        );
        resolve();
      });

      output.on('error', (err: Error) => {
        reject(err);
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.on('warning', (err: any) => {
        if (err?.code !== 'ENOENT') {
          this.logger.warn(
            `[Export ${project.projectId}] archiver warning: ${err?.message || err}`,
          );
        }
      });

      archive.pipe(output);

      // projectinfo.json 总是包含（项目元信息必需）
      const infoPath = this.getProjectInfoPath(project.projectId);
      if (fs.existsSync(infoPath)) {
        archive.file(infoPath, { name: PROJECT_INFO_FILE });
      }

      // 选择性添加子目录
      if (includePages) {
        const pagesDir = path.join(projectDir, 'pages');
        if (fs.existsSync(pagesDir)) {
          archive.directory(pagesDir, 'pages');
        }
      }
      if (includeProjectDb) {
        const dbDir = path.join(projectDir, 'db');
        if (fs.existsSync(dbDir)) {
          // 排除 SQLite WAL/SHM 临时文件：这些文件在运行时被锁定，
          // 打包会导致导出失败或导入后数据库不一致
          this.addDirToArchiveExcludingDbTemp(archive, dbDir, 'db');
        }
      }
      if (includeRtdb) {
        const rtdbDir = path.join(projectDir, 'rtdb');
        if (fs.existsSync(rtdbDir)) {
          archive.directory(rtdbDir, 'rtdb');
        }
      }
      // template 目录总是包含（模板为项目基础资源，体积小）
      const templateDir = path.join(projectDir, 'template');
      if (fs.existsSync(templateDir)) {
        archive.directory(templateDir, 'template');
      }

      archive.finalize();
    });

    return { filePath: zipFilePath, projectName: project.projectId };
  }

  /**
   * 将目录添加到 archive，排除 SQLite WAL/SHM 临时文件。
   *
   * 排除原因：
   * - .db-wal / .db-shm 是 SQLite WAL 模式的运行时临时文件
   * - 在 Windows 上这些文件可能被数据库进程锁定，导致 archiver 读取失败
   * - VACUUM 已将 WAL 数据合并到主 .db 文件，临时文件无需导出
   * - 导入时包含这些文件会导致数据库状态不一致
   */
  private addDirToArchiveExcludingDbTemp(
    archive: archiver.Archiver,
    dirPath: string,
    archiveName: string,
  ): void {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const archiveEntryName = `${archiveName}/${entry.name}`;
      if (entry.isDirectory()) {
        // 递归处理子目录
        this.addDirToArchiveExcludingDbTemp(archive, fullPath, archiveEntryName);
      } else if (entry.isFile()) {
        // 排除 SQLite WAL 和 SHM 临时文件
        if (entry.name.endsWith('.db-wal') || entry.name.endsWith('.db-shm')) {
          continue;
        }
        archive.file(fullPath, { name: archiveEntryName });
      }
    }
  }

  async exportProjectZip(
    projectId: string,
    userId: string,
    options?: { includePages?: boolean; includeProjectDb?: boolean; includeRtdb?: boolean },
  ): Promise<{ filePath: string; projectName: string; fileName: string }> {
    const result = await this.exportProject(projectId, userId, options);
    return { ...result, fileName: path.basename(result.filePath) };
  }

  async importProjectZip(
    zipBuffer: Buffer,
    userId: string,
    options?: { overwrite?: boolean },
  ): Promise<{ project: Project; warnings: string[] }> {
    const warnings: string[] = [];
    const tmpDir = path.join(os.tmpdir(), `project_import_${Date.now()}`);

    try {
      fs.mkdirSync(tmpDir, { recursive: true });

      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();

      if (entries.length === 0) {
        throw new BadRequestException('ZIP 文件为空');
      }

      const rootDirs = new Set<string>();
      for (const entry of entries) {
        if (entry.isDirectory) {
          rootDirs.add(entry.entryName);
          continue;
        }
        const parts = entry.entryName.split('/');
        if (parts.length >= 1 && parts[0]) {
          rootDirs.add(parts[0] + '/');
        }
      }

      if (rootDirs.size !== 1) {
        throw new BadRequestException('ZIP 文件格式不正确：应包含单个项目根目录');
      }

      let extractedDirName = '';
      for (const dir of rootDirs) {
        extractedDirName = dir.replace(/\/+$/, '').split('/')[0];
      }

      if (!extractedDirName) {
        throw new BadRequestException('无法从 ZIP 文件中解析项目名称');
      }

      const hasProjectInfo = entries.some(
        (entry) =>
          !entry.isDirectory &&
          entry.entryName.replace(/\\/g, '/') === `${extractedDirName}/${PROJECT_INFO_FILE}`,
      );

      if (!hasProjectInfo) {
        throw new BadRequestException('ZIP 文件缺少 projectinfo.json，项目数据不完整');
      }

      // 解压以获取 projectinfo.json
      zip.extractAllTo(tmpDir, true);
      const sourceDir = path.join(tmpDir, extractedDirName);
      if (!fs.existsSync(sourceDir)) {
        throw new BadRequestException('ZIP 文件解压后未找到项目目录');
      }

      // 从解压后的 projectinfo.json 读取 projectId（兼容旧 tid 字段）
      let projectId: string;
      let projectName: string;
      try {
        const infoRaw = JSON.parse(
          fs.readFileSync(path.join(sourceDir, PROJECT_INFO_FILE), 'utf-8'),
        );
        // 向后兼容：旧 zip 包可能含 tid 而非 projectId，此时用 tid 作为目录名
        projectId = infoRaw.projectId || infoRaw.tid || extractedDirName;
        projectName = infoRaw.projectName || infoRaw.name || projectId;
      } catch {
        projectId = extractedDirName;
        projectName = extractedDirName;
      }

      this.ensureProjectsDir();
      const targetDir = this.getProjectDir(projectId);
      const existsLocally = fs.existsSync(targetDir);

      if (existsLocally) {
        if (options?.overwrite) {
          // 先释放可能存在的数据库连接
          if (this.projectDbService.getMode() === 'isolated') {
            await this.projectDbService.unloadProjectDatabases(projectId);
          }
          fs.rmSync(targetDir, { recursive: true, force: true });
          warnings.push(`已覆盖现有项目 "${projectName}" (projectId: ${projectId})`);
        } else {
          throw new BadRequestException(
            `项目 "${projectName}" (projectId: ${projectId}) 已存在。如需覆盖请确认。`,
          );
        }
      }

      this.copyDirSync(sourceDir, targetDir);
      this.ensureProjectSubdirs(projectId);

      // isolated 模式：导入后校验/重建数据库
      if (this.projectDbService.getMode() === 'isolated') {
        if (!this.projectDbService.hasDatabaseFiles(projectId)) {
          await this.projectDbService.initProjectDatabases(projectId);
          warnings.push('导入的项目缺少数据库文件，已自动创建空数据库');
        }
      }

      const project = this.readProjectInfo(projectId);
      this.logger.log(
        `Project imported: ${projectName} (projectId: ${projectId}) by user ${userId}`,
      );
      this.eventBus.emit('project.created', { projectId, tenantId: project.tenantId, projectName });

      return { project, warnings };
    } finally {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  }

  private copyDirSync(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async findOrCreateDefault(userId: string): Promise<Project> {
    this.ensureProjectsDir();

    const defaultName = '默认项目';
    const defaultProjectId = 'default-project';

    // 先扫描所有项目，查找 projectId 为 "default-project" 的默认项目
    const existing = this.scanProjects();
    const defaultProject = existing.find((p) => p.projectId === defaultProjectId);
    if (defaultProject) {
      return defaultProject;
    }

    // 兼容：检查 "默认项目" 名称目录（旧版）
    const legacyDir = this.getProjectDir(defaultName);
    if (fs.existsSync(legacyDir)) {
      const infoPath = this.getProjectInfoPath(defaultName);
      if (fs.existsSync(infoPath)) {
        return this.readProjectInfo(defaultName);
      }
    }

    const now = new Date().toISOString();
    const projectDir = this.getProjectDir(defaultProjectId);
    const project = new Project({
      projectId: defaultProjectId,
      tenantId: defaultProjectId,
      projectName: defaultName,
      description: '系统自动创建的默认项目',
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      config: {},
      projectPath: projectDir,
      databasePath: path.join(projectDir, 'db'),
    });

    fs.mkdirSync(projectDir, { recursive: true });
    this.ensureProjectSubdirs(defaultProjectId);
    this.writeProjectInfo(project);

    // isolated 模式：初始化默认项目的数据库
    if (this.projectDbService.getMode() === 'isolated') {
      await this.projectDbService.initProjectDatabases(defaultProjectId);
    }

    this.logger.log(
      `Default project created: ${defaultName} (projectId: ${defaultProjectId}) by user ${userId}`,
    );
    this.eventBus.emit('project.created', {
      projectId: defaultProjectId,
      tenantId: defaultProjectId,
      projectName: defaultName,
    });
    return project;
  }

  /**
   * 获取用户设定的默认项目 ID（从 .default-project.json 读取）
   * 返回 null 表示未设定
   */
  getDefaultProjectId(): string | null {
    const filePath = path.join(this.getProjectsDir(), DEFAULT_PROJECT_FILE);
    if (!fs.existsSync(filePath)) return null;
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return data.projectId || null;
    } catch {
      this.logger.warn(`Failed to parse ${DEFAULT_PROJECT_FILE}, ignoring`);
      return null;
    }
  }

  /**
   * 设置默认项目 ID，写入 .default-project.json
   * 会校验项目目录是否存在
   */
  setDefaultProjectId(projectId: string): void {
    this.ensureProjectsDir();
    const projectDir = this.getProjectDir(projectId);
    if (!fs.existsSync(projectDir)) {
      throw new NotFoundException(`项目 "${projectId}" 不存在，无法设为默认`);
    }
    const filePath = path.join(this.getProjectsDir(), DEFAULT_PROJECT_FILE);
    fs.writeFileSync(
      filePath,
      JSON.stringify({ projectId, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8',
    );
    this.logger.log(`Default project set to: ${projectId}`);
  }

  /**
   * 清除默认项目设置（删除 .default-project.json）
   */
  clearDefaultProjectId(): void {
    const filePath = path.join(this.getProjectsDir(), DEFAULT_PROJECT_FILE);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log('Default project cleared');
    }
  }

  /**
   * 诊断项目资源完整性
   * 检测目录结构、配置文件、数据库文件是否存在
   */
  async diagnoseProject(projectId: string): Promise<DiagnoseResult> {
    this.ensureProjectsDir();
    const projectDir = this.getProjectDir(projectId);

    if (!fs.existsSync(projectDir)) {
      throw new NotFoundException(`项目 "${projectId}" 不存在`);
    }

    const project = this.readProjectInfo(projectId);
    const resources: DiagnoseResources = {};
    const issues: string[] = [];

    // 1. projectinfo.json
    const infoPath = this.getProjectInfoPath(projectId);
    resources.projectinfo = {
      status: fs.existsSync(infoPath) ? 'ok' : 'missing',
      path: infoPath,
    };
    if (resources.projectinfo.status === 'missing') {
      issues.push('projectinfo.json 文件缺失');
    }

    // 2. 子目录
    for (const subdir of SUBDIRS) {
      const subdirPath = path.join(projectDir, subdir);
      const key = `${subdir}Dir` as keyof DiagnoseResources;
      resources[key] = {
        status: fs.existsSync(subdirPath) ? 'ok' : 'missing',
        path: subdirPath,
      };
      if (resources[key].status === 'missing') {
        issues.push(`子目录 ${subdir} 缺失`);
      }
    }

    // 3. 数据库文件（isolated 模式）
    const dbMode = this.projectDbService.getMode();
    if (dbMode === 'isolated') {
      const dbDir = path.join(projectDir, 'db');
      const systemDbPath = path.join(dbDir, 'system.db');

      resources.systemDb = await this.checkDbFile(systemDbPath);

      if (resources.systemDb.status === 'missing') {
        issues.push('system.db 数据库文件缺失');
      } else if (resources.systemDb.status === 'empty') {
        issues.push('system.db 已创建，暂无业务表（待实体迁移）');
      } else if (resources.systemDb.status === 'error') {
        issues.push('system.db 文件损坏，无法读取');
      }
    }

    // 健康度判定
    let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // 数据库健康度判定：若 db/ 目录存在且包含有效的 system.db 文件，则视为数据库资源可用
    const dbDirPath = path.join(projectDir, 'db');
    let hasAnyDbFile = false;
    let hasAnyDbOk = false;
    if (dbMode === 'isolated' && fs.existsSync(dbDirPath)) {
      const dbFiles = fs.readdirSync(dbDirPath).filter((f) => f.endsWith('.db'));
      for (const dbFile of dbFiles) {
        hasAnyDbFile = true;
        const dbFilePath = path.join(dbDirPath, dbFile);
        const fileStatus = await this.checkDbFile(dbFilePath);
        if (fileStatus.status === 'ok') {
          hasAnyDbOk = true;
          break;
        }
      }
    }

    const hasCriticalMissing =
      resources.projectinfo.status === 'missing' ||
      resources.dbDir.status === 'missing' ||
      (dbMode === 'isolated' && !hasAnyDbFile);
    const hasDegradedDb = dbMode === 'isolated' && hasAnyDbFile && !hasAnyDbOk;
    const hasNonCriticalMissing =
      resources.rtdbDir.status === 'missing' ||
      resources.templateDir.status === 'missing' ||
      resources.pagesDir.status === 'missing';

    if (hasCriticalMissing) {
      health = 'unhealthy';
    } else if (hasNonCriticalMissing || hasDegradedDb) {
      health = 'degraded';
    }

    return {
      projectName: project.projectName,
      projectId: project.projectId,
      tenantId: project.tenantId,
      resources,
      health,
      issues,
      dbMode,
    };
  }

  /**
   * 初始化项目缺失资源
   * 自动补建缺失的子目录和数据库文件
   */
  async initProjectResources(
    projectId: string,
    targetResources?: string[],
  ): Promise<{
    initialized: string[];
    skipped: string[];
    warnings: string[];
  }> {
    this.ensureProjectsDir();
    const projectDir = this.getProjectDir(projectId);

    if (!fs.existsSync(projectDir)) {
      throw new NotFoundException(`项目 "${projectId}" 不存在`);
    }

    const initialized: string[] = [];
    const skipped: string[] = [];
    const warnings: string[] = [];
    // 清理无效的 resources 参数（如 [undefined] 等）
    const cleanResources = targetResources?.filter(Boolean);
    const initAll = !cleanResources || cleanResources.length === 0;

    // 初始化子目录
    if (initAll || cleanResources?.includes('subdirs')) {
      const existingSubdirs = SUBDIRS.filter((sd) => fs.existsSync(path.join(projectDir, sd)));
      const missingSubdirs = SUBDIRS.filter((sd) => !fs.existsSync(path.join(projectDir, sd)));

      for (const subdir of SUBDIRS) {
        if (existingSubdirs.includes(subdir)) {
          skipped.push(`${subdir}Dir`);
        } else {
          initialized.push(`${subdir}Dir`);
        }
      }

      this.ensureProjectSubdirs(projectId);

      if (missingSubdirs.length > 0) {
        this.logger.log(
          `Project "${projectId}": initialized missing subdirs: ${missingSubdirs.join(', ')}`,
        );
      }
    }

    // 初始化数据库
    if (initAll || cleanResources?.includes('database')) {
      const dbMode = this.projectDbService.getMode();
      const dbDir = path.join(projectDir, 'db');
      const systemDbPath = path.join(dbDir, 'system.db');

      if (dbMode === 'isolated') {
        const needSystemDb = !fs.existsSync(systemDbPath);
        const forceRecreateSystemDb =
          !needSystemDb && (await this.checkDbFile(systemDbPath)).status !== 'ok';

        if (forceRecreateSystemDb) {
          // 数据库文件存在但为空或损坏，先删除再重新初始化
          fs.unlinkSync(systemDbPath);
          this.logger.log(
            `Project "${projectId}": removing broken/empty system.db for re-initialization`,
          );
        }

        if (needSystemDb || forceRecreateSystemDb) {
          try {
            await this.projectDbService.initProjectDatabases(projectId);
            if (needSystemDb || forceRecreateSystemDb) initialized.push('systemDb');
            this.logger.log(
              `Project "${projectId}": initialized system.db (need=${needSystemDb || forceRecreateSystemDb})`,
            );
          } catch (err: any) {
            warnings.push(`数据库初始化失败: ${err.message}`);
            this.logger.error(`Project "${projectId}": database init failed: ${err.message}`);
          }
        } else {
          skipped.push('systemDb');
        }
      } else {
        skipped.push('systemDb');
        if (initAll || cleanResources?.includes('database')) {
          warnings.push(`项目数据库模式为 ${dbMode}，跳过项目级数据库初始化`);
        }
      }
    }

    return { initialized, skipped, warnings };
  }

  /**
   * 获取项目页面数量（轻量级，仅 readdir 一次，用于 getOverview 聚合）
   */
  async getPageCount(projectId: string): Promise<number> {
    const pagesDir = path.join(this.getProjectDir(projectId), 'pages');
    try {
      const entries = await fs.promises.readdir(pagesDir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).length;
    } catch {
      return 0;
    }
  }

  /**
   * 递归计算目录总大小（字节）
   * 异步遍历，避免阻塞事件循环
   */
  private async getDirSize(dirPath: string): Promise<number> {
    let total = 0;
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          total += await this.getDirSize(fullPath);
        } else if (entry.isFile()) {
          try {
            const stat = await fs.promises.stat(fullPath);
            total += stat.size;
          } catch {
            // 跳过无法访问的文件（如被锁定的 SQLite WAL/SHM 临时文件）
          }
        }
      }
    } catch {
      // 目录不存在或无法访问
    }
    return total;
  }

  /**
   * 计算项目目录总大小（字节，包含所有子目录：db/pages/rtdb/template/images 等）
   * 用于卡片视图展示项目磁盘占用
   */
  private async getProjectFolderSize(projectId: string): Promise<number> {
    const projectDir = this.getProjectDir(projectId);
    return this.getDirSize(projectDir);
  }

  /**
   * 获取单个文件大小（字节）
   * 仅 stat 单个文件，O(1) 轻量操作，不走 libuv 线程池的递归 stat 重路径。
   * 文件不存在或无法访问时返回 0（如项目尚未初始化 db）。
   */
  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stat = await fs.promises.stat(filePath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  /**
   * 获取项目管理信息（页面数量、数据库大小、时间等）
   */
  async getManageInfo(projectId: string): Promise<ManageInfo> {
    const project = this.readProjectInfo(projectId);
    const projectDir = this.getProjectDir(projectId);
    const dbDir = path.join(projectDir, 'db');
    const rtdbDir = path.join(projectDir, 'rtdb');
    const pagesDir = path.join(projectDir, 'pages');

    // 页面数量（异步读取，避免阻塞事件循环）
    let pageCount = 0;
    try {
      const entries = await fs.promises.readdir(pagesDir, { withFileTypes: true });
      pageCount = entries.filter((e) => e.isDirectory()).length;
    } catch {
      pageCount = 0;
    }

    // 数据库大小：统计 db/ 目录下的 system.db
    // 不遍历整个项目目录树（rtdb/ 下可能有海量实时数据文件）
    const dbSize = await this.getFileSize(path.join(dbDir, 'system.db'));
    const rtdbSize = 0; // rtdb 按需计算，不在 overview 中遍历

    const dbMode = this.projectDbService.getMode();

    return {
      projectName: project.projectName,
      tenantId: project.tenantId,
      projectId: project.projectId,
      version: project.version || '1.0.0',
      description: project.description || '',
      projectPath: projectDir,
      databasePath: dbDir,
      rtdbPath: rtdbDir,
      pageCount,
      dbSize,
      rtdbSize,
      dbMode,
      image: project.image,
      address: project.address,
      longitude: project.longitude,
      latitude: project.latitude,
      owner: project.owner,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      createdBy: project.createdBy,
      updatedBy: project.updatedBy,
    };
  }

  /**
   * 获取系统概览统计（所有项目聚合）
   * 后端统一汇总设备统计、报警统计，前端仅需一次请求。
   *
   * 性能保护：
   * - 单项目超时 10s，超时跳过不阻塞整体
   * - 最多 5 个项目并发加载，避免 SQLite 争用
   * - 全程耗时日志便于排查瓶颈
   */
  async getOverview(): Promise<ProjectOverview> {
    const t0 = Date.now();
    this.logger.log(`[getOverview] ======== ENTER ========`);

    const tScan0 = Date.now();
    const projects = this.scanProjects();
    this.logger.log(
      `[getOverview] scanProjects done: ${projects.length} projects (${Date.now() - tScan0}ms)`,
    );

    let totalPageCount = 0;
    let totalDbSize = 0;
    let successCount = 0;
    let failCount = 0;
    let timeoutCount = 0;

    // 聚合设备统计
    const deviceStats: DeviceStats = {
      total: 0,
      online: 0,
      offline: 0,
      connecting: 0,
      degraded: 0,
      error: 0,
      totalTags: 0,
    };
    // 聚合报警统计
    let alarmTotal = 0;
    let alarmActive = 0;
    let alarmAcknowledged = 0;
    let alarmCleared = 0;
    let alarmShelved = 0;

    // 逐项目超时保护
    const PER_PROJECT_TIMEOUT_MS = 10_000;
    // 并发数限制：避免过多项目同时打开 DB 连接导致 SQLite 繁忙
    const CONCURRENCY = 5;

    const processProject = async (project: Project) => {
      const pt0 = Date.now();
      let phaseTimings = '';
      try {
        // 并行执行 + 各阶段独立计时（保持并发优势）
        const timed = async <T>(fn: () => Promise<T>): Promise<{ dur: number; result: T }> => {
          const t = Date.now();
          const result = await fn();
          return { dur: Date.now() - t, result };
        };
        const result = await Promise.race([
          (async () => {
            const t1 = Date.now();
            // 并行获取 pageCount / 设备统计 / 报警统计 / system.db 文件大小。
            // 注意：仅 stat 单个 system.db 文件（O(1) 轻量），不递归 rtdb 目录树 ——
            // getManageInfo 内部 getDirSize 会递归 stat rtdb 下海量文件（可达 300MB+），
            // 在 5 个并发 worker 中会导致 libuv 线程池饱和、setTimeout 推迟 10s+ 才执行。
            // 因此 rtdb 大小仍不在此处计算，仅在项目详情页 getManageInfo 按需获取。
            const [pageCount, devTimed, almTimed, dbSize] = await Promise.all([
              this.getPageCount(project.projectId),
              timed(() => this.deviceService.getDeviceStats(project.projectId)),
              timed(() => this.alarmStatsService.getStatistics(project.projectId)),
              // 仅 stat 单个 system.db 文件（O(1)），不递归 rtdb 目录，避免 libuv 线程池饱和
              this.getFileSize(path.join(this.getProjectDir(project.projectId), 'db', 'system.db')),
            ]);
            phaseTimings = `pages=${Date.now() - t1}ms device=${devTimed.dur}ms alarm=${almTimed.dur}ms db=${dbSize}B`;
            return {
              pageCount,
              devStats: devTimed.result,
              almStats: almTimed.result,
              dbSize,
            };
          })(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), PER_PROJECT_TIMEOUT_MS),
          ),
        ]);
        const elapsed = Date.now() - pt0;
        successCount++;
        this.logger.log(
          `[getOverview] ${project.projectId}: OK ${phaseTimings} total=${elapsed}ms`,
        );

        totalPageCount += result.pageCount;
        totalDbSize += result.dbSize;

        const { devStats, almStats } = result;
        deviceStats.total += devStats.total;
        deviceStats.online += devStats.online;
        deviceStats.offline += devStats.offline;
        deviceStats.connecting += devStats.connecting;
        deviceStats.degraded += devStats.degraded;
        deviceStats.error += devStats.error;
        deviceStats.totalTags += devStats.totalTags;

        alarmTotal += almStats.total;
        alarmActive += almStats.active;
        alarmAcknowledged += almStats.acknowledged;
        alarmCleared += almStats.cleared;
        alarmShelved += almStats.shelved;
      } catch (err) {
        const elapsed = Date.now() - pt0;
        if ((err as Error).message === 'TIMEOUT') {
          timeoutCount++;
          this.logger.warn(
            `[getOverview] ${project.projectId}: TIMEOUT after ${elapsed}ms (>${PER_PROJECT_TIMEOUT_MS}ms)`,
          );
        } else {
          failCount++;
          this.logger.warn(
            `[getOverview] ${project.projectId}: FAIL after ${elapsed}ms — ${(err as Error).message}`,
          );
        }
      }
    };

    // 限流并发执行
    this.logger.log(
      `[getOverview] starting ${CONCURRENCY} workers for ${projects.length} projects...`,
    );
    const tWorkers0 = Date.now();
    const queue = [...projects];
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length > 0) {
        const project = queue.shift()!;
        await processProject(project);
      }
    });
    await Promise.all(workers);
    const tWorkers = Date.now() - tWorkers0;

    const totalElapsed = Date.now() - t0;
    this.logger.log(
      `[getOverview] ======== EXIT ========` +
        ` projects=${projects.length} success=${successCount} fail=${failCount} timeout=${timeoutCount}` +
        ` | workers=${tWorkers}ms total=${totalElapsed}ms` +
        ` | devices=${deviceStats.total}(on=${deviceStats.online} off=${deviceStats.offline} err=${deviceStats.error})` +
        ` | alarms=${alarmTotal}(active=${alarmActive} ack=${alarmAcknowledged})` +
        ` | dbSize=${totalDbSize}B pages=${totalPageCount}`,
    );

    return {
      projectCount: projects.length,
      totalDbSize,
      totalPageCount,
      deviceStats,
      alarmStats: {
        total: alarmTotal,
        active: alarmActive,
        acknowledged: alarmAcknowledged,
        cleared: alarmCleared,
        shelved: alarmShelved,
      },
    };
  }

  /**
   * 检测数据库文件状态（三层检测：文件存在 → 大小 → SQLite 魔数）
   *
   * 使用文件头魔数（"SQLite format 3\0"）检测，避免引入 better-sqlite3 原生依赖。
   * 不检查表数量，因为空表数据库仍是合法 SQLite 文件，且 Phase 2 实体迁移后会自动建表。
   */
  private async checkDbFile(dbPath: string): Promise<ResourceStatus> {
    if (!fs.existsSync(dbPath)) {
      return { status: 'missing', path: dbPath };
    }
    let stat: fs.Stats;
    try {
      stat = fs.statSync(dbPath);
    } catch {
      return { status: 'error', path: dbPath };
    }
    if (stat.size < 100) {
      // SQLite 文件太小（有效数据库至少包含文件头 100 字节）
      return { status: 'empty', path: dbPath, size: stat.size };
    }
    try {
      // 读取 SQLite 文件头魔数："SQLite format 3\0"（16 字节）
      const fd = fs.openSync(dbPath, 'r');
      const header = Buffer.alloc(16);
      fs.readSync(fd, header, 0, 16, 0);
      fs.closeSync(fd);

      const magic = header.toString('utf8', 0, 16);
      if (magic.startsWith('SQLite format 3')) {
        return { status: 'ok', path: dbPath, size: stat.size };
      }
      return { status: 'error', path: dbPath, size: stat.size };
    } catch {
      // 文件存在且大小合理，但无法以 'r' 打开读取魔数 ——
      // 在 Windows 上，当 SQLite 文件被当前后端进程（better-sqlite3/TypeORM）
      // 独占锁定时，fs.openSync 会抛出 EBUSY/EPERM。
      // 由于该文件正是由本项目代码创建并维护的合法数据库，
      // 此处将"已锁定但存在且非空"视为有效（status: 'ok'），
      // 避免误报为损坏，导致诊断显示"初始化缺失资源"。
      return { status: 'ok', path: dbPath, size: stat.size };
    }
  }
}

/** 诊断结果类型 */
export interface DiagnoseResources {
  projectinfo?: ResourceStatus;
  dbDir?: ResourceStatus;
  rtdbDir?: ResourceStatus;
  pagesDir?: ResourceStatus;
  templateDir?: ResourceStatus;
  systemDb?: ResourceStatus;
}

export interface ResourceStatus {
  status: 'ok' | 'missing' | 'error' | 'empty';
  path: string;
  size?: number;
}

export interface DiagnoseResult {
  projectName: string;
  projectId: string;
  tenantId: string;
  resources: DiagnoseResources;
  health: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  dbMode: string;
}

/** 聚合报警统计 */
export interface AggregatedAlarmStats {
  total: number;
  active: number;
  acknowledged: number;
  cleared: number;
  shelved: number;
}

/** 系统概览统计 */
export interface ProjectOverview {
  /** 项目总数 */
  projectCount: number;
  /** 所有项目数据库总大小（字节） */
  totalDbSize: number;
  /** 所有项目页面总数 */
  totalPageCount: number;
  /** 聚合设备统计（所有项目汇总） */
  deviceStats: DeviceStats;
  /** 聚合报警统计（所有项目汇总） */
  alarmStats: AggregatedAlarmStats;
}

/** 项目管理信息 */
export interface ManageInfo {
  projectName: string;
  tenantId: string;
  projectId: string;
  version: string;
  description: string;
  projectPath: string;
  databasePath: string;
  rtdbPath: string;
  pageCount: number;
  dbSize: number;
  rtdbSize: number;
  dbMode: string;
  image?: string;
  address?: string;
  longitude?: string;
  latitude?: string;
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}
