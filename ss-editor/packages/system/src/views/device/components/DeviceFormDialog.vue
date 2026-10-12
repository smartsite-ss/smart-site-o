<template>
  <div
    v-if="visible"
    class="modal-overlay"
    @click.self="handleClose"
  >
    <div class="modal">
      <div class="modal-header">
        <h2>{{ device ? $t('system.devices.editDevice') : $t('system.devices.addDevice') }}</h2>
        <button
          class="modal-close"
          @click="handleClose"
        >
          &times;
        </button>
      </div>

      <!-- Tab 导航 -->
      <div class="tab-bar">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'basic' }"
          @click="activeTab = 'basic'"
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
            /><line
              x1="12"
              y1="16"
              x2="12"
              y2="12"
            /><line
              x1="12"
              y1="8"
              x2="12.01"
              y2="8"
            />
          </svg>
          {{ $t('system.devices.basicInfo') }}
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'channel' }"
          @click="activeTab = 'channel'"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
          {{ $t('system.devices.channelConfig') }}
          <span
            v-if="channelSchema && !channelConfigured"
            class="tab-dot"
          />
        </div>
      </div>

      <!-- Tab 内容：基本信息 -->
      <div
        v-show="activeTab === 'basic'"
        class="modal-body"
      >
        <div class="form-group">
          <label class="form-label">{{ $t('system.devices.deviceCode') }} <span class="required">*</span></label>
          <input
            v-model="form.deviceCode"
            type="text"
            class="form-input"
            :placeholder="$t('system.devices.deviceCodePlaceholder')"
            :disabled="!!device"
            maxlength="63"
          >
          <p
            v-if="deviceCodeError"
            class="form-error"
          >
            {{ deviceCodeError }}
          </p>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('system.devices.deviceName') }} <span class="required">*</span></label>
          <input
            v-model="form.deviceName"
            type="text"
            class="form-input"
            :placeholder="$t('system.devices.deviceNamePlaceholder')"
          >
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('system.devices.nameAlias') }}</label>
          <input
            v-model="form.nameAlias"
            type="text"
            class="form-input"
            :placeholder="$t('system.devices.nameAliasPlaceholder')"
          >
        </div>

        <!-- 设备模板选择 -->
        <div class="form-group">
          <label class="form-label">{{ $t('system.devices.template') }}</label>
          <div class="template-tree-box">
            <div
              v-if="selectedTemplate"
              class="selected-template"
            >
              <div class="selected-info">
                <span class="selected-name">{{ selectedTemplate.name }}</span>
                <span class="selected-type">{{ selectedTemplate.deviceType }}</span>
              </div>
              <button
                class="btn-clear"
                @click="clearTemplate"
              >
                &times;
              </button>
            </div>
            <div
              v-if="!selectedTemplate"
              class="template-tree"
            >
              <div
                v-if="treeLoading"
                class="tree-loading"
              >
                {{ $t('system.devices.loadingTemplates') }}
              </div>
              <div
                v-else-if="treeData.length === 0"
                class="tree-empty"
              >
                {{ $t('system.devices.noTemplates') }}
              </div>
              <template
                v-for="industry in treeData"
                v-else
                :key="industry.id"
              >
                <div
                  class="tree-node industry-node"
                  :class="{ expanded: expandedNodes.has(industry.id) }"
                  @click="toggleIndustry(industry.id)"
                >
                  <svg
                    class="chevron"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    :class="{ rotated: expandedNodes.has(industry.id) }"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span class="node-label">{{ industry.name }}</span>
                  <span class="node-count">{{ industry.templateCount }}</span>
                </div>
                <div
                  v-if="expandedNodes.has(industry.id)"
                  class="industry-children"
                >
                  <template
                    v-for="cat in industry.categories"
                    :key="cat.id"
                  >
                    <div class="tree-node category-node">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        <path d="M2 8h20l-1.58 5.26A2 2 0 0 1 18.47 15H5.53a2 2 0 0 1-1.95-1.74L2 8z" />
                      </svg>
                      <span class="node-label">{{ cat.name }}</span>
                      <span class="node-count">{{ cat.templateCount }}</span>
                    </div>
                    <div
                      v-for="tpl in cat.templates"
                      :key="tpl.id"
                      class="tree-node template-node"
                      @click="selectTemplateNode(tpl)"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line
                          x1="16"
                          y1="13"
                          x2="8"
                          y2="13"
                        />
                        <line
                          x1="16"
                          y1="17"
                          x2="8"
                          y2="17"
                        />
                      </svg>
                      <span class="node-label">{{ tpl.name }}</span>
                      <span class="version-tag">v{{ tpl.version }}</span>
                    </div>
                  </template>
                </div>
              </template>
            </div>
          </div>
          <p
            v-if="templateError"
            class="form-error"
          >
            {{ templateError }}
          </p>
        </div>

        <!-- 采集驱动选择 -->
        <div class="form-group">
          <label class="form-label">{{ $t('system.devices.driver') }} <span class="required">*</span></label>
          <select
            v-model="form.driver"
            class="form-input form-select"
            @change="onDriverChange"
          >
            <option value="">
              {{ $t('system.devices.driverSelect') }}
            </option>
            <option
              v-for="p in pluginOptions"
              :key="p.protocol"
              :value="p.protocol"
            >
              {{ p.displayName }} v{{ p.version }}
            </option>
          </select>
          <p class="form-hint">
            {{ $t('system.devices.driverHint') }}
          </p>
          <p
            v-if="driverError"
            class="form-error"
          >
            {{ driverError }}
          </p>
        </div>

        <!-- 分组选择 -->
        <div class="form-group">
          <label class="form-label">{{ $t('system.devices.group') }}</label>
          <select
            v-model="form.groupId"
            class="form-input form-select"
          >
            <option value="">
              {{ $t('system.devices.noGroup') }}
            </option>
            <option
              v-for="g in groupOptions"
              :key="g.id"
              :value="g.id"
            >
              {{ g.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">{{ $t('system.devices.scanRate') }}</label>
          <input
            v-model.number="form.scanRate"
            type="number"
            class="form-input"
            :placeholder="$t('system.devices.scanRatePlaceholder')"
          >
        </div>

        <div class="form-group">
          <label class="form-label">{{ $t('system.devices.offlinePeriod') }}</label>
          <input
            v-model.number="form.offlinePeriod"
            type="number"
            class="form-input"
            :placeholder="$t('system.devices.offlinePeriodPlaceholder')"
          >
          <p class="form-hint">
            {{ $t('system.devices.offlinePeriodHint') }}
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">{{ $t('system.devices.deviceDesc') }}</label>
          <textarea
            v-model="form.description"
            class="form-input form-textarea"
            :placeholder="$t('system.devices.deviceDescPlaceholder')"
            rows="2"
          />
        </div>
        <p
          v-if="formError"
          class="form-error"
        >
          {{ formError }}
        </p>
      </div>

      <!-- Tab 内容：通道配置 -->
      <div
        v-show="activeTab === 'channel'"
        class="modal-body"
      >
        <div
          v-if="!form.driver"
          class="channel-empty-tip"
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          >
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
          <p>{{ $t('system.devices.channelEmptyHint') }}</p>
        </div>

        <template v-else-if="channelSchema">
          <div class="channel-section-header">
            <span class="driver-badge">{{ form.driver }}</span>
          </div>
          <ChannelConfigForm
            :schema="filteredChannelSchema"
            :model-value="form.connection"
            @update:model-value="onConnectionChange"
          />

          <!-- OPC UA 安全配置 -->
          <div
            v-if="form.driver === 'opc_ua'"
            class="driver-specific-config"
          >
            <div class="driver-section-title">
              {{ $t('system.devices.opcuaSecurityTitle') }}
            </div>
            <div class="form-row">
              <div class="form-group form-group-half">
                <label class="form-label-sm">{{ $t('system.devices.securityMode') }}</label>
                <select
                  class="form-input form-input-sm"
                  :value="form.connection.securityMode ?? 'None'"
                  @change="updateConnectionField('securityMode', ($event.target as HTMLSelectElement).value)"
                >
                  <option
                    v-for="opt in opcuaSecurityModeOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="form-group form-group-half">
                <label class="form-label-sm">{{ $t('system.devices.securityPolicy') }}</label>
                <select
                  class="form-input form-input-sm"
                  :value="form.connection.securityPolicy ?? 'None'"
                  @change="updateConnectionField('securityPolicy', ($event.target as HTMLSelectElement).value)"
                >
                  <option
                    v-for="opt in opcuaSecurityPolicyOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group form-group-half">
                <label class="form-label-sm">{{ $t('system.devices.username') }}</label>
                <input
                  type="text"
                  class="form-input form-input-sm"
                  :value="form.connection.username ?? ''"
                  :placeholder="$t('system.devices.usernameOptional')"
                  @input="updateConnectionField('username', ($event.target as HTMLInputElement).value)"
                >
              </div>
              <div class="form-group form-group-half">
                <label class="form-label-sm">{{ $t('system.devices.password') }}</label>
                <input
                  type="password"
                  class="form-input form-input-sm"
                  :value="form.connection.password ?? ''"
                  :placeholder="$t('system.devices.passwordOptional')"
                  @input="updateConnectionField('password', ($event.target as HTMLInputElement).value)"
                >
              </div>
            </div>
          </div>

          <!-- S7 配置 -->
          <div
            v-if="form.driver === 'siemens_s7'"
            class="driver-specific-config"
          >
            <div class="driver-section-title">
              {{ $t('system.devices.s7ConfigTitle') }}
            </div>
            <div class="form-row">
              <div class="form-group form-group-half">
                <label class="form-label-sm">{{ $t('system.devices.rack') }}</label>
                <input
                  type="number"
                  class="form-input form-input-sm"
                  :value="form.connection.rack ?? 0"
                  min="0"
                  max="31"
                  @input="updateConnectionField('rack', Number(($event.target as HTMLInputElement).value) || 0)"
                >
              </div>
              <div class="form-group form-group-half">
                <label class="form-label-sm">{{ $t('system.devices.slot') }}</label>
                <input
                  type="number"
                  class="form-input form-input-sm"
                  :value="form.connection.slot ?? 1"
                  min="0"
                  max="31"
                  @input="updateConnectionField('slot', Number(($event.target as HTMLInputElement).value) || 0)"
                >
              </div>
            </div>
            <div class="form-group s7-switch-group">
              <label class="form-label-sm">{{ $t('system.devices.optimizeBlockAccess') }}</label>
              <div class="switch-row">
                <input
                  type="checkbox"
                  class="form-checkbox"
                  :checked="form.connection.optimizeBlockAccess ?? false"
                  @change="updateConnectionField('optimizeBlockAccess', ($event.target as HTMLInputElement).checked)"
                >
                <span class="form-hint">{{ $t('system.devices.optimizeBlockAccessHint') }}</span>
              </div>
            </div>
          </div>

          <div
            v-if="channelValidateErrors.length"
            class="channel-errors"
          >
            <p
              v-for="e in channelValidateErrors"
              :key="e.field"
              class="form-error"
            >
              {{ e.field }}: {{ e.message }}
            </p>
          </div>
          <div
            v-if="channelValid === true"
            class="channel-result"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><polyline points="20 6 9 17 4 12" /></svg>
            <span>{{ $t('system.devices.validateSuccess') }}</span>
          </div>
          <div class="channel-actions">
            <button
              class="btn btn-secondary btn-sm"
              :disabled="validating"
              @click="validateChannel"
            >
              {{ validating ? $t('system.devices.validating') : $t('system.devices.validateConfig') }}
            </button>
          </div>
        </template>
      </div>

      <div class="modal-footer">
        <div class="footer-left">
          <span
            v-if="channelSchema && !channelConfigured && activeTab !== 'channel'"
            class="footer-hint"
          >
            {{ $t('system.devices.channelIncomplete') }}
          </span>
        </div>
        <div class="footer-right">
          <button
            class="btn btn-secondary"
            @click="handleClose"
          >
            {{ $t('system.devices.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="submitting"
            @click="handleSubmit"
          >
            {{ submitting ? $t('system.devices.submitting') : (device ? $t('system.devices.save') : $t('system.devices.add')) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useI18n } from '@scada-editor/core';
import type { Device } from '../../../types/api';
import type { PluginInfo, PluginConnectionSchema } from '../../../api/types/plugin';
import { templateApi } from '../../../api/modules/template.api';
import { deviceApi } from '../../../api/modules/device.api';
import { pluginApi } from '../../../api/modules/plugin.api';
import ChannelConfigForm from './ChannelConfigForm.vue';

const props = defineProps<{
  visible: boolean;
  device: Device | null;
  projectId: string;
  defaultGroupId?: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  submit: [dto: any, resolve: () => void];
}>();

const { t, locale } = useI18n();

// 模板树数据
interface TreeNode {
  id: string;
  name: string;
  templateCount: number;
  categories: Array<{
    id: string;
    name: string;
    templateCount: number;
    templates: Array<{
      id: string;
      name: string;
      deviceType: string;
      version: string;
      variableCount: number;
    }>;
  }>;
}

const treeData = ref<TreeNode[]>([]);
const treeLoading = ref(false);
const expandedNodes = ref(new Set<string>());
const templateError = ref('');

// 已选中的模板信息
const selectedTemplate = ref<{ id: string; name: string; deviceType: string; description?: string } | null>(null);

const form = ref({
  deviceCode: '',
  deviceName: '',
  nameAlias: '',
  templateId: '',
  driver: '' as string,
  groupId: '' as string,
  description: '',
  scanRate: 1000,
  offlinePeriod: 30000,
  connection: {} as Record<string, any>,
});
const submitting = ref(false);
const formError = ref('');
const deviceCodeError = ref('');
const driverError = ref('');

// ⭐ 插件相关
const pluginOptions = ref<PluginInfo[]>([]);
const channelSchema = ref<PluginConnectionSchema | null>(null);
const channelValidateErrors = ref<Array<{ field: string; message: string }>>([]);
const channelValid = ref<boolean | null>(null);
const validating = ref(false);

// ⭐ Tab 状态
const activeTab = ref<'basic' | 'channel'>('basic');
const channelConfigured = ref(false);

/** 驱动专属字段：这些字段由下方的增强 UI 渲染，需从通用 Schema 中过滤掉以避免重复 */
const DRIVER_SPECIFIC_FIELDS: Record<string, string[]> = {
  opc_ua: ['securityMode', 'securityPolicy', 'username', 'password'],
  siemens_s7: ['rack', 'slot'],
};

/** 过滤后的通道 Schema（排除已由驱动专属 UI 渲染的字段） */
const filteredChannelSchema = computed<PluginConnectionSchema>(() => {
  const schema = channelSchema.value;
  if (!schema) return { type: 'object', required: [], properties: {} };
  const excludeFields = DRIVER_SPECIFIC_FIELDS[form.value.driver] ?? [];
  if (excludeFields.length === 0) return schema;
  const filteredProperties = { ...schema.properties };
  for (const field of excludeFields) {
    delete filteredProperties[field];
  }
  return { ...schema, properties: filteredProperties };
});

/** OPC UA 安全模式选项 */
const opcuaSecurityModeOptions = computed(() => [
  { label: t('system.devices.securityModeNone'), value: 'None' },
  { label: t('system.devices.securityModeSign'), value: 'Sign' },
  { label: t('system.devices.securityModeSignAndEncrypt'), value: 'SignAndEncrypt' },
]);

/** OPC UA 安全策略选项 */
const opcuaSecurityPolicyOptions = computed(() => [
  { label: t('system.devices.securityPolicyNone'), value: 'None' },
  { label: t('system.devices.securityPolicyBasic128Rsa15'), value: 'Basic128Rsa15' },
  { label: t('system.devices.securityPolicyBasic256'), value: 'Basic256' },
  { label: t('system.devices.securityPolicyBasic256Sha256'), value: 'Basic256Sha256' },
]);

/** 更新 connection 中单个字段 */
function updateConnectionField(field: string, value: unknown) {
  form.value.connection = { ...form.value.connection, [field]: value };
  channelValid.value = null;
  channelValidateErrors.value = [];
  channelConfigured.value = true;
}

function onConnectionChange(value: Record<string, any>) {
  form.value.connection = value;
  channelValid.value = null;
  channelValidateErrors.value = [];
  channelConfigured.value = true;
}

// 分组选项
const groupOptions = ref<Array<{ id: string; name: string }>>([]);

async function loadGroupOptions() {
  if (!props.projectId) return;
  try {
    const res = await deviceApi.listGroups(props.projectId);
    const data = (res as any).data?.data || (res as any).data || [];
    groupOptions.value = Array.isArray(data) ? data : [];
  } catch {
    groupOptions.value = [];
  }
}

// ⭐ 加载采集插件列表
async function loadPlugins() {
  try {
    const res = await pluginApi.list();
    const data = (res as any).data?.data || (res as any).data || [];
    pluginOptions.value = Array.isArray(data) ? data : [];
  } catch {
    pluginOptions.value = [];
  }
}

// ⭐ 驱动变更时加载对应的 Schema + 初始化默认值
async function onDriverChange() {
  await loadSchemaForDriver(form.value.driver);
}

async function loadSchemaForDriver(driver: string) {
  channelValidateErrors.value = [];
  if (!driver) {
    channelSchema.value = null;
    return;
  }
  try {
    const res = await pluginApi.getSchema(driver);
    const schema = (res as any).data?.data || (res as any).data;
    if (schema?.properties) {
      channelSchema.value = schema;
      // 初始化 connection 为插件的默认值
      const plugin = pluginOptions.value.find(p => p.protocol === driver);
      const defaults = plugin?.defaultConnection || {};
      // 只设置尚未有值的字段
      const current = form.value.connection || {};
      form.value.connection = { ...defaults, ...current };
    }
  } catch {
    channelSchema.value = null;
  }
}

// ⭐ 调用插件校验接口
async function validateChannel() {
  if (!form.value.driver) return;
  channelValidateErrors.value = [];
  channelValid.value = null;
  validating.value = true;
  try {
    const res = await pluginApi.validateChannelConfig(form.value.driver, form.value.connection);
    const result = (res as any).data?.data || (res as any).data;
    if (result) {
      channelValid.value = result.valid;
      if (!result.valid && result.errors) {
        channelValidateErrors.value = result.errors;
      }
    }
  } catch {
    channelValid.value = false;
  } finally {
    validating.value = false;
  }
}

const DEVICE_CODE_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

async function loadTemplateTree() {
  treeLoading.value = true;
  try {
    const res = await templateApi.getIndex(locale.value);
    const index = (res as any).data?.data || (res as any).data;
    if (index?.industries) {
      treeData.value = index.industries;
    } else {
      treeData.value = [];
    }
  } catch {
    treeData.value = [];
  } finally {
    treeLoading.value = false;
  }
}

function toggleIndustry(industryId: string) {
  if (expandedNodes.value.has(industryId)) {
    expandedNodes.value.delete(industryId);
  } else {
    expandedNodes.value.add(industryId);
  }
}

function selectTemplateNode(tpl: { id: string; name: string; deviceType: string; version: string }) {
  form.value.templateId = tpl.id;
  selectedTemplate.value = {
    id: tpl.id,
    name: tpl.name,
    deviceType: tpl.deviceType,
  };
  templateError.value = '';
}

/** 从模板树中查找模板名称 */
function findTemplateName(templateId: string): string | undefined {
  for (const industry of treeData.value) {
    for (const category of industry.categories) {
      const tpl = category.templates.find((t) => t.id === templateId);
      if (tpl) return tpl.name;
    }
  }
  return undefined;
}

function clearTemplate() {
  form.value.templateId = '';
  selectedTemplate.value = null;
}

onMounted(async () => {
  await loadTemplateTree();
  await loadGroupOptions();
  await loadPlugins();
});

watch(() => props.device, (val) => {
  activeTab.value = 'basic';
  if (val) {
    const deviceCode = (val as any).deviceCode || '';
    const tplId = (val as any).templateId || '';
    const typeVal = (val as any).type || '';
    const driverVal = (val as any).driver || '';
    const groupIdVal = (val as any).groupId || '';
    const conn = (val as any).connection || (val as any).config || {};
    form.value = {
      deviceCode,
      deviceName: val.deviceName || '',
      nameAlias: (val as any).nameAlias || '',
      templateId: tplId,
      driver: driverVal,
      groupId: groupIdVal,
      description: val.description || '',
      scanRate: (val as any).scanRate ?? 1000,
      offlinePeriod: (val as any).offlinePeriod ?? 30000,
      connection: typeof conn === 'object' ? { ...conn } : {},
    };
    selectedTemplate.value = tplId
      ? { id: tplId, name: findTemplateName(tplId) || val.deviceName, deviceType: typeVal }
      : null;

    // 回填时也加载对应 Schema
    if (driverVal) {
      loadSchemaForDriver(driverVal);
    }
  } else {
    form.value = {
      deviceCode: '',
      deviceName: '',
      nameAlias: '',
      templateId: '',
      driver: '',
      groupId: props.defaultGroupId || '',
      description: '',
      scanRate: 1000,
      offlinePeriod: 30000,
      connection: {},
    };
    selectedTemplate.value = null;
    channelSchema.value = null;
    channelValidateErrors.value = [];
    channelValid.value = null;
    channelConfigured.value = false;
    loadGroupOptions();
  }
  formError.value = '';
  deviceCodeError.value = '';
  templateError.value = '';
  driverError.value = '';
}, { immediate: true });

function validate(): boolean {
  formError.value = '';
  deviceCodeError.value = '';
  templateError.value = '';
  driverError.value = '';

  if (!props.device) {
    if (!form.value.deviceCode.trim()) {
      deviceCodeError.value = t('system.devices.deviceCodeErrorEmpty');
      return false;
    }
    if (!DEVICE_CODE_PATTERN.test(form.value.deviceCode.trim())) {
      deviceCodeError.value = t('system.devices.deviceCodeErrorPattern');
      return false;
    }
  }

  if (!form.value.deviceName.trim()) {
    formError.value = t('system.devices.errorNameEmpty');
    return false;
  }

  if (!form.value.driver) {
    driverError.value = t('system.devices.driverError');
    return false;
  }

  return true;
}

async function handleSubmit() {
  if (!validate()) return;
  submitting.value = true;
  try {
    await new Promise<void>((resolve) => {
      emit('submit', {
        deviceCode: form.value.deviceCode.trim() || undefined,
        deviceName: form.value.deviceName.trim(),
        nameAlias: form.value.nameAlias.trim() || undefined,
        type: selectedTemplate.value?.deviceType,
        templateId: form.value.templateId,
        driver: form.value.driver,
        groupId: form.value.groupId || undefined,
        description: form.value.description.trim() || undefined,
        scanRate: form.value.scanRate,
        offlinePeriod: form.value.offlinePeriod,
        connection: form.value.connection,
      }, () => {
        resolve();
      });
    });
  } finally {
    submitting.value = false;
  }
}

function handleClose() {
  form.value = {
    deviceCode: '',
    deviceName: '',
    nameAlias: '',
    templateId: '',
    driver: '',
    groupId: '',
    description: '',
    scanRate: 1000,
    offlinePeriod: 30000,
    connection: {},
  };
  selectedTemplate.value = null;
  channelSchema.value = null;
  channelValidateErrors.value = [];
  channelValid.value = null;
  channelConfigured.value = false;
  activeTab.value = 'basic';
  formError.value = '';
  deviceCodeError.value = '';
  templateError.value = '';
  driverError.value = '';
  emit('update:visible', false);
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--background);
  border-radius: 12px;
  width: 90%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-header h2 { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }

.modal-close {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 20px;
}

.modal-close:hover { color: var(--text); background: var(--border-light); }

/* ===== Tab 导航 ===== */
.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
  flex-shrink: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  position: relative;
}

.tab-item:hover { color: var(--text); }

.tab-item.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--status-warning);
  flex-shrink: 0;
}

/* ===== 通道配置空状态 ===== */
.channel-empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--text-secondary);
  gap: 12px;
}

.channel-empty-tip p {
  font-size: 13px;
  margin: 0;
}

/* ===== 通道配置 section header ===== */
.channel-section-header {
  margin-bottom: 16px;
}

.driver-badge {
  display: inline-block;
  padding: 2px 10px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 4px;
  font-size: 12px;
  color: var(--primary);
  font-family: 'Courier New', monospace;
}

/* ===== 校验结果 ===== */
.channel-result {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--status-online) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-online) 30%, transparent);
  border-radius: 6px;
  color: var(--status-online);
  font-size: 13px;
}

.modal-body { padding: 20px; overflow-y: auto; min-height: 200px; }

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

.footer-left { flex-shrink: 0; }

.footer-hint {
  font-size: 12px;
  color: var(--status-warning);
}

.footer-right { display: flex; gap: 8px; }

.form-section {
  margin-bottom: 14px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.form-row:last-child { margin-bottom: 0; }

.form-group { margin-bottom: 14px; }

.form-group-half { flex: 1; margin-bottom: 0; }

.channel-config .form-group { margin-bottom: 0; }

/* ===== 驱动专属配置区 ===== */
.driver-specific-config {
  margin-top: 12px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.driver-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}

.s7-switch-group { margin-bottom: 0; }

.switch-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 6px;
}

.form-label-sm {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.required { color: var(--status-error); }

.form-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
}

.form-input {
  width: 100%;
  padding: 9px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input::placeholder { color: var(--text-secondary); }
.form-input:focus { border-color: var(--primary); }

.form-input-sm {
  padding: 6px 10px;
  font-size: 13px;
  border-radius: 6px;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--primary);
}

.form-select {
  appearance: auto;
  cursor: pointer;
}

.form-textarea {
  resize: vertical;
  min-height: 48px;
}

.form-error {
  color: var(--status-error);
  font-size: 13px;
  margin: -4px 0 0 0;
}

.btn {
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

.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: var(--text); }
.btn-primary:hover:not(:disabled) { background: var(--primary); }
.btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
.btn-secondary:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.btn-sm { padding: 4px 10px; font-size: 12px; }

/* ===== 模板树 ===== */
.template-tree-box {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  max-height: 220px;
  overflow-y: auto;
}

.template-tree-box.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.selected-template {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
}

.selected-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selected-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.selected-type {
  font-size: 12px;
  color: var(--text-secondary);
}

.btn-clear {
  background: transparent;
  border: none;
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.btn-clear:hover { color: var(--status-error); }

.template-tree {
  padding: 4px 0;
}

.tree-loading,
.tree-empty {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
  color: var(--text);
}

.tree-node:hover { background: var(--border-light); }

.industry-node { font-weight: 500; }

.category-node {
  padding-left: 36px;
  color: var(--text-secondary);
}

.template-node {
  padding-left: 60px;
  font-size: 12px;
}

.template-node:hover { color: var(--primary); }

.chevron {
  flex-shrink: 0;
  transition: transform 0.2s;
}

.chevron.rotated { transform: rotate(90deg); }

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--border-light);
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.version-tag {
  font-size: 10px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.industry-children {
  border-left: 1px solid var(--border);
  margin-left: 19px;
}

.channel-errors {
  margin-top: 8px;
  padding: 8px;
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-error) 30%, transparent);
  border-radius: 6px;
}

.channel-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.driver-version {
  font-size: 11px;
  color: var(--text-secondary);
}
</style>