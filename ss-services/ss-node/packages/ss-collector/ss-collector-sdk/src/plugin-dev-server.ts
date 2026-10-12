// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IProtocolAdapter } from './types';

/**
 * 插件开发服务器 — 提供独立调试环境
 *
 * 支持：
 *  - 手动连接/断开设备
 *  - 单次读写标签
 *  - 连续采集压力测试
 *  - 连接状态查询
 *
 * 使用方式：
 *   const devServer = new PluginDevServer(new MyService(), 5101);
 *   devServer.start();
 *   // 访问 http://localhost:5101/debug
 */
export class PluginDevServer {
  private app: any;
  private service: IProtocolAdapter;
  private activeClients = new Map<string, any>();
  private port: number;

  constructor(service: IProtocolAdapter, port: number = 5101) {
    this.service = service;
    this.port = port;
  }

  /** 启动开发服务器 */
  async start(): Promise<void> {
    const express = await this.loadExpress();
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
    this.app.listen(this.port, () => {
      console.log(`[DevServer] 插件开发服务器已启动 → http://localhost:${this.port}`);
      console.log(
        `[DevServer] 调试端点: POST /debug/connect | /debug/read | /debug/write | /debug/disconnect`,
      );
      console.log(`[DevServer] 压力测试: POST /debug/stress-test`);
    });
  }

  /** 停止服务器 */
  stop(): void {
    this.activeClients.clear();
  }

  private setupRoutes(): void {
    const app = this.app;

    // 连接设备
    app.post('/debug/connect', async (req: any, res: any) => {
      try {
        const client = await this.service.connect(req.body);
        const deviceId = req.body.id || req.body.deviceId || 'debug-device';
        this.activeClients.set(deviceId, client);
        res.json({ status: 'connected', deviceId });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // 读取标签
    app.post('/debug/read', async (req: any, res: any) => {
      try {
        const { deviceId, tagConfig } = req.body;
        const client = this.activeClients.get(deviceId);
        if (!client) {
          return res.status(400).json({ error: 'Device not connected' });
        }
        const result = await this.service.readTag(client, tagConfig);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // 写入标签
    app.post('/debug/write', async (req: any, res: any) => {
      try {
        const { deviceId, tagConfig, value } = req.body;
        const client = this.activeClients.get(deviceId);
        if (!client) {
          return res.status(400).json({ error: 'Device not connected' });
        }
        await this.service.writeTag(client, tagConfig, value);
        res.json({ status: 'written' });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // 压力测试
    app.post('/debug/stress-test', async (req: any, res: any) => {
      try {
        const { deviceId, tagConfigs, duration, interval } = req.body;
        const client = this.activeClients.get(deviceId);
        if (!client) {
          return res.status(400).json({ error: 'Device not connected' });
        }

        const results: any[] = [];
        const startTime = Date.now();
        const endTime = startTime + (duration || 10000);
        let errorCount = 0;

        const run = async () => {
          while (Date.now() < endTime) {
            for (const tc of tagConfigs) {
              try {
                const t0 = Date.now();
                const result = await this.service.readTag(client, tc);
                results.push({
                  tagId: tc.tagId || tc.id,
                  value: result.value,
                  elapsed: Date.now() - t0,
                  quality: (result as any).quality || 'good',
                });
              } catch (e) {
                errorCount++;
                results.push({
                  tagId: tc.tagId || tc.id,
                  error: String(e),
                  elapsed: 0,
                });
              }
            }
            await new Promise((r) => setTimeout(r, interval || 100));
          }
        };

        await run();
        const totalElapsed = Date.now() - startTime;
        const successCount = results.length - errorCount;

        res.json({
          totalRequests: results.length,
          successCount,
          errorCount,
          duration: totalElapsed,
          avgLatency:
            results.length > 0
              ? results.reduce((s: number, r: any) => s + r.elapsed, 0) / results.length
              : 0,
          throughput: results.length / (totalElapsed / 1000),
          results: results.slice(0, 100), // 只返回前 100 条
        });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // 断开连接
    app.post('/debug/disconnect', async (req: any, res: any) => {
      try {
        const { deviceId } = req.body;
        const client = this.activeClients.get(deviceId);
        if (client) {
          await this.service.disconnect(client);
          this.activeClients.delete(deviceId);
        }
        res.json({ status: 'disconnected' });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // 状态查询
    app.get('/debug/status', (_req: any, res: any) => {
      res.json({
        activeConnections: this.activeClients.size,
        deviceIds: Array.from(this.activeClients.keys()),
      });
    });
  }

  private async loadExpress(): Promise<any> {
    try {
      return require('express');
    } catch {
      throw new Error(
        'express is required for PluginDevServer. Install it: pnpm add express @types/express',
      );
    }
  }
}
