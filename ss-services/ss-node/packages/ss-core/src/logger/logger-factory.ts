// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import * as path from 'path';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * 统一日志配置
 *
 * 由 LoggerFactory 集中管理所有 Winston transport / logger 的创建，
 * 确保应用日志、错误日志、插件日志使用一致的轮转与压缩策略。
 *
 * 目录结构：
 *   {logDir}/app/app-%DATE%.log                — 应用日志（全级别）
 *   {logDir}/error/error-%DATE%.log            — 错误日志（仅 error）
 *   {logDir}/plugins/{protocol}/{protocol}-%DATE%.log — 插件采集日志
 *
 * 轮转策略：按天 + 按大小（LOG_MAX_SIZE），历史文件 gzip 压缩（zippedArchive），
 * 超过 LOG_MAX_FILES 自动删除最旧文件。
 */
export interface LogConfig {
  /** 日志根目录绝对路径 */
  logDir: string;
  /** 单文件最大大小，超过即轮转（如 '10m' / '100m'） */
  maxSize: string;
  /** 保留最近 N 个日志文件（含 .gz，如 '14' / '14d'） */
  maxFiles: string;
  /** 日志级别（'debug' | 'info' | 'warn' | 'error'） */
  logLevel: string;
}

/**
 * 获取项目根目录绝对路径
 *
 * 与 PathResolverService 保持一致：
 * - 优先使用 SS_NODE_ROOT（由 main.ts / app.module.ts 在启动时设置）
 * - Fallback 到 process.cwd()
 */
function getProjectRoot(): string {
  if (process.env.SS_NODE_ROOT) {
    return path.normalize(process.env.SS_NODE_ROOT);
  }
  return path.normalize(process.cwd());
}

/**
 * 将相对路径解析为绝对路径（相对于项目根）
 * - 绝对路径原样返回
 * - 相对路径相对于项目根解析
 *
 * 与 PathResolverService.resolve() 逻辑一致，确保 LoggerFactory 在
 * 静态调用场景（非 DI 注入）下也能正确解析路径。
 */
function resolvePath(relativePath: string): string {
  const projectRoot = getProjectRoot();
  if (!relativePath) return projectRoot;
  if (path.isAbsolute(relativePath)) return path.normalize(relativePath);
  return path.resolve(projectRoot, relativePath);
}

/**
 * 从环境变量读取统一日志配置
 *
 * 环境变量：
 * - LOG_DIR：日志根目录（相对路径基于项目根解析），默认 {projectRoot}/logs
 * - LOG_MAX_SIZE：单文件最大大小（默认 '10m'）
 * - LOG_MAX_FILES：保留文件数（默认 '14'）
 * - LOG_LEVEL：日志级别（默认 'info'）
 */
export function getLogConfig(): LogConfig {
  const logDir = process.env.LOG_DIR
    ? resolvePath(process.env.LOG_DIR)
    : path.join(getProjectRoot(), 'logs');

  return {
    logDir,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '14',
    logLevel: (process.env.LOG_LEVEL as string) || 'info',
  };
}

/**
 * 创建应用日志 transport（全级别 info+warn+error）
 *
 * 文件路径：{logDir}/app/app-%DATE%.log
 * 按天轮转 + 按大小轮转，历史文件 gzip 压缩。
 */
export function createAppFileTransport(config: LogConfig): DailyRotateFile {
  return new DailyRotateFile({
    // 受 LOG_LEVEL 环境变量控制（默认 'info'）
    // 与 Console transport 保持一致，避免文件日志仍写入 info 级别
    level: config.logLevel,
    filename: path.join(config.logDir, 'app', 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: config.maxSize,
    maxFiles: config.maxFiles,
    zippedArchive: true,
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  });
}

/**
 * 创建错误日志 transport（仅 error 级别）
 *
 * 文件路径：{logDir}/error/error-%DATE%.log
 * 按天轮转 + 按大小轮转，历史文件 gzip 压缩。
 */
export function createErrorFileTransport(config: LogConfig): DailyRotateFile {
  return new DailyRotateFile({
    level: 'error',
    filename: path.join(config.logDir, 'error', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: config.maxSize,
    maxFiles: config.maxFiles,
    zippedArchive: true,
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  });
}

/**
 * 创建插件采集日志 logger（按协议分目录，懒创建）
 *
 * 文件路径：{logDir}/plugins/{protocol}/{protocol}-%DATE%.log
 * 按天轮转 + 按大小轮转，历史文件 gzip 压缩。
 *
 * 格式：[timestamp] [LEVEL] message（与原 PluginMonitorService 格式兼容）
 *
 * @param config 日志配置
 * @param protocol 协议名（如 'modbus_tcp' / 'virtual'）
 */
export function createPluginLogger(config: LogConfig, protocol: string): winston.Logger {
  return winston.createLogger({
    level: config.logLevel,
    transports: [
      new DailyRotateFile({
        filename: path.join(config.logDir, 'plugins', protocol, `${protocol}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        maxSize: config.maxSize,
        maxFiles: config.maxFiles,
        zippedArchive: true,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${String(level).toUpperCase()}] ${message}`;
          }),
        ),
      }),
    ],
  });
}
