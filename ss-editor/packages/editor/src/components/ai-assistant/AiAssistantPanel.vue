<template>
  <div class="ai-assistant-panel">
    <!-- 标题栏 -->
    <header class="ai-header">
      <div class="ai-header-title">
        <svg
          class="ai-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
          <path d="M8 12h.01M12 8h.01M16 12h.01M12 16h.01" />
        </svg>
        <span>{{ t('editor.aiAssistant.title') }}</span>
      </div>
      <div class="ai-header-actions">
        <button
          class="ai-btn-icon"
          :class="{ 'ai-btn-icon--active': agentMode }"
          :title="agentMode ? t('editor.aiAssistant.agentModeAgent') : t('editor.aiAssistant.agentModeChat')"
          @click="agentMode = !agentMode"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <path d="M12 6v6l4 2" />
          </svg>
        </button>
        <button
          class="ai-btn-icon"
          :class="{ 'ai-btn-icon--active': showConversations }"
          :title="t('editor.aiAssistant.conversationHistory')"
          @click="toggleConversations"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <button
          class="ai-btn-icon"
          :title="t('editor.aiAssistant.clear')"
          :disabled="messages.length === 0 || isBusy"
          @click="handleClear"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
        <button
          class="ai-btn-icon"
          :title="t('editor.aiAssistant.close')"
          @click="$emit('close')"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line
              x1="18"
              y1="6"
              x2="6"
              y2="18"
            />
            <line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            />
          </svg>
        </button>
      </div>
    </header>

    <!-- 会话侧边栏（P2-T08 对话持久化） -->
    <div
      v-if="showConversations"
      class="ai-conversations-sidebar"
    >
      <div class="ai-conversations-header">
        <span class="ai-conversations-title">{{ t('editor.aiAssistant.conversationHistory') }}</span>
        <div class="ai-conversations-actions">
          <button
            class="ai-btn-icon"
            :title="t('editor.aiAssistant.newConversation')"
            :disabled="isBusy"
            @click="handleNewConversation"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line
                x1="12"
                y1="5"
                x2="12"
                y2="19"
              />
              <line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
              />
            </svg>
          </button>
          <button
            class="ai-btn-icon"
            :title="t('editor.aiAssistant.refreshConversations')"
            :disabled="conversationsLoading"
            @click="handleRefreshConversations"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>
      <div class="ai-conversations-list">
        <div
          v-if="conversationsLoading && conversations.length === 0"
          class="ai-conversations-empty"
        >
          {{ t('editor.aiAssistant.loadingConversations') }}
        </div>
        <div
          v-else-if="conversations.length === 0"
          class="ai-conversations-empty"
        >
          {{ t('editor.aiAssistant.noConversations') }}
        </div>
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="ai-conversation-item"
          :class="{ 'ai-conversation-item--active': conv.id === currentConversationId }"
          @click="handleSelectConversation(conv.id)"
        >
          <div class="ai-conversation-main">
            <div class="ai-conversation-title">
              {{ conv.title || t('editor.aiAssistant.untitledConversation') }}
            </div>
            <div class="ai-conversation-meta">
              <span class="ai-conversation-time">{{ formatConversationTime(conv.updatedAt) }}</span>
              <span
                v-if="conv.messageCount > 0"
                class="ai-conversation-count"
              >
                {{ t('editor.aiAssistant.messageCount', { n: conv.messageCount }) }}
              </span>
            </div>
          </div>
          <button
            class="ai-conversation-delete"
            :title="t('editor.aiAssistant.deleteConversation')"
            :disabled="isBusy"
            @click.stop="handleDeleteConversation(conv.id, conv.title)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 状态提示（D-015 三态：未启用/认证失败/服务不可达） -->
    <div
      v-if="statusHintKey"
      class="ai-status-banner ai-status-warning"
    >
      {{ t(statusHintKey) }}
    </div>

    <!-- 消息列表 -->
    <div
      ref="messageListRef"
      class="ai-message-list"
    >
      <!-- 空状态 -->
      <div
        v-if="messages.length === 0"
        class="ai-empty"
      >
        <div class="ai-empty-icon">
          AI
        </div>
        <p class="ai-empty-title">
          {{ t('editor.aiAssistant.welcome') }}
        </p>
        <p class="ai-empty-hint">
          {{ t('editor.aiAssistant.welcomeHint') }}
        </p>
        <div class="ai-suggestions">
          <button
            v-for="s in suggestions"
            :key="s.key"
            class="ai-suggestion-item"
            @click="quickSend(s.text, s.taskType)"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <!-- 消息气泡 -->
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="ai-message"
        :class="`ai-message--${msg.role}`"
      >
        <div class="ai-message-avatar">
          <span v-if="msg.role === 'user'">{{ t('editor.aiAssistant.you') }}</span>
          <span v-else>AI</span>
        </div>
        <div class="ai-message-bubble">
          <div
            class="ai-message-content"
            v-html="renderContent(msg)"
          />
          <!-- 插件/脚本代码块预览（P1-T05/P1-T06） -->
          <div
            v-if="!msg.streaming && msg.taskType && hasCodeBlocks(msg) && msg.content"
            class="ai-file-tree"
          >
            <div class="ai-file-tree-header">
              <span class="ai-file-tree-title">
                {{ msg.taskType === 'plugin-dev' ? t('editor.aiAssistant.pluginFiles') : t('editor.aiAssistant.scriptPreview') }}
              </span>
              <span class="ai-file-tree-count">{{ parsedFileCount(msg) }} files</span>
            </div>
            <div class="ai-file-list">
              <div
                v-for="(file, fi) in getParsedFiles(msg)"
                :key="fi"
                class="ai-file-item"
              >
                <span class="ai-file-icon">{{ fileIcon(file.path) }}</span>
                <span class="ai-file-name">{{ file.path }}</span>
                <span class="ai-file-lang">{{ file.lang }}</span>
                <span
                  v-if="getFileValidation(file)"
                  class="ai-file-validation"
                  :class="getFileValidation(file)?.valid ? 'ai-file-valid' : 'ai-file-invalid'"
                  :title="getFileValidation(file)?.summary"
                >
                  {{ getFileValidation(file)?.valid ? '✓' : '✗' }}
                </span>
              </div>
            </div>
            <div class="ai-file-actions">
              <button
                v-if="msg.taskType === 'plugin-dev'"
                class="ai-file-action-btn ai-file-action-btn--primary"
                :disabled="isBusy"
                @click="handleDownloadPlugin(msg)"
              >
                {{ t('editor.aiAssistant.downloadFiles') }}
              </button>
              <button
                v-if="msg.taskType === 'script-dev'"
                class="ai-file-action-btn ai-file-action-btn--primary"
                :disabled="isBusy"
                @click="handleCopyScript(msg)"
              >
                {{ t('editor.aiAssistant.copyScript') }}
              </button>
            </div>
          </div>
          <div
            v-if="msg.streaming"
            class="ai-message-cursor"
          >
            <span class="ai-cursor-dot" />
            <span class="ai-cursor-dot" />
            <span class="ai-cursor-dot" />
          </div>
          <div
            v-if="msg.usage && !msg.streaming"
            class="ai-message-meta"
          >
            tokens: {{ msg.usage.totalTokens }}
            <span v-if="msg.provider"> · {{ msg.provider }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent 思考步骤面板 -->
    <div
      v-if="agentSteps.length > 0"
      class="ai-agent-steps"
    >
      <div class="ai-agent-steps-header">
        <span class="ai-agent-steps-title">{{ t('editor.aiAssistant.agentAnswer') }}</span>
        <span class="ai-agent-steps-count">{{ t('editor.aiAssistant.agentStepCount', { count: agentSteps.length }) }}</span>
        <button
          class="ai-agent-steps-toggle"
          @click="agentStepsExpanded = !agentStepsExpanded"
        >
          {{ agentStepsExpanded ? '−' : '+' }}
        </button>
      </div>
      <div
        v-if="agentStepsExpanded"
        class="ai-agent-steps-body"
      >
        <div
          v-for="(step, si) in agentSteps"
          :key="si"
          class="ai-agent-step"
          :class="`ai-agent-step--${step.type}`"
        >
          <span class="ai-agent-step-icon">{{ stepIcons[step.type] || '·' }}</span>
          <div class="ai-agent-step-content">
            <span class="ai-agent-step-label">{{ stepLabels[step.type] || step.type }}</span>
            <div class="ai-agent-step-text">
              {{ step.content }}
            </div>
            <div
              v-if="step.toolName"
              class="ai-agent-step-meta"
            >
              工具: <code>{{ step.toolName }}</code>
              <template v-if="step.toolParams">
                | 参数: <code>{{ JSON.stringify(step.toolParams) }}</code>
              </template>
              <template v-if="step.toolResult">
                | 结果: <code>{{ step.toolResult }}</code>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div
      v-if="error"
      class="ai-error-banner"
    >
      <span class="ai-error-text">{{ error }}</span>
      <button
        class="ai-error-dismiss"
        @click="error = null"
      >
        ×
      </button>
    </div>

    <!-- 输入区域 -->
    <footer class="ai-input-area">
      <!-- 第一行：任务类型 + 模型选择 -->
      <div class="ai-selectors-row">
        <select
          v-model="taskType"
          class="ai-task-select"
          :disabled="isBusy"
          :title="t('editor.aiAssistant.taskTypeHint')"
        >
          <option value="chat">
            {{ t('editor.aiAssistant.taskChat') }}
          </option>
          <option value="plugin-dev">
            {{ t('editor.aiAssistant.taskPluginDev') }}
          </option>
          <option value="script-dev">
            {{ t('editor.aiAssistant.taskScriptDev') }}
          </option>
          <option value="analysis">
            {{ t('editor.aiAssistant.taskAnalysis') }}
          </option>
        </select>
        <select
          v-model="selectedModel"
          class="ai-model-select"
          :disabled="isStreaming || modelOptions.length === 0"
          :title="t('editor.aiAssistant.modelSelectHint')"
        >
          <option
            v-for="opt in modelOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>
      <!-- 第二行：输入框 + 发送按钮 -->
      <div class="ai-input-row">
        <textarea
          ref="inputRef"
          v-model="inputText"
          class="ai-input"
          :placeholder="t('editor.aiAssistant.inputPlaceholder')"
          :disabled="isBusy"
          rows="3"
          @keydown.enter.exact.prevent="handleSend"
          @keydown.shift.enter="() => {}"
        />
        <button
          v-if="!isBusy"
          class="ai-send-btn"
          :disabled="!inputText.trim()"
          @click="handleSend"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line
              x1="22"
              y1="2"
              x2="11"
              y2="13"
            />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
        <button
          v-else
          class="ai-stop-btn"
          :title="t('editor.aiAssistant.stop')"
          @click="handleAbort"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect
              x="6"
              y="6"
              width="12"
              height="12"
              rx="2"
            />
          </svg>
        </button>
      </div>
      <p class="ai-input-hint">
        {{ t('editor.aiAssistant.enterToSend') }}
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted, computed } from 'vue';
import { i18n, aiClient, type TaskType, type EnabledProviderOption, registerEditorTools, pluginGeneratorAgent, scriptGeneratorAgent, pluginFileWriter, parseCodeBlocks, validateCodeForDisplay, type ParsedFile } from '@scada-editor/core';
import { useStreamChat } from './useStreamChat';
import { useAgentStream, type AgentStreamStep } from './useAgentStream';
import { marked, type Tokens } from 'marked';
import DOMPurify from 'dompurify';

// ============================================================
// S-M05: AI 输出 XSS 防护
// 使用 marked 解析 Markdown + DOMPurify 净化 HTML，双重防护防止 XSS
// ============================================================

// 配置 marked：启用 GFM（表格/删除线/任务列表）+ breaks（换行转 <br>）
marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    // 自定义围栏代码块渲染：保持与现有 CSS 类名兼容（ai-code-block / ai-code-lang）
    code({ text, lang }: Tokens.Code): string {
      const langLabel = lang ? `<span class="ai-code-lang">${lang}</span>` : '';
      // marked 已对 text 做了 HTML 转义，直接输出
      return `<pre class="ai-code-block">${langLabel}<code>${text}</code></pre>`;
    },
    // 自定义行内代码：添加 ai-inline-code 类名
    codespan({ text }: Tokens.Codespan): string {
      return `<code class="ai-inline-code">${text}</code>`;
    },
  },
});

// DOMPurify 白名单：仅允许 Markdown 常用标签，阻止 script/iframe/object 等
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'blockquote', 'a', 'span', 'div', 'del', 'hr',
    'sup', 'sub', 'input',
  ],
  ALLOWED_ATTR: ['href', 'class', 'title', 'target', 'rel', 'type', 'disabled', 'checked'],
};

const { t } = i18n.global;

defineEmits<{
  (e: 'close'): void;
}>();

const {
  messages,
  isStreaming,
  error,
  aiStatus,
  sendMessage,
  addUserMessage,
  addAssistantMessage,
  abort,
  clear,
  checkStatus,
  // P2-T08 会话管理
  currentConversationId,
  currentProjectId,
  conversations,
  conversationsLoading,
  refreshConversations,
  loadConversation,
  clearConversation,
  deleteConversationById,
  setCurrentConversationId,
} = useStreamChat();

// ============ Agent 模式 ============
const agentMode = ref(true);
const agentSteps = ref<AgentStreamStep[]>([]);
const agentStepsExpanded = ref(true);

/** Agent 执行（当 agentMode=true 时使用） */
const {
  isStreaming: agentStreaming,
  execute: agentExecute,
  abort: agentAbort,
} = useAgentStream({
  onThought: (step) => {
    agentSteps.value = [...agentSteps.value, step];
  },
  onAction: (step) => {
    agentSteps.value = [...agentSteps.value, step];
  },
  onObservation: (step) => {
    agentSteps.value = [...agentSteps.value, step];
  },
  onPending: (step) => {
    agentSteps.value = [...agentSteps.value, step];
  },
  onAnswer: (step) => {
    agentSteps.value = [...agentSteps.value, step];
  },
  onError: (step) => {
    agentSteps.value = [...agentSteps.value, step];
  },
});

const stepIcons: Record<string, string> = {
  thought: '💭',
  action: '🔧',
  observation: '👁️',
  answer: '✅',
  error: '❌',
  pending: '⏳',
};

const stepLabels = computed<Record<string, string>>(() => ({
  thought: t('editor.aiAssistant.agentThought'),
  action: t('editor.aiAssistant.agentAction'),
  observation: t('editor.aiAssistant.agentObservation'),
  answer: t('editor.aiAssistant.agentAnswer'),
  error: t('editor.aiAssistant.agentAnswer'),
  pending: '···',
}));

/** 清除 Agent 步骤 */
function clearAgentSteps() {
  agentSteps.value = [];
  agentStepsExpanded.value = true;
}

/** 统一的忙状态（聊天或 Agent 任一运行中） */
const isBusy = computed(() => isStreaming.value || agentStreaming.value);

// AI 状态对应的提示键（null = 正常或未检测，不显示横幅）
const statusHintKey = computed(() => {
  switch (aiStatus.value) {
    case 'disabled':
      return 'editor.aiAssistant.disabledHint';
    case 'unauthorized':
      return 'editor.aiAssistant.unauthorizedHint';
    case 'unreachable':
      return 'editor.aiAssistant.unreachableHint';
    default:
      return null;
  }
});

const inputText = ref('');
const taskType = ref<TaskType>('chat');
const messageListRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);

// ============ 模型选择（仅显示已配置并启用的供应商模型） ============
const enabledProviders = ref<EnabledProviderOption[]>([]);
const selectedModel = ref<string>('');

/** 复合值分隔符（model 名不含 ::，避免歧义） */
const MODEL_VALUE_SEP = '::';

/** 模型下拉选项：value 用「providerId::model」复合编码，确保选中时能同时定位供应商与模型 */
const modelOptions = computed(() => {
  const opts: { value: string; label: string }[] = [];
  for (const p of enabledProviders.value) {
    for (const m of p.models) {
      opts.push({
        value: `${p.providerId}${MODEL_VALUE_SEP}${m}`,
        label: `${p.name} / ${m}`,
      });
    }
  }
  return opts;
});

/** 从复合值解析出 { providerId, model }，发送请求时分别传递 */
const selectedModelParts = computed(() => {
  const v = selectedModel.value;
  if (!v) return { providerId: undefined as string | undefined, model: undefined as string | undefined };
  const idx = v.indexOf(MODEL_VALUE_SEP);
  if (idx === -1) return { providerId: undefined as string | undefined, model: v };
  return {
    providerId: v.slice(0, idx),
    model: v.slice(idx + MODEL_VALUE_SEP.length),
  };
});

/** 默认选第一个供应商的 defaultModel（构造复合值） */
function initDefaultModel() {
  if (selectedModel.value && modelOptions.value.some((o) => o.value === selectedModel.value)) {
    return;
  }
  const firstWithDefault = enabledProviders.value.find((p) => p.defaultModel);
  if (firstWithDefault) {
    selectedModel.value = `${firstWithDefault.providerId}${MODEL_VALUE_SEP}${firstWithDefault.defaultModel}`;
    return;
  }
  selectedModel.value = modelOptions.value[0]?.value || '';
}

async function loadEnabledProviders() {
  try {
    enabledProviders.value = await aiClient.getEnabledProviders();
    initDefaultModel();
  } catch {
    enabledProviders.value = [];
  }
}

// 快捷建议
const suggestions = computed(() => [
  {
    key: 'create-graphic',
    label: t('editor.aiAssistant.suggestionCreateGraphic'),
    text: t('editor.aiAssistant.suggestionCreateGraphicPrompt'),
    taskType: 'codegen' as TaskType,
  },
  {
    key: 'plugin-dev',
    label: t('editor.aiAssistant.suggestionPluginDev'),
    text: t('editor.aiAssistant.suggestionPluginDevPrompt'),
    taskType: 'plugin-dev' as TaskType,
  },
  {
    key: 'script-dev',
    label: t('editor.aiAssistant.suggestionScriptDev'),
    text: t('editor.aiAssistant.suggestionScriptDevPrompt'),
    taskType: 'script-dev' as TaskType,
  },
  {
    key: 'analysis',
    label: t('editor.aiAssistant.suggestionAnalysis'),
    text: t('editor.aiAssistant.suggestionAnalysisPrompt'),
    taskType: 'analysis' as TaskType,
  },
]);

async function handleSend() {
  const text = inputText.value.trim();
  if (!text || isBusy.value) return;
  inputText.value = '';

  if (agentMode.value) {
    // Agent 模式：使用 Agent 编排器，并将结果写入消息列表
    addUserMessage(text, taskType.value);
    clearAgentSteps();
    // 传入 conversationId/projectId 实现持久化（P2-T08）
    const result = await agentExecute(
      text,
      'chat',
      undefined,
      currentConversationId.value || undefined,
      currentProjectId.value || undefined,
    );
    // 后端在 answer/error 步骤注入 conversationId，更新本地状态
    if (result.conversationId) {
      setCurrentConversationId(result.conversationId);
    }
    // 将 Agent 回答添加到消息对话框
    const answerContent = result.type === 'answer' ? result.content : (result.content || t('editor.aiAssistant.agentAnswer'));
    addAssistantMessage(answerContent, taskType.value);
    return;
  }

  // 普通聊天模式
  const { model, providerId } = selectedModelParts.value;
  const systemPrompt = buildSystemPrompt(taskType.value, text);
  await sendMessage(text, taskType.value, systemPrompt, model, providerId);
}

/** 根据任务类型构建 System Prompt（P1-T05/P1-T06 统一面板架构） */
function buildSystemPrompt(taskType: TaskType, userInput: string): string | undefined {
  if (taskType === 'plugin-dev') {
    const { systemPrompt } = pluginGeneratorAgent.analyze(userInput);
    return systemPrompt;
  }
  if (taskType === 'script-dev') {
    const { systemPrompt } = scriptGeneratorAgent.analyze(userInput);
    return systemPrompt;
  }
  return undefined;
}

/**
 * S-M05: 安全 Markdown 渲染
 *
 * 1. marked 将 Markdown 解析为 HTML（支持 GFM 表格/列表/链接/标题等）
 * 2. DOMPurify 净化 HTML（白名单过滤，阻止 script/iframe/onerror 等 XSS 向量）
 *
 * 双重防护：即使 marked 解析出恶意 HTML，DOMPurify 也会拦截。
 */
function renderContent(msg: { content: string; streaming?: boolean }): string {
  const raw = msg.content || (msg.streaming ? t('editor.aiAssistant.thinking') : '');
  if (!msg.content) return raw;

  // 1. marked 解析 Markdown → HTML
  const rawHtml = marked.parse(raw) as string;
  // 2. DOMPurify 净化，防止 XSS
  return DOMPurify.sanitize(rawHtml, PURIFY_CONFIG);
}

// ============================================================
// 代码块预览（P1-T05/P1-T06 文件树）
// ============================================================

/** 判断消息中是否包含代码块 */
function hasCodeBlocks(msg: { content: string; taskType?: string }): boolean {
  if (!msg.content) return false;
  return /```/.test(msg.content);
}

/** 获取消息中解析出的文件数 */
function parsedFileCount(msg: { content: string }): number {
  return getParsedFiles(msg).length;
}

/** 解析消息中的代码块为文件列表 */
function getParsedFiles(msg: { content: string }): ParsedFile[] {
  if (!msg.content) return [];
  return parseCodeBlocks(msg.content).files;
}

// 代码校验缓存（msg content → file path → validation result）
const validationCache = new Map<string, Map<string, { valid: boolean; summary: string }>>();

/** 获取单个文件的校验结果（带缓存） */
function getFileValidation(file: ParsedFile): { valid: boolean; summary: string } | null {
  if (!file.code || !file.lang) return null;
  // 仅对 JS/TS/Vue 文件进行校验
  const checkableLangs = ['javascript', 'js', 'typescript', 'ts', 'tsx', 'jsx', 'vue'];
  if (!checkableLangs.includes(file.lang.toLowerCase())) return null;

  // 使用 code + lang 做缓存 key
  const cacheKey = `${file.path}::${file.lang}`;
  let fileCache = validationCache.get(cacheKey);
  if (!fileCache) {
    fileCache = new Map();
    validationCache.set(cacheKey, fileCache);
  }
  const codeKey = file.code.slice(0, 200); // 用前 200 字符做键
  if (fileCache.has(codeKey)) {
    return fileCache.get(codeKey)!;
  }

  const result = validateCodeForDisplay(file.code, file.lang);
  fileCache.set(codeKey, result);
  return result;
}

/** 根据文件扩展名返回图标 */
function fileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const icons: Record<string, string> = {
    ts: '📘', tsx: '📘', js: '📒', jsx: '📒',
    vue: '💚', json: '📋', css: '🎨', md: '📝',
    html: '🌐', svg: '🖼️',
  };
  return icons[ext] || '📄';
}

/** 处理插件文件下载（P1-T05：使用 pluginFileWriter 合并骨架 + 代码） */
function handleDownloadPlugin(msg: { content: string }): void {
  // 尝试使用 pluginFileWriter 合并 LLM 代码与 PluginCodeGenerator 骨架
  try {
    const config = pluginGeneratorAgent.analyze(msg.content).config;
    const buildResult = pluginFileWriter.buildFromLLMResponse(config, msg.content);
    const blob = new Blob([JSON.stringify(buildResult.files, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${buildResult.type}-plugin.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  } catch {
    // 回退：直接解析代码块为 JSON 下载
  }

  const files = getParsedFiles(msg);
  const fileTree: Record<string, string> = {};
  for (const f of files) {
    fileTree[f.path] = f.code;
  }
  const json = JSON.stringify(fileTree, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plugin-files.json';
  a.click();
  URL.revokeObjectURL(url);
}

/** 处理脚本代码复制（P1-T06：使用 script-preview + trigger matcher） */
function handleCopyScript(msg: { content: string }): void {
  // 使用 scriptGeneratorAgent 获取 trigger 匹配
  const { trigger } = scriptGeneratorAgent.analyze(msg.content);
  const files = getParsedFiles(msg);
  const jsBlock = files.find((f) =>
    ['ts', 'tsx', 'js', 'jsx', 'javascript', 'typescript'].includes(f.lang),
  );
  let code = jsBlock?.code || files[0]?.code || '';

  // 使用 trigger-matched 注释头（P1-T06 触发事件配置）
  if (trigger.type !== 'unknown' && code) {
    const headerParts: string[] = [];
    headerParts.push(`// Trigger: ${trigger.type}`);
    if (trigger.tagId) headerParts.push(`// Tag: ${trigger.tagId} ${trigger.condition || ''} ${trigger.threshold || ''}`.trim());
    if (trigger.interval) headerParts.push(`// Interval: ${trigger.interval}ms`);
    if (trigger.graphicId) headerParts.push(`// Graphic: ${trigger.graphicId}.${trigger.eventType || 'click'}`);
    headerParts.push('// Generated by AI Assistant');
    code = `${headerParts.join('\n')}\n\n${code}`;
  }

  if (code) {
    navigator.clipboard.writeText(code).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }
}

async function quickSend(text: string, task: TaskType) {
  if (isStreaming.value) return;

  if (agentMode.value) {
    // Agent 模式：快捷发送也走 Agent 编排器
    taskType.value = task;
    addUserMessage(text, task);
    clearAgentSteps();
    // 传入 conversationId/projectId 实现持久化（P2-T08）
    const result = await agentExecute(
      text,
      task,
      undefined,
      currentConversationId.value || undefined,
      currentProjectId.value || undefined,
    );
    if (result.conversationId) {
      setCurrentConversationId(result.conversationId);
    }
    const answerContent = result.type === 'answer' ? result.content : (result.content || t('editor.aiAssistant.agentAnswer'));
    addAssistantMessage(answerContent, task);
    return;
  }

  taskType.value = task;
  const { model, providerId } = selectedModelParts.value;
  const systemPrompt = buildSystemPrompt(task, text);
  await sendMessage(text, task, systemPrompt, model, providerId);
}

// 清空对话时同时清除 Agent 步骤
function handleClear() {
  clearAgentSteps();
  clear();
}

// 中断时同时中断 Agent
function handleAbort() {
  if (agentMode.value) {
    agentAbort();
  }
  abort();
}

// ============================================================
// 会话管理（P2-T08 对话持久化）
// ============================================================

/** 会话侧边栏是否展开 */
const showConversations = ref(false);

/** 切换会话侧边栏（首次打开时加载列表） */
async function toggleConversations() {
  showConversations.value = !showConversations.value;
  if (showConversations.value && conversations.value.length === 0 && !conversationsLoading.value) {
    await refreshConversations();
  }
}

/** 手动刷新会话列表 */
async function handleRefreshConversations() {
  await refreshConversations();
}

/**
 * 点击会话项：加载历史消息
 * 当前有进行中的流式请求时拒绝切换
 */
async function handleSelectConversation(conversationId: string) {
  if (isBusy.value) return;
  clearAgentSteps();
  await loadConversation(conversationId);
}

/**
 * 开始新会话：清空当前消息并重置会话关联
 */
function handleNewConversation() {
  if (isBusy.value) return;
  clearAgentSteps();
  clearConversation();
}

/**
 * 删除指定会话（带确认）
 */
async function handleDeleteConversation(conversationId: string, title: string) {
  if (!confirm(t('editor.aiAssistant.confirmDeleteConversation', { title }))) return;
  try {
    await deleteConversationById(conversationId);
  } catch {
    // 错误已由 composable 写入 error，此处无需重复处理
  }
}

/** 格式化会话更新时间为相对时间 */
function formatConversationTime(timeStr: string): string {
  const ts = new Date(timeStr).getTime();
  if (Number.isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return t('editor.aiAssistant.minutesAgo', { n: Math.max(1, Math.floor(diff / minute)) });
  if (diff < day) return t('editor.aiAssistant.hoursAgo', { n: Math.floor(diff / hour) });
  if (diff < 30 * day) return t('editor.aiAssistant.daysAgo', { n: Math.floor(diff / day) });
  return new Date(ts).toLocaleDateString();
}

// 自动滚动到最新消息
watch(
  () => messages.value.length,
  async () => {
    await nextTick();
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  },
);

// 流式时也持续滚动
watch(
  () => messages.value[messages.value.length - 1]?.content,
  async () => {
    await nextTick();
    if (messageListRef.value) {
      const el = messageListRef.value;
      el.scrollTop = el.scrollHeight;
    }
  },
);

onMounted(async () => {
  // 注册编辑器 MCP 工具（P1-T04）
  registerEditorTools();
  await Promise.all([checkStatus(), loadEnabledProviders()]);
  // 后台预加载会话列表（不阻塞主面板初始化）
  refreshConversations().catch(() => {
    // 预加载失败不阻塞面板使用
  });
});

// 流式结束后刷新会话列表（覆盖普通 chat 和 Agent 两种模式）
watch(
  () => isBusy.value,
  async (busy, prevBusy) => {
    // 仅在忙状态从 true → false 时刷新（流结束）
    if (prevBusy && !busy && showConversations.value) {
      await refreshConversations();
    }
  },
);

onUnmounted(() => {
  // 组件卸载时中止所有进行中的请求，避免内存泄漏和 net::ERR_ABORTED
  agentAbort();
  abort();
});
</script>

<style scoped>
.ai-assistant-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--surface);
  border-left: 1px solid var(--border);
  overflow: hidden;
}

/* 标题栏 */
.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background-color: var(--background);
  flex-shrink: 0;
}

.ai-header-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.ai-icon {
  color: var(--accent);
}

.ai-header-actions {
  display: flex;
  gap: 4px;
}

.ai-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.15s;
}

.ai-btn-icon:hover:not(:disabled) {
  background-color: var(--elevated);
  color: var(--text);
}

.ai-btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 状态横幅 */
.ai-status-banner {
  padding: 6px 12px;
  font-size: 12px;
  text-align: center;
  flex-shrink: 0;
}

.ai-status-warning {
  background-color: var(--toast-warning-bg, rgba(245, 158, 11, 0.1));
  color: var(--toast-warning-text, var(--status-warning));
  border-bottom: 1px solid var(--toast-warning-border, rgba(245, 158, 11, 0.3));
}

/* 消息列表 */
.ai-message-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-message-list::-webkit-scrollbar {
  width: 4px;
}

.ai-message-list::-webkit-scrollbar-thumb {
  background-color: var(--text-tertiary);
  border-radius: 2px;
}

/* 空状态 */
.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  gap: 8px;
}

.ai-empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--primary));
  color: white;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.ai-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.ai-empty-hint {
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 240px;
  line-height: 1.5;
}

.ai-suggestions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  width: 100%;
  max-width: 260px;
}

.ai-suggestion-item {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--elevated);
  color: var(--text);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
}

.ai-suggestion-item:hover {
  border-color: var(--accent);
  background-color: var(--surface);
}

/* 消息气泡 */
.ai-message {
  display: flex;
  gap: 8px;
  max-width: 100%;
}

.ai-message-avatar {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.ai-message--user .ai-message-avatar {
  background-color: var(--primary);
  color: white;
}

.ai-message--assistant .ai-message-avatar {
  background-color: var(--accent);
  color: white;
}

.ai-message-bubble {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}

.ai-message--user .ai-message-bubble {
  background-color: var(--primary);
  color: white;
}

.ai-message--assistant .ai-message-bubble {
  background-color: var(--elevated);
  color: var(--text);
  border: 1px solid var(--border);
}

.ai-message-content {
  min-height: 18px;
  /* 覆盖父级 .ai-message-bubble 的 pre-wrap：marked 已将换行转为 <p>/<br>，
     pre-wrap 会导致额外空白 */
  white-space: normal;
}

/* ===== S-M05: Markdown 渲染样式（marked 输出） ===== */
.ai-message-content :deep(p) {
  margin: 4px 0;
}

.ai-message-content :deep(p:first-child) {
  margin-top: 0;
}

.ai-message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.ai-message-content :deep(h1),
.ai-message-content :deep(h2),
.ai-message-content :deep(h3),
.ai-message-content :deep(h4),
.ai-message-content :deep(h5),
.ai-message-content :deep(h6) {
  margin: 10px 0 6px;
  font-weight: 600;
  line-height: 1.4;
}

.ai-message-content :deep(h1) { font-size: 18px; }
.ai-message-content :deep(h2) { font-size: 16px; }
.ai-message-content :deep(h3) { font-size: 15px; }
.ai-message-content :deep(h4),
.ai-message-content :deep(h5),
.ai-message-content :deep(h6) { font-size: 14px; }

.ai-message-content :deep(ul),
.ai-message-content :deep(ol) {
  margin: 6px 0;
  padding-left: 20px;
}

.ai-message-content :deep(li) {
  margin: 2px 0;
}

.ai-message-content :deep(blockquote) {
  margin: 6px 0;
  padding: 4px 12px;
  border-left: 3px solid var(--border);
  color: var(--text-secondary);
  font-style: italic;
}

.ai-message-content :deep(hr) {
  margin: 10px 0;
  border: none;
  border-top: 1px solid var(--border);
}

.ai-message-content :deep(a) {
  color: var(--accent);
  text-decoration: none;
}

.ai-message-content :deep(a:hover) {
  text-decoration: underline;
}

/* GFM 表格 */
.ai-message-content :deep(table) {
  width: 100%;
  margin: 8px 0;
  border-collapse: collapse;
  font-size: 12px;
  overflow-x: auto;
  display: block;
}

.ai-message-content :deep(thead) {
  background-color: var(--background);
}

.ai-message-content :deep(th),
.ai-message-content :deep(td) {
  padding: 6px 10px;
  border: 1px solid var(--border);
  text-align: left;
}

.ai-message-content :deep(th) {
  font-weight: 600;
  color: var(--text);
}

.ai-message-content :deep(td) {
  color: var(--text-secondary);
}

.ai-message-content :deep(del) {
  color: var(--text-tertiary);
}

/* 流式光标 */
.ai-message-cursor {
  display: inline-flex;
  gap: 3px;
  margin-left: 4px;
  vertical-align: middle;
}

.ai-cursor-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: var(--text-tertiary);
  animation: ai-bounce 1.2s infinite;
}

.ai-cursor-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.ai-cursor-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes ai-bounce {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}

.ai-message-meta {
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-tertiary);
}

/* 错误横幅 */
.ai-error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: var(--toast-error-bg, rgba(239, 68, 68, 0.1));
  border-top: 1px solid var(--toast-error-border, rgba(239, 68, 68, 0.3));
  flex-shrink: 0;
}

.ai-error-text {
  flex: 1;
  font-size: 12px;
  color: var(--toast-error-text, var(--status-error));
}

.ai-error-dismiss {
  border: none;
  background: transparent;
  color: var(--toast-error-text, var(--status-error));
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}

/* 输入区域 */
.ai-input-area {
  border-top: 1px solid var(--border);
  padding: 10px 12px 12px;
  background-color: var(--background);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 第一行：选择器并排，各占一半 */
.ai-selectors-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.ai-input-row {
  display: flex;
  gap: 6px;
  align-items: flex-end;
}

.ai-task-select,
.ai-model-select {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--surface);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.ai-task-select:focus,
.ai-model-select:focus {
  border-color: var(--accent);
}

.ai-model-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-input {
  flex: 1;
  min-height: 72px;
  max-height: 160px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--surface);
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  line-height: 1.6;
}

.ai-input:focus {
  border-color: var(--accent);
}

.ai-input::placeholder {
  color: var(--text-tertiary);
}

.ai-input:disabled {
  opacity: 0.6;
}

.ai-send-btn,
.ai-stop-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  align-self: flex-end;
}

.ai-send-btn {
  background-color: var(--accent);
  color: white;
}

.ai-send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.ai-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ai-stop-btn {
  background-color: var(--status-error, #ef4444);
  color: white;
}

.ai-stop-btn:hover {
  opacity: 0.9;
}

.ai-input-hint {
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-tertiary);
  text-align: right;
}

/* ===== Markdown 代码块渲染 ===== */
.ai-message-content :deep(.ai-code-block) {
  position: relative;
  margin: 8px 0;
  padding: 12px;
  background-color: var(--dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.55;
}

.ai-message-content :deep(.ai-code-block code) {
  display: block;
  color: var(--text);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  white-space: pre;
}

.ai-message-content :deep(.ai-code-lang) {
  display: block;
  margin-bottom: 6px;
  font-size: 10px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ai-message-content :deep(.ai-inline-code) {
  padding: 1px 5px;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-family: 'Consolas', 'Courier New', monospace;
  color: var(--text-secondary);
}

.ai-message-content :deep(strong) {
  font-weight: 600;
  color: var(--text);
}

/* ===== 文件树预览（P1-T05/P1-T06） ===== */
.ai-file-tree {
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.ai-file-tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background-color: var(--background);
  border-bottom: 1px solid var(--border);
}

.ai-file-tree-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.ai-file-tree-count {
  font-size: 11px;
  color: var(--text-tertiary);
}

.ai-file-list {
  max-height: 200px;
  overflow-y: auto;
}

.ai-file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 11px;
  border-bottom: 1px solid var(--border);
  background-color: var(--surface);
}

.ai-file-item:last-child {
  border-bottom: none;
}

.ai-file-icon {
  flex-shrink: 0;
  font-size: 13px;
}

.ai-file-name {
  flex: 1;
  color: var(--text);
  font-family: 'Consolas', 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-file-lang {
  flex-shrink: 0;
  padding: 0 4px;
  font-size: 9px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  background-color: var(--background);
  border-radius: 2px;
}

/* 代码校验指示器（P1-T05/P1-T06） */
.ai-file-validation {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  border-radius: 50%;
  cursor: help;
}

.ai-file-valid {
  color: var(--status-success, #22c55e);
  background-color: var(--status-success-bg, rgba(34, 197, 94, 0.1));
}

.ai-file-invalid {
  color: var(--status-error, #ef4444);
  background-color: var(--status-error-bg, rgba(239, 68, 68, 0.1));
}

.ai-file-actions {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  background-color: var(--background);
  border-top: 1px solid var(--border);
}

.ai-file-action-btn {
  padding: 4px 12px;
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  background-color: var(--surface);
  color: var(--text);
  transition: all 0.15s;
}

.ai-file-action-btn:hover {
  background-color: var(--hover);
}

.ai-file-action-btn--primary {
  background-color: var(--primary);
  color: var(--on-primary);
  border-color: var(--primary);
}

.ai-file-action-btn--primary:hover {
  opacity: 0.85;
}

/* ===== Agent 模式切换按钮激活态 ===== */
.ai-btn-icon--active {
  color: var(--accent) !important;
  background-color: var(--hover);
}

/* ===== Agent 思考步骤面板 ===== */
.ai-agent-steps {
  margin: 0 12px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--background);
  overflow: hidden;
  flex-shrink: 0;
  max-height: 40vh;
  display: flex;
  flex-direction: column;
}

.ai-agent-steps-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background-color: var(--surface-alt);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.ai-agent-steps-title {
  color: var(--accent);
}

.ai-agent-steps-count {
  color: var(--text-tertiary);
  font-weight: 400;
  font-size: 11px;
}

.ai-agent-steps-toggle {
  margin-left: auto;
  background: none;
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

.ai-agent-steps-body {
  overflow-y: auto;
  flex: 1;
  padding: 4px 0;
}

.ai-agent-steps-body::-webkit-scrollbar {
  width: 3px;
}

.ai-agent-steps-body::-webkit-scrollbar-thumb {
  background-color: var(--text-tertiary);
  border-radius: 2px;
}

.ai-agent-step {
  display: flex;
  gap: 6px;
  padding: 4px 10px;
  font-size: 11px;
  border-bottom: 1px solid var(--border);
  align-items: flex-start;
}

.ai-agent-step:last-child {
  border-bottom: none;
}

.ai-agent-step-icon {
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  line-height: 1.6;
}

.ai-agent-step-content {
  flex: 1;
  min-width: 0;
}

.ai-agent-step-label {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ai-agent-step--thought .ai-agent-step-label { color: var(--accent); }
.ai-agent-step--action .ai-agent-step-label { color: var(--status-warning, #f59e0b); }
.ai-agent-step--observation .ai-agent-step-label { color: var(--status-info, #3b82f6); }
.ai-agent-step--answer .ai-agent-step-label { color: var(--status-success, #22c55e); }
.ai-agent-step--error .ai-agent-step-label { color: var(--status-error, #ef4444); }
.ai-agent-step--pending .ai-agent-step-label { color: var(--text-tertiary); }

.ai-agent-step-text {
  color: var(--text);
  line-height: 1.5;
  word-break: break-word;
  margin-top: 2px;
}

.ai-agent-step-meta {
  margin-top: 3px;
  font-size: 10px;
  color: var(--text-tertiary);
  word-break: break-all;
}

.ai-agent-step-meta code {
  background-color: var(--surface-alt);
  padding: 0 4px;
  border-radius: 2px;
  font-size: 10px;
  color: var(--text-secondary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: bottom;
}

/* ===== 会话侧边栏（P2-T08 对话持久化） ===== */
.ai-conversations-sidebar {
  border-bottom: 1px solid var(--border);
  background-color: var(--background);
  flex-shrink: 0;
  max-height: 40vh;
  display: flex;
  flex-direction: column;
}

.ai-conversations-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  background-color: var(--surface-alt);
}

.ai-conversations-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.ai-conversations-actions {
  display: flex;
  gap: 4px;
}

.ai-conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.ai-conversations-list::-webkit-scrollbar {
  width: 3px;
}

.ai-conversations-list::-webkit-scrollbar-thumb {
  background-color: var(--text-tertiary);
  border-radius: 2px;
}

.ai-conversations-empty {
  padding: 16px 12px;
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
}

.ai-conversation-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  transition: background-color 0.15s;
  border-bottom: 1px solid var(--border);
}

.ai-conversation-item:last-child {
  border-bottom: none;
}

.ai-conversation-item:hover {
  background-color: var(--hover);
}

.ai-conversation-item--active {
  background-color: var(--surface-alt);
  border-left: 2px solid var(--accent);
  padding-left: 8px;
}

.ai-conversation-main {
  flex: 1;
  min-width: 0;
}

.ai-conversation-title {
  font-size: 12px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.ai-conversation-item--active .ai-conversation-title {
  font-weight: 600;
  color: var(--accent);
}

.ai-conversation-meta {
  display: flex;
  gap: 8px;
  margin-top: 2px;
  font-size: 10px;
  color: var(--text-tertiary);
}

.ai-conversation-count {
  color: var(--text-secondary);
}

.ai-conversation-delete {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
}

.ai-conversation-item:hover .ai-conversation-delete {
  opacity: 1;
}

.ai-conversation-delete:hover:not(:disabled) {
  background-color: var(--status-error-bg, rgba(239, 68, 68, 0.1));
  color: var(--status-error, #ef4444);
}

.ai-conversation-delete:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
