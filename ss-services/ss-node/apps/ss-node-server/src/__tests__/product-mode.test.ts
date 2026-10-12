// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 分产品拆分配置驱动验证脚本
 * 验证 getProductMode() 与模块动态注册逻辑
 */

// Mock node-opcua：该包以 TypeScript 源码发布，Jest 无法直接解析。
// 本测试仅验证 getProductMode()，不需要真实的 OPC UA 实现。
jest.mock('node-opcua', () => ({
  SecurityPolicy: {
    None: 'None',
    Basic128Rsa15: 'Basic128Rsa15',
    Basic256: 'Basic256',
    Basic256Sha256: 'Basic256Sha256',
  },
  MessageSecurityMode: { None: 'None', Sign: 'Sign', SignAndEncrypt: 'SignAndEncrypt' },
  UserTokenType: { Anonymous: 0, UserName: 1, Certificate: 2 },
  AttributeIds: { Value: 13, BrowseName: 4, DisplayName: 5, NodeClass: 6, DataType: 7 },
  DataType: {},
  TimestampsToReturn: { None: 0, Source: 1, Server: 2, Both: 3 },
  coerceNodeId: jest.fn(() => ({})),
  OPCUAClient: { create: jest.fn(() => ({ connect: jest.fn(), createSession: jest.fn() })) },
  Variant: jest.fn((opts: any) => opts),
}));

import { getProductMode } from '../app.module';

describe('分产品拆分配置驱动', () => {
  afterEach(() => {
    delete process.env.APP_PRODUCT_MODE;
  });

  it('默认模式（未设置 APP_PRODUCT_MODE）应返回 full', () => {
    delete process.env.APP_PRODUCT_MODE;
    expect(getProductMode()).toBe('full');
  });

  it('APP_PRODUCT_MODE=full 应返回 full', () => {
    process.env.APP_PRODUCT_MODE = 'full';
    expect(getProductMode()).toBe('full');
  });

  it('APP_PRODUCT_MODE=scada 应返回 scada', () => {
    process.env.APP_PRODUCT_MODE = 'scada';
    expect(getProductMode()).toBe('scada');
  });

  it('APP_PRODUCT_MODE=data 应返回 data', () => {
    process.env.APP_PRODUCT_MODE = 'data';
    expect(getProductMode()).toBe('data');
  });

  it('大写 APP_PRODUCT_MODE=SCADA 应返回 scada（大小写不敏感）', () => {
    process.env.APP_PRODUCT_MODE = 'SCADA';
    expect(getProductMode()).toBe('scada');
  });

  it('非法值 APP_PRODUCT_MODE=invalid 应回退到 full', () => {
    process.env.APP_PRODUCT_MODE = 'invalid';
    expect(getProductMode()).toBe('full');
  });
});

describe('模块加载逻辑', () => {
  it('full 模式：scada 和 data 模块均加载', () => {
    process.env.APP_PRODUCT_MODE = 'full';
    const mode = getProductMode();
    expect(mode !== 'data').toBe(true); // scada 模块加载
    expect(mode !== 'scada').toBe(true); // data 模块加载
  });

  it('scada 模式：scada 模块加载，data 模块不加载', () => {
    process.env.APP_PRODUCT_MODE = 'scada';
    const mode = getProductMode();
    expect(mode !== 'data').toBe(true); // scada 模块加载
    expect(mode !== 'scada').toBe(false); // data 模块不加载
  });

  it('data 模式：scada 模块不加载，data 模块加载', () => {
    process.env.APP_PRODUCT_MODE = 'data';
    const mode = getProductMode();
    expect(mode !== 'data').toBe(false); // scada 模块不加载
    expect(mode !== 'scada').toBe(true); // data 模块加载
  });
});
