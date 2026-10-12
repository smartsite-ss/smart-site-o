// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import {
  matchState,
  resolveStateImage,
  getAvailableOperators,
  generateRuleId,
  type StateRule,
} from '../../system/state-variable/stateVariableUtils';

function makeRule(partial: Partial<StateRule>): StateRule {
  return {
    id: 'rule-1',
    label: '状态',
    operator: 'equal',
    value: '',
    image: 'img.png',
    ...partial,
  };
}

describe('stateVariableUtils - matchState 数值比较', () => {
  it('equal 命中相等数值', () => {
    expect(matchState(1, makeRule({ operator: 'equal', value: '1' }), 'float')).toBe(true);
  });

  it('equal 不命中不相等数值', () => {
    expect(matchState(2, makeRule({ operator: 'equal', value: '1' }), 'float')).toBe(false);
  });

  it('notEqual 命中不相等数值', () => {
    expect(matchState(2, makeRule({ operator: 'notEqual', value: '1' }), 'float')).toBe(true);
  });

  it('greaterThan / greaterOrEqual 边界正确', () => {
    expect(matchState(5, makeRule({ operator: 'greaterThan', value: '3' }), 'int')).toBe(true);
    expect(matchState(3, makeRule({ operator: 'greaterThan', value: '3' }), 'int')).toBe(false);
    expect(matchState(3, makeRule({ operator: 'greaterOrEqual', value: '3' }), 'int')).toBe(true);
  });

  it('lessThan / lessOrEqual 边界正确', () => {
    expect(matchState(1, makeRule({ operator: 'lessThan', value: '3' }), 'int')).toBe(true);
    expect(matchState(3, makeRule({ operator: 'lessThan', value: '3' }), 'int')).toBe(false);
    expect(matchState(3, makeRule({ operator: 'lessOrEqual', value: '3' }), 'int')).toBe(true);
  });

  it('between 闭区间命中正确', () => {
    const rule = makeRule({ operator: 'between', value: '0', value2: '30' });
    expect(matchState(0, rule, 'float')).toBe(true);
    expect(matchState(15, rule, 'float')).toBe(true);
    expect(matchState(30, rule, 'float')).toBe(true);
    expect(matchState(31, rule, 'float')).toBe(false);
  });
});

describe('stateVariableUtils - matchState 字符串比较', () => {
  it('equal / notEqual 字符串比较', () => {
    expect(matchState('running', makeRule({ operator: 'equal', value: 'running' }), 'string')).toBe(true);
    expect(matchState('running', makeRule({ operator: 'notEqual', value: 'fault' }), 'string')).toBe(true);
  });

  it('contains / startsWith / endsWith 命中正确', () => {
    expect(matchState('motor-running', makeRule({ operator: 'contains', value: 'running' }), 'string')).toBe(true);
    expect(matchState('running-01', makeRule({ operator: 'startsWith', value: 'running' }), 'string')).toBe(true);
    expect(matchState('pump-running', makeRule({ operator: 'endsWith', value: 'running' }), 'string')).toBe(true);
  });
});

describe('stateVariableUtils - matchState 布尔与边界', () => {
  it('布尔归一化 "1"/"true" 命中', () => {
    expect(matchState(1, makeRule({ operator: 'equal', value: '1' }), 'bool')).toBe(true);
    expect(matchState('true', makeRule({ operator: 'equal', value: 'true' }), 'boolean')).toBe(true);
    expect(matchState(false, makeRule({ operator: 'notEqual', value: '1' }), 'bool')).toBe(true);
  });

  it('null / undefined 不命中', () => {
    expect(matchState(null, makeRule({ operator: 'equal', value: '1' }), 'float')).toBe(false);
    expect(matchState(undefined, makeRule({ operator: 'equal', value: '1' }), 'float')).toBe(false);
  });

  it('字符串类型配置 greaterThan 不命中且不抛异常', () => {
    expect(matchState('abc', makeRule({ operator: 'greaterThan', value: '1' }), 'string')).toBe(false);
  });
});

describe('stateVariableUtils - resolveStateImage', () => {
  it('命中第一条规则后停止（first match wins）', () => {
    const states = [
      makeRule({ id: 'a', operator: 'equal', value: '1', image: 'first.png' }),
      makeRule({ id: 'b', operator: 'equal', value: '1', image: 'second.png' }),
    ];
    expect(resolveStateImage(1, states, 'int', '')).toBe('first.png');
  });

  it('未命中返回 defaultImage', () => {
    const states = [makeRule({ operator: 'equal', value: '1', image: 'hit.png' })];
    expect(resolveStateImage(2, states, 'int', 'default.png')).toBe('default.png');
  });

  it('未命中且无默认图返回空字符串', () => {
    const states = [makeRule({ operator: 'equal', value: '1', image: 'hit.png' })];
    expect(resolveStateImage(2, states, 'int', '')).toBe('');
  });

  it('规则 image 为空时跳过', () => {
    const states = [makeRule({ operator: 'equal', value: '1', image: '' })];
    expect(resolveStateImage(1, states, 'int', 'default.png')).toBe('default.png');
  });
});

describe('stateVariableUtils - getAvailableOperators / generateRuleId', () => {
  it('数值类型返回区间运算符', () => {
    expect(getAvailableOperators('float')).toContain('between');
    expect(getAvailableOperators('int')).toContain('greaterThan');
  });

  it('SCADA 实际数值类型（float32/float64/int16/uint16/int32/uint32）返回完整数值运算符', () => {
    for (const dataType of ['float32', 'float64', 'int16', 'uint16', 'int32', 'uint32']) {
      const ops = getAvailableOperators(dataType);
      expect(ops).toContain('greaterThan');
      expect(ops).toContain('greaterOrEqual');
      expect(ops).toContain('lessThan');
      expect(ops).toContain('lessOrEqual');
      expect(ops).toContain('between');
    }
  });

  it('布尔类型仅返回 equal / notEqual', () => {
    expect(getAvailableOperators('bool')).toEqual(['equal', 'notEqual']);
  });

  it('字符串类型返回字符串运算符', () => {
    expect(getAvailableOperators('string')).toContain('contains');
    expect(getAvailableOperators('string')).toContain('startsWith');
    expect(getAvailableOperators('string')).toContain('endsWith');
  });

  it('generateRuleId 返回 rule- 前缀唯一字符串', () => {
    const a = generateRuleId();
    const b = generateRuleId();
    expect(a.startsWith('rule-')).toBe(true);
    expect(a).not.toBe(b);
  });
});
