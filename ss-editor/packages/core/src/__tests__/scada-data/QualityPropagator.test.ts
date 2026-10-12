// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { QualityCode } from './mocks/data-source-mock';

// QualityCode enum is already defined in data-source.mock.ts

// Mock visual feedback function for TDD
export const getQualityVisualFeedback = (quality: QualityCode) => {
  // This is a mock implementation for testing
  switch (quality) {
    case QualityCode.GOOD:
      return { opacity: 1, blink: false, overlay: null };
    case QualityCode.UNCERTAIN:
      return { blink: true, blinkColor: 'yellow' };
    case QualityCode.BAD:
      return { overlay: 'red', showLastValue: true };
    case QualityCode.STALE:
      return { blink: true, blinkColor: 'gray' };
    case QualityCode.DISCONNECTED:
      return { overlay: 'gray', strikethrough: true };
    default:
      return { opacity: 1, blink: false, overlay: null };
  }
};

// Mock quality propagator for TDD
export class QualityPropagator {
  static getWorst(qualities: QualityCode[]): QualityCode {
    // Simple implementation for testing
    return Math.max(...qualities) as QualityCode;
  }
}

describe('Data quality marking - TDD', () => {
  describe('QualityCode enum', () => {
    it('should have five quality levels', () => {
      expect(QualityCode.GOOD).toBe(0);
      expect(QualityCode.UNCERTAIN).toBe(1);
      expect(QualityCode.BAD).toBe(2);
      expect(QualityCode.STALE).toBe(3);
      expect(QualityCode.DISCONNECTED).toBe(4);
    });
  });

  describe('Visual feedback', () => {
    it('should display normal for GOOD quality', () => {
      const feedback = getQualityVisualFeedback(QualityCode.GOOD);
      expect(feedback.opacity).toBe(1);
      expect(feedback.blink).toBe(false);
      expect(feedback.overlay).toBeNull();
    });

    it('should yellow-blink for UNCERTAIN quality', () => {
      const feedback = getQualityVisualFeedback(QualityCode.UNCERTAIN);
      expect(feedback.blink).toBe(true);
      expect(feedback.blinkColor).toBe('yellow');
    });

    it('should red-overlay with last value for BAD quality', () => {
      const feedback = getQualityVisualFeedback(QualityCode.BAD);
      expect(feedback.overlay).toBe('red');
      expect(feedback.showLastValue).toBe(true);
    });

    it('should gray-blink for STALE quality', () => {
      const feedback = getQualityVisualFeedback(QualityCode.STALE);
      expect(feedback.blink).toBe(true);
      expect(feedback.blinkColor).toBe('gray');
    });

    it('should gray-with-strikethrough for DISCONNECTED', () => {
      const feedback = getQualityVisualFeedback(QualityCode.DISCONNECTED);
      expect(feedback.overlay).toBe('gray');
      expect(feedback.strikethrough).toBe(true);
    });
  });

  describe('Quality Propagation Rules', () => {
    it('should propagate worst quality from dependencies', () => {
      const qualities = [
        QualityCode.GOOD,
        QualityCode.UNCERTAIN,
        QualityCode.GOOD,
      ];
      const worst = QualityPropagator.getWorst(qualities);
      expect(worst).toBe(QualityCode.UNCERTAIN);
    });

    it('should prioritize BAD over UNCERTAIN', () => {
      const qualities = [
        QualityCode.GOOD,
        QualityCode.BAD,
        QualityCode.UNCERTAIN,
      ];
      const worst = QualityPropagator.getWorst(qualities);
      expect(worst).toBe(QualityCode.BAD);
    });
  });
});
