// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { parseSvgPath } from '../SvgPathParser';

describe('SvgPathParser', () => {
  describe('parseSvgPath', () => {
    it('should parse a simple M+L path', () => {
      const d = 'M 0 30 L 100 30 L 200 30';
      const commands = parseSvgPath(d);
      expect(commands).toEqual([
        { type: 'M', x: 0, y: 30 },
        { type: 'L', x: 100, y: 30 },
        { type: 'L', x: 200, y: 30 },
      ]);
    });

    it('should parse lowercase commands', () => {
      const d = 'm 0 30 l 100 30 l 200 30';
      const commands = parseSvgPath(d);
      expect(commands).toEqual([
        { type: 'M', x: 0, y: 30 },
        { type: 'L', x: 100, y: 30 },
        { type: 'L', x: 200, y: 30 },
      ]);
    });

    it('should parse H and V commands', () => {
      const d = 'M 0 0 H 100 V 50 H 0 Z';
      const commands = parseSvgPath(d);
      expect(commands).toHaveLength(5);
      expect(commands[0]).toEqual({ type: 'M', x: 0, y: 0 });
      expect(commands[1]).toEqual({ type: 'H', x: 100 });
      expect(commands[2]).toEqual({ type: 'V', y: 50 });
      expect(commands[3]).toEqual({ type: 'H', x: 0 });
      expect(commands[4]).toEqual({ type: 'Z' });
    });

    it('should parse cubic bezier C command', () => {
      const d = 'M 0 0 C 10 10, 20 10, 30 0';
      const commands = parseSvgPath(d);
      expect(commands).toHaveLength(2);
      expect(commands[0]).toEqual({ type: 'M', x: 0, y: 0 });
      expect(commands[1]).toEqual({ type: 'C', x1: 10, y1: 10, x2: 20, y2: 10, x: 30, y: 0 });
    });

    it('should parse quadratic bezier Q command', () => {
      const d = 'M 0 0 Q 15 15, 30 0';
      const commands = parseSvgPath(d);
      expect(commands).toHaveLength(2);
      expect(commands[0]).toEqual({ type: 'M', x: 0, y: 0 });
      expect(commands[1]).toEqual({ type: 'Q', x1: 15, y1: 15, x: 30, y: 0 });
    });

    it('should parse multiple M commands', () => {
      const d = 'M 0 0 L 50 50 M 100 0 L 150 50';
      const commands = parseSvgPath(d);
      expect(commands).toHaveLength(4);
      expect(commands[0]).toEqual({ type: 'M', x: 0, y: 0 });
      expect(commands[1]).toEqual({ type: 'L', x: 50, y: 50 });
      expect(commands[2]).toEqual({ type: 'M', x: 100, y: 0 });
      expect(commands[3]).toEqual({ type: 'L', x: 150, y: 50 });
    });

    it('should handle decimal numbers', () => {
      const d = 'M 10.5 20.25 L 100.75 200.5';
      const commands = parseSvgPath(d);
      expect(commands).toHaveLength(2);
      expect(commands[0]).toEqual({ type: 'M', x: 10.5, y: 20.25 });
      expect(commands[1]).toEqual({ type: 'L', x: 100.75, y: 200.5 });
    });

    it('should handle comma-separated coordinates', () => {
      const d = 'M 0,30 L 100,30 L 200,30';
      const commands = parseSvgPath(d);
      expect(commands).toHaveLength(3);
      expect(commands[0]).toEqual({ type: 'M', x: 0, y: 30 });
      expect(commands[2]).toEqual({ type: 'L', x: 200, y: 30 });
    });

    it('should handle negative numbers', () => {
      const d = 'M -5 -10 L 50 -20';
      const commands = parseSvgPath(d);
      expect(commands).toHaveLength(2);
      expect(commands[0]).toEqual({ type: 'M', x: -5, y: -10 });
      expect(commands[1]).toEqual({ type: 'L', x: 50, y: -20 });
    });

    it('should return empty array for empty string', () => {
      const commands = parseSvgPath('');
      expect(commands).toEqual([]);
    });
  });
});