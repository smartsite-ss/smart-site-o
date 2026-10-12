<template>
  <div class="user-info">
    <div
      class="user-profile"
      @click="toggleUserMenu"
    >
      <div class="user-avatar">
        <span class="avatar-text">{{ userInitial }}</span>
      </div>
      <div class="user-details">
        <div class="user-name">
          {{ userName }}
        </div>
      </div>
      <svg
        class="dropdown-arrow"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      ><polyline points="6 9 12 15 18 9" /></svg>
    </div>
    
    <!-- 用户菜单 -->
    <div
      v-if="showUserMenu"
      class="user-menu"
    >
      <button
        class="menu-item"
        @click="openProfile"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        ><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
          cx="12"
          cy="7"
          r="4"
        /></svg>
        {{ $t('userInfo.profile') }}
      </button>
      <div class="menu-divider" />
      <button
        class="menu-item logout"
        @click="handleLogout"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line
          x1="21"
          y1="12"
          x2="9"
          y2="12"
        /></svg>
        {{ $t('userInfo.logout') }}
      </button>
    </div>

    <!-- 用户资料对话框 -->
    <UserProfileDialog
      :visible="showProfileDialog"
      @close="showProfileDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { i18n } from '@scada-editor/core';
import { useAuthStore } from '@scada-editor/system';
import UserProfileDialog from '../../common/UserProfileDialog.vue';

const { t } = i18n.global;
const router = useRouter();
const authStore = useAuthStore();

// 用户信息（从 authStore 读取）
const userName = computed(() => authStore.user?.displayName || authStore.user?.username || t('userInfo.admin'));

// 计算用户头像的首字母
const userInitial = computed(() => {
  const name = authStore.user?.displayName || authStore.user?.username || t('userInfo.admin');
  return name.charAt(0).toUpperCase();
});

// 用户菜单状态
const showUserMenu = ref(false);
const showProfileDialog = ref(false);

// 切换用户菜单
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

// 打开个人资料弹框
const openProfile = () => {
  showUserMenu.value = false;
  showProfileDialog.value = true;
};

// 退出登录
async function handleLogout() {
  showUserMenu.value = false;
  // 先导航到登录页，卸载所有数据请求组件，避免 token 清除后触发 401 请求
  await router.push('/login');
  // 再清除 token 并调用后端登出（fire-and-forget，无需阻塞导航）
  authStore.logout();
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  const userInfo = document.querySelector('.user-info');
  if (userInfo && !userInfo.contains(event.target as Node)) {
    showUserMenu.value = false;
  }
};

// 添加点击外部关闭菜单的事件监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

// 移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.user-info {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.user-profile:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #1557b0) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  font-size: 14px;
}

.avatar-text {
  line-height: 32px;
}

.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.user-name {
  color: var(--header-text);
  font-size: 14px;
  font-weight: 500;
}

.dropdown-arrow {
  color: var(--header-text);
  opacity: 0.5;
  flex-shrink: 0;
}

.user-menu {
  position: absolute;
  top: 100%;
  right: 20px;
  background-color: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-medium);
  min-width: 180px;
  z-index: 1000;
  margin-top: 8px;
  border: 1px solid var(--border-light);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text);
  transition: all 0.2s ease;
  text-align: left;
}

.menu-item:hover {
  background-color: var(--control-button-hover);
}

.menu-item.logout {
  color: var(--status-error);
}

.menu-item.logout:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.menu-divider {
  height: 1px;
  background-color: var(--border-light);
  margin: 4px 0;
}
</style>
