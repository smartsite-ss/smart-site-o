#!/usr/bin/env node
// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 采集插件脚手架 CLI
 *
 * 用法：
 *   pnpm create @ss-node/collector-plugin my-bacnet
 *   node bin/create-plugin.ts --name bacnet --display "BACnet/IP" --category building --transport tcp --author "SS-Team"
 *   npx ts-node bin/create-plugin.ts --name bacnet
 */

import { scaffoldPlugin } from '../src/scaffold';

function parseArgs(): {
  name: string;
  displayName: string;
  category: string;
  transport: string;
  author: string;
  outputDir?: string;
} {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {
    name: '',
    displayName: '',
    category: 'custom',
    transport: 'other',
    author: 'SS-Team',
  };

  // 位置参数：第一个非 -- 参数作为 name
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--name' || arg === '-n') {
      result.name = args[++i] || '';
    } else if (arg === '--display' || arg === '-d') {
      result.displayName = args[++i] || '';
    } else if (arg === '--category' || arg === '-c') {
      result.category = args[++i] || 'custom';
    } else if (arg === '--transport' || arg === '-t') {
      result.transport = args[++i] || 'other';
    } else if (arg === '--author' || arg === '-a') {
      result.author = args[++i] || 'SS-Team';
    } else if (arg === '--output' || arg === '-o') {
      result.outputDir = args[++i] || '';
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith('--') && !arg.startsWith('-') && !result.name) {
      result.name = arg;
    }
  }

  if (!result.name) {
    showHelp();
    process.exit(1);
  }

  return {
    name: result.name,
    displayName: result.displayName || result.name,
    category: result.category,
    transport: result.transport,
    author: result.author,
    outputDir: result.outputDir || undefined,
  };
}

function showHelp(): void {
  console.log(`
Usage: create-plugin [options] <plugin-name>

Options:
  --name, -n       插件名称（如 "bacnet"）
  --display, -d    显示名称（如 "BACnet/IP"）
  --category, -c   协议分类（industrial_bus | iot | power | building | custom）
  --transport, -t  传输层类型（tcp | serial | ws | tls | other）
  --author, -a     作者名称
  --output, -o     输出目录（默认为 packages/ss-collector/）
  --help, -h       显示帮助信息

Examples:
  pnpm create @ss-node/collector-plugin my-bacnet
  node bin/create-plugin.ts --name bacnet --display "BACnet/IP" --category building --transport tcp
  npx ts-node bin/create-plugin.ts bacnet -d "BACnet/IP" -c building -t tcp -a "SS-Team"
`);
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log('');
  console.log('  🚀 Smart SCADA Collector Plugin Scaffold');
  console.log('  =========================================');
  console.log('');
  console.log(`  Plugin name:     ${options.name}`);
  console.log(`  Display name:    ${options.displayName}`);
  console.log(`  Category:        ${options.category}`);
  console.log(`  Transport:       ${options.transport}`);
  console.log(`  Author:          ${options.author}`);
  console.log('');

  try {
    const result = scaffoldPlugin(options);

    console.log(`  ✅ Plugin scaffold created successfully!`);
    console.log('');
    console.log(`  Directory: ${result.outputPath}`);
    console.log(`  Package:   ${result.packageName}`);
    console.log('');
    console.log(`  Generated files (${result.files.length}):`);
    for (const file of result.files) {
      console.log(`    - ${file}`);
    }
    console.log('');
    console.log('  Next steps:');
    console.log(`    1. cd ${result.outputPath}`);
    console.log('    2. pnpm install');
    console.log(`    3. Implement the TODO items in src/${options.name}.service.ts`);
    console.log('    4. pnpm run build');
    console.log('    5. pnpm test');
    console.log('');
  } catch (error) {
    console.error(`  ❌ Failed to create plugin: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
