// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IPluginManifest } from '../types/IPluginManifest';
import { PluginTestHarness } from './PluginTestHarness';
import { SchemaValidator } from '../utils/SchemaValidator';
import { SchemaMigrationEngine } from '../utils/SchemaMigrationEngine';

export interface TestCollectorResult {
  pluginType: string;
  passed: number;
  failed: number;
  errors: string[];
}

export class TestCollector {
  static runForPlugin(manifest: IPluginManifest): TestCollectorResult {
    const def = manifest.__test__;
    const result: TestCollectorResult = {
      pluginType: manifest.type,
      passed: 0,
      failed: 0,
      errors: [],
    };

    if (!def) return result;

    try {
      if (manifest.schema) {
        const v = SchemaValidator.validateDefaults(manifest.schema);
        if (v.valid) {
          result.passed++;
        } else {
          result.failed++;
          result.errors.push(...v.errors.map((e) => `Schema默认值: ${e.message}`));
        }
      }

      if (def.migrationTests && manifest.migrations) {
        for (const mTest of def.migrationTests) {
          try {
            const r = SchemaMigrationEngine.migrate(
              { type: manifest.type, schemaVersion: mTest.fromVersion, props: mTest.inputProps },
              manifest.migrations,
              manifest.schemaVersion,
            );
            const match = JSON.stringify(r.props) === JSON.stringify(mTest.assertProps);
            if (match) result.passed++;
            else {
              result.failed++;
              result.errors.push(`迁移 v${mTest.fromVersion}: 输出不匹配`);
            }
          } catch (e: any) {
            result.failed++;
            result.errors.push(`迁移 v${mTest.fromVersion}: ${e.message}`);
          }
        }
      }

      if (manifest.schema && def.defaultProps) {
        const v = SchemaValidator.validate(manifest.schema, def.defaultProps);
        if (v.valid) result.passed++;
        else {
          result.failed++;
          result.errors.push(...v.errors.map((e) => `属性合法性: ${e.message}`));
        }
      }

      if (manifest.renderBackend === 'canvas2d' && def.propCombinations) {
        for (const combo of def.propCombinations) {
          try {
            const harness = new PluginTestHarness(manifest.graphic as any, combo);
            harness.render();
            result.passed++;
          } catch (e: any) {
            result.failed++;
            result.errors.push(`渲染组合 ${JSON.stringify(combo)}: ${e.message}`);
          }
        }
      }
    } catch (e: any) {
      result.failed++;
      result.errors.push(`测试异常: ${e.message}`);
    }

    return result;
  }

  static runAll(manifests: IPluginManifest[]): TestCollectorResult[] {
    return manifests.map((m) => this.runForPlugin(m));
  }

  static summary(results: TestCollectorResult[]): string {
    const totalPassed = results.reduce((s, r) => s + r.passed, 0);
    const totalFailed = results.reduce((s, r) => s + r.failed, 0);
    const total = totalPassed + totalFailed;

    const lines: string[] = [
      `\n========== Plugin Test Summary ==========`,
      `Total: ${total} | Passed: ${totalPassed} | Failed: ${totalFailed}`,
      `Coverage: ${total > 0 ? ((totalPassed / total) * 100).toFixed(1) : '0'}%`,
      `-------------------------------------------`,
    ];

    for (const r of results) {
      const status = r.failed === 0 ? '✅' : '❌';
      lines.push(`${status} ${r.pluginType}: ${r.passed}/${r.passed + r.failed} passed`);
      for (const err of r.errors) {
        lines.push(`   └ ${err}`);
      }
    }

    lines.push(`===========================================\n`);
    return lines.join('\n');
  }
}