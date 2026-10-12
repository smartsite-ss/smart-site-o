// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestQueue } from '../request-queue';
import type { InternalAxiosRequestConfig } from 'axios';

function createConfig(method: string = 'post'): InternalAxiosRequestConfig {
  return {
    method,
    url: '/test',
    headers: {},
  } as InternalAxiosRequestConfig;
}

describe('RequestQueue', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  describe('enqueue', () => {
    it('should enqueue a request and return true', () => {
      const result = queue.enqueue(createConfig(), vi.fn(), vi.fn());
      expect(result).toBe(true);
      expect(queue.getStats().size).toBe(1);
    });

    it('should return false when queue is full (50 items)', () => {
      for (let i = 0; i < 50; i++) {
        queue.enqueue(createConfig(), vi.fn(), vi.fn());
      }
      const result = queue.enqueue(createConfig(), vi.fn(), vi.fn());
      expect(result).toBe(false);
      expect(queue.getStats().size).toBe(50);
    });

    it('should notify size change listeners', () => {
      const listener = vi.fn();
      queue.onSizeChange(listener);
      queue.enqueue(createConfig(), vi.fn(), vi.fn());
      expect(listener).toHaveBeenCalledWith({ size: 1, oldest: expect.any(Number) });
    });
  });

  describe('getStats', () => {
    it('should return size 0 and oldest null for empty queue', () => {
      const stats = queue.getStats();
      expect(stats.size).toBe(0);
      expect(stats.oldest).toBeNull();
    });

    it('should return correct size and oldest timestamp', () => {
      queue.enqueue(createConfig(), vi.fn(), vi.fn());
      const stats = queue.getStats();
      expect(stats.size).toBe(1);
      expect(stats.oldest).toBeGreaterThan(0);
    });
  });

  describe('flush', () => {
    it('should do nothing for empty queue', async () => {
      const mockClient = vi.fn();
      await queue.flush(mockClient as any);
      expect(mockClient).not.toHaveBeenCalled();
    });

    it('should resend queued requests via the axios client', async () => {
      const resolve = vi.fn();
      const reject = vi.fn();
      const mockResponse = { data: 'success', status: 200 };
      const mockClient = vi.fn().mockResolvedValue(mockResponse);

      queue.enqueue(createConfig('post'), resolve, reject);
      await queue.flush(mockClient as any);

      expect(mockClient).toHaveBeenCalledTimes(1);
      expect(resolve).toHaveBeenCalledWith(mockResponse);
      expect(reject).not.toHaveBeenCalled();
    });

    it('should reject expired requests (> 5 minutes)', async () => {
      const resolve = vi.fn();
      const reject = vi.fn();
      const mockClient = vi.fn();

      const realDateNow = Date.now;
      const pastTime = Date.now() - 6 * 60 * 1000;
      Date.now = vi.fn(() => pastTime);
      queue.enqueue(createConfig(), resolve, reject);
      Date.now = realDateNow;

      await queue.flush(mockClient as any);

      expect(reject).toHaveBeenCalledWith(expect.objectContaining({ message: 'REQUEST_EXPIRED' }));
      expect(resolve).not.toHaveBeenCalled();
      expect(mockClient).not.toHaveBeenCalled();
    });

    it('should reject after max retry count is exceeded', async () => {
      const resolve = vi.fn();
      const reject = vi.fn();
      const mockClient = vi.fn().mockRejectedValue(new Error('Server error'));

      // maxRetry = 1: first flush increments to 1, fails, 1 < 1 is false → reject
      queue.enqueue(createConfig(), resolve, reject, 1);

      await queue.flush(mockClient as any);

      expect(mockClient).toHaveBeenCalledTimes(1);
      expect(reject).toHaveBeenCalled();
      expect(resolve).not.toHaveBeenCalled();
      expect(queue.getStats().size).toBe(0);
    });

    it('should re-enqueue request if retry fails and retry count not exceeded', async () => {
      const resolve = vi.fn();
      const reject = vi.fn();
      const mockClient = vi.fn().mockRejectedValue(new Error('Server error'));

      // maxRetry = 3: first flush increments to 1, fails, 1 < 3 → re-enqueue
      queue.enqueue(createConfig(), resolve, reject, 3);

      await queue.flush(mockClient as any);

      expect(mockClient).toHaveBeenCalledTimes(1);
      expect(queue.getStats().size).toBe(1);
      expect(resolve).not.toHaveBeenCalled();
      expect(reject).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all requests and reject them', () => {
      const resolve1 = vi.fn();
      const reject1 = vi.fn();
      const resolve2 = vi.fn();
      const reject2 = vi.fn();

      queue.enqueue(createConfig(), resolve1, reject1);
      queue.enqueue(createConfig(), resolve2, reject2);

      queue.clear();

      expect(queue.getStats().size).toBe(0);
      expect(reject1).toHaveBeenCalledWith(expect.objectContaining({ message: 'QUEUE_CLEARED' }));
      expect(reject2).toHaveBeenCalledWith(expect.objectContaining({ message: 'QUEUE_CLEARED' }));
    });
  });

  describe('onSizeChange', () => {
    it('should call multiple listeners on size change', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      queue.onSizeChange(listener1);
      queue.onSizeChange(listener2);

      queue.enqueue(createConfig(), vi.fn(), vi.fn());

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });
});
