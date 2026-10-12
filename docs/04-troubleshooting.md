# 04 · 常见问题排查

本文件汇总在新机器上首次搭建 smart-site-o 时实际遇到的问题与解决办法。多数已在仓库配置中预设修复，仅当在新环境复现时参考。

---

## 1. `pnpm` 命令直接失败：EPERM 写入 `node_global\.tools`

**现象**：执行任何 `pnpm` 命令报 `EPERM: operation not permitted`，尝试在 `E:\develop\node\node\node_global\.tools` 下创建目录失败。

**原因**：项目 `package.json` 用 `packageManager` 锁定了 pnpm 版本，pnpm 的「自管理版本切换」会尝试下载并安装该版本到全局 `.tools` 目录，而该目录受保护无法写入。

**解决**（已写入仓库，**勿删除**）：在两个子工作区的 `.npmrc` 中关闭自管理版本：

```ini
# ss-editor/.npmrc 与 ss-services/ss-node/.npmrc
manage-package-manager-versions=false
```

之后直接使用全局已安装的 pnpm 即可。如仍报错，可改用 `corepack disable` 或确认 `pnpm` 在 PATH 中。

---

## 2. `pnpm -r build` 报 `TS2307: Cannot find module '@ss-node/ss-device'` 等

**现象**：构建到 `ss-project` 包时，提示找不到 `@ss-node/ss-alarm` / `ss-device` 等模块类型。

**原因（两点叠加）**：
1. 部分包的 `dist` 产物残缺（例如缺少 `dist/index.d.ts`），是之前半途构建留下的。
2. 包间存在**循环依赖**（`ss-alarm ↔ ss-project`、`ss-device ↔ ss-system`）。`pnpm -r build` 在循环图上拓扑排序不可靠，可能让 `ss-project` 先于其依赖包构建，导致解析失败。

**解决**：
- 先手动按依赖顺序构建关键包，确保它们的 `dist/index.*` 完整生成：
  ```bat
  pnpm --filter @ss-node/ss-system build
  pnpm --filter @ss-node/ss-device build
  pnpm --filter @ss-node/ss-alarm build
  pnpm --filter @ss-node/ss-project build
  ```
- 再跑全量构建：
  ```bat
  pnpm -r build
  ```
- 若后续仍报某模块找不到，先确认对应包的 `dist/index.d.ts` 存在（`pnpm --filter <pkg> build` 重建它）。

---

## 3. `TS2307: Cannot find module 'uuid'` 或 `uuid` 类型缺失

**现象**：`ss-project` 编译报找不到 `uuid` 模块/类型。

**原因**：本机 pnpm store 中 `uuid` 包（多个版本）的 `dist/*.d.ts` 缺失（运行时 `index.js` 仍在），是 store 抽包不完整导致的系统性问题。

**解决（推荐）**：避免外部 `uuid` 依赖，改用 Node 内置 crypto：
```ts
import { randomUUID as uuidv4 } from 'node:crypto';
```
本仓库 `widget-template.service.ts` 已采用此写法。如确有需要添加 `uuid`，请确认其 `.d.ts` 在 store 中完整，否则用上面的内置替代。

---

## 4. 前端 Vite：`Failed to resolve import "@/..."` 来自编辑器源码

**现象**：启动前端时，Vite 在处理 `packages/editor/...` 某个文件时报无法解析 `@/canvas-page/...`，且报错路径带 `../../packages/editor/...` 前缀（说明是在 `apps/web` 上下文中编译）。

**原因**：编辑器库包的 `@/` 别名指向 `packages/editor/src`，但宿主应用 `apps/web` 的 Vite 别名 `@` 指向 `apps/web/src`，两者冲突。

**解决**：在编辑器库包内部引用同包文件时改用**相对路径**或 `@scada-editor/*` 工作区别名，不要用 `@/...`。本仓库 `graphic-editing/layer/SidePanel.vue` 已改为：
```ts
import WidgetTemplatePanel from '../../canvas-page/templates/WidgetTemplatePanel.vue';
```

---

## 5. 登录返回 401 / 系统提示未初始化

**现象**：首次启动后端后，前端登录 `test/test` 得到 401，或后端返回 `setup/status` 为 `initialized:false`。

**原因**：新克隆仓库数据库为空，尚未创建管理员账号（这是正常状态，不是故障）。

**解决**：浏览器打开前端后按引导进入**初始化向导**，或调用：
```bash
curl -X POST http://localhost:4000/api/v1/setup/step1 \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123","email":"admin@smartsite.local"}'
```
随后完成 Step 2/3/4 即可登录。

---

## 6. 原生模块编译失败（sqlite3 / serialport 等）

**现象**：`pnpm install` 阶段原生模块编译报错（`node-gyp` 相关）。

**解决**：安装 Windows 构建工具链：
- **Visual Studio Build Tools**（勾选「使用 C++ 的桌面开发」）
- **Python 3.x**（加入 PATH）

重跑 `pnpm install`。

---

## 7. 端口被占用（4000 / 5173 / 5174 / 5175）

**现象**：后端/前端启动报 `EADDRINUSE`。

**排查**：
```bat
netstat -ano | findstr ":4000 :5173 :5174 :5175" | findstr LISTENING
```
确认没有遗留的旧 `start-backend.bat` / `start-frontend.bat` 进程（注意一个脚本会启动一个 `cmd` 父进程 + `node` 子进程，需整棵树结束）。

---

## 8. 健康检查与日志

- 后端健康：`GET http://localhost:4000/api/v1/health`（`{"code":200,"data":{"status":"ok"}}`）。
- 初始化状态：`GET http://localhost:4000/api/v1/setup/status`。
- 后端日志：启动脚本默认把输出重定向到 `bin/_backend.log`；前端日志 `bin/_frontend.log`。
- 应用启动分阶段日志以 `[STARTUP] Phase A/B/C/D` 前缀，便于定位卡点。
