// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, computed } from 'vue';
import { ShortcutConfig } from './shortcuts.config';

// 按键修饰符类型
export interface KeyModifiers {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

// 按键处理函数类型
export type KeyHandler = (event: KeyboardEvent) => void;

// 按键绑定类型
export interface KeyBinding {
  id?: string;
  key: string;
  modifiers: KeyModifiers;
  handler: KeyHandler;
  context?: string;
  priority: number;
}

// 按键上下文
export enum KeyboardContext {
  GLOBAL = 'global',
  PREVIEW = 'preview',
  EDIT = 'edit'
}

// 按键状态类型
export interface KeyState {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

/**
 * 键盘事件管理服务
 * 统一管理应用中的按键事件，处理按键冲突，提供按键注册和注销功能
 */
export class KeyboardService {
  private bindings: KeyBinding[] = [];
  private currentContext = ref<KeyboardContext>(KeyboardContext.GLOBAL);
  private isListening = false;
  
  // 按键状态
  private keyState = ref<KeyState>({
    ctrl: false,
    shift: false,
    alt: false,
    meta: false
  });

  // 绑定的事件处理函数（用于正确移除）
  private boundHandleKeyDown: (event: KeyboardEvent) => void;
  private boundHandleKeyUp: (event: KeyboardEvent) => void;

  constructor() {
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
  }

  private static TEXT_EDITING_KEYS = new Set(['backspace', 'delete', 'escape']);

  private static MODAL_CLASS_PATTERNS = [
    'modal-overlay', 'modal', 'n-modal', 'n-drawer',
    'dialog-overlay', 'overlay', 'popup',
  ];

  // 暴露按键状态的 computed
  private inputLikeTags = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

  private isInputLikeElement(el: Element | null): boolean {
    if (!el) return false;
    if (!('getAttribute' in el)) return false;
    if (this.inputLikeTags.has(el.tagName)) return true;
    if ((el as HTMLElement).isContentEditable) return true;
    const role = el.getAttribute('role');
    if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true;
    return false;
  }

  private isEventFromInputLike(event: KeyboardEvent): boolean {
    const target = event.target as Element | null;
    if (!target) return false;
    if (this.isInputLikeElement(target)) return true;
    let parent: Element | null = target.parentElement;
    while (parent) {
      if (this.isInputLikeElement(parent)) return true;
      for (const cls of KeyboardService.MODAL_CLASS_PATTERNS) {
        if (parent.classList.contains(cls)) return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  get isShiftPressed() { return computed(() => this.keyState.value.shift); }
  get isCtrlPressed() { return computed(() => this.keyState.value.ctrl); }
  get isAltPressed() { return computed(() => this.keyState.value.alt); }
  get isMetaPressed() { return computed(() => this.keyState.value.meta); }

  // 获取当前按键状态
  getCurrentKeyState(): Readonly<KeyState> {
    return { ...this.keyState.value };
  }

  /**
   * 检查事件是否由指定键触发
   */
  isKey(event: KeyboardEvent, key: string): boolean {
    return event.key.toLowerCase() === key.toLowerCase();
  }

  /**
   * 检查事件是否由指定组合键触发
   */
  isKeyCombo(event: KeyboardEvent, keys: string[]): boolean {
    return keys.every(key => {
      switch (key.toLowerCase()) {
        case 'ctrl':
        case 'control':
          return event.ctrlKey;
        case 'shift':
          return event.shiftKey;
        case 'alt':
          return event.altKey;
        case 'meta':
          return event.metaKey;
        default:
          return event.key.toLowerCase() === key.toLowerCase();
      }
    });
  }

  /**
   * 检查修饰键是否匹配
   */
  matchModifiers(event: KeyboardEvent, modifiers: KeyModifiers): boolean {
    return this.isModifiersMatch(event, modifiers);
  }

  /**
   * 开始监听键盘事件
   */
  startListening() {
    if (!this.isListening && typeof document !== 'undefined') {
      document.addEventListener('keydown', this.boundHandleKeyDown);
      document.addEventListener('keyup', this.boundHandleKeyUp);
      this.isListening = true;
    }
  }

  /**
   * 停止监听键盘事件
   */
  stopListening() {
    if (this.isListening && typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.boundHandleKeyDown);
      document.removeEventListener('keyup', this.boundHandleKeyUp);
      this.isListening = false;
    }
  }

  /**
   * 设置当前上下文
   * @param context 键盘上下文
   */
  setContext(context: KeyboardContext) {
    this.currentContext.value = context;
  }

  /**
   * 获取当前上下文
   */
  getContext() {
    return this.currentContext.value;
  }

  /**
   * 注册按键绑定
   * @param key 按键
   * @param handler 处理函数
   * @param modifiers 修饰符
   * @param context 上下文
   * @param priority 优先级（数值越大优先级越高）
   * @returns 绑定ID
   */
  registerKey(
    key: string,
    handler: KeyHandler,
    modifiers: KeyModifiers = {},
    context: KeyboardContext = KeyboardContext.GLOBAL,
    priority: number = 0
  ): string {
    const id = `${key}-${Date.now()}`;
    const binding: KeyBinding = {
      id,
      key: key.toLowerCase(),
      modifiers,
      handler,
      context,
      priority
    };

    this.bindings.push(binding);
    // 按优先级排序，优先级高的在前
    this.bindings.sort((a, b) => b.priority - a.priority);

    // 开始监听（如果还没开始）
    this.startListening();

    return id;
  }

  /**
   * 从快捷键配置注册按键
   * @param shortcut 快捷键配置
   * @param handler 处理函数
   */
  registerShortcut(shortcut: ShortcutConfig, handler: KeyHandler): string {
    const binding: KeyBinding = {
      id: shortcut.id,
      key: shortcut.key.toLowerCase(),
      modifiers: shortcut.modifiers,
      handler,
      context: shortcut.context,
      priority: shortcut.priority
    };

    this.bindings.push(binding);
    this.bindings.sort((a, b) => b.priority - a.priority);
    this.startListening();

    return shortcut.id;
  }

  /**
   * 批量从快捷键配置注册
   * @param shortcuts 快捷键配置数组
   * @param handlerMap 处理函数映射表
   */
  registerShortcuts(
    shortcuts: ShortcutConfig[],
    handlerMap: Record<string, KeyHandler>
  ) {
    shortcuts.forEach(shortcut => {
      const handler = handlerMap[shortcut.id];
      if (handler) {
        this.registerShortcut(shortcut, handler);
      }
    });
  }

  /**
   * 更新已注册的快捷键
   * @param shortcut 更新后的快捷键配置
   */
  updateShortcut(shortcut: ShortcutConfig) {
    const index = this.bindings.findIndex(b => b.id === shortcut.id);
    if (index !== -1) {
      const existingBinding = this.bindings[index];
      this.bindings[index] = {
        ...existingBinding,
        key: shortcut.key.toLowerCase(),
        modifiers: shortcut.modifiers,
        context: shortcut.context,
        priority: shortcut.priority
      };
      this.bindings.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * 批量更新快捷键
   */
  updateShortcuts(shortcuts: ShortcutConfig[]) {
    shortcuts.forEach(shortcut => this.updateShortcut(shortcut));
  }

  /**
   * 注销指定ID的快捷键
   */
  unregisterShortcut(id: string) {
    this.bindings = this.bindings.filter(b => b.id !== id);
  }

  /**
   * 格式化快捷键显示文本
   */
  static formatShortcut(key: string, modifiers: KeyModifiers): string {
    const parts: string[] = [];
    if (modifiers.ctrl) parts.push('Ctrl');
    if (modifiers.shift) parts.push('Shift');
    if (modifiers.alt) parts.push('Alt');
    if (modifiers.meta) parts.push('Meta');
    
    // 格式化按键显示
    let keyDisplay = key;
    const keyMap: Record<string, string> = {
      'escape': 'Esc',
      'delete': 'Delete',
      'backspace': 'Backspace',
      'enter': 'Enter',
      'space': 'Space',
      'tab': 'Tab',
      'f5': 'F5',
      'arrowup': '↑',
      'arrowdown': '↓',
      'arrowleft': '←',
      'arrowright': '→'
    };
    if (keyMap[key.toLowerCase()]) {
      keyDisplay = keyMap[key.toLowerCase()];
    } else if (key.length === 1) {
      keyDisplay = key.toUpperCase();
    }
    
    parts.push(keyDisplay);
    return parts.join('+');
  }

  /**
   * 注销按键绑定
   * @param key 按键
   * @param context 上下文
   */
  unregisterKey(key: string, context?: KeyboardContext) {
    this.bindings = this.bindings.filter(binding => {
      if (binding.key !== key.toLowerCase()) return true;
      if (context && binding.context !== context) return true;
      return false;
    });
  }

  /**
   * 注销指定上下文的所有按键绑定
   * @param context 上下文
   */
  unregisterContext(context: KeyboardContext) {
    this.bindings = this.bindings.filter(binding => binding.context !== context);
  }

  /**
   * 检查按键修饰符是否匹配
   * @param event 键盘事件
   * @param modifiers 修饰符
   */
  private isModifiersMatch(event: KeyboardEvent, modifiers: KeyModifiers): boolean {
    return (
      (modifiers.ctrl === undefined || event.ctrlKey === modifiers.ctrl) &&
      (modifiers.shift === undefined || event.shiftKey === modifiers.shift) &&
      (modifiers.alt === undefined || event.altKey === modifiers.alt) &&
      (modifiers.meta === undefined || event.metaKey === modifiers.meta)
    );
  }

  /**
   * 处理按键按下事件
   * @param event 键盘事件
   */
  private handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Shift') this.keyState.value.shift = true;
    if (event.key === 'Control') this.keyState.value.ctrl = true;
    if (event.key === 'Alt') this.keyState.value.alt = true;
    if (event.key === 'Meta') this.keyState.value.meta = true;

    const key = event.key.toLowerCase();
    const context = this.currentContext.value;

    const isTextKey = KeyboardService.TEXT_EDITING_KEYS.has(key);
    if (isTextKey && this.isEventFromInputLike(event)) {
      return;
    }

    for (const binding of this.bindings) {
      if (binding.context !== KeyboardContext.GLOBAL && binding.context !== context) {
        continue;
      }

      if (binding.key === key && this.isModifiersMatch(event, binding.modifiers)) {
        binding.handler(event);

        if (!event.defaultPrevented) {
          event.preventDefault();
        }
        break;
      }
    }
  }

  /**
   * 处理按键释放事件
   * @param event 键盘事件
   */
  private handleKeyUp(event: KeyboardEvent) {
    // 更新按键状态
    if (event.key === 'Shift') this.keyState.value.shift = false;
    if (event.key === 'Control') this.keyState.value.ctrl = false;
    if (event.key === 'Alt') this.keyState.value.alt = false;
    if (event.key === 'Meta') this.keyState.value.meta = false;
  }

  /**
   * 清除所有按键绑定
   */
  clear() {
    this.bindings = [];
  }

  /**
   * 获取所有按键绑定
   */
  getBindings() {
    return this.bindings;
  }
}

// 导出单例实例
export const keyboardService = new KeyboardService();
