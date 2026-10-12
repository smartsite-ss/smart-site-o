// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle, delay, retry } from '../../utils/core/TimerUtils';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not call function before wait time', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should call function after wait time', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should only call once for rapid successive calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should pass arguments to the original function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('hello', 42);
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('hello', 42);
  });

  it('should call with leading option', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { leading: true });

    debounced();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not call with trailing set to false', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { trailing: false });

    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should support cancel', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should support flush', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('test');
    debounced.flush();
    expect(fn).toHaveBeenCalledWith('test');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call with latest arguments on rapid calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced(1);
    vi.advanceTimersByTime(50);
    debounced(2);
    vi.advanceTimersByTime(50);
    debounced(3);
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call immediately on first invocation', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not call again within limit period', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call after limit period', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    vi.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should call with latest args on trailing invocation', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('a');
    throttled('b');
    throttled('c');
    vi.advanceTimersByTime(100);

    throttled();
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('should support cancel', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('keep');
    throttled('drop');
    throttled.cancel();
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('keep');
  });

  it('should respect leading=false option', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { leading: false });

    throttled();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect trailing=false option', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { trailing: false });

    throttled();
    throttled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve after specified milliseconds', async () => {
    const callback = vi.fn();
    const promise = delay(100).then(callback);

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    await promise;
    expect(callback).toHaveBeenCalled();
  });

  it('should resolve with undefined', async () => {
    const promise = delay(50);
    vi.advanceTimersByTime(50);
    const result = await promise;
    expect(result).toBeUndefined();
  });

  it('should handle zero delay', async () => {
    const callback = vi.fn();
    const promise = delay(0).then(callback);
    vi.advanceTimersByTime(0);
    await promise;
    expect(callback).toHaveBeenCalled();
  });
});

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const promise = retry(fn, 3, 100);
    vi.advanceTimersByTime(0);
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('eventual success');

    const promise = retry(fn, 3, 100);
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('eventual success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after exhausting retries', async () => {
    const error = new Error('always fails');
    const fn = vi.fn().mockRejectedValue(error);

    const promise = retry(fn, 3, 100);
    const result = expect(promise).rejects.toThrow('always fails');
    await vi.runAllTimersAsync();
    await result;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use default retry count (3)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    const promise = retry(fn);
    const result = expect(promise).rejects.toThrow('fail');
    await vi.runAllTimersAsync();
    await result;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should respect custom delay between retries', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const promise = retry(fn, 2, 500);

    vi.advanceTimersByTime(0);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(400);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();
    await promise;
    expect(fn).toHaveBeenCalledTimes(2);
  });
});