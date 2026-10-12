// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Mock日期时间（用于时间相关测试）
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

// 全局错误处理
process.on('unhandledRejection', (error) => {
  fail(`Unhandled Promise Rejection: ${error}`);
});
