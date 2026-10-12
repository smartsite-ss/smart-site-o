// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { PluginManagerService } from './plugin-manager.service';

@Controller('plugins')
export class PluginController {
  constructor(private readonly pluginManager: PluginManagerService) {}

  // =======================================================================
  //  不带动态参数的路由（精确匹配，优先级最高）
  // =======================================================================

  /** 获取所有插件列表 */
  @Get()
  async listPlugins(@Query('status') status?: string, @Query('category') category?: string) {
    const data = await this.pluginManager.listPluginsWithRuntime({ status, category });
    return { code: 0, data, message: 'ok' };
  }

  /** 触发重新发现插件 */
  @Post('discover')
  async rediscover() {
    const plugins = await this.pluginManager.rediscover();
    return {
      code: 0,
      data: plugins,
      message: `Discovered ${plugins.length} plugins`,
    };
  }

  /** 健康检查 */
  @Get('health')
  async healthCheck() {
    const report = await this.pluginManager.healthCheck();
    return { code: 0, data: report, message: 'ok' };
  }

  // =======================================================================
  //  :protocol/xxx 二级子路径 → 必须在 @Get(':protocol') 之前注册
  // =======================================================================

  /** 激活插件 */
  @Post(':protocol/activate')
  async activatePlugin(@Param('protocol') protocol: string) {
    try {
      const plugin = await this.pluginManager.activate(protocol);
      return { code: 0, data: plugin, message: `Plugin ${protocol} activated` };
    } catch (error) {
      return { code: 404, message: (error as Error).message };
    }
  }

  /** 停用插件 */
  @Post(':protocol/deactivate')
  async deactivatePlugin(@Param('protocol') protocol: string) {
    try {
      const plugin = await this.pluginManager.deactivate(protocol);
      return { code: 0, data: plugin, message: `Plugin ${protocol} deactivated` };
    } catch (error) {
      return { code: 404, message: (error as Error).message };
    }
  }

  /** 获取插件运行状态 */
  @Get(':protocol/status')
  getPluginStatus(@Param('protocol') protocol: string) {
    try {
      const status = this.pluginManager.getPluginStatus(protocol);
      return { code: 0, data: status, message: 'ok' };
    } catch (error) {
      return { code: 404, message: (error as Error).message };
    }
  }

  /** 获取插件连接配置 Schema */
  @Get(':protocol/schema')
  getConnectionSchema(@Param('protocol') protocol: string) {
    const schema = this.pluginManager.getConnectionSchema(protocol);
    if (!schema) {
      return { code: 404, message: `Schema not found for: ${protocol}` };
    }
    return { code: 0, data: schema, message: 'ok' };
  }

  /** 检查更新 */
  @Get(':protocol/check-update')
  async checkUpdate(@Param('protocol') protocol: string) {
    const result = await this.pluginManager.checkUpdate(protocol);
    return { code: 0, data: result, message: 'ok' };
  }

  /** 热更新插件 */
  @Post(':protocol/update')
  async updatePlugin(@Param('protocol') protocol: string) {
    const result = await this.pluginManager.hotReload(protocol);
    return {
      code: result.success ? 0 : 500,
      data: result,
      message: result.success
        ? `Plugin ${protocol} updated to ${result.newVersion}`
        : `Update failed: ${result.error}`,
    };
  }

  /** 回滚版本 */
  @Post(':protocol/rollback')
  async rollbackPlugin(@Param('protocol') protocol: string) {
    const result = await this.pluginManager.rollback(protocol);
    return {
      code: result.success ? 0 : 500,
      data: result,
      message: result.success
        ? `Plugin ${protocol} rolled back to ${result.newVersion}`
        : `Rollback failed: ${result.error}`,
    };
  }

  /** 获取插件正在采集的活跃设备列表 */
  @Get(':protocol/active-devices')
  getActiveDevices(@Param('protocol') protocol: string) {
    const devices = this.pluginManager.getPluginActiveDevices(protocol);
    return {
      code: 0,
      data: {
        protocol,
        count: devices.length,
        devices,
      },
      message: 'ok',
    };
  }

  /** 校验通道配置 */
  @Post(':protocol/validate')
  async validateChannelConfig(
    @Param('protocol') protocol: string,
    @Body() config: Record<string, any>,
  ) {
    try {
      const result = await this.pluginManager.validateChannelConfig(protocol, config);
      return {
        code: result.valid ? 0 : 400,
        data: result,
        message: result.valid ? 'ok' : '通道配置校验失败',
      };
    } catch (error) {
      return {
        code: 404,
        message: `Plugin not found or validation error: ${(error as Error).message}`,
      };
    }
  }

  /** 获取插件运行监控数据（内存/CPU + 采集日志） */
  @Get(':protocol/monitor')
  async getMonitor(@Param('protocol') protocol: string) {
    const data = await this.pluginManager.getMonitorData(protocol);
    return { code: 0, data, message: 'ok' };
  }

  /** 清空插件采集日志 */
  @Delete(':protocol/monitor/logs')
  clearMonitorLogs(@Param('protocol') protocol: string) {
    const result = this.pluginManager.clearPluginLogs(protocol);
    return {
      code: result.cleared ? 0 : 500,
      data: result,
      message: result.message,
    };
  }

  // -----------------------------------------------------------------------
  //  运行时配置持久化
  // -----------------------------------------------------------------------

  /** 获取插件运行时配置 */
  @Get(':protocol/config')
  getPluginConfig(@Param('protocol') protocol: string) {
    const config = this.pluginManager.getPluginConfig(protocol);
    return { code: 0, data: config, message: 'ok' };
  }

  /** 更新插件运行时配置（持久化到 JSON 文件，重启后保持） */
  @Put(':protocol/config')
  async updatePluginConfig(
    @Param('protocol') protocol: string,
    @Body() body: { isolationMode?: string },
  ) {
    const config = await this.pluginManager.updatePluginConfig(protocol, body);
    return { code: 0, data: config, message: 'ok' };
  }

  /** 重启插件（用于隔离模式等配置变更后重载 executor） */
  @Post(':protocol/restart')
  async restartPlugin(@Param('protocol') protocol: string) {
    const result = await this.pluginManager.restartPlugin(protocol);
    return {
      code: 0,
      data: result,
      message: `Plugin ${protocol} restarted in ${result.elapsed}ms`,
    };
  }

  // =======================================================================
  //  精确路径路由（必须在 @Get(':protocol') 通配之前注册）
  // =======================================================================

  /** 获取所有插件的设备统计（在线/离线数量） */
  @Get('device-stats')
  getAllDeviceStats() {
    const data = this.pluginManager.getAllDeviceStats();
    return { code: 0, data, message: 'ok' };
  }

  // =======================================================================
  //  @Get(':protocol') 通配 → 必须放在最后
  // =======================================================================

  /** 获取单个插件详情 */
  @Get(':protocol')
  getPlugin(@Param('protocol') protocol: string) {
    const plugin = this.pluginManager.getPlugin(protocol);
    if (!plugin) {
      return { code: 404, message: `Plugin not found: ${protocol}` };
    }
    return { code: 0, data: plugin, message: 'ok' };
  }
}
