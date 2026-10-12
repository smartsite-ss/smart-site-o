// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { SVGElementPool } from '../../../canvas-page/renderer/svg/SVGElementPool';

describe('SVGElementPool', () => {
  let pool: SVGElementPool;

  beforeEach(() => {
    pool = new SVGElementPool();
  });

  it('should create and acquire elements of the same tag', () => {
    const element1 = pool.acquire('rect');
    expect(element1).toBeInstanceOf(SVGElement);
    expect(element1.tagName).toBe('rect');

    const element2 = pool.acquire('rect');
    expect(element2).toBeInstanceOf(SVGElement);
    expect(element2.tagName).toBe('rect');
    expect(element1).not.toBe(element2);
  });

  it('should acquire and release elements correctly', () => {
    const element1 = pool.acquire('rect');
    pool.release(element1);
    const element2 = pool.acquire('rect');
    expect(element1).toBe(element2);
  });

  it('should create new elements when pool is empty', () => {
    const elements = [
      pool.acquire('rect'),
      pool.acquire('rect'),
      pool.acquire('rect'),
    ];
    expect(elements[0]).not.toBe(elements[1]);
    expect(elements[0]).not.toBe(elements[2]);
    expect(elements[1]).not.toBe(elements[2]);

    const stats = pool.getStats();
    expect(stats.createdCount).toBe(3);
    expect(stats.poolSize).toBe(0);
  });

  it('should clear all pooled elements', () => {
    const element = pool.acquire('rect');
    pool.release(element);
    expect(pool.getStats().poolSize).toBe(1);

    pool.clear();
    const stats = pool.getStats();
    expect(stats.createdCount).toBe(0);
    expect(stats.poolSize).toBe(0);

    const newElement = pool.acquire('rect');
    expect(newElement).not.toBe(element);
  });

  it('should provide pool stats', () => {
    const rect1 = pool.acquire('rect');
    void pool.acquire('rect');
    void pool.acquire('circle');

    const statsAfterAcquire = pool.getStats();
    expect(statsAfterAcquire.createdCount).toBe(3);
    expect(statsAfterAcquire.poolSize).toBe(0);

    pool.release(rect1);
    const statsAfterRelease = pool.getStats();
    expect(statsAfterRelease.createdCount).toBe(3);
    expect(statsAfterRelease.poolSize).toBe(1);
  });

  it('should handle releasing non-SVG elements gracefully', () => {
    expect(() => {
      const nonSvgElement = document.createElement('div');
      pool.release(nonSvgElement as unknown as SVGElement);
    }).not.toThrow();
  });

  it('should create SVG elements with correct namespace', () => {
    const element = pool.acquire('rect');
    expect(element.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });
});
