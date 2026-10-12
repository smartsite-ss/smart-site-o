// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyboardService, keyboardService, KeyboardContext, KeyBinding } from '../../canvas-page/keyboard.service';
import { ShortcutConfig } from '../../canvas-page/shortcuts.config';

describe('KeyboardService', () => {
  beforeEach(() => {
    keyboardService.clear();
    keyboardService.setContext(KeyboardContext.GLOBAL);
    keyboardService.stopListening();
  });

  describe('registerKey', () => {
    it('registers a key binding and returns an ID', () => {
      const handler = vi.fn();
      const id = keyboardService.registerKey('a', handler);
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);

      const bindings = keyboardService.getBindings();
      expect(bindings.some((b: KeyBinding) => b.id === id)).toBe(true);
    });

    it('handler is called when matching key and modifiers fired', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const handler = vi.fn();

      keyboardService.registerKey('a', handler);
      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

      const event = new KeyboardEvent('keydown', { key: 'a' });
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledTimes(1);
      addSpy.mockRestore();
    });

    it('handler NOT called when context does not match', () => {
      const handler = vi.fn();

      keyboardService.registerKey('a', handler, {}, KeyboardContext.EDIT);
      keyboardService.setContext(KeyboardContext.PREVIEW);

      const event = new KeyboardEvent('keydown', { key: 'a' });
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('handler NOT called when modifiers do not match', () => {
      const handler = vi.fn();

      keyboardService.registerKey('a', handler, { ctrl: true });

      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: false });
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('setContext / getContext', () => {
    it('changes context correctly', () => {
      expect(keyboardService.getContext()).toBe(KeyboardContext.GLOBAL);

      keyboardService.setContext(KeyboardContext.EDIT);
      expect(keyboardService.getContext()).toBe(KeyboardContext.EDIT);

      keyboardService.setContext(KeyboardContext.PREVIEW);
      expect(keyboardService.getContext()).toBe(KeyboardContext.PREVIEW);

      keyboardService.setContext(KeyboardContext.GLOBAL);
      expect(keyboardService.getContext()).toBe(KeyboardContext.GLOBAL);
    });
  });

  describe('unregisterKey', () => {
    it('removes specific key binding', () => {
      const handler = vi.fn();
      keyboardService.registerKey('a', handler);
      const initialCount = keyboardService.getBindings().length;

      keyboardService.unregisterKey('a');
      expect(keyboardService.getBindings().length).toBe(initialCount - 1);
    });

    it('can unregister by key and context', () => {
      const handler = vi.fn();
      keyboardService.registerKey('a', handler, {}, KeyboardContext.GLOBAL);
      keyboardService.registerKey('a', handler, {}, KeyboardContext.EDIT);

      const initialCount = keyboardService.getBindings().length;
      keyboardService.unregisterKey('a', KeyboardContext.EDIT);

      const remaining = keyboardService.getBindings();
      expect(remaining.length).toBe(initialCount - 1);
      expect(remaining.every((b: KeyBinding) => b.context !== KeyboardContext.EDIT)).toBe(true);
    });
  });

  describe('unregisterContext', () => {
    it('removes all bindings for a context', () => {
      const handler = vi.fn();
      keyboardService.registerKey('a', handler, {}, KeyboardContext.GLOBAL);
      keyboardService.registerKey('b', handler, {}, KeyboardContext.EDIT);
      keyboardService.registerKey('c', handler, {}, KeyboardContext.EDIT);

      keyboardService.unregisterContext(KeyboardContext.EDIT);

      const bindings = keyboardService.getBindings();
      expect(bindings.length).toBe(1);
      expect(bindings[0].context).toBe(KeyboardContext.GLOBAL);
    });
  });

  describe('clear', () => {
    it('removes all bindings', () => {
      const handler = vi.fn();
      keyboardService.registerKey('a', handler);
      keyboardService.registerKey('b', handler);
      keyboardService.registerKey('c', handler);

      expect(keyboardService.getBindings().length).toBe(3);

      keyboardService.clear();

      expect(keyboardService.getBindings().length).toBe(0);
    });
  });

  describe('getBindings', () => {
    it('returns all registered bindings', () => {
      const handler = vi.fn();
      keyboardService.registerKey('x', handler);
      keyboardService.registerKey('y', handler, { ctrl: true });

      const bindings = keyboardService.getBindings();
      expect(bindings).toHaveLength(2);
      expect(bindings[0]).toHaveProperty('id');
      expect(bindings[0]).toHaveProperty('key');
      expect(bindings[0]).toHaveProperty('handler');
      expect(bindings[0]).toHaveProperty('priority');
    });
  });

  describe('priority', () => {
    it('higher priority handler executes first', () => {
      const order: string[] = [];
      const lowHandler = vi.fn(() => order.push('low'));
      const highHandler = vi.fn(() => order.push('high'));

      keyboardService.registerKey('z', lowHandler, {}, KeyboardContext.GLOBAL, 1);
      keyboardService.registerKey('z', highHandler, {}, KeyboardContext.GLOBAL, 10);

      const event = new KeyboardEvent('keydown', { key: 'z' });
      document.dispatchEvent(event);

      expect(highHandler).toHaveBeenCalled();
      expect(lowHandler).not.toHaveBeenCalled();
      expect(order).toEqual(['high']);
    });
  });

  describe('formatShortcut', () => {
    it('Ctrl+S → "Ctrl+S"', () => {
      const result = KeyboardService.formatShortcut('s', { ctrl: true });
      expect(result).toBe('Ctrl+S');
    });

    it('Ctrl+Shift+Delete → "Ctrl+Shift+Delete"', () => {
      const result = KeyboardService.formatShortcut('delete', { ctrl: true, shift: true });
      expect(result).toBe('Ctrl+Shift+Delete');
    });

    it('Escape → "Esc"', () => {
      const result = KeyboardService.formatShortcut('escape', {});
      expect(result).toBe('Esc');
    });

    it('Tab → "Tab"', () => {
      const result = KeyboardService.formatShortcut('tab', {});
      expect(result).toBe('Tab');
    });

    it('ArrowUp → "↑"', () => {
      const result = KeyboardService.formatShortcut('arrowup', {});
      expect(result).toBe('↑');
    });
  });

  describe('isKey', () => {
    it('matching key returns true', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      expect(keyboardService.isKey(event, 'a')).toBe(true);
    });

    it('non-matching key returns false', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      expect(keyboardService.isKey(event, 'b')).toBe(false);
    });
  });

  describe('isKeyCombo', () => {
    it('Ctrl+C combo detection', () => {
      const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true });
      expect(keyboardService.isKeyCombo(event, ['ctrl', 'c'])).toBe(true);
    });

    it('returns false when combo does not match', () => {
      const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: false });
      expect(keyboardService.isKeyCombo(event, ['ctrl', 'c'])).toBe(false);
    });
  });

  describe('startListening / stopListening', () => {
    it('toggles listening state', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      keyboardService.startListening();
      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

      keyboardService.stopListening();
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('does not add duplicate listeners', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');

      keyboardService.startListening();
      const callCount = addSpy.mock.calls.length;

      keyboardService.startListening();
      expect(addSpy).toHaveBeenCalledTimes(callCount);

      addSpy.mockRestore();
    });
  });

  describe('handleKeyUp', () => {
    it('updates key state on release', () => {
      keyboardService.startListening();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
      expect(keyboardService.getCurrentKeyState().ctrl).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
      expect(keyboardService.getCurrentKeyState().ctrl).toBe(false);
    });

    it('updates Shift key state on release', () => {
      keyboardService.startListening();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      expect(keyboardService.getCurrentKeyState().shift).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
      expect(keyboardService.getCurrentKeyState().shift).toBe(false);
    });
  });

  describe('registerShortcut', () => {
    it('registers from ShortcutConfig', () => {
      const handler = vi.fn();
      const shortcut: ShortcutConfig = {
        id: 'test-shortcut',
        name: 'Test Shortcut',
        key: 'z',
        modifiers: { ctrl: true },
        context: KeyboardContext.EDIT,
        priority: 5,
        category: 'Test',
      };

      const id = keyboardService.registerShortcut(shortcut, handler);
      expect(id).toBe('test-shortcut');

      const bindings = keyboardService.getBindings();
      const found = bindings.find((b: KeyBinding) => b.id === 'test-shortcut');
      expect(found).toBeDefined();
      expect(found!.key).toBe('z');
      expect(found!.modifiers.ctrl).toBe(true);
    });
  });

  describe('updateShortcut', () => {
    it('updates existing shortcut', () => {
      const handler = vi.fn();
      const shortcut: ShortcutConfig = {
        id: 'test-update',
        name: 'Test',
        key: 'a',
        modifiers: {},
        context: KeyboardContext.GLOBAL,
        priority: 1,
      };

      keyboardService.registerShortcut(shortcut, handler);

      const updated: ShortcutConfig = {
        ...shortcut,
        key: 'b',
        modifiers: { ctrl: true, shift: true },
        priority: 10,
      };

      keyboardService.updateShortcut(updated);

      const bindings = keyboardService.getBindings();
      const found = bindings.find((b: KeyBinding) => b.id === 'test-update');
      expect(found).toBeDefined();
      expect(found!.key).toBe('b');
      expect(found!.modifiers.ctrl).toBe(true);
      expect(found!.modifiers.shift).toBe(true);
      expect(found!.priority).toBe(10);
    });
  });

  describe('getCurrentKeyState', () => {
    it('returns copy of current key state', () => {
      keyboardService.startListening();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));

      const state = keyboardService.getCurrentKeyState();
      expect(state.ctrl).toBe(true);
      expect(state.shift).toBe(false);
      expect(state.alt).toBe(false);
      expect(state.meta).toBe(false);

      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
      expect(keyboardService.getCurrentKeyState().ctrl).toBe(false);
    });
  });

  describe('key state tracking', () => {
    it('tracks ctrl press and release', () => {
      keyboardService.startListening();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
      expect(keyboardService.getCurrentKeyState().ctrl).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
      expect(keyboardService.getCurrentKeyState().ctrl).toBe(false);
    });

    it('tracks shift press and release', () => {
      keyboardService.startListening();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      expect(keyboardService.getCurrentKeyState().shift).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
      expect(keyboardService.getCurrentKeyState().shift).toBe(false);
    });

    it('tracks alt press and release', () => {
      keyboardService.startListening();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
      expect(keyboardService.getCurrentKeyState().alt).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));
      expect(keyboardService.getCurrentKeyState().alt).toBe(false);
    });

    it('tracks meta press and release', () => {
      keyboardService.startListening();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' }));
      expect(keyboardService.getCurrentKeyState().meta).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));
      expect(keyboardService.getCurrentKeyState().meta).toBe(false);
    });
  });
});