<template>
  <div class="track-move-editor">
    <PluginConfigPanel
      :schema="trackMovePropertySchema"
      :values="values"
    />
    <div class="section-title">
      {{ t('track-move.editor.pathPoints') }}
    </div>
    <div class="points-table">
      <div class="table-header">
        <span class="col-index">{{ t('track-move.editor.index') }}</span>
        <span class="col-coord">{{ t('track-move.editor.coordX') }}</span>
        <span class="col-coord">{{ t('track-move.editor.coordY') }}</span>
        <span class="col-type">{{ t('track-move.editor.type') }}</span>
        <span class="col-action">{{ t('track-move.editor.action') }}</span>
      </div>
      <div
        v-for="(pt, idx) in points"
        :key="idx"
        class="table-row"
      >
        <span class="col-index">{{ idx + 1 }}</span>
        <input
          v-model.number="pt.x"
          type="number"
          class="col-coord coord-input"
          @input="onPointChanged"
        >
        <input
          v-model.number="pt.y"
          type="number"
          class="col-coord coord-input"
          @input="onPointChanged"
        >
        <span class="col-type">{{ getPointTypeLabel(idx) }}</span>
        <button
          class="col-action btn-delete"
          :disabled="!canDeletePoint(idx)"
          @click="deletePoint(idx)"
        >
          🗑
        </button>
      </div>
    </div>
    <div class="actions">
      <button
        class="btn-add"
        @click="addPoint"
      >
        {{ t('track-move.editor.addBendPoint') }}
      </button>
      <button
        class="btn-reverse"
        @click="reversePath"
      >
        {{ t('track-move.editor.reversePath') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRef, type PropType } from 'vue';
import { i18n } from '@scada-editor/core';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { trackMovePropertySchema } from './trackMovePropertySchema';

interface TrackPoint {
  x: number;
  y: number;
}

const props = defineProps({
  graphicProperties: {
    type: Object as PropType<any>,
    required: true,
  },
});

const emit = defineEmits<{
  (e: 'updateGraphicProperties'): void;
}>();

const points = ref<TrackPoint[]>([]);

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  trackMovePropertySchema,
  emit,
);

function t(key: string): string {
  return i18n.global.t(key) as string;
}

function readPoints(): TrackPoint[] {
  const gp = props.graphicProperties;
  if (!gp?.config) return [];
  const customProps = gp.config.customProps;
  if (!customProps?.points || !Array.isArray(customProps.points)) return [];
  return customProps.points.map((p: TrackPoint) => ({ x: p.x ?? 0, y: p.y ?? 0 }));
}

function writePoints(pts: TrackPoint[]): void {
  const gp = props.graphicProperties;
  if (!gp?.config) {
    gp.config = {};
  }
  if (!gp.config.customProps) {
    gp.config.customProps = {};
  }
  gp.config.customProps.points = pts.map((p) => ({ x: p.x, y: p.y }));
  emit('updateGraphicProperties');
}

watch(
  () => props.graphicProperties?.config,
  () => {
    points.value = readPoints();
  },
  { immediate: true, deep: true },
);

function onPointChanged(): void {
  writePoints(points.value);
}

function getPointType(idx: number): string {
  if (idx === 0) return 'start';
  if (idx === points.value.length - 1) return 'end';
  return 'bend';
}

function getPointTypeLabel(idx: number): string {
  const type = getPointType(idx);
  if (type === 'start') return t('track-move.editor.startPoint');
  if (type === 'end') return t('track-move.editor.endPoint');
  return t('track-move.editor.bendPoint');
}

function canDeletePoint(idx: number): boolean {
  return points.value.length > 2 && idx > 0 && idx < points.value.length - 1;
}

function addPoint(): void {
  const pts = points.value;
  if (pts.length < 2) return;
  const last = pts[pts.length - 1];
  const secondLast = pts[pts.length - 2];
  const dx = last.x - secondLast.x;
  const dy = last.y - secondLast.y;
  const midX = last.x - dx * 0.5;
  const midY = last.y - dy * 0.5;
  const newPt: TrackPoint = {
    x: Math.round(midX + dy * 0.5),
    y: Math.round(midY - dx * 0.5),
  };
  pts.splice(pts.length - 1, 0, newPt);
  points.value = [...pts];
  writePoints(points.value);
}

function deletePoint(idx: number): void {
  if (!canDeletePoint(idx)) return;
  const pts = [...points.value];
  pts.splice(idx, 1);
  points.value = pts;
  writePoints(points.value);
}

function reversePath(): void {
  points.value = [...points.value].reverse();
  writePoints(points.value);
}
</script>

<style scoped>
.track-move-editor {
  padding: 8px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
  margin-top: 12px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
.points-table {
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.table-header {
  display: flex;
  background: var(--background);
  padding: 4px 6px;
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
}
.table-row {
  display: flex;
  align-items: center;
  padding: 2px 6px;
  border-top: 1px solid var(--border);
  font-size: 12px;
}
.col-index {
  width: 24px;
  text-align: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.col-coord {
  width: 52px;
  text-align: center;
  flex-shrink: 0;
}
.col-type {
  width: 40px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 11px;
  flex-shrink: 0;
}
.col-action {
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}
.coord-input {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 11px;
  width: 48px;
  text-align: center;
}
.coord-input:focus {
  border-color: var(--primary);
  outline: none;
}
.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 1px 4px;
  color: var(--status-error);
  opacity: 0.7;
}
.btn-delete:hover:not(:disabled) {
  opacity: 1;
}
.btn-delete:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}
.actions {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}
.btn-add {
  padding: 4px 10px;
  background: var(--surface);
  border: 1px solid var(--primary);
  color: var(--primary);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.btn-add:hover {
  background: var(--control-button-hover);
}
.btn-reverse {
  padding: 4px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.btn-reverse:hover {
  background: var(--control-button-hover);
  color: var(--text);
}
</style>