// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * ApiClient — 基于 Node.js 内置 http/https 模块的 API 客户端
 *
 * 不依赖 axios，使用内置网络模块实现 REST 请求。
 * 支持 JWT Token 和 API Key 两种认证方式。
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

/** ApiClient 配置 */
export interface ApiClientConfig {
  /** 服务器基础地址，如 http://localhost:4000 */
  baseUrl: string;
  /** JWT Token（可选） */
  token?: string;
  /** API Key（可选） */
  apiKey?: string;
  /** 请求超时时间（毫秒），默认 30000 */
  timeout?: number;
}

/** API 错误 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * REST API 客户端
 */
export class ApiClient {
  private readonly config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  /** GET 请求 */
  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /** POST 请求 */
  async post<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', path, data);
  }

  /** PUT 请求 */
  async put<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', path, data);
  }

  /** DELETE 请求 */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /** 底层请求方法 */
  private request<T>(method: string, path: string, data?: unknown): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const url = new URL(path, this.config.baseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      if (this.config.token) {
        headers['Authorization'] = `Bearer ${this.config.token}`;
      }

      if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey;
      }

      const body = data ? JSON.stringify(data) : undefined;
      if (body) {
        headers['Content-Length'] = Buffer.byteLength(body).toString();
      }

      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method,
          headers,
          timeout: this.config.timeout ?? 30000,
        },
        (res: http.IncomingMessage) => {
          let responseData = '';

          res.on('data', (chunk: Buffer) => {
            responseData += chunk.toString();
          });

          res.on('end', () => {
            const statusCode = res.statusCode ?? 0;

            if (statusCode < 200 || statusCode >= 300) {
              reject(
                new ApiError(
                  `API request failed: ${method} ${path} → ${statusCode}`,
                  statusCode,
                  responseData,
                ),
              );
              return;
            }

            // 尝试解析 JSON，失败则返回原始字符串
            try {
              resolve(JSON.parse(responseData) as T);
            } catch {
              resolve(responseData as unknown as T);
            }
          });
        },
      );

      req.on('error', (err: Error) => {
        reject(new Error(`Network error: ${err.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.config.timeout ?? 30000}ms`));
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }
}
