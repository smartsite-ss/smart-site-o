// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { PipePathPlugin } from '../../industrial/pipe-path/PipePathPlugin';

function createMockContext() {
  const calls: { method: string; args: any[] }[] = [];
  const handler: ProxyHandler<any> = {
    get: (_t, prop) => {
      if (prop === '__calls') return calls;
      if (typeof prop === 'string') {
        return (...args: any[]) => {
          calls.push({ method: prop, args });
        };
      }
      return undefined;
    },
  };
  return new Proxy({}, handler) as unknown as CanvasRenderingContext2D & { __calls: typeof calls };
}

describe('PipePath render diagnostics', () => {
  it('PipePath constructor sets expected default props', () => {
    const plugin = new PipePathPlugin(0, 0, 200, 60);
    const props = plugin.pluginProps as any;
    expect(props.points).toBeDefined();
    expect(props.points.length).toBe(3);
    expect(props.status).toBe('stopped');
    expect(props.pipeThickness).toBe(20);
    expect(props.pipeColor).toBe('#4A90A4FF');
  });

  it('PipePath toJSON/fromJSON round-trip preserves points', () => {
    const a = new PipePathPlugin(100, 150, 240, 80);
    const json = a.toJSON();
    expect(json.type).toBe('pipe-path');
    expect(json.config.customProps.points).toHaveLength(3);

    const b = new PipePathPlugin();
    b.fromJSON(json);
    expect((b.pluginProps as any).points).toEqual((a.pluginProps as any).points);
  });

  it('PipePath draw issues actual line stroke commands on default config', () => {
    const plugin = new PipePathPlugin(0, 0, 200, 60);
    const ctx = createMockContext();
    plugin.draw(ctx);
    const calls = (ctx as any).__calls;
    const moveToCalls = calls.filter((c: any) => c.method === 'moveTo');
    const lineToCalls = calls.filter((c: any) => c.method === 'lineTo');
    const strokeCalls = calls.filter((c: any) => c.method === 'stroke');
    expect(moveToCalls.length).toBeGreaterThanOrEqual(1);
    expect(lineToCalls.length).toBeGreaterThanOrEqual(2);
    expect(strokeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('PipePath after toJSON/fromJSON still issues stroke commands', () => {
    const a = new PipePathPlugin(0, 0, 200, 60);
    const json = a.toJSON();

    const b = new PipePathPlugin();
    b.fromJSON(json);
    const ctx = createMockContext();
    b.draw(ctx);
    const calls = (ctx as any).__calls;
    const strokeCalls = calls.filter((c: any) => c.method === 'stroke');
    expect(strokeCalls.length).toBeGreaterThanOrEqual(1);
  });
});
