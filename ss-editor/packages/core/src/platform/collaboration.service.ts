// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '../types';

/**
 * 协作服务
 * 支持多人协作编辑功能
 */
export class CollaborationService {
  private static instance: CollaborationService;
  private socket: WebSocket | null = null;
  private userId: string;
  private userName: string;
  private listeners: Map<string, ((...args: any[]) => any)[]> = new Map();
  private isConnected: boolean = false;

  private constructor() {
    this.userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.userName = `User ${Math.floor(Math.random() * 1000)}`;
  }

  static getInstance(): CollaborationService {
    if (!CollaborationService.instance) {
      CollaborationService.instance = new CollaborationService();
    }
    return CollaborationService.instance;
  }

  /**
   * 连接到协作服务器
   * @param url 服务器 URL
   */
  connect(url: string = 'ws://localhost:8800'): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          ('协作服务器连接成功');
          this.isConnected = true;
          this.send({
            type: 'join',
            userId: this.userId,
            userName: this.userName,
          });
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onclose = () => {
          ('协作服务器连接关闭');
          this.isConnected = false;
        };

        this.socket.onerror = (error) => {
          console.error('协作服务器连接错误:', error);
          this.isConnected = false;
          resolve(false);
        };
      } catch (error) {
        console.error('连接协作服务器失败:', error);
        resolve(false);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * 发送消息
   * @param message 消息内容
   */
  private send(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  /**
   * 处理收到的消息
   * @param data 消息数据
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      const { type, payload } = message;

      switch (type) {
        case 'userJoined':
          this.emit('userJoined', payload);
          break;
        case 'userLeft':
          this.emit('userLeft', payload);
          break;
        case 'graphicAdded':
          this.emit('graphicAdded', payload);
          break;
        case 'graphicUpdated':
          this.emit('graphicUpdated', payload);
          break;
        case 'graphicDeleted':
          this.emit('graphicDeleted', payload);
          break;
        case 'selectionChanged':
          this.emit('selectionChanged', payload);
          break;
        case 'cursorMoved':
          this.emit('cursorMoved', payload);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('处理协作消息失败:', error);
    }
  }

  /**
   * 监听事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  on(event: string, callback: (...args: any[]) => any): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * 移除事件监听
   * @param event 事件名称
   * @param callback 回调函数
   */
  off(event: string, callback: (...args: any[]) => any): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners
        .get(event)
        ?.filter((cb) => cb !== callback);
      if (callbacks) {
        this.listeners.set(event, callbacks);
      }
    }
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param data 事件数据
   */
  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error('触发事件回调失败:', error);
        }
      });
    }
  }

  /**
   * 发送图形添加事件
   * @param graphic 图形对象
   */
  sendGraphicAdded(graphic: IGraphic): void {
    this.send({
      type: 'graphicAdded',
      payload: {
        userId: this.userId,
        userName: this.userName,
        graphic: graphic.toJSON(),
      },
    });
  }

  /**
   * 发送图形更新事件
   * @param graphic 图形对象
   */
  sendGraphicUpdated(graphic: IGraphic): void {
    this.send({
      type: 'graphicUpdated',
      payload: {
        userId: this.userId,
        userName: this.userName,
        graphic: graphic.toJSON(),
      },
    });
  }

  /**
   * 发送图形删除事件
   * @param graphicId 图形 ID
   */
  sendGraphicDeleted(graphicId: string): void {
    this.send({
      type: 'graphicDeleted',
      payload: {
        userId: this.userId,
        userName: this.userName,
        graphicId,
      },
    });
  }

  /**
   * 发送选择变化事件
   * @param selectedGraphicIds 选中的图形 ID 列表
   */
  sendSelectionChanged(selectedGraphicIds: string[]): void {
    this.send({
      type: 'selectionChanged',
      payload: {
        userId: this.userId,
        userName: this.userName,
        selectedGraphicIds,
      },
    });
  }

  /**
   * 发送光标移动事件
   * @param x X 坐标
   * @param y Y 坐标
   */
  sendCursorMoved(x: number, y: number): void {
    this.send({
      type: 'cursorMoved',
      payload: {
        userId: this.userId,
        userName: this.userName,
        x,
        y,
      },
    });
  }

  /**
   * 获取当前用户信息
   * @returns 用户信息
   */
  getUserInfo(): { userId: string; userName: string } {
    return { userId: this.userId, userName: this.userName };
  }

  /**
   * 检查是否连接
   * @returns 是否连接
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }
}
