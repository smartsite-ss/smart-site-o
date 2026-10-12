// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * InteractivePrompts — 基于 Node.js 内置 readline 模块的交互式提示工具
 *
 * 不依赖 inquirer.js，使用 readline + process.stdin 实现。
 * 在非 TTY 环境下优雅降级（抛出明确错误）。
 */

import * as readline from 'readline';
import * as tty from 'tty';

/** 选择项（单选） */
export interface SelectChoice {
  name: string;
  value: string;
}

/** 选择项（多选） */
export interface MultiSelectChoice {
  name: string;
  value: string;
  checked?: boolean;
}

/** 校验器：返回 null 表示通过，返回字符串表示错误信息 */
export type Validator = (value: string) => string | null;

/**
 * 确保当前环境支持交互式输入
 * 在非 TTY 环境下抛出明确错误
 */
function ensureTty(): void {
  if (!process.stdin.isTTY) {
    throw new Error(
      'Interactive mode requires a TTY environment. ' +
        'Please run this command in an interactive terminal.',
    );
  }
}

/** 创建 readline 接口 */
function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * 确认提示
 * @param message 提示消息
 * @param defaultValue 默认值（用户直接回车时使用）
 * @returns 用户选择 true/false
 */
export function confirm(message: string, defaultValue?: boolean): Promise<boolean> {
  ensureTty();
  const hint = defaultValue !== undefined ? (defaultValue ? 'Y/n' : 'y/N') : 'y/n';
  const prompt = `${message} (${hint}) `;

  return new Promise<boolean>((resolve) => {
    const rl = createInterface();
    rl.question(prompt, (answer: string) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === '') {
        resolve(defaultValue ?? false);
      } else {
        resolve(trimmed === 'y' || trimmed === 'yes');
      }
    });
  });
}

/**
 * 输入提示
 * @param message 提示消息
 * @param defaultValue 默认值
 * @param validator 校验函数（可选）
 * @returns 用户输入的字符串
 */
export function input(
  message: string,
  defaultValue?: string,
  validator?: Validator,
): Promise<string> {
  ensureTty();
  const hint = defaultValue !== undefined ? ` (default: ${defaultValue})` : '';
  const prompt = `${message}${hint}: `;

  return new Promise<string>((resolve) => {
    const rl = createInterface();

    const ask = (): void => {
      rl.question(prompt, (answer: string) => {
        const trimmed = answer.trim();
        const value = trimmed === '' && defaultValue !== undefined ? defaultValue : trimmed;

        if (validator) {
          const error = validator(value);
          if (error) {
            console.log(`  Error: ${error}`);
            ask();
            return;
          }
        }

        rl.close();
        resolve(value);
      });
    };

    ask();
  });
}

/**
 * 单选提示
 * @param message 提示消息
 * @param choices 选项列表
 * @param defaultValue 默认选中的 value
 * @returns 用户选择的 value
 */
export function select(
  message: string,
  choices: SelectChoice[],
  defaultValue?: string,
): Promise<string> {
  ensureTty();

  console.log(message);
  choices.forEach((choice: SelectChoice, index: number) => {
    const marker = defaultValue === choice.value ? '*' : ' ';
    console.log(`  ${marker} ${index + 1}. ${choice.name}`);
  });

  const hint = defaultValue !== undefined ? ` (default: ${defaultValue})` : '';

  return new Promise<string>((resolve) => {
    const rl = createInterface();

    const ask = (): void => {
      rl.question(`Select option (1-${choices.length})${hint}: `, (answer: string) => {
        const trimmed = answer.trim();

        if (trimmed === '' && defaultValue !== undefined) {
          rl.close();
          resolve(defaultValue);
          return;
        }

        const index = parseInt(trimmed, 10) - 1;
        if (Number.isNaN(index) || index < 0 || index >= choices.length) {
          console.log('  Invalid selection. Please try again.');
          ask();
          return;
        }

        rl.close();
        resolve(choices[index].value);
      });
    };

    ask();
  });
}

/**
 * 多选提示
 * @param message 提示消息
 * @param choices 选项列表（checked=true 的项默认选中）
 * @returns 用户选择的 value 数组
 */
export function multiSelect(message: string, choices: MultiSelectChoice[]): Promise<string[]> {
  ensureTty();

  console.log(message);
  choices.forEach((choice: MultiSelectChoice, index: number) => {
    const marker = choice.checked ? '[x]' : '[ ]';
    console.log(`  ${marker} ${index + 1}. ${choice.name}`);
  });
  console.log('  Enter comma-separated numbers (e.g., 1,3,5). Empty for defaults.');

  return new Promise<string[]>((resolve) => {
    const rl = createInterface();

    const ask = (): void => {
      rl.question('Select options: ', (answer: string) => {
        const trimmed = answer.trim();

        if (trimmed === '') {
          const defaults = choices
            .filter((c: MultiSelectChoice) => c.checked)
            .map((c: MultiSelectChoice) => c.value);
          rl.close();
          resolve(defaults);
          return;
        }

        const indices = trimmed.split(',').map((s: string) => parseInt(s.trim(), 10) - 1);

        const invalid = indices.some(
          (i: number) => Number.isNaN(i) || i < 0 || i >= choices.length,
        );

        if (invalid) {
          console.log('  Invalid selection. Please try again.');
          ask();
          return;
        }

        rl.close();
        resolve(indices.map((i: number) => choices[i].value));
      });
    };

    ask();
  });
}

/**
 * 密码输入（不回显字符，用 * 代替）
 * @param message 提示消息
 * @returns 用户输入的密码
 */
export function password(message: string): Promise<string> {
  ensureTty();

  process.stdout.write(`${message}: `);

  return new Promise<string>((resolve) => {
    const stdin = process.stdin as tty.ReadStream;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf-8');

    let pw = '';

    const onData = (char: string): void => {
      // Enter / Return
      if (char === '\r' || char === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(pw);
        return;
      }

      // Ctrl+C
      if (char === '\u0003') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        process.exit(1);
      }

      // Backspace / Delete
      if (char === '\u007f' || char === '\b') {
        if (pw.length > 0) {
          pw = pw.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }

      // Normal character
      pw += char;
      process.stdout.write('*');
    };

    stdin.on('data', onData);
  });
}

/** 交互式提示工具集 */
export const InteractivePrompts = {
  confirm,
  input,
  select,
  multiSelect,
  password,
};
