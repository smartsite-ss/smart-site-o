// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * CommandParser — 命令解析器
 *
 * 基于 commander 注册所有 CLI 命令，包括：
 *   - init / start（基础命令）
 *   - device create-wizard（交互式设备创建向导）
 *   - script create-wizard（交互式脚本创建向导）
 *
 * 全局选项：--interactive / -i 启用交互模式
 */

import { Command } from 'commander';
import { ApiClient } from './ApiClient';
import { runScriptCreateWizard } from '../commands/script-create-wizard';

export class CommandParser {
  private readonly program: Command;

  constructor() {
    this.program = new Command();
    this.setupGlobalOptions();
  }

  /** 获取 commander Command 实例（供外部模块注册命令） */
  getProgram(): Command {
    return this.program;
  }

  /** 配置全局选项和元数据 */
  private setupGlobalOptions(): void {
    this.program
      .name('ss-data')
      .description('Smart SCADA Node CLI Tool')
      .version('0.1.0')
      .option('-i, --interactive', 'Enable interactive mode');
  }

  /** 注册所有内置命令 */
  registerCommands(): void {
    this.registerInitCommand();
    this.registerStartCommand();
    this.registerScriptCommands();
  }

  /** init 命令 */
  private registerInitCommand(): void {
    this.program
      .command('init')
      .description('Initialize a new project')
      .action(() => {
        console.log('Initializing ss-data project...');
      });
  }

  /** start 命令 */
  private registerStartCommand(): void {
    this.program
      .command('start')
      .description('Start the server')
      .action(() => {
        console.log('Starting ss-data server...');
      });
  }

  /** script 命令组 */
  private registerScriptCommands(): void {
    const script = this.program.command('script').description('Script management commands');

    script
      .command('create-wizard')
      .description('Interactive script creation wizard')
      .action(() => {
        this.runScriptWizard();
      });
  }

  /** 创建 ApiClient（从环境变量读取配置） */
  createApiClient(): ApiClient {
    const baseUrl = process.env.SS_CLI_SERVER_URL || 'http://localhost:4000';
    const apiKey = process.env.SS_CLI_API_KEY;
    const token = process.env.SS_CLI_TOKEN;

    return new ApiClient({ baseUrl, apiKey, token });
  }

  /** 运行脚本创建向导 */
  private async runScriptWizard(): Promise<void> {
    try {
      const apiClient = this.createApiClient();
      await runScriptCreateWizard({ apiClient });
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }

  /** 解析命令行参数 */
  parse(argv: string[]): void {
    this.program.parse(argv);
  }
}
