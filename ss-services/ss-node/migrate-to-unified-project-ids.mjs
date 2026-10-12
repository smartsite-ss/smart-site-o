// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 方案 B Step 6：数据迁移脚本
 *
 * 将项目资源目录名统一为 projectId（拼音全拼 kebab-case），
 * 并同步更新 projectinfo.json 和 system.db 中的 projectId 字段。
 *
 * 运行前提：
 *   1. 后端服务已停止（.\bin\kill-node.bat）
 *   2. 已备份 ss-run/ss/data/projects/ 目录
 *
 * 用法：
 *   cd ss-services/ss-node
 *   node migrate-to-unified-project-ids.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// pinyin-pro 在 ss-project 包中可用
const require = createRequire(import.meta.url);
const { pinyin } = require(path.join(__dirname, 'packages/ss-project/node_modules/pinyin-pro'));

// sqlite3 通过 pnpm 安装在 ss-core 中，需用绝对路径解析
let sqlite3;
try {
  const ssCoreRequire = createRequire(path.join(__dirname, 'packages/ss-core/package.json'));
  sqlite3 = ssCoreRequire('sqlite3');
} catch {
  // 回退尝试
  try {
    sqlite3 = require('sqlite3');
  } catch {
    console.warn('[WARN] 无法加载 sqlite3 模块，将跳过 system.db 更新');
  }
}

// 项目数据目录
const PROJECTS_DIR = path.resolve(__dirname, '../../ss-run/ss/data/projects');
const LOG_FILE = path.resolve(PROJECTS_DIR, '../migration-unified-ids.log');

/**
 * 生成项目唯一标识符 projectId（拼音全拼 kebab-case）
 * 与 project.service.ts 中 generateProjectId() 逻辑保持一致
 */
function generateProjectId(name) {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug) {
    return slug;
  }
  // 纯中文/非拉丁名：用拼音全拼生成 slug
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
 * 判断目录名是否符合 projectId 规范（kebab-case，至少含一个字母）
 */
function isValidProjectId(dirName) {
  // 必须匹配 kebab-case 正则
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(dirName)) return false;
  // 必须至少含一个字母（排除纯数字如 "32"）
  if (!/[a-z]/.test(dirName)) return false;
  return true;
}

/**
 * 更新 system.db 中所有含 projectId 列的表
 * 使用 sqlite3（回调式 API，通过 Promise 包装）
 */
async function updateSystemDb(dbPath, newProjectId) {
  if (!sqlite3) {
    return { updated: false, reason: 'sqlite3 module not available' };
  }
  if (!fs.existsSync(dbPath)) {
    return { updated: false, reason: 'system.db not found' };
  }

  const db = new sqlite3.Database(dbPath);

  const run = (sql, ...params) =>
    new Promise((resolve, reject) => {
      db.run(sql, ...params, function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

  const all = (sql) =>
    new Promise((resolve, reject) => {
      db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

  try {
    // 获取所有表名
    const tables = await all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    );

    let totalUpdated = 0;
    const updatedTables = [];

    for (const { name: table } of tables) {
      // 检查表是否有 projectId 列
      const columns = await all(`PRAGMA table_info(${table})`);
      const hasProjectId = columns.some((c) => c.name === 'projectId');
      if (!hasProjectId) continue;

      // 更新所有行的 projectId 为新值
      const result = await run(`UPDATE ${table} SET projectId = ?`, newProjectId);
      if (result.changes > 0) {
        totalUpdated += result.changes;
        updatedTables.push(`${table} (${result.changes} rows)`);
      }
    }

    return { updated: true, totalUpdated, updatedTables };
  } catch (e) {
    return { updated: false, reason: `error: ${e.message}` };
  } finally {
    db.close();
  }
}

/**
 * 主迁移函数
 */
async function migrate() {
  const startTime = new Date();
  const logLines = [];
  logLines.push(`=== 项目标识符统一迁移 (${startTime.toISOString()}) ===`);
  logLines.push(`项目目录: ${PROJECTS_DIR}`);
  logLines.push('');

  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error(`项目目录不存在: ${PROJECTS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  const projectDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

  // 收集所有项目的当前信息
  const projects = [];
  const dirsWithoutInfo = [];

  for (const entry of projectDirs) {
    const dirPath = path.join(PROJECTS_DIR, entry.name);
    const infoPath = path.join(dirPath, 'projectinfo.json');

    if (!fs.existsSync(infoPath)) {
      dirsWithoutInfo.push(entry.name);
      continue;
    }

    try {
      const raw = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
      projects.push({
        dirName: entry.name,
        dirPath,
        infoPath,
        raw,
        projectName: raw.projectName || raw.name || entry.name,
        currentProjectId: raw.projectId || raw.tid || raw.pid || entry.name,
        currentTid: raw.tid || entry.name,
      });
    } catch (e) {
      logLines.push(`[WARN] 无法读取 ${entry.name}/projectinfo.json: ${e.message}`);
      dirsWithoutInfo.push(entry.name);
    }
  }

  logLines.push(`扫描结果: ${projects.length} 个有效项目, ${dirsWithoutInfo.length} 个无 projectinfo.json 的目录`);
  if (dirsWithoutInfo.length > 0) {
    logLines.push(`  无 projectinfo.json 的目录: ${dirsWithoutInfo.join(', ')}`);
  }
  logLines.push('');

  // 生成新 projectId 并处理冲突
  const usedProjectIds = new Set();
  const migrationPlan = [];

  for (const proj of projects) {
    let newProjectId;

    if (isValidProjectId(proj.dirName)) {
      // 目录名已符合规范，直接使用
      newProjectId = proj.dirName;
    } else {
      // 生成新 projectId
      newProjectId = generateProjectId(proj.projectName);
    }

    // 确保非空
    if (!newProjectId) {
      newProjectId = proj.dirName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    // 冲突处理：追加数字后缀
    if (usedProjectIds.has(newProjectId)) {
      let n = 2;
      while (usedProjectIds.has(`${newProjectId}${n}`)) {
        n++;
      }
      newProjectId = `${newProjectId}${n}`;
    }
    usedProjectIds.add(newProjectId);

    migrationPlan.push({
      ...proj,
      newProjectId,
      needsRename: proj.dirName !== newProjectId,
    });
  }

  // 打印迁移计划
  logLines.push('=== 迁移计划 ===');
  for (const p of migrationPlan) {
    const action = p.needsRename ? `[RENAME] ${p.dirName} → ${p.newProjectId}` : `[KEEP]    ${p.dirName}`;
    logLines.push(`  ${action}  (projectName="${p.projectName}", oldProjectId="${p.currentProjectId}")`);
  }
  logLines.push('');

  // 执行迁移
  logLines.push('=== 执行迁移 ===');
  let successCount = 0;
  let failCount = 0;

  for (const p of migrationPlan) {
    try {
      // 1. 重命名目录（如果需要）
      if (p.needsRename) {
        const newPath = path.join(PROJECTS_DIR, p.newProjectId);
        if (fs.existsSync(newPath)) {
          throw new Error(`目标目录已存在: ${p.newProjectId}`);
        }
        fs.renameSync(p.dirPath, newPath);
        p.dirPath = newPath;
        p.infoPath = path.join(newPath, 'projectinfo.json');
      }

      // 2. 更新 projectinfo.json
      const updated = { ...p.raw };
      updated.projectId = p.newProjectId;
      updated.tenantId = p.newProjectId;
      updated.projectName = p.projectName;
      // 删除旧字段
      delete updated.tid;
      delete updated.pid;
      delete updated.name; // 旧 name 字段

      fs.writeFileSync(p.infoPath, JSON.stringify(updated, null, 2), 'utf-8');

      // 3. 更新 system.db
      const dbPath = path.join(p.dirPath, 'db', 'system.db');
      const dbResult = await updateSystemDb(dbPath, p.newProjectId);

      const dbInfo = dbResult.updated
        ? `system.db: ${dbResult.totalUpdated} rows updated in [${dbResult.updatedTables.join(', ')}]`
        : `system.db: ${dbResult.reason}`;

      logLines.push(`  [OK] ${p.dirName} → ${p.newProjectId} | ${dbInfo}`);
      successCount++;
    } catch (e) {
      logLines.push(`  [FAIL] ${p.dirName} → ${p.newProjectId} | ${e.message}`);
      failCount++;
    }
  }

  logLines.push('');
  logLines.push(`=== 迁移完成: ${successCount} 成功, ${failCount} 失败 ===`);
  logLines.push(`完成时间: ${new Date().toISOString()}`);

  // 写入日志
  const logContent = logLines.join('\n');
  fs.writeFileSync(LOG_FILE, logContent, 'utf-8');

  // 输出到控制台
  console.log(logContent);
  console.log(`\n日志已写入: ${LOG_FILE}`);
}

migrate();
