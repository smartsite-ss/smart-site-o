// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsolationFactory } from '../isolation-factory';
import { IProtocolAdapter } from '../../../types';
import { IsolationMode } from '../../plugin.types';

// ============================================================
// Mock PluginRegistry
// ============================================================
const createMockRegistry = (mode: IsolationMode = IsolationMode.IN_PROCESS) => {
  const mockAdapter: jest.Mocked<IProtocolAdapter> = {
    connect: jest.fn().mockResolvedValue({ id: 'mock-client' }),
    readTag: jest.fn().mockResolvedValue(42),
    writeTag: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  } as any;

  const getPlugin = jest.fn().mockReturnValue({
    protocol: 'test',
    meta: { isolationMode: mode },
    status: 'active',
    adapter: mockAdapter,
  });
  const getAdapter = jest.fn().mockReturnValue(mockAdapter);

  return {
    getPlugin,
    getAdapter,
    mockAdapter,
  };
};

// ============================================================
// Mock EventBusService
// ============================================================
const createMockEventBus = () => ({
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  removeAllListeners: jest.fn(),
  eventNames: jest.fn().mockReturnValue([]),
  listenerCount: jest.fn().mockReturnValue(0),
  listeners: jest.fn().mockReturnValue([]),
  rawListeners: jest.fn().mockReturnValue([]),
  hasListeners: jest.fn().mockReturnValue(false),
  waitFor: jest.fn(),
  emitAsync: jest.fn(),
  emitMany: jest.fn(),
  addListener: jest.fn(),
  prependListener: jest.fn(),
  prependOnceListener: jest.fn(),
  removeListener: jest.fn(),
  setMaxListeners: jest.fn(),
  getMaxListeners: jest.fn().mockReturnValue(10),
  listenTo: jest.fn(),
  stopListeningTo: jest.fn(),
  toJSON: jest.fn().mockReturnValue({}),
  eventBus: {} as any,
});

// ============================================================
// 测试套件
// ============================================================
describe('IsolationFactory', () => {
  describe('getExecutor', () => {
    it('IN_PROCESS 模式应创建 InProcessExecutor', () => {
      const { getPlugin, getAdapter } = createMockRegistry(IsolationMode.IN_PROCESS);
      const factory = new IsolationFactory(
        {
          getPlugin,
          getAdapter,
          listPlugins: jest.fn(),
          listPluginsWithRuntime: jest.fn(),
          getRegisteredPlugins: jest.fn(),
          getRegisteredPlugin: jest.fn(),
          register: jest.fn(),
          unregister: jest.fn(),
          updatePlugin: jest.fn(),
          setPluginStatus: jest.fn(),
          getProtocols: jest.fn(),
          hasProtocol: jest.fn(),
          size: jest.fn(),
          clear: jest.fn(),
          getPluginConfig: jest.fn(),
          getPluginConfigs: jest.fn(),
          getPluginMeta: jest.fn(),
          getPluginViewModel: jest.fn(),
        } as any,
        createMockEventBus() as any,
      );

      const executor = factory.getExecutor('test');
      expect(executor.name).toBe('InProcess');
    });

    it('WORKER_THREAD 模式应创建 WorkerThreadExecutor', () => {
      const { getPlugin, getAdapter } = createMockRegistry(IsolationMode.WORKER_THREAD);
      const factory = new IsolationFactory(
        {
          getPlugin,
          getAdapter,
          listPlugins: jest.fn(),
          listPluginsWithRuntime: jest.fn(),
          getRegisteredPlugins: jest.fn(),
          getRegisteredPlugin: jest.fn(),
          register: jest.fn(),
          unregister: jest.fn(),
          updatePlugin: jest.fn(),
          setPluginStatus: jest.fn(),
          getProtocols: jest.fn(),
          hasProtocol: jest.fn(),
          size: jest.fn(),
          clear: jest.fn(),
          getPluginConfig: jest.fn(),
          getPluginConfigs: jest.fn(),
          getPluginMeta: jest.fn(),
          getPluginViewModel: jest.fn(),
        } as any,
        createMockEventBus() as any,
      );

      const executor = factory.getExecutor('test');
      expect(executor.name).toBe('WorkerThread');
    });

    it('CHILD_PROCESS 模式应创建 ChildProcessExecutor', () => {
      const { getPlugin, getAdapter } = createMockRegistry(IsolationMode.CHILD_PROCESS);
      const factory = new IsolationFactory(
        {
          getPlugin,
          getAdapter,
          listPlugins: jest.fn(),
          listPluginsWithRuntime: jest.fn(),
          getRegisteredPlugins: jest.fn(),
          getRegisteredPlugin: jest.fn(),
          register: jest.fn(),
          unregister: jest.fn(),
          updatePlugin: jest.fn(),
          setPluginStatus: jest.fn(),
          getProtocols: jest.fn(),
          hasProtocol: jest.fn(),
          size: jest.fn(),
          clear: jest.fn(),
          getPluginConfig: jest.fn(),
          getPluginConfigs: jest.fn(),
          getPluginMeta: jest.fn(),
          getPluginViewModel: jest.fn(),
        } as any,
        createMockEventBus() as any,
      );

      const executor = factory.getExecutor('test');
      expect(executor.name).toBe('ChildProcess');
    });

    it('同一协议多次调用应返回同一 executor', () => {
      const { getPlugin, getAdapter } = createMockRegistry(IsolationMode.IN_PROCESS);
      const factory = new IsolationFactory(
        {
          getPlugin,
          getAdapter,
          listPlugins: jest.fn(),
          listPluginsWithRuntime: jest.fn(),
          getRegisteredPlugins: jest.fn(),
          getRegisteredPlugin: jest.fn(),
          register: jest.fn(),
          unregister: jest.fn(),
          updatePlugin: jest.fn(),
          setPluginStatus: jest.fn(),
          getProtocols: jest.fn(),
          hasProtocol: jest.fn(),
          size: jest.fn(),
          clear: jest.fn(),
          getPluginConfig: jest.fn(),
          getPluginConfigs: jest.fn(),
          getPluginMeta: jest.fn(),
          getPluginViewModel: jest.fn(),
        } as any,
        createMockEventBus() as any,
      );

      const executor1 = factory.getExecutor('test');
      const executor2 = factory.getExecutor('test');
      expect(executor1).toBe(executor2);
    });

    it('无插件信息时默认使用 IN_PROCESS', () => {
      const getPlugin = jest.fn().mockReturnValue(undefined);
      const factory = new IsolationFactory(
        {
          getPlugin,
          getAdapter: jest.fn(),
          listPlugins: jest.fn(),
          listPluginsWithRuntime: jest.fn(),
          getRegisteredPlugins: jest.fn(),
          getRegisteredPlugin: jest.fn(),
          register: jest.fn(),
          unregister: jest.fn(),
          updatePlugin: jest.fn(),
          setPluginStatus: jest.fn(),
          getProtocols: jest.fn(),
          hasProtocol: jest.fn(),
          size: jest.fn(),
          clear: jest.fn(),
          getPluginConfig: jest.fn(),
          getPluginConfigs: jest.fn(),
          getPluginMeta: jest.fn(),
          getPluginViewModel: jest.fn(),
        } as any,
        createMockEventBus() as any,
      );

      const executor = factory.getExecutor('unknown');
      expect(executor.name).toBe('InProcess');
    });
  });

  describe('isIsolated', () => {
    it('IN_PROCESS 模式返回 false', () => {
      const { getPlugin, getAdapter } = createMockRegistry(IsolationMode.IN_PROCESS);
      const factory = new IsolationFactory(
        {
          getPlugin,
          getAdapter,
          listPlugins: jest.fn(),
          listPluginsWithRuntime: jest.fn(),
          getRegisteredPlugins: jest.fn(),
          getRegisteredPlugin: jest.fn(),
          register: jest.fn(),
          unregister: jest.fn(),
          updatePlugin: jest.fn(),
          setPluginStatus: jest.fn(),
          getProtocols: jest.fn(),
          hasProtocol: jest.fn(),
          size: jest.fn(),
          clear: jest.fn(),
          getPluginConfig: jest.fn(),
          getPluginConfigs: jest.fn(),
          getPluginMeta: jest.fn(),
          getPluginViewModel: jest.fn(),
        } as any,
        createMockEventBus() as any,
      );

      expect(factory.isIsolated('test')).toBe(false);
    });

    it('WORKER_THREAD 模式返回 true', () => {
      const { getPlugin, getAdapter } = createMockRegistry(IsolationMode.WORKER_THREAD);
      const factory = new IsolationFactory(
        {
          getPlugin,
          getAdapter,
          listPlugins: jest.fn(),
          listPluginsWithRuntime: jest.fn(),
          getRegisteredPlugins: jest.fn(),
          getRegisteredPlugin: jest.fn(),
          register: jest.fn(),
          unregister: jest.fn(),
          updatePlugin: jest.fn(),
          setPluginStatus: jest.fn(),
          getProtocols: jest.fn(),
          hasProtocol: jest.fn(),
          size: jest.fn(),
          clear: jest.fn(),
          getPluginConfig: jest.fn(),
          getPluginConfigs: jest.fn(),
          getPluginMeta: jest.fn(),
          getPluginViewModel: jest.fn(),
        } as any,
        createMockEventBus() as any,
      );

      expect(factory.isIsolated('test')).toBe(true);
    });
  });

  describe('prepare', () => {
    it('IN_PROCESS 模式无需预热', async () => {
      const { getPlugin, getAdapter } = createMockRegistry(IsolationMode.IN_PROCESS);
      const factory = new IsolationFactory(
        {
          getPlugin,
          getAdapter,
          listPlugins: jest.fn(),
          listPluginsWithRuntime: jest.fn(),
          getRegisteredPlugins: jest.fn(),
          getRegisteredPlugin: jest.fn(),
          register: jest.fn(),
          unregister: jest.fn(),
          updatePlugin: jest.fn(),
          setPluginStatus: jest.fn(),
          getProtocols: jest.fn(),
          hasProtocol: jest.fn(),
          size: jest.fn(),
          clear: jest.fn(),
          getPluginConfig: jest.fn(),
          getPluginConfigs: jest.fn(),
          getPluginMeta: jest.fn(),
          getPluginViewModel: jest.fn(),
        } as any,
        createMockEventBus() as any,
      );

      await factory.prepare('test');
      expect(getAdapter).not.toHaveBeenCalled(); // prepare 不调用 getAdapter
    });

    it('协议不存在时不应报错', async () => {
      const getPlugin = jest.fn().mockReturnValue(undefined);
      const factory = new IsolationFactory(
        {
          getPlugin,
          getAdapter: jest.fn(),
          listPlugins: jest.fn(),
          listPluginsWithRuntime: jest.fn(),
          getRegisteredPlugins: jest.fn(),
          getRegisteredPlugin: jest.fn(),
          register: jest.fn(),
          unregister: jest.fn(),
          updatePlugin: jest.fn(),
          setPluginStatus: jest.fn(),
          getProtocols: jest.fn(),
          hasProtocol: jest.fn(),
          size: jest.fn(),
          clear: jest.fn(),
          getPluginConfig: jest.fn(),
          getPluginConfigs: jest.fn(),
          getPluginMeta: jest.fn(),
          getPluginViewModel: jest.fn(),
        } as any,
        createMockEventBus() as any,
      );

      await expect(factory.prepare('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('getAllHealth', () => {
    it('应该返回所有 executor 的健康状态', async () => {
      const { getPlugin, getAdapter } = createMockRegistry(IsolationMode.IN_PROCESS);
      const factory = new IsolationFactory(
        {
          getPlugin,
          getAdapter,
          listPlugins: jest.fn(),
          listPluginsWithRuntime: jest.fn(),
          getRegisteredPlugins: jest.fn(),
          getRegisteredPlugin: jest.fn(),
          register: jest.fn(),
          unregister: jest.fn(),
          updatePlugin: jest.fn(),
          setPluginStatus: jest.fn(),
          getProtocols: jest.fn(),
          hasProtocol: jest.fn(),
          size: jest.fn(),
          clear: jest.fn(),
          getPluginConfig: jest.fn(),
          getPluginConfigs: jest.fn(),
          getPluginMeta: jest.fn(),
          getPluginViewModel: jest.fn(),
        } as any,
        createMockEventBus() as any,
      );

      factory.getExecutor('test');
      const health = await factory.getAllHealth();

      expect(health.has('test')).toBe(true);
      expect(health.get('test').status).toBe('healthy');
    });
  });

  describe('onModuleDestroy', () => {
    it('应该销毁所有 executor', async () => {
      const { getPlugin, getAdapter } = createMockRegistry(IsolationMode.IN_PROCESS);
      const factory = new IsolationFactory(
        {
          getPlugin,
          getAdapter,
          listPlugins: jest.fn(),
          listPluginsWithRuntime: jest.fn(),
          getRegisteredPlugins: jest.fn(),
          getRegisteredPlugin: jest.fn(),
          register: jest.fn(),
          unregister: jest.fn(),
          updatePlugin: jest.fn(),
          setPluginStatus: jest.fn(),
          getProtocols: jest.fn(),
          hasProtocol: jest.fn(),
          size: jest.fn(),
          clear: jest.fn(),
          getPluginConfig: jest.fn(),
          getPluginConfigs: jest.fn(),
          getPluginMeta: jest.fn(),
          getPluginViewModel: jest.fn(),
        } as any,
        createMockEventBus() as any,
      );

      factory.getExecutor('test');
      await factory.onModuleDestroy();

      const health = await factory.getAllHealth();
      expect(health.size).toBe(0);
    });
  });
});
