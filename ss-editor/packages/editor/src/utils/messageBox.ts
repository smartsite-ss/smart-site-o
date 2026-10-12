// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { createApp, h } from 'vue';
import MessageBox from '../common/MessageBox.vue';
import ConfirmSaveBox from '../common/ConfirmSaveBox.vue';
import InputMessageBox from '../common/InputMessageBox.vue';
import { i18n } from '@scada-editor/core';

const t = (key: string, fallback: string) => (i18n.global.t(key) as string) || fallback;

interface MessageBoxOptions {
  title?: string;
  message: string;
  type?: 'warning' | 'error' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
}

export interface MessageBoxInstance {
  close: () => void;
}

export function showMessageBox(options: MessageBoxOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp({
      render() {
        return h(MessageBox, {
          visible: true,
          title: options.title,
          message: options.message,
          type: options.type,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          showCancelButton: options.showCancelButton,
          onConfirm: () => {
            resolve(true);
            app.unmount();
            document.body.removeChild(container);
          },
          onCancel: () => {
            resolve(false);
            app.unmount();
            document.body.removeChild(container);
          },
          onClose: () => {
            resolve(false);
            app.unmount();
            document.body.removeChild(container);
          }
        });
      }
    });

    app.mount(container);
  });
}

export function showPrompt(message: string, defaultValue = '', title?: string, placeholder?: string): Promise<string | null> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp({
      render() {
        return h(InputMessageBox, {
          visible: true,
          title: title || t('messageBox.inputTitle', '输入'),
          message,
          type: 'info',
          showInput: true,
          defaultValue,
          placeholder: placeholder || t('messageBox.inputPlaceholder', '请输入...'),
          onConfirm: (value: string) => {
            resolve(value);
            app.unmount();
            document.body.removeChild(container);
          },
          onCancel: () => {
            resolve(null);
            app.unmount();
            document.body.removeChild(container);
          },
          onClose: () => {
            resolve(null);
            app.unmount();
            document.body.removeChild(container);
          }
        });
      }
    });

    app.mount(container);
  });
}

export function showConfirm(message: string, title?: string): Promise<boolean> {
  return showMessageBox({
    title: title || t('messageBox.confirm', '确认'),
    message,
    type: 'warning',
    showCancelButton: true
  });
}

export function showAlert(message: string, title?: string, type: 'error' | 'success' | 'info' = 'info'): Promise<void> {
  return showMessageBox({
    title: title || t('messageBox.title', '提示'),
    message,
    type,
    showCancelButton: false
  }).then(() => {});
}

export function showError(message: string, title?: string): Promise<void> {
  return showAlert(message, title || t('messageBox.error', '错误'), 'error');
}

export function showSuccess(message: string, title?: string): Promise<void> {
  return showAlert(message, title || t('messageBox.success', '成功'), 'success');
}

export function showInfo(message: string, title?: string): Promise<void> {
  return showAlert(message, title || t('messageBox.info', '信息'), 'info');
}

export type SaveConfirmResult = 'save' | 'discard' | 'cancel';

export function showConfirmSave(
  message: string,
  title?: string,
  saveText?: string,
  discardText?: string,
): Promise<SaveConfirmResult> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const defaultTitle = t('messageBox.unsavedTitle', '未保存的页面');
    const defaultSaveText = t('messageBox.save', '保存');
    const defaultDiscardText = t('messageBox.dontSave', '不保存');
    const defaultCancelText = t('messageBox.cancel', '取消');

    const app = createApp({
      render() {
        return h(ConfirmSaveBox, {
          visible: true,
          title: title || defaultTitle,
          message,
          saveText: saveText || defaultSaveText,
          discardText: discardText || defaultDiscardText,
          cancelText: defaultCancelText,
          onSave: () => {
            resolve('save');
            app.unmount();
            document.body.removeChild(container);
          },
          onDiscard: () => {
            resolve('discard');
            app.unmount();
            document.body.removeChild(container);
          },
          onCancel: () => {
            resolve('cancel');
            app.unmount();
            document.body.removeChild(container);
          },
        });
      }
    });

    app.mount(container);
  });
}