<template>
  <div class="interaction-panel">
    <div class="interaction-header">
      <label class="section-title">{{ $t('propertyPanel.events') }}</label>
    </div>

    <div
      v-for="(event, eventIndex) in (props.graphicProperties?.events || [])"
      :key="event.id || eventIndex"
      class="event-card"
    >
      <!-- 事件头部 -->
      <div class="event-header">
        <select
          v-model="event.eventType"
          class="event-type-select"
          @change="updateGraphicProperties"
        >
          <option value="click">
            {{ $t('propertyPanel.click') }}
          </option>
          <option value="dblclick">
            {{ $t('propertyPanel.dblclick') }}
          </option>
          <option value="mouseenter">
            {{ $t('propertyPanel.mouseenter') }}
          </option>
          <option value="mouseleave">
            {{ $t('propertyPanel.mouseleave') }}
          </option>
          <optgroup :label="$t('propertyPanel.advancedEvents')">
            <option value="vnodeMounted">
              {{ $t('propertyPanel.vnodeMounted') }}
            </option>
            <option value="vnodeBeforeMount">
              {{ $t('propertyPanel.vnodeBeforeMount') }}
            </option>
          </optgroup>
        </select>
        <button
          class="btn-delete"
          :title="$t('propertyPanel.removeEvent')"
          @click="removeEvent(eventIndex as number)"
        >
          ×
        </button>
      </div>

      <!-- 动作列表 -->
      <div class="actions-section">
        <label class="subsection-title">{{ $t('propertyPanel.actions') }}</label>
        <div
          v-for="(action, actionIndex) in (event.actions || [])"
          :key="action.id || actionIndex"
          class="action-card"
        >
          <!-- 动作类型选择 -->
          <div class="action-header">
            <select
              v-model="action.actionType"
              class="action-type-select"
              @change="onActionTypeChange(eventIndex, actionIndex)"
            >
              <!-- 一类：API 动作 -->
              <optgroup :label="$t('propertyPanel.apiGroup')">
                <option value="api">
                  {{ $t('propertyPanel.api') }}
                </option>
              </optgroup>
              <!-- 二类：脚本引擎动作 -->
              <optgroup :label="$t('propertyPanel.scriptGroup')">
                <option value="script">
                  {{ $t('propertyPanel.script') }}
                </option>
                <option value="customScript">
                  {{ $t('propertyPanel.customScript') }}
                </option>
                <option value="show">
                  {{ $t('propertyPanel.show') }}
                </option>
                <option value="hide">
                  {{ $t('propertyPanel.hide') }}
                </option>
                <option value="change">
                  {{ $t('propertyPanel.changeAction') }}
                </option>
                <option value="navigate">
                  {{ $t('propertyPanel.navigate') }}
                </option>
                <option value="alert">
                  {{ $t('propertyPanel.alert') }}
                </option>
              </optgroup>
            </select>
            <button
              class="btn-delete-sm"
              :title="$t('propertyPanel.removeAction')"
              @click="removeAction(eventIndex as number, actionIndex as number)"
            >
              ×
            </button>
          </div>

          <!-- API 动作专属表单 -->
          <template v-if="action.actionType === 'api'">
            <div class="form-row">
              <label>{{ $t('propertyPanel.apiPath') }}</label>
              <input
                v-model="action.target"
                type="text"
                placeholder="/api/v1/control/:deviceId"
                @input="updateGraphicProperties"
              >
            </div>
            <div class="form-row">
              <label>{{ $t('propertyPanel.apiParams') }}</label>
              <textarea
                :value="formatActionValue(action.value)"
                rows="3"
                placeholder="{&quot;command&quot;:&quot;start&quot;}"
                @input="(e: any) => { try { action.value = JSON.parse(e.target.value) } catch(_) { action.value = e.target.value } }"
                @blur="updateGraphicProperties"
              />
            </div>
          </template>

          <!-- 脚本动作专属表单 -->
          <template v-else-if="action.actionType === 'script'">
            <div class="form-row">
              <label>{{ $t('propertyPanel.scriptMethod') }}</label>
              <select
                v-model="action.target"
                class="script-method-select"
                @change="updateGraphicProperties"
              >
                <option value="setProperty">
                  {{ $t('propertyPanel.setProperty') }}
                </option>
                <option value="playAnimation">
                  {{ $t('propertyPanel.playAnimation') }}
                </option>
                <option value="stopAnimation">
                  {{ $t('propertyPanel.stopAnimation') }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>{{ $t('propertyPanel.scriptParams') }}</label>
              <textarea
                :value="formatActionValue(action.value)"
                rows="3"
                :placeholder="getScriptParamsPlaceholder(action.target)"
                @input="(e: any) => { try { action.value = JSON.parse(e.target.value) } catch(_) { action.value = e.target.value } }"
                @blur="updateGraphicProperties"
              />
            </div>
          </template>

          <!-- 自定义脚本动作专属表单 -->
          <template v-else-if="action.actionType === 'customScript'">
            <div class="form-row">
              <label>{{ $t('propertyPanel.scriptPreview') }}</label>
            </div>
            <div class="script-preview-container">
              <div class="script-preview">
                <code class="script-preview-code">{{ previewScript(action.script) }}</code>
              </div>
              <button
                class="btn-add btn-open-drawer"
                type="button"
                @click="openScriptInDrawer(eventIndex as number, actionIndex as number)"
              >
                <span class="btn-icon">✎</span>
                {{ $t('propertyPanel.openInDrawer') }}
              </button>
            </div>
          </template>

          <!-- 通用表单（show/hide/change/navigate/alert） -->
          <template v-else>
            <div
              v-if="needsTarget(action.actionType)"
              class="form-row"
            >
              <label>{{ $t('propertyPanel.target') }}</label>
              <input
                v-model="action.target"
                type="text"
                :placeholder="getTargetPlaceholder(action.actionType)"
                @input="updateGraphicProperties"
              >
            </div>
            <div
              v-if="needsValueInput(action.actionType)"
              class="form-row"
            >
              <label>{{ $t('propertyPanel.value') }}</label>
              <input
                v-model="action.value"
                type="text"
                :placeholder="getValuePlaceholder(action.actionType)"
                @input="updateGraphicProperties"
              >
            </div>
          </template>

          <!-- 条件列表 -->
          <div class="conditions-section">
            <label class="subsection-title">{{ $t('propertyPanel.conditions') }}</label>
            <div
              v-for="(condition, conditionIndex) in (action.conditions || [])"
              :key="condition.id || conditionIndex"
              class="condition-card"
            >
              <div class="form-row">
                <label>{{ $t('propertyPanel.field') }}</label>
                <input
                  v-model="condition.field"
                  type="text"
                  placeholder="dataSource.value"
                  @input="updateGraphicProperties"
                >
              </div>
              <div class="form-row">
                <label>{{ $t('propertyPanel.operator') }}</label>
                <select
                  v-model="condition.operator"
                  @change="updateGraphicProperties"
                >
                  <option value="equal">
                    {{ $t('propertyPanel.equal') }}
                  </option>
                  <option value="notEqual">
                    {{ $t('propertyPanel.notEqual') }}
                  </option>
                  <option value="greaterThan">
                    {{ $t('propertyPanel.greaterThan') }}
                  </option>
                  <option value="lessThan">
                    {{ $t('propertyPanel.lessThan') }}
                  </option>
                  <option value="greaterThanOrEqual">
                    {{ $t('propertyPanel.greaterThanOrEqual') }}
                  </option>
                  <option value="lessThanOrEqual">
                    {{ $t('propertyPanel.lessThanOrEqual') }}
                  </option>
                  <option value="contains">
                    {{ $t('propertyPanel.contains') }}
                  </option>
                  <option value="notContains">
                    {{ $t('propertyPanel.notContains') }}
                  </option>
                </select>
              </div>
              <div class="form-row">
                <label>{{ $t('propertyPanel.value') }}</label>
                <input
                  v-model="condition.value"
                  type="text"
                  placeholder="80"
                  @input="updateGraphicProperties"
                >
              </div>
              <button
                class="btn-delete-sm"
                @click="removeCondition(eventIndex as number, actionIndex as number, conditionIndex as number)"
              >
                {{ $t('propertyPanel.remove') }}
              </button>
            </div>
            <button
              class="btn-add"
              @click="addCondition(eventIndex as number, actionIndex as number)"
            >
              + {{ $t('propertyPanel.addCondition') }}
            </button>
          </div>
        </div>
        <button
          class="btn-add"
          @click="addAction(eventIndex as number)"
        >
          + {{ $t('propertyPanel.addAction') }}
        </button>
      </div>
    </div>

    <button
      class="btn-add btn-add-event"
      @click="addEvent"
    >
      + {{ $t('propertyPanel.addEvent') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useScriptDrawer } from '../../components/script/useScriptDrawer';

const props = defineProps<{
  graphicProperties: any;
}>();

const emit = defineEmits<{
  updateGraphicProperties: [];
}>();

const { openScript } = useScriptDrawer();

const updateGraphicProperties = () => {
  emit('updateGraphicProperties');
};

// 切换动作类型时清空无关字段
const onActionTypeChange = (eventIndex: number, actionIndex: number) => {
  const action = props.graphicProperties?.events?.[eventIndex]?.actions?.[actionIndex];
  if (!action) return;
  if (action.actionType === 'api') {
    action.target = '';
    action.value = {};
  } else if (action.actionType === 'script') {
    action.target = 'setProperty';
    action.value = {};
  } else if (action.actionType === 'customScript') {
    action.target = '';
    action.value = '';
    action.script = action.script || '';
  }
  updateGraphicProperties();
};

// 格式化 JSON 显示
const formatActionValue = (value: any): string => {
  if (typeof value === 'object' && value !== null) {
    try { return JSON.stringify(value, null, 2); } catch { return ''; }
  }
  return value || '';
};

// 哪些动作需要 target 输入
const needsTarget = (actionType: string): boolean => {
  return ['show', 'hide', 'change', 'navigate'].includes(actionType);
};

// 哪些动作需要 value 输入
const needsValueInput = (actionType: string): boolean => {
  return ['change', 'alert'].includes(actionType);
};

const getTargetPlaceholder = (actionType: string): string => {
  switch (actionType) {
    case 'show':
    case 'hide': return '图元ID';
    case 'change': return 'style.color';
    case 'navigate': return 'URL 或页面ID';
    default: return '';
  }
};

const getValuePlaceholder = (actionType: string): string => {
  switch (actionType) {
    case 'change': return '#FF0000';
    case 'alert': return '提示信息';
    default: return '';
  }
};

const getScriptParamsPlaceholder = (method: string): string => {
  switch (method) {
    case 'setProperty': return '{"graphicId":"g1","path":"style.color","value":"#FF0000"}';
    case 'playAnimation': return '{"graphicId":"g1","animationName":"blink","options":{}}';
    case 'stopAnimation': return '{"graphicId":"g1","animationName":"blink"}';
    default: return '{}';
  }
};

/** 在底部抽屉中打开脚本编辑器 */
const openScriptInDrawer = (eventIndex: number, actionIndex: number) => {
  const action = props.graphicProperties?.events?.[eventIndex]?.actions?.[actionIndex];
  if (!action) return;

  const event = props.graphicProperties.events[eventIndex];
  const graphicId = props.graphicProperties.config?.id || 'unknown';
  const tabId = `interaction-${graphicId}-${event.id}-${action.id}`;

  openScript(
    {
      id: tabId,
      title: `${event.eventType} → ${action.actionType}`,
      script: action.script || '',
      mode: 'interaction',
      source: { type: 'interaction', sourceId: `${graphicId}:${event.id}:${action.id}` },
    },
    (script: string) => {
      action.script = script;
      updateGraphicProperties();
    },
  );
};

/** 脚本预览（截取前几行） */
const previewScript = (script: string): string => {
  if (!script) return '// 暂无脚本';
  const lines = script.split('\n').slice(0, 3);
  if (script.split('\n').length > 3) lines.push('...');
  return lines.join('\n');
};

const addEvent = () => {
  if (props.graphicProperties) {
    if (!Array.isArray(props.graphicProperties.events)) {
      props.graphicProperties.events = [];
    }
    props.graphicProperties.events.push({
      id: crypto.randomUUID(),
      eventType: 'click',
      actions: [],
    });
    updateGraphicProperties();
  }
};

const removeEvent = (eventIndex: number) => {
  if (props.graphicProperties && Array.isArray(props.graphicProperties.events)) {
    props.graphicProperties.events.splice(eventIndex, 1);
    updateGraphicProperties();
  }
};

const addAction = (eventIndex: number) => {
  if (props.graphicProperties?.events?.[eventIndex]) {
    props.graphicProperties.events[eventIndex].actions.push({
      id: crypto.randomUUID(),
      actionType: 'show',
      target: '',
      value: '',
      conditions: [],
    });
    updateGraphicProperties();
  }
};

const removeAction = (eventIndex: number, actionIndex: number) => {
  if (props.graphicProperties?.events?.[eventIndex]?.actions) {
    props.graphicProperties.events[eventIndex].actions.splice(actionIndex, 1);
    updateGraphicProperties();
  }
};

const addCondition = (eventIndex: number, actionIndex: number) => {
  if (props.graphicProperties?.events?.[eventIndex]?.actions?.[actionIndex]?.conditions) {
    props.graphicProperties.events[eventIndex].actions[actionIndex].conditions.push({
      id: crypto.randomUUID(),
      field: '',
      operator: 'equal',
      value: '',
    });
    updateGraphicProperties();
  }
};

const removeCondition = (eventIndex: number, actionIndex: number, conditionIndex: number) => {
  if (props.graphicProperties?.events?.[eventIndex]?.actions?.[actionIndex]?.conditions) {
    props.graphicProperties.events[eventIndex].actions[actionIndex].conditions.splice(conditionIndex, 1);
    updateGraphicProperties();
  }
};
</script>

<style scoped>
/* ── 面板容器 ── */
.interaction-panel {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}

.subsection-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 6px 0 4px;
  display: block;
}

/* ── 事件卡（蓝色系） ── */
.event-card {
  border: 1px solid var(--border);
  border-left: 3px solid var(--primary, #4a9ef8);
  border-radius: 6px;
  padding: 8px 10px;
  background: var(--surface);
}

.event-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--border);
}

.event-type-select {
  flex: 1;
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--panel);
  color: var(--text-primary);
  font-size: 12px;
}

/* ── 动作区域 ── */
.actions-section {
  padding-left: 4px;
}

.action-card {
  border: 1px dashed var(--border);
  border-radius: 4px;
  padding: 6px 8px;
  margin: 6px 0;
  background: var(--panel);
}

.action-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.action-type-select,
.script-method-select {
  flex: 1;
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-primary);
  font-size: 12px;
}

/* ── 表单行 ── */
.form-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.form-row label {
  width: 50px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
}

.form-row input,
.form-row textarea,
.form-row select {
  flex: 1;
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--surface);
  color: var(--text-primary);
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
}

.form-row textarea {
  resize: vertical;
  min-height: 48px;
}

.form-row input:focus,
.form-row textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 1px rgba(74, 158, 248, 0.2);
}

/* ── 条件区域（橙色系） ── */
.conditions-section {
  padding-left: 6px;
  margin-top: 6px;
  border-left: 2px solid var(--warning, #e6a23c);
}

.condition-card {
  padding: 4px 4px 4px 8px;
  margin: 4px 0;
  border: 1px dotted var(--border);
  border-radius: 3px;
  background: var(--surface);
}

/* ── 按钮 ── */
.btn-delete {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--danger, #f56c6c);
  border-radius: 50%;
  background: transparent;
  color: var(--danger, #f56c6c);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.btn-delete:hover {
  background: var(--danger, #f56c6c);
  color: #fff;
}

.btn-delete-sm {
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-delete-sm:hover {
  background: var(--danger, #f56c6c);
  color: #fff;
  border-color: var(--danger);
}

.btn-add {
  width: 100%;
  padding: 4px 0;
  border: 1px dashed var(--border);
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-add:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(74, 158, 248, 0.05);
}

.btn-add-event {
  margin-top: 2px;
  padding: 6px 0;
  font-size: 12px;
}

/* ── select/optgroup 主题适配 ── */
select {
  cursor: pointer;
}

optgroup {
  font-weight: 600;
  font-style: normal;
  color: var(--text-secondary);
  font-size: 11px;
}

/* ── 脚本预览区域 ── */
.script-preview-container {
  margin-bottom: 6px;
}

.script-preview {
  background-color: var(--background, #1e1e1e);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 8px;
  max-height: 60px;
  overflow: auto;
  margin-bottom: 6px;
}

.script-preview-code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
  white-space: pre-wrap;
  word-break: break-all;
}

.btn-open-drawer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-color: var(--primary, #4a9ef8);
  color: var(--primary, #4a9ef8);
}

.btn-open-drawer:hover {
  background: var(--primary, #4a9ef8);
  color: #fff;
}

.btn-open-drawer .btn-icon {
  font-size: 13px;
}
</style>