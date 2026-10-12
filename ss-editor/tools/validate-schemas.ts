// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

interface SchemaValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

class SchemaValidator {
  private errors: SchemaValidationError[] = [];

  validate(schema: any, pluginName: string): SchemaValidationError[] {
    this.errors = [];

    this.validateBasicStructure(schema, pluginName);
    this.validateFieldUniqueness(schema);

    for (const field of (schema.fields || [])) {
      this.validateField(field);
    }

    return this.errors;
  }

  private validateBasicStructure(schema: any, name: string): void {
    if (!schema.name) {
      this.addError('(root)', `[${name}] schema 缺少 name 字段`, 'error');
    }
    if (!schema.fields || schema.fields.length === 0) {
      this.addError('(root)', `[${name}] schema 缺少 fields 数组`, 'error');
    }
    if (!schema.propsPath) {
      this.addError('(root)', `[${name}] schema 缺少 propsPath，将默认使用 'customProps'`, 'warning');
    }
  }

  private validateFieldUniqueness(schema: any): void {
    const names = new Set<string>();
    for (const field of (schema.fields || [])) {
      if (names.has(field.name)) {
        this.addError(field.name, '字段名重复', 'error');
      }
      names.add(field.name);
    }
  }

  private validateField(field: any): void {
    const name = field.name || '(unnamed)';

    if (!field.name) {
      this.addError(name, 'field 缺少 name 属性', 'error');
    }
    if (!field.label) {
      this.addError(name, 'field 缺少 label 属性', 'warning');
    }
    if (!field.type) {
      this.addError(name, 'field 缺少 type 属性', 'error');
      return;
    }

    switch (field.type) {
      case 'select':
        if (!field.options || field.options.length === 0) {
          this.addError(name, 'select 类型缺少 options', 'error');
        }
        break;
      case 'number':
      case 'range':
        if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
          this.addError(name, `min(${field.min}) > max(${field.max})`, 'error');
        }
        break;
      case 'color':
        if (field.defaultValue !== undefined && !isValidColor(String(field.defaultValue))) {
          this.addError(name, `defaultValue "${field.defaultValue}" 不是有效的 hex 颜色`, 'warning');
        }
        break;
    }

    if (field.defaultValue === undefined) {
      this.addError(name, 'field 缺少 defaultValue', 'warning');
    }

    if (field.type === 'number' && field.step === undefined) {
      this.addError(name, 'number 类型建议声明 step', 'warning');
    }
  }

  private addError(field: string, message: string, severity: 'error' | 'warning'): void {
    this.errors.push({ field, message, severity });
  }
}

function isValidColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color);
}

async function main() {
  const cwd = process.cwd();
  const schemaFiles = await glob('packages/plugins/**/*PropertySchema.ts', { cwd });

  console.log(`发现 ${schemaFiles.length} 个 schema 文件\n`);

  const validator = new SchemaValidator();
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of schemaFiles) {
    const fullPath = path.resolve(cwd, file);
    if (!fs.existsSync(fullPath)) {
      console.log(`  ⚠ ${file} — 文件不存在`);
      continue;
    }

    try {
      const mod = await import(pathToFileURL(fullPath).href + '?t=' + Date.now());
      const keys = Object.keys(mod);
      const schemaKey = keys.find(k => k.includes('Schema') || k.includes('schema')) || keys[0];
      const schema = mod[schemaKey];

      if (!schema || !schema.fields) {
        console.log(`  ⚠ ${file} — 未找到有效 schema 导出`);
        continue;
      }

      const match = file.match(/\/([^/]+)PropertySchema\.ts$/);
      const name = match ? match[1] : path.basename(file);

      const errors = validator.validate(schema, name);
      const errs = errors.filter(e => e.severity === 'error');
      const warns = errors.filter(e => e.severity === 'warning');
      totalErrors += errs.length;
      totalWarnings += warns.length;

      if (errors.length === 0) {
        console.log(`  ✅ ${file}`);
      } else {
        console.log(`  ❌ ${file}`);
        for (const e of errs) {
          console.log(`     [ERROR] [${e.field}] ${e.message}`);
        }
        for (const w of warns) {
          console.log(`     [WARN]  [${w.field}] ${w.message}`);
        }
      }
    } catch (err: any) {
      console.log(`  ❌ ${file} — 加载失败: ${err.message}`);
      totalErrors++;
    }
  }

  console.log(`\n结果: ${totalErrors} 个错误, ${totalWarnings} 个警告`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();