<template>
  <div class="global-tools">
    <!-- 搜索框 -->
    <div class="search-box">
      <input 
        type="text" 
        :placeholder="$t('globalTools.search')"
        class="search-input"
      >
    </div>
    
    <!-- 全屏切换 -->
    <button
      class="tool-button"
      @click="toggleFullscreen"
    >
      <Icon
        :icon="{ type: 'vicon', value: ExpandOutline }"
        :size="18"
      />
    </button>
    
    <!-- 语言切换 -->
    <div class="language-switcher">
      <div class="language-dropdown">
        <button 
          class="language-dropdown-button" 
          :title="$t('globalTools.switchLanguage')"
          @click="toggleLanguageDropdown"
        >
          <Icon
            :icon="{ type: 'vicon', value: LanguageOutline }"
            :size="18"
          />
        </button>
        <div
          v-if="showLanguageDropdown"
          class="language-dropdown-menu"
        >
          <button
            class="language-dropdown-item"
            :class="{ active: currentLanguage === 'zh-CN' }"
            @click="switchLanguage('zh-CN')"
          >
            <span class="language-icon">🇨🇳</span>
            <span>{{ $t('globalTools.chinese') }}</span>
          </button>
          <button
            class="language-dropdown-item"
            :class="{ active: currentLanguage === 'en-US' }"
            @click="switchLanguage('en-US')"
          >
            <span class="language-icon">🇺🇸</span>
            <span>{{ $t('globalTools.english') }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 主题切换 -->
    <div class="theme-switcher">
      <div class="theme-dropdown">
        <button 
          class="theme-dropdown-button" 
          :title="$t('globalTools.switchTheme')"
          @click="toggleThemeDropdown"
        >
          <Icon
            :icon="{ type: 'vicon', value: ColorPaletteOutline }"
            :size="18"
          />
        </button>
        <div
          v-if="showThemeDropdown"
          class="theme-dropdown-menu"
        >
          <button
            v-for="theme in allThemes"
            :key="theme.name"
            class="theme-dropdown-item"
            :class="{ active: currentTheme === theme.name }"
            @click="switchTheme(theme.name)"
          >
            <span class="theme-icon">{{ theme.icon }}</span>
            <span>{{ $t(theme.i18nKey) }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 数据中台 -->
    <button 
      class="nav-button" 
      :title="$t('globalTools.dataCenter')"
      @click="navigateToSystem"
    >
      <Icon
        :icon="{ type: 'vicon', value: GridOutline }"
        :size="18"
      />
      <span class="nav-label">{{ $t('globalTools.dataCenter') }}</span>
    </button>

    <!-- 设置按钮 -->
    <button 
      class="tool-button" 
      :title="$t('globalTools.settings')"
      @click="openSettings"
    >
      <Icon
        :icon="{ type: 'vicon', value: SettingsOutline }"
        :size="18"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useConfigStore, useTheme, setLocale, getLocale } from '@scada-editor/core';
import Icon from '../../common/Icon.vue';
import {
  ExpandOutline,
  LanguageOutline,
  ColorPaletteOutline,
  SettingsOutline,
  GridOutline
} from '@vicons/ionicons5';

type LocaleType = 'zh-CN' | 'en-US';

// 全局工具区组件
// 负责辅助功能，如搜索、消息通知、全屏切换、主题切换、语言切换等

const emit = defineEmits<{
  (e: 'open-settings'): void;
}>();

const router = useRouter();
const configStore = useConfigStore();
const { switchTheme: useThemeSwitch } = useTheme();
const { t: _t } = useI18n(); // 只使用 t 函数进行翻译
const currentTheme = computed(() => configStore.ui?.theme ?? 'dark');
const showThemeDropdown = ref(false);

const themeIconMap: Record<string, string> = {
  light: '🌞',
  dark: '🌙',
  'high-contrast': '⬜',
  blue: '🔵',
  'tech-light-blue': '🔷',
  'tech-dark-blue': '🔵',
  'blue-light': '💎',
  'blue-dark': '🌌',
  'green-tech': '💚',
  'orange-warm': '🔥',
  enterprise: '🏢',
};

const themeI18nKeyMap: Record<string, string> = {
  light: 'globalTools.lightTheme',
  dark: 'globalTools.darkTheme',
  'high-contrast': 'globalTools.highContrast',
  blue: 'globalTools.blue',
  'tech-light-blue': 'globalTools.techLightBlue',
  'tech-dark-blue': 'globalTools.techDarkBlue',
  'blue-light': 'globalTools.blueLight',
  'blue-dark': 'globalTools.blueDark',
  'green-tech': 'globalTools.greenTech',
  'orange-warm': 'globalTools.orangeWarm',
  enterprise: 'globalTools.enterprise',
};

const allThemes = computed(() => {
  return Object.keys(themeIconMap).map((name) => ({
    name,
    icon: themeIconMap[name],
    i18nKey: themeI18nKeyMap[name],
  }));
});

// 语言切换相关
const showLanguageDropdown = ref(false);
const currentLanguage = computed(() => getLocale());

// 初始化：应用保存的语言设置
onMounted(() => {
  const savedLang = configStore.ui?.language;
  if (savedLang && savedLang !== getLocale()) {
    setLocale(savedLang as 'zh-CN' | 'en-US');
  }
});

// 监听 configStore 中的语言变化
watch(() => configStore.ui?.language, (newLang) => {
  if (newLang && newLang !== getLocale()) {
    setLocale(newLang as 'zh-CN' | 'en-US');
  }
});

// 切换主题
const switchTheme = (theme: string) => {
  useThemeSwitch(theme as any);
  showThemeDropdown.value = false;
};

// 切换语言
const switchLanguage = (language: LocaleType) => {
  setLocale(language);
  configStore.updateUIConfig({ language });
  showLanguageDropdown.value = false;
};

// 切换主题下拉菜单
const toggleThemeDropdown = () => {
  showThemeDropdown.value = !showThemeDropdown.value;
  showLanguageDropdown.value = false;
};

// 切换语言下拉菜单
const toggleLanguageDropdown = () => {
  showLanguageDropdown.value = !showLanguageDropdown.value;
  showThemeDropdown.value = false;
};

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const themeDropdown = document.querySelector('.theme-dropdown');
  const languageDropdown = document.querySelector('.language-dropdown');
  
  if (themeDropdown && !themeDropdown.contains(event.target as Node)) {
    showThemeDropdown.value = false;
  }
  
  if (languageDropdown && !languageDropdown.contains(event.target as Node)) {
    showLanguageDropdown.value = false;
  }
};

// 监听点击事件
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

// 移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 切换全屏
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

// 打开设置
const openSettings = () => {
  emit('open-settings');
};

// 导航到数据中台
const navigateToSystem = () => {
  router.push('/system');
};
</script>

<style scoped>
.global-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
}

.search-box {
  position: relative;
}

.search-input {
  padding: 6px 12px;
  border: none;
  border-radius: 16px;
  font-size: 14px;
  width: 200px;
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--header-text);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.tool-button {
  position: relative;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--header-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.tool-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--header-text);
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.nav-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.nav-label {
  font-size: 13px;
  font-weight: 500;
}

.icon {
  font-size: 16px;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: var(--status-error);
  color: white;
  font-size: 12px;
  font-weight: bold;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-switcher {
  position: relative;
  display: flex;
  align-items: center;
}

.theme-dropdown {
  position: relative;
}

.theme-dropdown-button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--header-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.theme-dropdown-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.theme-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: var(--shadow-medium);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1000;
  min-width: 120px;
}

.theme-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}

.theme-dropdown-item:hover {
  background-color: var(--control-button-hover);
}

.theme-dropdown-item.active {
  background-color: var(--primary);
  color: white;
}

.theme-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.language-switcher {
  position: relative;
  display: flex;
  align-items: center;
}

.language-dropdown {
  position: relative;
}

.language-dropdown-button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--header-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.language-dropdown-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.language-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: var(--shadow-medium);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1000;
  min-width: 120px;
}

.language-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}

.language-dropdown-item:hover {
  background-color: var(--control-button-hover);
}

.language-dropdown-item.active {
  background-color: var(--primary);
  color: white;
}

.language-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}
</style>
