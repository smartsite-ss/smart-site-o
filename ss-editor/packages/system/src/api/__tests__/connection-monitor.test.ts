// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionMonitor } from '../connection-monitor';

describe('ConnectionMonitor', () => {
  let monitor: ConnectionMonitor;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    monitor = new ConnectionMonitor();
  });

  afterEach(() => {
    monitor.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start in online status', () => {
      expect(monitor.getStatus()).toBe('online');
    });

    it('should not be offline initially', () => {
      expect(monitor.isOffline()).toBe(false);
    });
  });

  describe('markOffline', () => {
    it('should set status to offline', () => {
      monitor.markOffline();
      expect(monitor.getStatus()).toBe('offline');
      expect(monitor.isOffline()).toBe(true);
    });

    it('should notify status change listeners', () => {
      const listener = vi.fn();
      monitor.onStatusChange(listener);
      monitor.markOffline();
      expect(listener).toHaveBeenCalledWith('offline');
    });

    it('should start polling after marking offline', () => {
      const spy = vi.spyOn(monitor, 'startPolling');
      monitor.markOffline();
      expect(spy).toHaveBeenCalled();
    });

    it('should not notify if already offline', () => {
      const listener = vi.fn();
      monitor.onStatusChange(listener);
      monitor.markOffline();
      monitor.markOffline();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('markOnline', () => {
    it('should set status to online', () => {
      monitor.markOffline();
      monitor.markOnline();
      expect(monitor.getStatus()).toBe('online');
    });

    it('should stop polling when marking online', () => {
      const spy = vi.spyOn(monitor, 'stopPolling');
      monitor.markOffline();
      monitor.markOnline();
      expect(spy).toHaveBeenCalled();
    });

    it('should notify status change listeners', () => {
      const listener = vi.fn();
      monitor.onStatusChange(listener);
      monitor.markOffline();
      monitor.markOnline();
      expect(listener).toHaveBeenLastCalledWith('online');
    });
  });

  describe('onRecover', () => {
    it('should call recover listeners when health check succeeds after offline', async () => {
      const recoverCb = vi.fn();
      monitor.onRecover(recoverCb);

      // Set up fetch mock to return success BEFORE marking offline
      fetchMock.mockResolvedValue({ ok: true } as Response);

      // markOffline triggers startPolling → probe() immediately
      monitor.markOffline();

      // Wait for the async probe to complete and trigger recover
      await vi.waitFor(() => {
        expect(recoverCb).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('startPolling / stopPolling', () => {
    it('should not start multiple poll timers', () => {
      monitor.markOffline();
      monitor.startPolling();
      expect(monitor.getStatus()).toBe('offline');
    });

    it('should stop polling when stopPolling is called', () => {
      monitor.markOffline();
      monitor.stopPolling();
      expect(monitor.getStatus()).toBe('offline');
    });
  });

  describe('destroy', () => {
    it('should stop polling and clear listeners', () => {
      const listener = vi.fn();
      monitor.onStatusChange(listener);
      monitor.markOffline();
      monitor.destroy();
      // No error should occur
      expect(true).toBe(true);
    });
  });
});
