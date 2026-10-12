// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { exec, ExecOptions } from 'child_process';
import * as crypto from 'crypto';

export interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  exitCode: number | null;
  status: 'running' | 'completed' | 'timeout' | 'blocked' | 'error';
  createdAt: Date;
  completedAt?: Date;
}

/** 命令白名单 */
const COMMAND_WHITELIST = [
  'dir',
  'ls',
  'pwd',
  'cd',
  'echo',
  'cat',
  'head',
  'tail',
  'ps',
  'top',
  'df',
  'du',
  'free',
  'netstat',
  'ping',
  'tracert',
  'nslookup',
  'node -v',
  'npm -v',
  'whoami',
  'hostname',
  'date',
  'time',
  'uptime',
  'type',
  'find',
  'wc',
  'systeminfo',
  'tasklist',
  'git status',
  'git log',
  'git branch',
  'pm2 list',
  'pm2 status',
];

/** 危险命令模式 */
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i,
  /rm\s+-r/i,
  /del\s+\/f/i,
  /del\s+\/s/i,
  /format\s/i,
  /fdisk/i,
  /mkfs/i,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM/i,
  /TRUNCATE\s+TABLE/i,
  /shutdown/i,
  /reboot/i,
  /halt/i,
  /init\s+[0-6]/i,
  /kill\s+-9/i,
  /chmod\s+777/i,
  /\|.*sh$/i,
  /`.*`/i,
  /\$\(.*\)/i,
  /;\s*(rm|shutdown|reboot)/i,
  /&&\s*(rm|shutdown|reboot)/i,
  /\|\|\s*(rm|shutdown|reboot)/i,
];

const MAX_COMMAND_TIMEOUT = 10000; // 10秒

@Injectable()
export class TerminalService {
  private readonly logger = new Logger(TerminalService.name);
  private activeCommands: Map<string, TerminalCommand> = new Map();

  /** 执行命令 */
  async executeCommand(cmd: string, adminUser?: string): Promise<TerminalCommand> {
    // 权限检查
    if (!adminUser) {
      throw new ForbiddenException('Only administrators can execute terminal commands');
    }

    // 危险命令拦截
    const dangerCheck = this.checkDangerous(cmd);
    if (dangerCheck) {
      this.logger.warn(`Dangerous command blocked: "${cmd}" by ${adminUser}`);
      return {
        id: crypto.randomUUID(),
        command: cmd,
        output: `Command blocked: ${dangerCheck}`,
        exitCode: -1,
        status: 'blocked',
        createdAt: new Date(),
        completedAt: new Date(),
      };
    }

    // 白名单检查
    if (!this.isWhitelisted(cmd)) {
      this.logger.warn(`Command not in whitelist: "${cmd}" by ${adminUser}`);
      return {
        id: crypto.randomUUID(),
        command: cmd,
        output: 'Command not in whitelist. Allowed commands: ' + COMMAND_WHITELIST.join(', '),
        exitCode: -1,
        status: 'blocked',
        createdAt: new Date(),
        completedAt: new Date(),
      };
    }

    const id = crypto.randomUUID();
    const entry: TerminalCommand = {
      id,
      command: cmd,
      output: '',
      exitCode: null,
      status: 'running',
      createdAt: new Date(),
    };

    this.activeCommands.set(id, entry);

    try {
      const output = await this.execWithTimeout(cmd, MAX_COMMAND_TIMEOUT);
      entry.output = output.stdout || output.stderr || '';
      entry.exitCode = 0;
      entry.status = 'completed';
      entry.completedAt = new Date();
    } catch (error) {
      if (error.message === 'TIMEOUT') {
        entry.status = 'timeout';
        entry.output = 'Command execution timed out (10s)';
      } else {
        entry.status = 'error';
        entry.output = error.message || 'Command execution failed';
      }
      entry.exitCode = -1;
      entry.completedAt = new Date();
    }

    this.activeCommands.delete(id);
    return entry;
  }

  /** 获取活跃命令列表 */
  getActiveCommands(): TerminalCommand[] {
    return Array.from(this.activeCommands.values());
  }

  /** 获取命令执行结果 */
  getCommandResult(id: string): TerminalCommand | null {
    return this.activeCommands.get(id) || null;
  }

  /** 检查危险命令 */
  private checkDangerous(cmd: string): string | null {
    for (const pattern of DANGEROUS_PATTERNS) {
      const match = cmd.match(pattern);
      if (match) {
        return `Dangerous pattern detected: ${match[0]}`;
      }
    }
    return null;
  }

  /** 检查白名单 */
  private isWhitelisted(cmd: string): boolean {
    const trimmed = cmd.trim().toLowerCase();
    for (const allowed of COMMAND_WHITELIST) {
      if (trimmed === allowed || trimmed.startsWith(allowed + ' ')) {
        return true;
      }
    }
    return false;
  }

  /** 带超时的命令执行 */
  private execWithTimeout(
    cmd: string,
    timeoutMs: number,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, timeoutMs);

      // Windows 下切换到 UTF-8 代码页，避免中文乱码
      const isWin = process.platform === 'win32';
      const finalCmd = isWin ? `chcp 65001 >nul && ${cmd}` : cmd;

      const options: ExecOptions = {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024, // 1MB
        windowsHide: true,
        encoding: 'utf8',
        env: { ...process.env, LANG: 'en_US.UTF-8' },
      };

      exec(finalCmd, options, (error, stdout, stderr) => {
        clearTimeout(timer);
        if (error) {
          resolve({ stdout: String(stdout || ''), stderr: String(stderr || error.message) });
        } else {
          resolve({ stdout: String(stdout || ''), stderr: String(stderr || '') });
        }
      });
    });
  }
}
