// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  raw: string;
}

export interface LogFilter {
  level?: string;
  module?: string;
  keyword?: string;
  lines?: number;
}

@Injectable()
export class LogViewerService {
  private readonly logger = new Logger(LogViewerService.name);
  private readonly logDir: string;
  private sseClients: Subject<LogEntry>[] = [];

  constructor(private readonly pathResolver: PathResolverService) {
    // 使用 path.resolve 确保与 main.ts 中 Winston 写入路径完全一致
    // LOG_DIR 通常由 .env 配置（${DATA_DIR}/logs），fallback 时使用项目根目录
    this.logDir = process.env.LOG_DIR
      ? this.pathResolver.resolve(process.env.LOG_DIR)
      : path.join(this.pathResolver.getProjectRoot(), 'logs');
  }

  private getProjectRoot(): string {
    return this.pathResolver.getProjectRoot();
  }

  /** SSE 实时日志推送 */
  subscribeToLogs(filter: LogFilter = {}): Observable<LogEntry> {
    const subject = new Subject<LogEntry>();
    this.sseClients.push(subject);

    // 连接时发送最近 20 条日志
    this.getRecentLogs(filter, 20)
      .then((logs) => {
        for (const log of logs) {
          subject.next(log);
        }
      })
      .catch((err) => {
        this.logger.warn(`Failed to fetch recent logs for SSE client: ${err.message}`);
      });

    // 监听主日志文件（combined.log）的变化，实现实时推送
    let watcher: fs.FSWatcher | null = null;
    const primaryLog = this.getPrimaryLogFile();
    if (primaryLog) {
      let lastSize = 0;
      try {
        lastSize = fs.statSync(primaryLog).size;
      } catch {
        /* 文件可能尚未创建 */
      }

      try {
        watcher = fs.watch(primaryLog, (eventType) => {
          if (eventType !== 'change') return;
          try {
            const newStat = fs.statSync(primaryLog);
            if (newStat.size > lastSize) {
              // 读取新增的字节
              const stream = fs.createReadStream(primaryLog, {
                encoding: 'utf-8',
                start: lastSize,
                end: newStat.size,
              });
              const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
              rl.on('line', (line) => {
                const entry = this.parseLogLine(line);
                if (entry && this.matchesFilter(entry, filter)) {
                  subject.next(entry);
                }
              });
              lastSize = newStat.size;
            } else if (newStat.size < lastSize) {
              // 文件被截断或轮转
              lastSize = 0;
            }
          } catch {
            /* 忽略读取异常 */
          }
        });
      } catch (err) {
        this.logger.warn(`Failed to watch log file: ${(err as Error).message}`);
      }
    }

    return subject.asObservable().pipe(
      finalize(() => {
        // 客户端断开时清理 watcher 和客户端列表
        if (watcher) watcher.close();
        this.sseClients = this.sseClients.filter((c) => c !== subject);
      }),
    );
  }

  /**
   * 获取主日志文件，SSE 监听此文件实现实时推送。
   *
   * 优先级：
   * 1. 新目录结构：app/app-YYYY-MM-DD.log（Winston DailyRotateFile 当天日志，全级别）
   * 2. 兼容旧目录结构：combined.log（Winston File transport）
   * 3. 回退到最新的 .log 文件
   */
  private getPrimaryLogFile(): string | null {
    // 1. 新目录结构：app/app-YYYY-MM-DD.log
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const todayAppLog = path.join(this.logDir, 'app', `app-${yyyy}-${mm}-${dd}.log`);
    if (fs.existsSync(todayAppLog)) return todayAppLog;

    // 2. 兼容旧目录结构：combined.log
    const combinedPath = path.join(this.logDir, 'combined.log');
    if (fs.existsSync(combinedPath)) return combinedPath;

    // 3. 回退到最新的 .log 文件
    const files = this.getLogFiles();
    if (files.length > 0) return path.join(this.logDir, files[files.length - 1]);
    return null;
  }

  /** 推送日志条目 */
  pushLog(entry: LogEntry): void {
    for (const client of this.sseClients) {
      try {
        client.next(entry);
      } catch {
        // client disconnected
      }
    }
    // Clean up disconnected clients
    this.sseClients = this.sseClients.filter((c) => !c.closed);
  }

  /** 查询日志（优先读取主日志文件：app/app-YYYY-MM-DD.log 或 combined.log） */
  async getRecentLogs(filter: LogFilter = {}, lines: number = 100): Promise<LogEntry[]> {
    const results: LogEntry[] = [];

    // 优先读取主日志文件（Winston 主日志，包含所有级别）
    const primaryLog = this.getPrimaryLogFile();
    if (primaryLog) {
      const fileLines = await this.readLastLines(primaryLog, lines * 2);
      for (const line of fileLines) {
        const entry = this.parseLogLine(line);
        if (entry && this.matchesFilter(entry, filter)) {
          results.push(entry);
        }
      }
    }

    // 如果主日志文件数据不足，回退到读取其他日志文件（排除已读取的主日志）
    if (results.length < lines) {
      // 与 getLogFiles() 保持一致：统一正斜杠便于比较
      const primaryRel = primaryLog
        ? path.relative(this.logDir, primaryLog).split(path.sep).join('/')
        : '';
      const logFiles = this.getLogFiles().filter(
        (f) => f !== 'combined.log' && f !== primaryRel,
      );
      for (const file of logFiles.slice(-3)) {
        const filePath = path.join(this.logDir, file);
        if (!fs.existsSync(filePath)) continue;

        const fileLines = await this.readLastLines(filePath, lines);
        for (const line of fileLines) {
          const entry = this.parseLogLine(line);
          if (entry && this.matchesFilter(entry, filter)) {
            results.push(entry);
          }
        }
      }
    }

    return results.slice(-lines);
  }

  /** 列出日志文件（递归扫描 app/ error/ plugins/ 子目录，返回相对路径）
   *
   * 返回的相对路径统一使用正斜杠 `/` 作为分隔符（跨平台一致、URL 安全），
   * 便于前端展示与下载接口拼接。同时跳过 winston-daily-rotate-file 的
   * 隐藏审计文件（以 `.` 开头，如 `.xxxxx-audit.json`）。
   */
  getLogFiles(): string[] {
    try {
      if (!fs.existsSync(this.logDir)) return [];
      const results: string[] = [];
      const scan = (dir: string, base: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          // 跳过隐藏文件（winston 轮转的 .xxxxx-audit.json 等）
          if (entry.name.startsWith('.')) continue;
          const full = path.join(dir, entry.name);
          const rel = path.relative(base, full).split(path.sep).join('/');
          if (entry.isDirectory()) {
            scan(full, base);
          } else if (entry.name.endsWith('.log') || entry.name.endsWith('.log.gz')) {
            results.push(rel);
          }
        }
      };
      scan(this.logDir, this.logDir);
      return results.sort();
    } catch {
      return [];
    }
  }

  /** 获取日志文件绝对路径。
   *
   * 接受正斜杠或反斜杠的相对路径（来自 getLogFiles 的返回值或前端下载请求），
   * 解析为绝对路径并强制校验必须位于 logDir 内部，防止路径穿越攻击。
   */
  getLogFilePath(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      throw new Error('Filename is required');
    }
    // 统一为正斜杠后再 normalize，避免 Windows 反斜杠干扰
    const cleaned = filename.replace(/\\/g, '/');
    const normalizedLogDir = path.resolve(this.logDir);
    const filePath = path.resolve(normalizedLogDir, cleaned);

    // 路径穿越保护：解析后的路径必须仍在 logDir 之内
    if (filePath !== normalizedLogDir && !filePath.startsWith(normalizedLogDir + path.sep)) {
      throw new Error(`Invalid log file path: ${filename}`);
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error(`Log file not found: ${filename}`);
    }
    return filePath;
  }

  private async readLastLines(filePath: string, maxLines: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const lines: string[] = [];
      try {
        const fileSize = fs.statSync(filePath).size;

        // 大文件优化：只读取文件尾部，避免读取整个 GB 级文件导致超时
        // 按平均每行 ~500 字节估算，读取 maxLines * 2 * 500 字节，最少 64KB，最多 4MB
        const tailBytes = Math.min(Math.max(maxLines * 1000, 65536), 4 * 1024 * 1024);
        const start = Math.max(0, fileSize - tailBytes);
        const isPartialRead = start > 0; // 从文件中间开始读取时，首行可能不完整

        const rl = readline.createInterface({
          input: fs.createReadStream(filePath, { encoding: 'utf-8', start, end: fileSize }),
          crlfDelay: Infinity,
        });

        let isFirstLine = true;
        rl.on('line', (line) => {
          // 从文件中间读取时，跳过首个不完整行
          if (isPartialRead && isFirstLine) {
            isFirstLine = false;
            return;
          }
          isFirstLine = false;
          lines.push(line);
          if (lines.length > maxLines) {
            lines.shift();
          }
        });

        rl.on('close', () => resolve(lines));
        rl.on('error', reject);
      } catch (error) {
        resolve([]);
      }
    });
  }

  private parseLogLine(line: string): LogEntry | null {
    if (!line || !line.trim()) return null;
    try {
      // Try JSON format first (Winston File transport 输出)
      const parsed = JSON.parse(line);
      // Winston 的 level 可能是 "log"（NestJS Logger.log 映射），统一为 "info"
      const rawLevel = parsed.level || parsed.level || 'info';
      const level = rawLevel === 'log' ? 'info' : rawLevel;
      return {
        timestamp: parsed.timestamp || parsed.time || new Date().toISOString(),
        level,
        module: parsed.context || parsed.module || '',
        message: parsed.message || parsed.msg || '',
        raw: line,
      };
    } catch {
      // Try plain text format: [TIMESTAMP] [LEVEL] [MODULE] message
      // 匹配 Winston Console transport 的 printf 格式：
      // "2026/07/24 09:03:13     LOG [ChildProcessExecutor] message"
      const winstonMatch = line.match(
        /^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\w+)\s+\[([^\]]+)\]\s*(.*)$/,
      );
      if (winstonMatch) {
        const level = winstonMatch[2].toLowerCase().replace('log', 'info');
        return {
          timestamp: winstonMatch[1].replace(/\//g, '-'),
          level,
          module: winstonMatch[3],
          message: winstonMatch[4],
          raw: line,
        };
      }
      // 匹配 ISO 时间戳格式：2026-07-24T01:03:14.068Z [info] [Module] message
      const isoMatch = line.match(
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^\s\]]*)\s+\[?(\w+)\]?\s*\[?([^\]]+)\]?\s*(.*)$/,
      );
      if (isoMatch) {
        return {
          timestamp: isoMatch[1],
          level: isoMatch[2].toLowerCase(),
          module: isoMatch[3],
          message: isoMatch[4],
          raw: line,
        };
      }
      // 无法解析的行，作为纯文本返回
      return {
        timestamp: new Date().toISOString(),
        level: 'info',
        module: '',
        message: line,
        raw: line,
      };
    }
  }

  private matchesFilter(entry: LogEntry, filter: LogFilter): boolean {
    if (filter.level && entry.level !== filter.level) return false;
    if (filter.module && !entry.module.includes(filter.module)) return false;
    if (
      filter.keyword &&
      !entry.message.includes(filter.keyword) &&
      !entry.raw.includes(filter.keyword)
    )
      return false;
    return true;
  }
}
