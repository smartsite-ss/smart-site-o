// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * HTTP 客户端工具单元测试 — P1-T01
 *
 * 重点验证 SSE 流解析逻辑（parseSSEStream）
 * 不测试实际网络请求（需集成测试）
 */

import { parseSSEStream } from '../ai/http-client.util';

const NL = String.fromCharCode(10); // \n
const SEP = NL + NL; // 事件分隔符
const DONE = 'data: [DONE]' + SEP;

async function* fromChunks(chunks: string[]): AsyncGenerator<string, void, unknown> {
  for (const c of chunks) yield c;
}

async function drain(stream: AsyncGenerator<string, void, unknown>): Promise<string[]> {
  const out: string[] = [];
  for await (const d of stream) out.push(d);
  return out;
}

describe('parseSSEStream', () => {
  it('正确解析标准 SSE 事件', async () => {
    const input = [
      'data: {"id":"1","content":"hello"}' + SEP,
      'data: {"id":"2","content":"world"}' + SEP,
      DONE,
    ];
    const output = await drain(parseSSEStream(fromChunks(input)));
    expect(output).toEqual(['{"id":"1","content":"hello"}', '{"id":"2","content":"world"}']);
    expect(output).not.toContain('[DONE]');
  });

  it('正确处理跨 chunk 的事件（被拆分）', async () => {
    const input = ['data: {"id":', '"1","content":"hello"}' + SEP, DONE];
    const output = await drain(parseSSEStream(fromChunks(input)));
    expect(output).toEqual(['{"id":"1","content":"hello"}']);
  });

  it('正确处理同一 chunk 内多个事件', async () => {
    const input = ['data: {"a":1}' + SEP + 'data: {"b":2}' + SEP + DONE];
    const output = await drain(parseSSEStream(fromChunks(input)));
    expect(output).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('忽略空行和非 data: 字段（如 event:/id:）', async () => {
    const input = [
      'event: ping' + NL + 'data: {"a":1}' + NL + 'id: 12345' + SEP,
      'data: {"b":2}' + SEP + DONE,
    ];
    const output = await drain(parseSSEStream(fromChunks(input)));
    expect(output).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('忽略空 data 行', async () => {
    const input = ['data:' + NL + 'data: {"a":1}' + SEP + DONE];
    const output = await drain(parseSSEStream(fromChunks(input)));
    expect(output).toEqual(['{"a":1}']);
  });

  it('遇到 [DONE] 立即结束流', async () => {
    const input = ['data: {"a":1}' + SEP, DONE, 'data: {"should-not-appear":true}' + SEP];
    const output = await drain(parseSSEStream(fromChunks(input)));
    expect(output).toEqual(['{"a":1}']);
  });

  it('空流返回空数组', async () => {
    const output = await drain(parseSSEStream(fromChunks([])));
    expect(output).toEqual([]);
  });

  it('只有分隔符的流返回空数组', async () => {
    const output = await drain(parseSSEStream(fromChunks([SEP, SEP])));
    expect(output).toEqual([]);
  });
});
