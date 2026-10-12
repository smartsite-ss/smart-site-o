// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 依赖注入容器
 */

type Class<T = any> = new (...args: any[]) => T;
type Factory<T = any> = (...args: any[]) => T;

interface Registration<T = any> {
  instance?: T;
  factory?: Factory<T>;
  class?: Class<T>;
  singleton: boolean;
  dependencies?: string[];
}

export class DIContainer {
  private registrations = new Map<string, Registration>();
  private instances = new Map<string, any>();

  /**
   * 注册单例
   */
  registerSingleton<T>(token: string, instance: T): void;
  registerSingleton<T>(token: string, factory: Factory<T>, dependencies?: string[]): void;
  registerSingleton<T>(token: string, classDef: Class<T>, dependencies?: string[]): void;
  registerSingleton<T>(
    token: string,
    arg: T | Factory<T> | Class<T>,
    dependencies?: string[]
  ): void {
    if (typeof arg === 'function') {
      if (arg.prototype && arg.prototype.constructor) {
        this.registrations.set(token, {
          class: arg as Class<T>,
          singleton: true,
          dependencies,
        });
      } else {
        this.registrations.set(token, {
          factory: arg as Factory<T>,
          singleton: true,
          dependencies,
        });
      }
    } else {
      this.registrations.set(token, {
        instance: arg,
        singleton: true,
      });
    }
  }

  /**
   * 注册瞬态（每次创建新实例）
   */
  registerTransient<T>(token: string, factory: Factory<T>, dependencies?: string[]): void;
  registerTransient<T>(token: string, classDef: Class<T>, dependencies?: string[]): void;
  registerTransient<T>(
    token: string,
    arg: Factory<T> | Class<T>,
    dependencies?: string[]
  ): void {
    if (typeof arg === 'function') {
      if (arg.prototype && arg.prototype.constructor) {
        this.registrations.set(token, {
          class: arg as Class<T>,
          singleton: false,
          dependencies,
        });
      } else {
        this.registrations.set(token, {
          factory: arg as Factory<T>,
          singleton: false,
          dependencies,
        });
      }
    }
  }

  /**
   * 获取实例
   */
  get<T>(token: string): T {
    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`No registration found for token: ${token}`);
    }

    // 如果已有实例，直接返回
    if (registration.singleton && registration.instance) {
      return registration.instance as T;
    }

    // 解析依赖
    const deps = registration.dependencies?.map(dep => this.get(dep)) || [];

    // 创建实例
    let instance: T;
    if (registration.factory) {
      instance = registration.factory(...deps);
    } else if (registration.class) {
      instance = new registration.class(...deps);
    } else {
      instance = registration.instance as T;
    }

    // 如果是单例，缓存实例
    if (registration.singleton) {
      registration.instance = instance;
    }

    return instance;
  }

  /**
   * 检查是否已注册
   */
  has(token: string): boolean {
    return this.registrations.has(token);
  }

  /**
   * 清除所有注册
   */
  clear(): void {
    this.registrations.clear();
    this.instances.clear();
  }

  /**
   * 获取所有注册的令牌
   */
  getTokens(): string[] {
    return Array.from(this.registrations.keys());
  }
}

// 导出单例实例
export const diContainer = new DIContainer();