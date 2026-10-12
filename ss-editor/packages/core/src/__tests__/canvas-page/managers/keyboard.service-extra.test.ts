// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyboardService, KeyboardContext } from '../../../canvas-page/keyboard.service'; /** * KeyboardService 补充测试：触发真实键盘事件 */ describe('KeyboardService - 键盘事件派发补充测试', () => {
  let keyboardService: KeyboardService;

  beforeEach(() => {
    keyboardService = new KeyboardService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    keyboardService.stopListening();
  });

  describe('startListening / stopListening', () => {
    it('startListening 后键盘事件应被处理', () => {
      const handler = vi.fn();
      keyboardService.registerKey('z', handler, { ctrl: true }); /* registerKey 内部会 startListening */ const event = new KeyboardEvent('keydown', {
        key: 'z', ctrlKey: true, bubbles: true, cancelable: true
      });
      document.dispatchEvent(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('stopListening 后键盘事件不再被处理', () => {
      const handler = vi.fn();
      keyboardService.registerKey('c', handler, { ctrl: true });
      keyboardService.stopListening();

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'c', ctrlKey: true, bubbles: true
      }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('多次 stopListening 后 startListening 可恢复', () => {
      const handler = vi.fn();
      keyboardService.registerKey('v', handler, { ctrl: true });
      keyboardService.stopListening();
      keyboardService.stopListening();
      keyboardService.startListening();

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'v', ctrlKey: true, bubbles: true
      }));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('修饰键组合匹配', () => {
    it('Ctrl+Z 精确匹配', () => {
      const handler = vi.fn();
      keyboardService.registerKey('z', handler, { ctrl: true });
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'z', ctrlKey: true, bubbles: true
      }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('Ctrl+Shift+Z 不匹配 Ctrl+Z', () => {
      const handler = vi.fn();
      keyboardService.registerKey('z', handler, { ctrl: true, shift: false });
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'z', ctrlKey: true, shiftKey: true, bubbles: true
      }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('应支持 Alt 修饰键', () => {
      const handler = vi.fn();
      keyboardService.registerKey('a', handler, { alt: true });
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'a', altKey: true, bubbles: true
      }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('单独按键 Delete 应匹配', () => {
      const handler = vi.fn();
      keyboardService.registerKey('Delete', handler);
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Delete', bubbles: true
      }));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('上下文管理', () => {
    it('EDIT 上下文的快捷键在 PREVIEW 下不应触发', () => {
      const editHandler = vi.fn();
      keyboardService.registerKey('e', editHandler, { ctrl: true }, KeyboardContext.EDIT);
      keyboardService.setContext(KeyboardContext.PREVIEW);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true, bubbles: true }));
      expect(editHandler).not.toHaveBeenCalled();
    });

    it('GLOBAL 上下文的快捷键在任何上下文都应触发', () => {
      const globalHandler = vi.fn();
      keyboardService.registerKey('s', globalHandler, { ctrl: true }, KeyboardContext.GLOBAL);
      keyboardService.setContext(KeyboardContext.EDIT);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
      expect(globalHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('优先级与冲突', () => {
    it('注册的 handler 应被依次执行', () => {
      const order: number[] = [];
      
      const keyboardService = new KeyboardService();
      keyboardService.startListening();
      
      keyboardService.registerKey('a', () => { order.push(1); }, {}, KeyboardContext.GLOBAL, 100);
      keyboardService.registerKey('b', () => { order.push(2); }, {}, KeyboardContext.GLOBAL, 50);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: false, shiftKey: false, altKey: false }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: false, shiftKey: false, altKey: false }));
      
      expect(order).toContain(1);
      expect(order).toContain(2);
    });
  });

  describe('快捷键卸载', () => {
    it('注册后 ID 可用', () => {
      const handler = vi.fn();
      const id = keyboardService.registerKey('z', handler, { ctrl: true });
      expect(id).toBeTruthy();
    });
  });

  describe('边界条件', () => {
    it('注销后可注册新 handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      keyboardService.registerKey('x', handler1, { ctrl: true });
      keyboardService.unregisterKey('x');
      keyboardService.registerKey('x', handler2, { ctrl: true });

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'x', ctrlKey: true, bubbles: true
      }));
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('不同 modifier 的同一按键应独立', () => {
      const ctrlHandler = vi.fn();
      const noModHandler = vi.fn();
      keyboardService.registerKey('k', ctrlHandler, { ctrl: true });
      keyboardService.registerKey('k', noModHandler, {});

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k', ctrlKey: false, shiftKey: false, altKey: false, bubbles: true
      }));
      expect(ctrlHandler).not.toHaveBeenCalled();
      expect(noModHandler).toHaveBeenCalledTimes(1);
    });

    it('特殊键名大小写匹配', () => {
      const handler = vi.fn();
      keyboardService.registerKey('Escape', handler);
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape', bubbles: true
      }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('不匹配的按键不影响注册的 handler', () => {
      const handler = vi.fn();
      keyboardService.registerKey('z', handler, { ctrl: true });
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'a', bubbles: true
      }));
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'b', ctrlKey: true, bubbles: true
      }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('Shift 修饰键独立匹配', () => {
      const handler = vi.fn();
      keyboardService.registerKey('ArrowUp', handler, { shift: true });
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowUp', shiftKey: true, bubbles: true
      }));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
