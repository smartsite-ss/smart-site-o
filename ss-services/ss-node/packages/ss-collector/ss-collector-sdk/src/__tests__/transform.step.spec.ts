// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TransformStep } from '../pipeline/steps/transform.step';
import { PipelineContext } from '../pipeline/pipeline-orchestrator';

function makeContext(overrides: Partial<PipelineContext>): PipelineContext {
  return {
    tagId: 'tag-001',
    deviceId: 'device-001',
    projectId: 'project-001',
    rawValue: null,
    transformedValue: null,
    quality: 'good',
    shouldPersist: true,
    shouldPublish: true,
    startTime: Date.now(),
    errors: [],
    ...overrides,
  };
}

describe('TransformStep — 数据类型语义保留', () => {
  const step = new TransformStep();

  describe("布尔类型（兼容点表规范 'boolean'）", () => {
    it("dataType='boolean' 且 rawValue 为 boolean 时应保留布尔语义", async () => {
      const ctx = makeContext({
        rawValue: true,
        tagConfig: { dataType: 'boolean' },
      });
      const result = await step.process(ctx);
      expect(result.transformedValue).toBe(true);
      expect(result.quality).toBe('good');
    });

    it("dataType='bool'（历史写法）同样保留布尔语义", async () => {
      const ctx = makeContext({
        rawValue: false,
        tagConfig: { dataType: 'bool' },
      });
      const result = await step.process(ctx);
      expect(result.transformedValue).toBe(false);
    });

    it("dataType='boolean' 且 rawValue 为 0/1 时应转为 boolean", async () => {
      const ctx = makeContext({
        rawValue: 1,
        tagConfig: { dataType: 'boolean' },
      });
      const result = await step.process(ctx);
      expect(result.transformedValue).toBe(true);
    });

    it("dataType='boolean' 且 rawValue 为非法值时应标记 bad 质量", async () => {
      const ctx = makeContext({
        rawValue: 42,
        tagConfig: { dataType: 'boolean' },
      });
      const result = await step.process(ctx);
      expect(result.transformedValue).toBeNull();
      expect(result.quality).toBe('bad');
    });
  });

  describe('数值类型回归保护', () => {
    it("dataType='float32' 且 rawValue 为 boolean 时应转为 0/1 数字", async () => {
      const ctx = makeContext({
        rawValue: true,
        tagConfig: { dataType: 'float32' },
      });
      const result = await step.process(ctx);
      expect(result.transformedValue).toBe(1);
    });

    it("dataType='string' 时数值应转为字符串保留", async () => {
      const ctx = makeContext({
        rawValue: 'OK',
        tagConfig: { dataType: 'string' },
      });
      const result = await step.process(ctx);
      expect(result.transformedValue).toBe('OK');
    });
  });
});
