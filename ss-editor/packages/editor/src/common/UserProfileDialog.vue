<template>
  <div
    v-if="visible"
    class="modal-overlay"
    @click.self="close"
  >
    <div class="modal">
      <div class="modal-header">
        <h2>{{ $t('system.layout.userProfile') }}</h2>
        <button
          class="modal-close"
          @click="close"
        >
          &times;
        </button>
      </div>
      <div class="modal-body">
        <!-- 个人信息 -->
        <fieldset class="profile-section">
          <legend class="section-title">
            {{ $t('system.layout.profileInfo') }}
          </legend>
          <div class="form-group">
            <label class="form-label">{{ $t('system.layout.username') }}</label>
            <input
              type="text"
              class="form-input form-input-disabled"
              :value="authStore.user?.username || ''"
              disabled
            >
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.layout.displayName') }}</label>
            <input
              v-model="profileForm.displayName"
              type="text"
              class="form-input"
              :placeholder="$t('system.layout.displayNamePlaceholder')"
              maxlength="50"
            >
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.layout.email') }}</label>
            <input
              v-model="profileForm.email"
              type="email"
              class="form-input"
              :placeholder="$t('system.layout.emailPlaceholder')"
            >
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.layout.role') }}</label>
            <input
              type="text"
              class="form-input form-input-disabled"
              :value="roleLabel"
              disabled
            >
          </div>
          <p
            v-if="profileError"
            class="form-error"
          >
            {{ profileError }}
          </p>
          <p
            v-if="profileSuccess"
            class="form-success"
          >
            {{ profileSuccess }}
          </p>
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            :disabled="profileSubmitting"
            @click="handleUpdateProfile"
          >
            {{ profileSubmitting ? $t('system.layout.saving') : $t('system.layout.saveProfile') }}
          </button>
        </fieldset>

        <!-- 修改密码 -->
        <fieldset class="profile-section">
          <legend class="section-title">
            {{ $t('system.layout.changePassword') }}
          </legend>
          <div class="form-group">
            <label class="form-label">{{ $t('system.layout.oldPassword') }}</label>
            <input
              v-model="passwordForm.oldPassword"
              type="password"
              class="form-input"
              :placeholder="$t('system.layout.oldPasswordPlaceholder')"
            >
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.layout.newPassword') }}</label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              class="form-input"
              :placeholder="$t('system.layout.newPasswordPlaceholder')"
            >
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.layout.confirmPassword') }}</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              class="form-input"
              :placeholder="$t('system.layout.confirmPasswordPlaceholder')"
            >
          </div>
          <p
            v-if="passwordError"
            class="form-error"
          >
            {{ passwordError }}
          </p>
          <p
            v-if="passwordSuccess"
            class="form-success"
          >
            {{ passwordSuccess }}
          </p>
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            :disabled="passwordSubmitting"
            @click="handleChangePassword"
          >
            {{ passwordSubmitting ? $t('system.layout.saving') : $t('system.layout.updatePassword') }}
          </button>
        </fieldset>
      </div>
      <div class="modal-footer">
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="close"
        >
          {{ $t('system.layout.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore, userApi } from '@scada-editor/system';
import { useI18n } from '@scada-editor/core';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const authStore = useAuthStore();
const { t } = useI18n();

const profileForm = ref({
  displayName: authStore.user?.displayName || '',
  email: authStore.user?.email || '',
});
const profileError = ref('');
const profileSuccess = ref('');
const profileSubmitting = ref(false);

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const passwordError = ref('');
const passwordSuccess = ref('');
const passwordSubmitting = ref(false);

const roleLabel = computed(() => {
  const labels: Record<string, string> = {
    admin: t('system.layout.roleAdmin'),
    user: t('system.layout.roleUser'),
    viewer: t('system.layout.roleViewer'),
  };
  return labels[authStore.user?.role || ''] || authStore.user?.role || '-';
});

function close() {
  // 重置状态
  profileError.value = '';
  profileSuccess.value = '';
  passwordError.value = '';
  passwordSuccess.value = '';
  emit('close');
}

async function handleUpdateProfile() {
  profileError.value = '';
  profileSuccess.value = '';
  profileSubmitting.value = true;
  try {
    const res = await userApi.updateProfile({
      displayName: profileForm.value.displayName || undefined,
      email: profileForm.value.email || undefined,
    });
    // 更新 store 中的用户信息
    if (res.data) {
      authStore.user = { ...authStore.user!, ...res.data };
    }
    profileSuccess.value = t('system.layout.profileSaved');
    setTimeout(() => { profileSuccess.value = ''; }, 2000);
  } catch (e: any) {
    profileError.value = e?.response?.data?.message || t('system.layout.saveFailed');
  } finally {
    profileSubmitting.value = false;
  }
}

async function handleChangePassword() {
  passwordError.value = '';
  passwordSuccess.value = '';

  if (!passwordForm.value.oldPassword) {
    passwordError.value = t('system.layout.oldPasswordRequired');
    return;
  }
  if (passwordForm.value.newPassword.length < 8) {
    passwordError.value = t('system.layout.passwordMinLength');
    return;
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = t('system.layout.passwordMismatch');
    return;
  }

  passwordSubmitting.value = true;
  try {
    await userApi.changePassword({
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword,
      confirmPassword: passwordForm.value.confirmPassword,
    });
    passwordSuccess.value = t('system.layout.passwordChanged');
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
    setTimeout(() => { passwordSuccess.value = ''; }, 2000);
  } catch (e: any) {
    passwordError.value = e?.response?.data?.message || t('system.layout.passwordChangeFailed');
  } finally {
    passwordSubmitting.value = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  width: 440px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text);
}

.modal-body {
  padding: 16px 24px 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 24px 20px;
}

.profile-section {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  padding: 0 4px;
}

.form-group {
  margin-bottom: 12px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--background);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: var(--border);
}

.form-input:focus {
  border-color: var(--primary);
}

.form-input-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-error {
  color: var(--status-error);
  font-size: 12px;
  margin: -4px 0 8px 0;
}

.form-success {
  color: var(--status-success);
  font-size: 12px;
  margin: -4px 0 8px 0;
}

.sys-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.5;
}

.sys-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sys-btn-primary {
  background: var(--primary);
  color: var(--text);
}

.sys-btn-primary:hover:not(:disabled) {
  background: var(--button-hover);
}

.sys-btn-secondary {
  background: var(--border-light);
  color: var(--text);
}

.sys-btn-secondary:hover:not(:disabled) {
  background: var(--border);
}

.sys-btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
