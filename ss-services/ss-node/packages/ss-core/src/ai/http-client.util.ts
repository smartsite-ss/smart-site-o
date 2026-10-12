// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 轻量 HTTP 客户端工具 — P1-T01 LLM API 接入
 *
 * 使用 Node.js 内置 http/https 模块，避免引入 axios 等额外依赖。
 * 支持：
 *   - POST 请求（JSON body）
 *   - 流式响应（SSE 解析）
 *   - 超时控制
 *   - Bearer Token 鉴权
 *
 * 仅用于 AI Provider 调用云端 API，不替代项目其他 HTTP 客户端。
 */

import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export interface HttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  /** 请求超时（毫秒） */
  timeoutMs?: number;
  /** 是否流式响应（true: 返回 AsyncGenerator；false: 返回 buffer） */
  stream?: boolean;
}

export interface HttpResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

/** HTTP 错误（非 2xx） */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly statusText: string,
    public readonly body: string,
    public readonly url: string,
  ) {
    super(`HTTP ${statusCode} ${statusText} — ${url}: ${body.slice(0, 500)}`);
    this.name = 'HttpError';
  }
}

/** 超时错误 */
export class HttpTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'HttpTimeoutError';
  }
}

/**
 * 发送 HTTP 请求并返回完整响应（非流式）
 */
export function httpRequest(options: HttpRequestOptions): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const lib = url.protocol === 'https:' ? https : http;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    const bodyStr = options.body != null ? JSON.stringify(options.body) : '';
    if (bodyStr && !headers['Content-Length']) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
    }

    const req = lib.request(
      url,
      {
        method: options.method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body,
            });
          } else {
            reject(new HttpError(res.statusCode || 0, res.statusMessage || '', body, options.url));
          }
        });
      },
    );

    req.on('error', (err) => reject(err));

    if (options.timeoutMs) {
      req.setTimeout(options.timeoutMs, () => {
        req.destroy(new HttpTimeoutError(options.url, options.timeoutMs!));
      });
    }

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

/**
 * 发送 HTTP 请求并以流式方式返回响应（SSE/Stream）
 *
 * yield 字符串片段（已是 UTF-8 解码）。
 */
export async function* httpStream(
  options: HttpRequestOptions,
): AsyncGenerator<string, void, unknown> {
  const url = new URL(options.url);
  const lib = url.protocol === 'https:' ? https : http;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    ...(options.headers || {}),
  };

  const bodyStr = options.body != null ? JSON.stringify(options.body) : '';
  if (bodyStr && !headers['Content-Length']) {
    headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
  }

  // 先通过 Promise 等待响应头到达，再返回内部的 AsyncGenerator
  const generator = await new Promise<AsyncGenerator<string, void, unknown>>((resolve, reject) => {
    const req = lib.request(
      url,
      {
        method: options.method,
        headers,
      },
      (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            reject(
              new HttpError(
                res.statusCode || 0,
                res.statusMessage || '',
                Buffer.concat(chunks).toString('utf-8'),
                options.url,
              ),
            );
          });
          return;
        }

        async function* gen(): AsyncGenerator<string, void, unknown> {
          for await (const chunk of res) {
            yield chunk.toString('utf-8');
          }
        }

        resolve(gen());
      },
    );

    req.on('error', (err) => reject(err));

    if (options.timeoutMs) {
      req.setTimeout(options.timeoutMs, () => {
        req.destroy(new HttpTimeoutError(options.url, options.timeoutMs!));
      });
    }

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });

  // 转发底层流的 chunk
  yield* generator;
}

/**
 * 解析 SSE 文本流，提取 data: 字段内容
 *
 * SSE 协议格式（OpenAI 兼容）：
 *   data: {"id":...}\n\n
 *   data: {"id":...}\n\n
 *   data: [DONE]\n\n
 */
export async function* parseSSEStream(
  stream: AsyncGenerator<string, void, unknown>,
): AsyncGenerator<string, void, unknown> {
  let buffer = '';
  for await (const chunk of stream) {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of rawEvent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            return;
          }
          if (data) {
            yield data;
          }
        }
      }
    }
  }
}
