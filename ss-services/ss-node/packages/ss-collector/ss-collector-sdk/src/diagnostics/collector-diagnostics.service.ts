// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional } from '@nestjs/common';
import { PluginRegistry } from '../plugins/plugin-registry';

export interface DiagnosisResult {
  checkName: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  suggestion?: string;
  details?: Record<string, any>;
}

export interface DiagnosisReport {
  timestamp: Date;
  deviceId?: string;
  results: DiagnosisResult[];
  summary: { ok: number; warning: number; error: number };
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
}

@Injectable()
export class CollectorDiagnosticsService {
  private readonly logger = new Logger(CollectorDiagnosticsService.name);

  constructor(@Optional() private readonly pluginRegistry?: PluginRegistry) {}

  /**
   * 检查设备连通性 — 通过插件注册表判断协议是否支持
   */
  async checkDeviceConnectivity(deviceId: string): Promise<DiagnosisResult> {
    this.logger.log(`Running device connectivity check for: ${deviceId}`);

    if (!this.pluginRegistry) {
      return {
        checkName: '设备连通性检查',
        status: 'warning',
        message: 'PluginRegistry 不可用，无法检查设备连通性',
        suggestion: '请确认 PluginModule 已正确导入',
        details: { deviceId },
      };
    }

    const protocols = this.pluginRegistry.getSupportedProtocols();
    if (protocols.length === 0) {
      return {
        checkName: '设备连通性检查',
        status: 'warning',
        message: `设备 ${deviceId} 无可用协议插件`,
        suggestion: '请安装并注册采集插件',
        details: { deviceId, supportedProtocols: protocols },
      };
    }

    return {
      checkName: '设备连通性检查',
      status: 'ok',
      message: `设备 ${deviceId} 协议插件就绪，支持的协议: ${protocols.join(', ')}`,
      details: { deviceId, supportedProtocols: protocols },
    };
  }

  /**
   * 检查标签可读性 — 标签是否可读
   */
  async checkTagReadability(tagId: string): Promise<DiagnosisResult> {
    this.logger.log(`Running tag readability check for: ${tagId}`);

    if (!this.pluginRegistry) {
      return {
        checkName: '标签可读性检查',
        status: 'warning',
        message: 'PluginRegistry 不可用，无法检查标签可读性',
        suggestion: '请确认 PluginModule 已正确导入',
        details: { tagId },
      };
    }

    const activePlugins = this.pluginRegistry.listPlugins({ status: 'active' });

    if (activePlugins.length === 0) {
      return {
        checkName: '标签可读性检查',
        status: 'error',
        message: `标签 ${tagId} 不可读：没有激活的采集插件`,
        suggestion: '请先激活至少一个采集插件，然后检查标签配置是否匹配已激活的协议',
        details: { tagId, activePlugins: 0 },
      };
    }

    return {
      checkName: '标签可读性检查',
      status: 'ok',
      message: `标签 ${tagId} 可读，当前有 ${activePlugins.length} 个活跃插件`,
      suggestion: '如数据仍异常，请检查标签地址配置和数据类型是否与设备一致',
      details: {
        tagId,
        activePlugins: activePlugins.length,
        protocols: activePlugins.map((p) => p.meta.protocol),
      },
    };
  }

  /**
   * 检查数据质量 — 检查数据质量指标（错误率、响应时间等）
   */
  async checkDataQuality(deviceId: string): Promise<DiagnosisResult[]> {
    this.logger.log(`Running data quality check for: ${deviceId}`);
    const results: DiagnosisResult[] = [];

    if (!this.pluginRegistry) {
      results.push({
        checkName: '数据质量检查',
        status: 'warning',
        message: 'PluginRegistry 不可用，无法检查数据质量',
        suggestion: '请确认 PluginModule 已正确导入',
        details: { deviceId },
      });
      return results;
    }

    const allPlugins = this.pluginRegistry.listPlugins();

    if (allPlugins.length === 0) {
      results.push({
        checkName: '数据质量检查',
        status: 'warning',
        message: '没有注册的采集插件，无法评估数据质量',
        suggestion: '请先注册并激活采集插件',
        details: { deviceId },
      });
      return results;
    }

    for (const plugin of allPlugins) {
      const { metrics, meta } = plugin;

      // 检查错误率
      if (metrics.totalReads > 0) {
        const errorRate = metrics.totalErrors / metrics.totalReads;
        if (errorRate > 0.1) {
          results.push({
            checkName: `数据质量-${meta.protocol}错误率`,
            status: 'error',
            message: `协议 ${meta.protocol} 错误率过高：${(errorRate * 100).toFixed(1)}%（${metrics.totalErrors}/${metrics.totalReads}）`,
            suggestion: '请检查插件配置是否正确，考虑降低扫描频率或检查设备接线',
            details: {
              deviceId,
              protocol: meta.protocol,
              errorRate,
              totalReads: metrics.totalReads,
              totalErrors: metrics.totalErrors,
            },
          });
        } else if (errorRate > 0.05) {
          results.push({
            checkName: `数据质量-${meta.protocol}错误率`,
            status: 'warning',
            message: `协议 ${meta.protocol} 错误率偏高：${(errorRate * 100).toFixed(1)}%（${metrics.totalErrors}/${metrics.totalReads}）`,
            suggestion: '建议关注错误趋势，必要时检查设备通信质量',
            details: {
              deviceId,
              protocol: meta.protocol,
              errorRate,
              totalReads: metrics.totalReads,
              totalErrors: metrics.totalErrors,
            },
          });
        }
      }

      // 检查响应时间
      if (metrics.avgResponseTime > 5000) {
        results.push({
          checkName: `数据质量-${meta.protocol}响应延迟`,
          status: 'warning',
          message: `协议 ${meta.protocol} 平均响应时间过高：${metrics.avgResponseTime}ms`,
          suggestion: '建议减小批量读取大小或增加超时时间，检查网络带宽是否充足',
          details: {
            deviceId,
            protocol: meta.protocol,
            avgResponseTime: metrics.avgResponseTime,
          },
        });
      }

      // 检查数据新鲜度
      if (metrics.lastActivity) {
        const staleThreshold = 5 * 60 * 1000; // 5分钟
        const timeSinceLastActivity = Date.now() - metrics.lastActivity.getTime();
        if (timeSinceLastActivity > staleThreshold) {
          results.push({
            checkName: `数据质量-${meta.protocol}数据新鲜度`,
            status: 'warning',
            message: `协议 ${meta.protocol} 数据已过期：最后活跃时间 ${Math.floor(timeSinceLastActivity / 60000)} 分钟前`,
            suggestion: '设备可能已停止发送数据，请检查设备连接状态和采集调度是否正常',
            details: {
              deviceId,
              protocol: meta.protocol,
              lastActivity: metrics.lastActivity,
              staleMinutes: Math.floor(timeSinceLastActivity / 60000),
            },
          });
        }
      }

      // 检查活跃连接数
      if (plugin.status === 'active' && metrics.activeConnections === 0) {
        results.push({
          checkName: `数据质量-${meta.protocol}连接状态`,
          status: 'warning',
          message: `协议 ${meta.protocol} 已激活但无活跃连接`,
          suggestion: '请检查设备是否在线，或连接配置是否正确',
          details: {
            deviceId,
            protocol: meta.protocol,
            activeConnections: metrics.activeConnections,
            totalConnections: metrics.totalConnections,
          },
        });
      }
    }

    if (results.length === 0) {
      results.push({
        checkName: '数据质量检查',
        status: 'ok',
        message: `设备 ${deviceId} 数据质量正常`,
        details: {
          deviceId,
          pluginsChecked: allPlugins.length,
        },
      });
    }

    return results;
  }

  /**
   * 检查插件健康状态
   */
  async checkPluginHealth(protocol: string): Promise<DiagnosisResult> {
    this.logger.log(`Running plugin health check for: ${protocol}`);

    if (!this.pluginRegistry) {
      return {
        checkName: '插件健康检查',
        status: 'warning',
        message: 'PluginRegistry 不可用，无法检查插件健康状态',
        suggestion: '请确认 PluginModule 已正确导入',
        details: { protocol },
      };
    }

    const plugin = this.pluginRegistry.getPlugin(protocol);

    if (!plugin) {
      return {
        checkName: '插件健康检查',
        status: 'error',
        message: `协议 ${protocol} 的插件未注册`,
        suggestion: '请确认插件已安装并注册，或检查协议名称是否正确',
        details: {
          protocol,
          registered: false,
          supportedProtocols: this.pluginRegistry.getSupportedProtocols(),
        },
      };
    }

    if (plugin.status === 'error') {
      return {
        checkName: '插件健康检查',
        status: 'error',
        message: `插件 ${protocol} 处于错误状态：${plugin.errorMessage || '未知错误'}`,
        suggestion: '请检查插件日志排查错误原因，必要时重新加载插件',
        details: {
          protocol,
          status: plugin.status,
          errorMessage: plugin.errorMessage,
          registeredAt: plugin.registeredAt,
        },
      };
    }

    if (plugin.status === 'inactive') {
      return {
        checkName: '插件健康检查',
        status: 'warning',
        message: `插件 ${protocol} 未激活`,
        suggestion: '请激活该插件以开始采集数据',
        details: {
          protocol,
          status: plugin.status,
          displayName: plugin.meta.displayName,
          registeredAt: plugin.registeredAt,
        },
      };
    }

    if (plugin.status === 'active') {
      return {
        checkName: '插件健康检查',
        status: 'ok',
        message: `插件 ${protocol}（${plugin.meta.displayName}）运行正常`,
        details: {
          protocol,
          status: plugin.status,
          displayName: plugin.meta.displayName,
          version: plugin.meta.version,
          metrics: plugin.metrics,
          registeredAt: plugin.registeredAt,
          activatedAt: plugin.activatedAt,
        },
      };
    }

    return {
      checkName: '插件健康检查',
      status: 'warning',
      message: `插件 ${protocol} 状态为 ${plugin.status}`,
      suggestion: '建议激活该插件',
      details: {
        protocol,
        status: plugin.status,
        displayName: plugin.meta.displayName,
      },
    };
  }

  /**
   * 运行全量诊断
   */
  async runFullDiagnosis(deviceId?: string): Promise<DiagnosisReport> {
    this.logger.log(`Running full diagnosis${deviceId ? ` for device: ${deviceId}` : ''}`);
    const results: DiagnosisResult[] = [];

    // 插件健康检查
    if (this.pluginRegistry) {
      const _allPlugins = this.pluginRegistry.listPlugins();
      const supportedProtocols = this.pluginRegistry.getSupportedProtocols();

      if (supportedProtocols.length === 0) {
        results.push({
          checkName: '系统诊断-插件',
          status: 'error',
          message: '没有注册任何采集插件',
          suggestion: '请安装并注册至少一个采集插件',
          details: {},
        });
      } else {
        for (const protocol of supportedProtocols) {
          results.push(await this.checkPluginHealth(protocol));
        }
      }
    } else {
      results.push({
        checkName: '系统诊断-插件',
        status: 'warning',
        message: 'PluginRegistry 不可用，跳过插件检查',
        suggestion: '请确认 PluginModule 已正确导入',
        details: {},
      });
    }

    // 设备连通性检查
    if (deviceId) {
      results.push(await this.checkDeviceConnectivity(deviceId));
    }

    // 数据质量检查
    if (deviceId) {
      const qualityResults = await this.checkDataQuality(deviceId);
      results.push(...qualityResults);
    } else if (this.pluginRegistry) {
      // 没有指定设备时，检查所有插件的整体数据质量
      const allPlugins = this.pluginRegistry.listPlugins();
      for (const plugin of allPlugins) {
        const { metrics, meta } = plugin;

        if (metrics.totalReads > 0) {
          const errorRate = metrics.totalErrors / metrics.totalReads;
          if (errorRate > 0.1) {
            results.push({
              checkName: `数据质量-${meta.protocol}错误率`,
              status: 'error',
              message: `协议 ${meta.protocol} 错误率过高：${(errorRate * 100).toFixed(1)}%`,
              suggestion: '请检查插件配置，考虑降低扫描频率或检查设备接线',
              details: { protocol: meta.protocol, errorRate },
            });
          }
        }

        if (metrics.avgResponseTime > 5000) {
          results.push({
            checkName: `数据质量-${meta.protocol}响应延迟`,
            status: 'warning',
            message: `协议 ${meta.protocol} 平均响应时间过高：${metrics.avgResponseTime}ms`,
            suggestion: '建议减小批量读取大小或增加超时时间',
            details: { protocol: meta.protocol, avgResponseTime: metrics.avgResponseTime },
          });
        }

        if (metrics.lastActivity) {
          const staleThreshold = 5 * 60 * 1000;
          const timeSinceLastActivity = Date.now() - metrics.lastActivity.getTime();
          if (timeSinceLastActivity > staleThreshold) {
            results.push({
              checkName: `数据质量-${meta.protocol}数据新鲜度`,
              status: 'warning',
              message: `协议 ${meta.protocol} 数据已过期：最后活跃时间 ${Math.floor(timeSinceLastActivity / 60000)} 分钟前`,
              suggestion: '设备可能已停止发送数据，请检查连接状态',
              details: {
                protocol: meta.protocol,
                staleMinutes: Math.floor(timeSinceLastActivity / 60000),
              },
            });
          }
        }
      }
    }

    // 汇总统计
    const summary = {
      ok: results.filter((r) => r.status === 'ok').length,
      warning: results.filter((r) => r.status === 'warning').length,
      error: results.filter((r) => r.status === 'error').length,
    };

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.error > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.warning > 0) {
      overallStatus = 'degraded';
    }

    return {
      timestamp: new Date(),
      deviceId,
      results,
      summary,
      overallStatus,
    };
  }
}
