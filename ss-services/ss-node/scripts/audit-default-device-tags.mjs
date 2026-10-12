// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * T3 核查脚本：扫描存量 default-device / 孤儿标签
 *
 * 背景：旧版标签导入接口在未传 deviceId 时回退为 'default-device' 占位
 * （见 datatag.controller.ts 已修复的 `body.deviceId || 'default-device'`），
 * 导致标签 deviceId 与真实设备 UUID 失关联，按 deviceId 查询返回空。
 * 本脚本扫描所有项目级 system.db，报告：
 *   1. deviceId = 'default-device' 的标签（占位脏数据）
 *   2. deviceId 不在 dev_devices.id 中的标签（孤儿标签，设备可能已删但标签残留）
 *
 * 用法：
 *   cd ss-services/ss-node
 *   node scripts/audit-default-device-tags.mjs            # 只扫描报告（dry-run，默认）
 *   node scripts/audit-default-device-tags.mjs --fix       # 交互式修复（仍需人工确认每条）
 *
 * --fix 模式不会自动删除/修改，仅列出建议并提示人工指定目标设备 UUID；
 * 确认后才会执行 UPDATE。无 --fix 时全程只读。
 *
 * 运行前提：后端服务可运行可停止均可（只读连接 system.db）。
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// sqlite3 通过 pnpm 安装在 ss-core 中，需用绝对路径解析（与 migrate-to-unified-project-ids.mjs 同惯例）
let sqlite3;
try {
  const ssCoreRequire = createRequire(path.join(__dirname, '../packages/ss-core/package.json'));
  sqlite3 = ssCoreRequire('sqlite3');
} catch {
  try {
    const require = createRequire(import.meta.url);
    sqlite3 = require('sqlite3');
  } catch {
    console.error('[FATAL] 无法加载 sqlite3 模块。请确保 ss-core 已安装依赖（pnpm install）。');
    process.exit(1);
  }
}

const PROJECTS_DIR = path.resolve(__dirname, '../../../ss-run/ss/data/projects');
const isFixMode = process.argv.includes('--fix');

/**
 * 扫描单个项目库
 */
function auditProjectDb(projectId, dbPath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(dbPath)) {
      resolve({ projectId, skipped: 'db not found', dbPath });
      return;
    }
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (openErr) => {
      if (openErr) {
        resolve({ projectId, skipped: `open failed: ${openErr.message}`, dbPath });
        return;
      }
      // 先确认表存在
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('dev_data_tags', 'dev_devices')",
        (tblErr, row) => {
          if (tblErr || !row) {
            db.close();
            resolve({ projectId, skipped: 'tables not found (dev_data_tags/dev_devices)', dbPath });
            return;
          }
          // 1. 占位 default-device 标签
          db.all(
            "SELECT id, name, deviceId, projectId FROM dev_data_tags WHERE deviceId = 'default-device'",
            (err1, placeholderRows) => {
              if (err1) {
                db.close();
                resolve({ projectId, error: `query placeholder failed: ${err1.message}`, dbPath });
                return;
              }
              // 2. 孤儿标签：deviceId 不在 dev_devices.id 中（排除 default-device，已由 1 覆盖）
              db.all(
                `SELECT t.id, t.name, t.deviceId, t.projectId
                 FROM dev_data_tags t
                 LEFT JOIN dev_devices d ON d.id = t.deviceId
                 WHERE t.deviceId != 'default-device' AND d.id IS NULL`,
                (err2, orphanRows) => {
                  db.close();
                  if (err2) {
                    resolve({ projectId, error: `query orphans failed: ${err2.message}`, dbPath });
                    return;
                  }
                  resolve({
                    projectId,
                    dbPath,
                    placeholder: placeholderRows || [],
                    orphans: orphanRows || [],
                  });
                },
              );
            },
          );
        },
      );
    });
  });
}

/**
 * 交互式修复单条标签（--fix 模式）
 * 提示人工指定目标设备 UUID，确认后执行 UPDATE。
 */
function fixTag(dbPath, tag, kind) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const hint = kind === 'placeholder' ? '占位 default-device' : '孤儿（设备不存在）';
    readline.question(
      `\n[${hint}] 标签 id=${tag.id} name="${tag.name}" deviceId=${tag.deviceId}\n` +
        `  输入目标设备 UUID 修复，输入 d 删除该标签，输入 s 跳过：`,
      (answer) => {
        readline.close();
        const trimmed = (answer || '').trim();
        if (trimmed === '' || trimmed === 's') {
          resolve('skipped');
          return;
        }
        if (trimmed === 'd') {
          const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (openErr) => {
            if (openErr) { resolve(`delete failed: ${openErr.message}`); return; }
            db.run('DELETE FROM dev_data_tags WHERE id = ?', [tag.id], (delErr) => {
              db.close();
              resolve(delErr ? `delete failed: ${delErr.message}` : 'deleted');
            });
          });
          return;
        }
        // 视为设备 UUID，执行 UPDATE
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (openErr) => {
          if (openErr) { resolve(`update failed: ${openErr.message}`); return; }
          db.run('UPDATE dev_data_tags SET deviceId = ? WHERE id = ?', [trimmed, tag.id], (updErr) => {
            db.close();
            resolve(updErr ? `update failed: ${updErr.message}` : `updated deviceId=${trimmed}`);
          });
        });
      },
    );
  });
}

async function main() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error(`[FATAL] 项目数据目录不存在: ${PROJECTS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_trash') && !e.name.startsWith('.'));
  console.log(`[INFO] 发现 ${entries.length} 个项目目录，开始扫描...`);
  console.log(`[INFO] 模式: ${isFixMode ? 'FIX（交互式修复）' : 'DRY-RUN（只读报告）'}\n`);

  let totalPlaceholder = 0;
  let totalOrphan = 0;
  const reports = [];

  for (const dir of entries) {
    const projectId = dir.name;
    const dbPath = path.join(PROJECTS_DIR, projectId, 'db', 'system.db');
    const result = await auditProjectDb(projectId, dbPath);
    reports.push(result);

    if (result.skipped || result.error) {
      console.log(`[${projectId}] 跳过: ${result.skipped || result.error}`);
      continue;
    }
    const ph = result.placeholder.length;
    const orph = result.orphans.length;
    totalPlaceholder += ph;
    totalOrphan += orph;
    console.log(`[${projectId}] 占位 default-device: ${ph} 条 / 孤儿: ${orph} 条`);
    for (const t of result.placeholder) {
      console.log(`    [占位] id=${t.id} name="${t.name}" deviceId=${t.deviceId}`);
    }
    for (const t of result.orphans) {
      console.log(`    [孤儿] id=${t.id} name="${t.name}" deviceId=${t.deviceId}`);
    }

    // --fix 模式：逐条交互
    if (isFixMode) {
      for (const t of result.placeholder) {
        const r = await fixTag(dbPath, t, 'placeholder');
        console.log(`      -> ${r}`);
      }
      for (const t of result.orphans) {
        const r = await fixTag(dbPath, t, 'orphan');
        console.log(`      -> ${r}`);
      }
    }
  }

  console.log(`\n[汇总] 占位 default-device 标签: ${totalPlaceholder} 条`);
  console.log(`[汇总] 孤儿标签（deviceId 不在设备表）: ${totalOrphan} 条`);
  if (!isFixMode && (totalPlaceholder > 0 || totalOrphan > 0)) {
    console.log('[建议] 重新运行 `node scripts/audit-default-device-tags.mjs --fix` 交互式修复，或人工核查后批量 UPDATE。');
  }
  if (isFixMode) {
    console.log('[完成] 修复流程结束，可重新运行本脚本（不带 --fix）复核。');
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
