// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional } from '@nestjs/common';
import { PipelineContext, PipelineStep } from '../pipeline-orchestrator';
import { IDeviceContext, ITagContext } from '../../types';
import { PluginRegistry } from '../../plugins';

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffStrategy?: 'exponential' | 'linear' | 'fixed';
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 10000,
  backoffStrategy: 'exponential',
};

@Injectable()
export class RetryableProtocolRead implements PipelineStep {
  readonly name = 'RetryableProtocolRead';
  readonly order = 0;

  private readonly logger = new Logger(RetryableProtocolRead.name);

  constructor(
    private readonly pluginRegistry: PluginRegistry,
    @Optional() private readonly config: RetryConfig = {},
  ) {}

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...this.config };

    let lastError: Error | null = null;

    const deviceType = (ctx as any).deviceType;
    if (!deviceType || !this.pluginRegistry.isSupported(deviceType)) {
      ctx.rawValue = null;
      ctx.quality = 'bad';
      ctx.errors.push({
        step: 'RetryableProtocolRead',
        message: `No plugin for device type: ${deviceType}`,
      });
      return ctx;
    }

    const adapter = this.pluginRegistry.getAdapter(deviceType);
    const deviceCtx: IDeviceContext = {
      id: ctx.deviceId,
      name: (ctx as any).tagConfig?.deviceName || ctx.deviceId,
      protocol: deviceType,
      connection: (ctx as any).deviceConnection || {},
      projectId: ctx.projectId,
    };
    const tagCtx: ITagContext = (ctx as any).tagConfig || {
      id: ctx.tagId,
      name: ctx.tagId,
      address: '',
      dataType: 'float32',
    };

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        this.logger.debug(
          `Reading tag ${ctx.tagId} (attempt ${attempt}/${retryConfig.maxRetries})`,
        );

        // Internal connection cache for this step
        let client = (this as any)._clientCache?.get(ctx.deviceId);
        if (!client) {
          client = await adapter.connect(deviceCtx);
          if (!(this as any)._clientCache) (this as any)._clientCache = new Map();
          (this as any)._clientCache.set(ctx.deviceId, client);
        }

        const result = await adapter.readTag(client, tagCtx);

        ctx.rawValue = result.value ?? (result as any).rawValue;
        ctx.rawTimestamp = result.timestamp || new Date();
        ctx.quality = (result as any).quality || 'good';

        if ((result as any).error) {
          ctx.errors.push({ step: 'RetryableProtocolRead', message: (result as any).error });
        }

        if (attempt > 1) {
          this.logger.log(`Successfully read ${ctx.tagId} on attempt ${attempt}`);
        }

        return ctx;
      } catch (error) {
        lastError = error as Error;
        (this as any)._clientCache?.delete(ctx.deviceId);

        if (attempt < retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt, retryConfig);

          this.logger.warn(
            `Read failed for ${ctx.tagId}, retrying in ${delay}ms...` +
              ` (${(error as Error).message}) [${attempt}/${retryConfig.maxRetries}]`,
          );

          await this.sleep(delay);
        }
      }
    }

    this.logger.error(
      `Failed to read ${ctx.tagId} after ${retryConfig.maxRetries} attempts: ` +
        `${lastError?.message}`,
    );

    ctx.rawValue = null;
    ctx.quality = 'bad';
    ctx.errors.push({
      step: 'RetryableProtocolRead',
      message: `Read failed after ${retryConfig.maxRetries} retries: ${lastError?.message}`,
    });

    return ctx;
  }

  private calculateDelay(attempt: number, config: Required<RetryConfig>): number {
    switch (config.backoffStrategy) {
      case 'exponential':
        return Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay);

      case 'linear':
        return Math.min(config.baseDelay * attempt, config.maxDelay);

      case 'fixed':
      default:
        return config.baseDelay;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

@Injectable()
export class CircuitBreakerDecorator implements PipelineStep {
  readonly name = 'CircuitBreaker';
  readonly order = 0;

  private readonly logger = new Logger(CircuitBreakerDecorator.name);

  private circuitStates = new Map<
    string,
    {
      state: 'closed' | 'open' | 'half-open';
      failureCount: number;
      lastFailureTime: Date;
      successCount: number;
    }
  >();

  private readonly FAILURE_THRESHOLD = 5;
  private readonly RESET_TIMEOUT_MS = 30000;
  private readonly HALF_OPEN_MAX_TRIES = 1;

  constructor(@Optional() private readonly wrappedStep: PipelineStep) {}

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    const circuitKey = `${ctx.deviceId}:${ctx.tagId}`;
    const circuit = this.getOrCreateCircuit(circuitKey);

    if (circuit.state === 'open') {
      if (this.shouldAttemptReset(circuit)) {
        circuit.state = 'half-open';
        circuit.successCount = 0;
        this.logger.warn(`Circuit HALF-OPEN for ${circuitKey}, allowing test request`);
      } else {
        ctx.rawValue = null;
        ctx.quality = 'bad';
        ctx.errors.push({ step: 'CircuitBreaker', message: 'Circuit breaker is OPEN' });

        this.logger.debug(`Circuit OPEN for ${circuitKey}, failing fast`);
        return ctx;
      }
    }

    try {
      const result = await this.wrappedStep.process(ctx);

      this.onSuccess(circuit, circuitKey);

      if (circuit.state === 'half-open') {
        this.logger.log(`Circuit reset to CLOSED for ${circuitKey}`);
      }

      return result;
    } catch (error) {
      this.onFailure(circuit, circuitKey, error as Error);

      if (circuit.state === 'open') {
        this.logger.error(`Circuit OPEN for ${circuitKey}: too many failures`);
      }

      throw error;
    }
  }

  private getOrCreateCircuit(key: string): any {
    if (!this.circuitStates.has(key)) {
      this.circuitStates.set(key, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: new Date(),
        successCount: 0,
      });
    }
    return this.circuitStates.get(key)!;
  }

  private onSuccess(circuit: any, _key: string): void {
    circuit.failureCount = 0;
    circuit.successCount++;

    if (circuit.state === 'half-open' && circuit.successCount >= this.HALF_OPEN_MAX_TRIES) {
      circuit.state = 'closed';
    }
  }

  private onFailure(circuit: any, _key: string, _error: Error): void {
    circuit.failureCount++;
    circuit.lastFailureTime = new Date();
    circuit.successCount = 0;

    if (circuit.failureCount >= this.FAILURE_THRESHOLD && circuit.state !== 'open') {
      circuit.state = 'open';
      this.logger.error(`Circuit breaker OPENED for ${_key}: ${circuit.failureCount} failures`);
    }
  }

  private shouldAttemptReset(circuit: any): boolean {
    const elapsed = Date.now() - circuit.lastFailureTime.getTime();
    return elapsed >= this.RESET_TIMEOUT_MS;
  }

  getCircuitStatus(): Map<string, string> {
    const status = new Map<string, string>();
    for (const [key, circuit] of this.circuitStates) {
      status.set(key, circuit.state);
    }
    return status;
  }

  resetCircuit(key: string): void {
    const circuit = this.circuitStates.get(key);
    if (circuit) {
      circuit.state = 'closed';
      circuit.failureCount = 0;
      circuit.successCount = 0;
      this.logger.log(`Circuit manually reset for ${key}`);
    }
  }

  resetAllCircuits(): void {
    for (const [key] of this.circuitStates) {
      this.resetCircuit(key);
    }
  }
}
