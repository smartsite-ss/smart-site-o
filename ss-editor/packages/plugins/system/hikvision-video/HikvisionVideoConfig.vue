<template>
  <div class="hikvision-video-config">
    <!-- 1. 通道管理 -->
    <div class="channels-section">
      <div class="section-title">
        <span>{{ $t('hikvisionVideo.config.channels') }}</span>
        <button type="button" class="bind-btn" @click="addChannel">
          {{ $t('hikvisionVideo.config.addChannel') }}
        </button>
      </div>

      <div v-if="channels.length === 0" class="channels-empty">
        {{ $t('hikvisionVideo.config.channelsEmpty') }}
      </div>

      <div v-for="(channel, index) in channels" :key="channel.id" class="channel-item">
        <div class="channel-row">
          <input
            :value="channel.name"
            type="text"
            class="channel-input channel-name"
            :placeholder="$t('hikvisionVideo.config.channelName')"
            @input="updateChannel(index, { name: ($event.target as HTMLInputElement).value })"
          >
          <select
            :value="channel.protocol"
            class="channel-input channel-protocol"
            @change="updateChannel(index, { protocol: ($event.target as HTMLSelectElement).value as VideoProtocol })"
          >
            <option value="webrtc">WebRTC</option>
            <option value="http-flv">HTTP-FLV</option>
            <option value="hls">HLS</option>
          </select>
        </div>

        <div class="channel-row">
          <input
            :value="channel.sourceUrl"
            type="text"
            class="channel-input channel-url"
            :placeholder="$t('hikvisionVideo.config.sourceUrl')"
            @input="updateChannel(index, { sourceUrl: ($event.target as HTMLInputElement).value })"
          >
        </div>

        <div class="channel-row">
          <input
            :value="channel.playUrl"
            type="text"
            class="channel-input channel-url"
            :placeholder="$t('hikvisionVideo.config.playUrl')"
            @input="updateChannel(index, { playUrl: ($event.target as HTMLInputElement).value })"
          >
        </div>

        <div class="channel-row">
          <input
            :value="channel.username"
            type="text"
            class="channel-input channel-cred"
            :placeholder="$t('hikvisionVideo.config.username')"
            @input="updateChannel(index, { username: ($event.target as HTMLInputElement).value })"
          >
          <input
            :value="channel.password"
            type="password"
            class="channel-input channel-cred"
            :placeholder="$t('hikvisionVideo.config.password')"
            @input="updateChannel(index, { password: ($event.target as HTMLInputElement).value })"
          >
        </div>

        <div class="channel-row channel-row--actions">
          <label class="channel-enabled">
            <input
              type="checkbox"
              :checked="channel.enabled"
              @change="updateChannel(index, { enabled: ($event.target as HTMLInputElement).checked })"
            >
            {{ $t('hikvisionVideo.config.enabled') }}
          </label>
          <button type="button" class="move-btn" :disabled="index === 0" title="上移" @click="moveChannel(index, -1)">↑</button>
          <button type="button" class="move-btn" :disabled="index === channels.length - 1" title="下移" @click="moveChannel(index, 1)">↓</button>
          <button type="button" class="delete-btn" :title="$t('hikvisionVideo.config.deleteChannel')" @click="removeChannel(index)">×</button>
        </div>
      </div>
    </div>

    <!-- 2. 布局 / 播放行为 / 通道名显示 / 容器样式 -->
    <PluginConfigPanel
      :schema="hikvisionVideoPropertySchema"
      :values="values"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { hikvisionVideoPropertySchema } from './hikvisionVideoPropertySchema';
import type { VideoChannel, VideoProtocol } from './videoPlayer';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), hikvisionVideoPropertySchema, emit);

const customProps = computed(() => props.graphicProperties?.config?.customProps ?? {});
const channels = computed<VideoChannel[]>(() => customProps.value.channels ?? []);

function writeCustomProps(fields: Record<string, any>) {
  const gp = props.graphicProperties as any;
  if (!gp?.config) return;
  if (!gp.config.customProps) gp.config.customProps = {};
  Object.assign(gp.config.customProps, fields);
  emit('updateGraphicProperties');
}

function newChannel(): VideoChannel {
  return {
    id: `ch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    sourceUrl: '',
    playUrl: '',
    protocol: 'webrtc',
    username: '',
    password: '',
    enabled: true,
  };
}

function addChannel() {
  writeCustomProps({ channels: [...channels.value, newChannel()] });
}

function removeChannel(index: number) {
  const next = channels.value.filter((_, i) => i !== index);
  writeCustomProps({ channels: next });
}

function moveChannel(index: number, offset: number) {
  const target = index + offset;
  if (target < 0 || target >= channels.value.length) return;
  const next = [...channels.value];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  writeCustomProps({ channels: next });
}

function updateChannel(index: number, fields: Partial<VideoChannel>) {
  const next = channels.value.map((channel, i) => (i === index ? { ...channel, ...fields } : channel));
  writeCustomProps({ channels: next });
}
</script>

<style scoped>
.hikvision-video-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.channels-section {
  padding: 8px 0;
  border-bottom: 1px solid var(--border, #dddddd);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.channels-empty {
  padding: 12px 0;
  font-size: 12px;
  color: var(--text-tertiary, #999999);
  text-align: center;
}

.channel-item {
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
}

.channel-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.channel-row:last-child {
  margin-bottom: 0;
}

.channel-input {
  height: 28px;
  padding: 0 6px;
  font-size: 12px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text);
  box-sizing: border-box;
}

.channel-name {
  flex: 1;
  min-width: 0;
}

.channel-protocol {
  width: 96px;
  flex-shrink: 0;
}

.channel-url {
  width: 100%;
}

.channel-cred {
  width: 50%;
}

.channel-enabled {
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text);
}

.bind-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text);
  cursor: pointer;
}

.bind-btn:hover {
  background: var(--background, #f5f5f5);
}

.move-btn,
.delete-btn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text-secondary, #666666);
  cursor: pointer;
  font-size: 13px;
}

.move-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.delete-btn {
  color: var(--status-error, #d03050);
}
</style>
