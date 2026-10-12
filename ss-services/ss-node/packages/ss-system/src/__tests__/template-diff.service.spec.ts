// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TemplateDiffService } from '../template/template-diff.service';
import { TemplateVariable } from '../entities/device-tag-template.entity';

function makeVar(overrides: Partial<TemplateVariable> = {}): TemplateVariable {
  return {
    order: 1,
    name: 'temperature',
    address: '40001',
    dataType: 'float32',
    scanRate: 1000,
    enabled: true,
    conversionType: 'none',
    deadbandMode: 'none',
    alarmEnabled: false,
    qualityCheckEnabled: false,
    archiveEnabled: false,
    ...overrides,
  };
}

describe('TemplateDiffService', () => {
  let service: TemplateDiffService;

  beforeEach(() => {
    service = new TemplateDiffService();
  });

  describe('diff', () => {
    it('TC-DIFF-001: should detect added variables', () => {
      const left: TemplateVariable[] = [];
      const right: TemplateVariable[] = [makeVar({ name: 'new_tag' })];

      const result = service.diff('Template A', '1.0', left, 'Template A', '2.0', right);

      expect(result.summary.added).toBe(1);
      expect(result.summary.removed).toBe(0);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.unchanged).toBe(0);
      expect(result.summary.totalLeft).toBe(0);
      expect(result.summary.totalRight).toBe(1);
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0].type).toBe('added');
      expect(result.diffs[0].name).toBe('new_tag');
    });

    it('TC-DIFF-002: should detect removed variables', () => {
      const left: TemplateVariable[] = [makeVar({ name: 'old_tag' })];
      const right: TemplateVariable[] = [];

      const result = service.diff('Template A', '1.0', left, 'Template A', '2.0', right);

      expect(result.summary.removed).toBe(1);
      expect(result.summary.added).toBe(0);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.unchanged).toBe(0);
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0].type).toBe('removed');
      expect(result.diffs[0].name).toBe('old_tag');
    });

    it('TC-DIFF-003: should detect modified variables', () => {
      const left: TemplateVariable[] = [makeVar({ name: 'temp', address: '40001' })];
      const right: TemplateVariable[] = [makeVar({ name: 'temp', address: '40002' })];

      const result = service.diff('Template A', '1.0', left, 'Template A', '2.0', right);

      expect(result.summary.modified).toBe(1);
      expect(result.summary.unchanged).toBe(0);
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0].type).toBe('modified');
      expect(result.diffs[0].name).toBe('temp');
      expect(result.diffs[0].changedFields).toContain('address');
    });

    it('TC-DIFF-004: should detect unchanged variables (no diff)', () => {
      const vars: TemplateVariable[] = [makeVar({ name: 'temp' })];
      const result = service.diff('Template A', '1.0', vars, 'Template A', '2.0', vars);

      expect(result.summary.added).toBe(0);
      expect(result.summary.removed).toBe(0);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.unchanged).toBe(1);
      expect(result.diffs).toHaveLength(0);
    });

    it('TC-DIFF-005: should handle mixed changes (add, remove, modify)', () => {
      const left: TemplateVariable[] = [
        makeVar({ name: 'keep', address: '40001', dataType: 'float32' }),
        makeVar({ name: 'modify', address: '40002', dataType: 'float32' }),
        makeVar({ name: 'remove', address: '40003', dataType: 'float32' }),
      ];
      const right: TemplateVariable[] = [
        makeVar({ name: 'keep', address: '40001', dataType: 'float32' }),
        makeVar({ name: 'modify', address: '40002', dataType: 'int32' }),
        makeVar({ name: 'add', address: '40004', dataType: 'float32' }),
      ];

      const result = service.diff('Template A', '1.0', left, 'Template A', '2.0', right);

      expect(result.summary.added).toBe(1);
      expect(result.summary.removed).toBe(1);
      expect(result.summary.modified).toBe(1);
      expect(result.summary.unchanged).toBe(1);
      expect(result.summary.totalLeft).toBe(3);
      expect(result.summary.totalRight).toBe(3);
      expect(result.diffs).toHaveLength(3);
    });

    it('TC-DIFF-006: should detect dataType change', () => {
      const left: TemplateVariable[] = [makeVar({ name: 'temp', dataType: 'float32' })];
      const right: TemplateVariable[] = [makeVar({ name: 'temp', dataType: 'int16' })];

      const result = service.diff('A', '1.0', left, 'B', '2.0', right);

      expect(result.diffs[0].changedFields).toContain('dataType');
    });

    it('TC-DIFF-007: should detect scanRate change', () => {
      const left: TemplateVariable[] = [makeVar({ name: 'temp', scanRate: 1000 })];
      const right: TemplateVariable[] = [makeVar({ name: 'temp', scanRate: 500 })];

      const result = service.diff('A', '1.0', left, 'B', '2.0', right);

      expect(result.diffs[0].changedFields).toContain('scanRate');
    });

    it('TC-DIFF-008: should detect alarm limit changes', () => {
      const left: TemplateVariable[] = [
        makeVar({ name: 'temp', alarmEnabled: true, alarmHigh: 80 }),
      ];
      const right: TemplateVariable[] = [
        makeVar({ name: 'temp', alarmEnabled: true, alarmHigh: 90 }),
      ];

      const result = service.diff('A', '1.0', left, 'B', '2.0', right);

      expect(result.diffs[0].changedFields).toContain('alarmHigh');
    });

    it('TC-DIFF-009: should detect multiple field changes', () => {
      const left: TemplateVariable[] = [
        makeVar({
          name: 'temp',
          address: '40001',
          dataType: 'float32',
          scale: 1,
          offset: 0,
        }),
      ];
      const right: TemplateVariable[] = [
        makeVar({
          name: 'temp',
          address: '40002',
          dataType: 'int32',
          scale: 10,
          offset: 5,
        }),
      ];

      const result = service.diff('A', '1.0', left, 'B', '2.0', right);

      expect(result.diffs[0].changedFields).toContain('address');
      expect(result.diffs[0].changedFields).toContain('dataType');
      expect(result.diffs[0].changedFields).toContain('scale');
      expect(result.diffs[0].changedFields).toContain('offset');
      expect(result.diffs[0].changedFields!.length).toBe(4);
    });

    it('TC-DIFF-010: should include version info in result', () => {
      const left: TemplateVariable[] = [makeVar({ name: 'temp' })];
      const right: TemplateVariable[] = [];

      const result = service.diff('温度模板', '1.0', left, '温度模板', '2.0', right);

      expect(result.comparedVersions.left).toBe('温度模板@1.0');
      expect(result.comparedVersions.right).toBe('温度模板@2.0');
    });

    it('TC-DIFF-011: should detect unit change', () => {
      const left: TemplateVariable[] = [makeVar({ name: 'temp', unit: '°C' })];
      const right: TemplateVariable[] = [makeVar({ name: 'temp', unit: '°F' })];

      const result = service.diff('A', '1.0', left, 'B', '2.0', right);

      expect(result.diffs[0].changedFields).toContain('unit');
    });

    it('TC-DIFF-012: should detect minValue and maxValue changes', () => {
      const left: TemplateVariable[] = [makeVar({ name: 'temp', minValue: 0, maxValue: 100 })];
      const right: TemplateVariable[] = [makeVar({ name: 'temp', minValue: -10, maxValue: 120 })];

      const result = service.diff('A', '1.0', left, 'B', '2.0', right);

      expect(result.diffs[0].changedFields).toContain('minValue');
      expect(result.diffs[0].changedFields).toContain('maxValue');
    });

    it('TC-DIFF-013: should detect deadband changes', () => {
      const left: TemplateVariable[] = [
        makeVar({ name: 'temp', deadbandMode: 'none', deadbandValue: 0 }),
      ];
      const right: TemplateVariable[] = [
        makeVar({ name: 'temp', deadbandMode: 'absolute', deadbandValue: 5 }),
      ];

      const result = service.diff('A', '1.0', left, 'B', '2.0', right);

      expect(result.diffs[0].changedFields).toContain('deadbandMode');
      expect(result.diffs[0].changedFields).toContain('deadbandValue');
    });

    it('TC-DIFF-014: should handle empty variable arrays', () => {
      const result = service.diff('A', '1.0', [], 'B', '2.0', []);

      expect(result.summary.added).toBe(0);
      expect(result.summary.removed).toBe(0);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.unchanged).toBe(0);
      expect(result.diffs).toHaveLength(0);
    });

    it('TC-DIFF-015: should detect enabled/disabled change', () => {
      const left: TemplateVariable[] = [makeVar({ name: 'temp', enabled: true })];
      const right: TemplateVariable[] = [makeVar({ name: 'temp', enabled: false })];

      const result = service.diff('A', '1.0', left, 'B', '2.0', right);

      expect(result.diffs[0].changedFields).toContain('enabled');
    });

    it('TC-DIFF-016: should detect conversionType change', () => {
      const left: TemplateVariable[] = [makeVar({ name: 'temp', conversionType: 'none' })];
      const right: TemplateVariable[] = [makeVar({ name: 'temp', conversionType: 'linear' })];

      const result = service.diff('A', '1.0', left, 'B', '2.0', right);

      expect(result.diffs[0].changedFields).toContain('conversionType');
    });

    it('TC-DIFF-017: should not report diff when only order differs', () => {
      const left: TemplateVariable[] = [makeVar({ name: 'temp', order: 1 })];
      const right: TemplateVariable[] = [makeVar({ name: 'temp', order: 2 })];

      const result = service.diff('A', '1.0', left, 'B', '2.0', right);

      // order is not in compareFields list
      expect(result.summary.modified).toBe(0);
      expect(result.diffs).toHaveLength(0);
    });

    it('TC-DIFF-018: should handle duplicate variable names (last wins)', () => {
      const left: TemplateVariable[] = [
        makeVar({ name: 'temp', address: '40001' }),
        makeVar({ name: 'temp', address: '40002' }),
      ];
      const right: TemplateVariable[] = [makeVar({ name: 'temp', address: '40002' })];

      const result = service.diff('A', '1.0', left, 'B', '2.0', right);

      // Map overwrites duplicates, so only the last entry (address=40002) is compared.
      // Since it matches the right entry (address=40002), no diff is generated.
      // unchanged = totalLeft - removed - modified = 2 - 0 - 0 = 2
      expect(result.summary.removed).toBe(0);
      expect(result.summary.modified).toBe(0);
      expect(result.diffs).toHaveLength(0);
    });
  });
});
