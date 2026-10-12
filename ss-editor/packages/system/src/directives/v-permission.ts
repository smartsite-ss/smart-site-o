// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { Directive, DirectiveBinding } from 'vue';
import { usePermission } from '../composables/usePermission';
import type { PermissionCode } from '../config/system-menu.config';

/**
 * 权限指令 v-permission
 *
 * 用法：
 *   <button v-permission="'project:create'">新建</button>
 *        → 无权限时隐藏元素
 *
 *   <button v-permission="['project:edit','project:delete']">操作</button>
 *        → 任一权限满足即可显示
 *
 *   <button v-permission:disable="'device:delete'">删除</button>
 *        → 无权限时 disabled 而非移除
 */
export const vPermission: Directive<HTMLElement, PermissionCode | PermissionCode[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<PermissionCode | PermissionCode[]>) {
    const { hasAnyPermission } = usePermission();
    const codes = Array.isArray(binding.value) ? binding.value : [binding.value];
    const allowed = hasAnyPermission(...codes);

    if (binding.arg === 'disable') {
      // 禁用模式：不移除元素，仅添加 disabled 属性
      if (!allowed) {
        el.setAttribute('disabled', 'true');
        el.classList.add('permission-disabled');
        if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
          el.disabled = true;
        }
      }
    } else {
      // 隐藏模式：无权限时移除 DOM 元素
      if (!allowed) {
        el.parentNode?.removeChild(el);
      }
    }
  },
};