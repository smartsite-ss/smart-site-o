// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ISaveService, SaveServiceConfig, ProjectData, SaveStatus } from './types';

/**
 * 保存服务管理器
 * 管理不同类型的保存服务实现
 */
export class SaveServiceManager {
  private service: ISaveService | null = null;
  private status: SaveStatus = 'idle';
  private lastSavedTime: number | null = null;
  private statusListeners: Set<(status: SaveStatus) => void> = new Set();

  /**
   * 检查保存服务是否已初始化
   */
  isInitialized(): boolean {
    return this.service !== null;
  }

  /**
   * 获取当前保存状态
   */
  getStatus(): SaveStatus {
    return this.status;
  }

  /**
   * 获取最后保存时间
   */
  getLastSavedTime(): number | null {
    return this.lastSavedTime;
  }

  /**
   * 注册保存状态监听器
   */
  onStatusChange(listener: (status: SaveStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * 初始化保存服务
   */
  init(config: SaveServiceConfig, customService?: ISaveService): void {
    if (customService) {
      this.service = customService;
      return;
    }

    switch (config.type) {
      case 'local':
        this.service = this.createLocalService();
        break;
      case 'mock':
        this.service = this.createMockService();
        break;
      case 'server':
        if (!config.apiBaseUrl) {
          throw new Error('server 模式需要配置 apiBaseUrl');
        }
        this.service = this.createServerService(config.apiBaseUrl);
        break;
      default:
        this.service = this.createLocalService();
    }
  }

  /**
   * 保存项目
   */
  async save(data: ProjectData): Promise<void> {
    if (!this.service) {
      throw new Error('SaveService 未初始化，请先调用 init()');
    }

    try {
      this.updateStatus('saving');
      if (!data.pages || data.pages.length === 0) {
        console.warn('[SaveServiceManager] save: pages is empty, this may cause server 400 error');
      }
      await this.service.save(data);
      this.lastSavedTime = Date.now();
      this.updateStatus('success');
    } catch (error: any) {
      this.updateStatus('error');
      throw error;
    }
  }

  /**
   * 加载项目
   */
  async load(): Promise<ProjectData | null> {
    if (!this.service) {
      throw new Error('SaveService 未初始化，请先调用 init()');
    }

    const data = await this.service.load();
    if (data) {
      this.lastSavedTime = data.savedAt;
    }
    return data;
  }

  /**
   * 删除保存数据
   */
  async delete(): Promise<void> {
    if (!this.service) {
      throw new Error('SaveService 未初始化，请先调用 init()');
    }
    await this.service.delete();
    this.lastSavedTime = null;
  }

  /**
   * 检查是否有已保存的数据
   */
  async hasSavedData(): Promise<boolean> {
    if (!this.service) {
      throw new Error('SaveService 未初始化，请先调用 init()');
    }
    return this.service.hasSavedData();
  }

  // ==================== 内置服务实现 ====================

  /**
   * 创建 localStorage 服务
   */
  private createLocalService(): ISaveService {
    const STORAGE_KEY = 'scada-editor-project';

    return {
      async save(data: ProjectData): Promise<void> {
        const jsonString = JSON.stringify(data);
        localStorage.setItem(STORAGE_KEY, jsonString);
      },

      async load(): Promise<ProjectData | null> {
        const jsonString = localStorage.getItem(STORAGE_KEY);
        if (!jsonString) {
          return null;
        }
        return JSON.parse(jsonString);
      },

      async delete(): Promise<void> {
        localStorage.removeItem(STORAGE_KEY);
      },

      async hasSavedData(): Promise<boolean> {
        return !!localStorage.getItem(STORAGE_KEY);
      }
    };
  }

  /**
   * 创建 Mock 服务（仅用于演示）
   */
  private createMockService(): ISaveService {
    let mockData: ProjectData | null = null;

    return {
      async save(data: ProjectData): Promise<void> {
        mockData = { ...data, savedAt: Date.now() };
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500));
      },

      async load(): Promise<ProjectData | null> {
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockData;
      },

      async delete(): Promise<void> {
        mockData = null;
      },

      async hasSavedData(): Promise<boolean> {
        return !!mockData;
      }
    };
  }

  /**
   * 创建 Server 服务（预留接口）
   */
  private createServerService(apiBaseUrl: string): ISaveService {
    const createApiUrl = (path: string) => `${apiBaseUrl}${path}`;

    return {
      async save(data: ProjectData): Promise<void> {
        const response = await fetch(createApiUrl('/api/save'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error(`保存失败: ${response.status}`);
        }
      },

      async load(): Promise<ProjectData | null> {
        const response = await fetch(createApiUrl('/api/load'));
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`加载失败: ${response.status}`);
        }
        return response.json();
      },

      async delete(): Promise<void> {
        const response = await fetch(createApiUrl('/api/delete'), {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error(`删除失败: ${response.status}`);
        }
      },

      async hasSavedData(): Promise<boolean> {
        try {
          const response = await fetch(createApiUrl('/api/exists'));
          return response.ok;
        } catch {
          return false;
        }
      }
    };
  }

  /**
   * 更新状态
   */
  private updateStatus(status: SaveStatus): void {
    this.status = status;
    this.statusListeners.forEach(listener => listener(status));
  }
}

/**
 * 全局单例
 */
export const saveServiceManager = new SaveServiceManager();
