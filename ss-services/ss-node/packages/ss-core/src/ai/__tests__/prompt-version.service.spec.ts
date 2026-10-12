// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Prompt 版本管理 Service 单元测试 — P2-T08
 */

import { PromptVersionService } from '../prompt-version.service';

function makeService() {
  const mockPromptRepo: any = {
    create: jest.fn((dto) => ({ ...dto, id: 'prompt-1' })),
    save: jest.fn((e) => Promise.resolve({ ...e, id: e.id || 'prompt-1' })),
    find: jest.fn(() => Promise.resolve([])),
    findOne: jest.fn(() => Promise.resolve(null)),
    update: jest.fn(() => Promise.resolve({})),
  };

  const mockVersionRepo: any = {
    create: jest.fn((dto) => ({ ...dto, id: 'ver-1' })),
    save: jest.fn((e) => Promise.resolve({ ...e, id: e.id || 'ver-1' })),
    find: jest.fn(() => Promise.resolve([])),
    findOne: jest.fn(() => Promise.resolve(null)),
    update: jest.fn(() => Promise.resolve({})),
  };

  return {
    service: new PromptVersionService(mockPromptRepo, mockVersionRepo),
    mockPromptRepo,
    mockVersionRepo,
  };
}

describe('PromptVersionService — Prompt CRUD', () => {
  it('应创建 Prompt 模板', async () => {
    const { service, mockPromptRepo } = makeService();
    const prompt = await service.createPrompt({ key: 'test', name: '测试' });
    expect(prompt.key).toBe('test');
    expect(mockPromptRepo.save).toHaveBeenCalledTimes(1);
  });

  it('应列出所有 Prompt', async () => {
    const { service, mockPromptRepo } = makeService();
    mockPromptRepo.find = jest.fn(() =>
      Promise.resolve([
        { id: 'p1', key: 'a' },
        { id: 'p2', key: 'b' },
      ]),
    );
    const list = await service.listPrompts();
    expect(list.length).toBe(2);
  });

  it('应按 key 查找 Prompt', async () => {
    const { service, mockPromptRepo } = makeService();
    mockPromptRepo.findOne = jest.fn(() => Promise.resolve({ id: 'p1', key: 'test' }));
    const prompt = await service.getPromptByKey('test');
    expect(prompt?.key).toBe('test');
  });
});

describe('PromptVersionService — 版本管理', () => {
  it('应创建版本', async () => {
    const { service, mockVersionRepo } = makeService();
    const version = await service.createVersion({
      promptId: 'p1',
      version: 'v1.0',
      systemPrompt: 'You are...',
    });
    expect(version.status).toBe('draft');
    expect(mockVersionRepo.save).toHaveBeenCalledTimes(1);
  });

  it('应列出版本', async () => {
    const { service, mockVersionRepo } = makeService();
    mockVersionRepo.find = jest.fn(() =>
      Promise.resolve([
        { id: 'v1', version: 'v1.0', status: 'active' },
        { id: 'v2', version: 'v1.1', status: 'draft' },
      ]),
    );
    const list = await service.listVersions('p1');
    expect(list.length).toBe(2);
  });

  it('应获取活跃版本', async () => {
    const { service, mockVersionRepo } = makeService();
    mockVersionRepo.findOne = jest.fn(() =>
      Promise.resolve({
        id: 'v1',
        status: 'active',
        systemPrompt: 'active prompt',
      }),
    );
    const v = await service.getActiveVersion('p1');
    expect(v?.systemPrompt).toBe('active prompt');
  });

  it('应发布版本（draft → active）', async () => {
    const { service, mockVersionRepo, mockPromptRepo } = makeService();
    mockVersionRepo.findOne = jest
      .fn()
      .mockResolvedValueOnce({ id: 'v2', promptId: 'p1', status: 'draft' }) // 目标
      .mockResolvedValueOnce(null); // 旧 active 不存在

    await service.publishVersion('v2');
    expect(mockVersionRepo.update).toHaveBeenCalledWith('v2', { status: 'active' });
    expect(mockPromptRepo.update).toHaveBeenCalledWith('p1', { activeVersionId: 'v2' });
  });

  it('非 draft 版本不能发布', async () => {
    const { service, mockVersionRepo } = makeService();
    mockVersionRepo.findOne = jest.fn(() =>
      Promise.resolve({
        id: 'v1',
        promptId: 'p1',
        status: 'active',
      }),
    );
    await expect(service.publishVersion('v1')).rejects.toThrow('不是 draft 状态');
  });

  it('应回滚版本', async () => {
    const { service, mockVersionRepo } = makeService();
    mockVersionRepo.findOne = jest
      .fn()
      .mockResolvedValueOnce({ id: 'v2', promptId: 'p1', status: 'archived' }) // 目标
      .mockResolvedValueOnce({ id: 'v1', promptId: 'p1', status: 'active' }); // 当前

    await service.rollbackToVersion('v2');
    expect(mockVersionRepo.update).toHaveBeenCalledWith('v1', { status: 'archived' });
    expect(mockVersionRepo.update).toHaveBeenCalledWith('v2', { status: 'active' });
  });
});

describe('PromptVersionService — 模板渲染', () => {
  it('应渲染模板变量', () => {
    const { service } = makeService();
    const result = service.renderTemplate('你好 {{name}}，设备 {{device}}', {
      name: '张三',
      device: '水泵1号',
    });
    expect(result).toBe('你好 张三，设备 水泵1号');
  });

  it('缺失变量应保留原占位符', () => {
    const { service } = makeService();
    const result = service.renderTemplate('你好 {{name}}', {});
    expect(result).toBe('你好 {{name}}');
  });

  it('应获取并渲染活跃版本 Prompt', async () => {
    const { service, mockPromptRepo, mockVersionRepo } = makeService();
    mockPromptRepo.findOne = jest.fn(() => Promise.resolve({ id: 'p1', key: 'test' }));
    mockVersionRepo.findOne = jest.fn(() =>
      Promise.resolve({
        id: 'v1',
        systemPrompt: '设备 {{device}} 温度 {{temp}}',
        status: 'active',
      }),
    );

    const rendered = await service.getRenderedSystemPrompt('test', {
      device: '水泵1号',
      temp: '85°C',
    });
    expect(rendered).toBe('设备 水泵1号 温度 85°C');
  });
});
