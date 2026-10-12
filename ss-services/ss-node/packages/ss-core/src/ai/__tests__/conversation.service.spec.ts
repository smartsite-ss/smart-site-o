// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 对话持久化 Service 单元测试 — P2-T08
 */

import { ConversationService, ContextWindowConfig } from '../conversation.service';
import { AiMessage } from '../entities/ai-conversation.entity';

function makeService() {
  const mockConvRepo: any = {
    create: jest.fn((dto) => ({ ...dto, id: 'conv-1' })),
    save: jest.fn((entity) => Promise.resolve(entity)),
    find: jest.fn(() => Promise.resolve([])),
    findOne: jest.fn(() => Promise.resolve(null)),
    update: jest.fn(() => Promise.resolve({})),
    delete: jest.fn(() => Promise.resolve({})),
    increment: jest.fn(() => Promise.resolve({})),
  };

  const mockMsgRepo: any = {
    create: jest.fn((dto) => ({ ...dto, id: 'msg-1' })),
    save: jest.fn((entity) => Promise.resolve(entity)),
    find: jest.fn(() => Promise.resolve([])),
    findOne: jest.fn(() => Promise.resolve(null)),
    delete: jest.fn(() => Promise.resolve({})),
    maximum: jest.fn(() => Promise.resolve(0)),
  };

  return { service: new ConversationService(mockConvRepo, mockMsgRepo), mockConvRepo, mockMsgRepo };
}

describe('ConversationService — 会话 CRUD', () => {
  it('应创建会话', async () => {
    const { service, mockConvRepo } = makeService();
    const conv = await service.createConversation({
      projectId: 'proj-1',
      userId: 'user-1',
      title: '测试会话',
    });
    expect(conv.title).toBe('测试会话');
    expect(mockConvRepo.save).toHaveBeenCalledTimes(1);
  });

  it('应列出会话', async () => {
    const { service, mockConvRepo } = makeService();
    mockConvRepo.find = jest.fn(() =>
      Promise.resolve([
        { id: 'conv-1', title: 'A', archived: 0 },
        { id: 'conv-2', title: 'B', archived: 0 },
      ]),
    );
    const list = await service.listConversations('user-1', 'proj-1');
    expect(list.length).toBe(2);
  });

  it('应获取会话', async () => {
    const { service, mockConvRepo } = makeService();
    mockConvRepo.findOne = jest.fn(() => Promise.resolve({ id: 'conv-1', title: 'X' }));
    const conv = await service.getConversation('conv-1');
    expect(conv?.title).toBe('X');
  });

  it('应更新标题', async () => {
    const { service, mockConvRepo } = makeService();
    await service.updateTitle('conv-1', '新标题');
    expect(mockConvRepo.update).toHaveBeenCalledWith('conv-1', { title: '新标题' });
  });

  it('应归档会话', async () => {
    const { service, mockConvRepo } = makeService();
    await service.archiveConversation('conv-1', true);
    expect(mockConvRepo.update).toHaveBeenCalledWith('conv-1', { archived: 1 });
  });

  it('应删除会话及消息', async () => {
    const { service, mockConvRepo, mockMsgRepo } = makeService();
    await service.deleteConversation('conv-1');
    expect(mockMsgRepo.delete).toHaveBeenCalledWith({ conversationId: 'conv-1' });
    expect(mockConvRepo.delete).toHaveBeenCalledWith('conv-1');
  });
});

describe('ConversationService — 消息 CRUD', () => {
  it('应追加消息', async () => {
    const { service, mockMsgRepo } = makeService();
    await service.appendMessage('conv-1', { role: 'user', content: 'hello' });
    expect(mockMsgRepo.save).toHaveBeenCalled();
    expect(mockMsgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', content: 'hello', seq: 1 }),
    );
  });

  it('应批量保存消息', async () => {
    const { service, mockMsgRepo } = makeService();
    const msgs = [
      { role: 'user' as const, content: 'hi' },
      { role: 'assistant' as const, content: 'hello' },
    ];
    await service.saveMessages('conv-1', msgs);
    expect(mockMsgRepo.save).toHaveBeenCalledTimes(1);
    expect(mockMsgRepo.create).toHaveBeenCalledTimes(2);
  });

  it('应获取消息', async () => {
    const { service, mockMsgRepo } = makeService();
    mockMsgRepo.find = jest.fn(() =>
      Promise.resolve([
        { seq: 1, role: 'user', content: 'hi' },
        { seq: 2, role: 'assistant', content: 'hello' },
      ]),
    );
    const msgs = await service.getMessages('conv-1');
    expect(msgs.length).toBe(2);
  });
});

describe('ConversationService — 上下文窗口管理', () => {
  function makeMessages(count: number): AiMessage[] {
    return Array.from(
      { length: count },
      (_, i) =>
        ({
          id: `msg-${i}`,
          conversationId: 'conv-1',
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `message ${i}`,
          toolCalls: null,
          toolCallId: null,
          toolName: null,
          tokens: 10,
          seq: i + 1,
          createdAt: new Date(),
        }) as AiMessage,
    );
  }

  it('FIFO 策略应保留最近 N 条', async () => {
    const { service, mockMsgRepo } = makeService();
    const allMsgs = makeMessages(60);
    mockMsgRepo.find = jest.fn(() => Promise.resolve(allMsgs));

    const config: Partial<ContextWindowConfig> = {
      strategy: 'fifo',
      maxMessages: 10,
      maxTokens: 99999,
      summaryRatio: 0.3,
    };
    const history = await service.getConversationHistory('conv-1', config);
    expect(history.length).toBeLessThanOrEqual(10);
    // 应保留最后一条
    expect(history[history.length - 1].content).toContain('59');
  });

  it('消息数不超限时应返回全部', async () => {
    const { service, mockMsgRepo } = makeService();
    const allMsgs = makeMessages(5);
    mockMsgRepo.find = jest.fn(() => Promise.resolve(allMsgs));

    const history = await service.getConversationHistory('conv-1');
    expect(history.length).toBe(5);
  });

  it('Sliding 策略应保留头部+尾部', async () => {
    const { service, mockMsgRepo } = makeService();
    const allMsgs = makeMessages(30);
    mockMsgRepo.find = jest.fn(() => Promise.resolve(allMsgs));

    const config: Partial<ContextWindowConfig> = {
      strategy: 'sliding',
      maxMessages: 10,
      maxTokens: 99999,
      summaryRatio: 0.3,
    };
    const history = await service.getConversationHistory('conv-1', config);
    expect(history.length).toBeLessThanOrEqual(10);
  });

  it('Summary 策略应保留比例', async () => {
    const { service, mockMsgRepo } = makeService();
    const allMsgs = makeMessages(20);
    mockMsgRepo.find = jest.fn(() => Promise.resolve(allMsgs));

    const config: Partial<ContextWindowConfig> = {
      strategy: 'summary',
      maxMessages: 10,
      maxTokens: 99999,
      summaryRatio: 0.3,
    };
    const history = await service.getConversationHistory('conv-1', config);
    expect(history.length).toBeLessThanOrEqual(10);
  });

  it('按 Token 截断应限制消息数', () => {
    const { service } = makeService();
    const messages = makeMessages(20).map((_m) => ({
      role: 'user' as const,
      content: 'x'.repeat(100),
    }));

    const truncated = service.truncateByTokens(messages, 50);
    expect(truncated.length).toBeLessThan(20);
  });

  it('应自动生成标题（超长截断）', async () => {
    const { service, mockConvRepo } = makeService();
    // 超过 30 个字符限制
    const longMsg = '这是一段非常非常长的用户输入文本消息用来测试标题自动截断功能是否能够正常工作';
    await service.autoGenerateTitle('conv-1', longMsg);
    expect(mockConvRepo.update).toHaveBeenCalledWith('conv-1', {
      title: longMsg.substring(0, 30) + '...',
    });
  });
});
