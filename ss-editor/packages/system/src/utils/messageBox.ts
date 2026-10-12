// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { createApp, h } from 'vue';
import type { Component } from 'vue';
import { i18n } from '@scada-editor/core';

interface MessageBoxOptions {
  title?: string;
  message: string;
  type?: 'warning' | 'error' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
}

function _createModal(component: Component, props: Record<string, any>, events: Record<string, (...args: any[]) => any>) {
  return new Promise((_resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp({
      render() {
        return h(component, { ...props, ...events });
      }
    });

    const cleanup = () => {
      app.unmount();
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    };

    Object.keys(events).forEach((key) => {
      const original = events[key];
      events[key] = (...args: any[]) => {
        cleanup();
        original(...args);
      };
    });

    app.mount(container);
  });
}

class _SimpleMessageBox {
  visible = true;
  title = '';
  message = '';
  type: MessageBoxOptions['type'] = 'info';
  confirmText = i18n.global.t('system.messageBox.confirm');
  cancelText = i18n.global.t('system.messageBox.cancel');
  showCancelButton = false;

  constructor(props: Partial<_SimpleMessageBox>) {
    Object.assign(this, props);
  }

  emit(event: string, value?: any) {
    (this as any)[`on${event.charAt(0).toUpperCase()}${event.slice(1)}`]?.(value);
  }
}

export function showMessageBox(options: MessageBoxOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.className = 'message-box-overlay';
    container.innerHTML = `
      <div class="message-box" data-type="${options.type || 'info'}">
        <div class="message-box-header">
          <span class="message-box-title">${options.title || i18n.global.t('system.messageBox.title')}</span>
          <button class="message-box-close">&times;</button>
        </div>
        <div class="message-box-body">${options.message}</div>
        <div class="message-box-footer">
          ${options.showCancelButton !== false ? `<button class="btn btn-cancel">${options.cancelText || i18n.global.t('system.messageBox.cancel')}</button>` : ''}
          <button class="btn btn-confirm">${options.confirmText || i18n.global.t('system.messageBox.confirm')}</button>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .message-box-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.45); display: flex;
        align-items: center; justify-content: center; z-index: 10000;
        animation: mb-fade-in 0.2s ease;
      }
      @keyframes mb-fade-in { from { opacity: 0; } to { opacity: 1; } }
      .message-box {
        width: 380px; border-radius: 8px;
        background: var(--surface, #fff); box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        overflow: hidden; animation: mb-scale-in 0.2s ease;
      }
      @keyframes mb-scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .message-box-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px; border-bottom: 1px solid var(--border, #e5e5e5);
      }
      .message-box-title { font-size: 15px; font-weight: 600; color: var(--text, #333); }
      .message-box-close {
        background: none; border: none; font-size: 20px; cursor: pointer;
        color: var(--text-secondary, #999); padding: 0 4px; line-height: 1;
      }
      .message-box-close:hover { color: var(--text, #333); }
      .message-box-body {
        padding: 20px 24px; font-size: 14px; line-height: 1.6;
        color: var(--text-secondary, #666); word-break: break-word;
      }
      .message-box-footer {
        display: flex; justify-content: flex-end; gap: 10px;
        padding: 14px 20px; border-top: 1px solid var(--border, #e5e5e5);
      }
      .message-box .btn {
        padding: 7px 18px; border-radius: 4px; font-size: 13px;
        cursor: pointer; border: 1px solid var(--border, #dcdfe6);
        background: var(--surface, #fff); transition: all 0.15s ease;
      }
      .message-box .btn:hover { border-color: var(--primary, #409eff); color: var(--primary, #409eff); }
      .message-box .btn-cancel:hover { border-color: var(--border, #dcdfe6); color: var(--text, #333); }
      .message-box .btn-confirm {
        background: var(--primary, #409eff); color: #fff; border-color: var(--primary, #409eff);
      }
      .message-box .btn-confirm:hover { opacity: 0.85; color: #fff; }
      .message-box[data-type="warning"] .message-box-title,
      .message-box[data-type="error"] .message-box-title { color: var(--danger, #e74c3c); }
      .message-box[data-type="success"] .message-box-title { color: var(--success, #27ae60); }
    `;
    document.head.appendChild(style);

    const close = (result: boolean) => {
      resolve(result);
      container.remove();
      style.remove();
    };

    container.querySelector('.btn-confirm')!.addEventListener('click', () => close(true));
    container.querySelector('.btn-cancel')?.addEventListener('click', () => close(false));
    container.querySelector('.message-box-close')!.addEventListener('click', () => close(false));
    container.addEventListener('click', (e) => {
      if (e.target === container) close(false);
    });

    document.body.appendChild(container);
  });
}

export function showConfirm(message: string, title?: string): Promise<boolean> {
  return showMessageBox({
    title: title || i18n.global.t('system.messageBox.warnConfirm'),
    message,
    type: 'warning',
    showCancelButton: true
  });
}

export function showAlert(message: string, title?: string, type: 'error' | 'success' | 'info' = 'info'): Promise<void> {
  return showMessageBox({ title: title || i18n.global.t('system.messageBox.title'), message, type, showCancelButton: false }).then(() => {});
}

export function showError(message: string, title?: string): Promise<void> {
  return showAlert(message, title || i18n.global.t('system.messageBox.error'), 'error');
}

export function showSuccess(message: string, title?: string): Promise<void> {
  return showAlert(message, title || i18n.global.t('system.messageBox.success'), 'success');
}
