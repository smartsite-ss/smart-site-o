// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
// @ts-expect-error - plugin-sdk is a build-time dependency
import { ScaffoldGenerator, RenderBackend } from '@scada-editor/plugin-sdk';
// @ts-expect-error - plugin-sdk is a build-time dependency
import type { ScaffoldConfig } from '@scada-editor/plugin-sdk';

type BackendChoice = { value: RenderBackend; label: string; description: string };

function askQuestion(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer: string) => {
      resolve(answer.trim());
    });
  });
}

async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });



  const type = await askQuestion(rl, 'Plugin type (kebab-case, e.g. my-plugin): ');
  if (!type) {
    console.error('❌ Plugin type cannot be empty');
    process.exit(1);
  }

  const label = await askQuestion(rl, 'Plugin label (Chinese, e.g. 我的插件): ');
  const category = await askQuestion(rl, 'Plugin category (basic/industrial/chart/form/3d): ');

  const backends = ScaffoldGenerator.getBackendChoices();

  const backendAnswer = await askQuestion(rl, `Enter number (1-${backends.length}, default: 1): `);
  const backendIndex = parseInt(backendAnswer, 10) - 1;
  const renderBackend = backends[backendIndex >= 0 && backendIndex < backends.length ? backendIndex : 0].value;

  const config: ScaffoldConfig = {
    type,
    label: label || type,
    category: category || 'basic',
    renderBackend,
    fields: [],
  };

  const files = ScaffoldGenerator.generate(config);

  const outputDir = path.resolve(process.cwd(), type);
  if (fs.existsSync(outputDir)) {
    const overwrite = await askQuestion(rl, `\nDirectory "${type}" already exists, overwrite? (y/N): `);
    if (overwrite.toLowerCase() !== 'y') {
      process.exit(0);
    }
    fs.rmSync(outputDir, { recursive: true });
  }

  fs.mkdirSync(outputDir, { recursive: true });
  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(outputDir, filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content as string);
  }

  const _backendName = backends.find((b: BackendChoice) => b.value === renderBackend)?.label || '';

  rl.close();
}

main().catch((err: Error) => {
  console.error('❌', err.message);
  process.exit(1);
});