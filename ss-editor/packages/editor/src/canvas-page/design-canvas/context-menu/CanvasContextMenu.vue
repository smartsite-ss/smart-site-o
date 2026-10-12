<template>
  <ContextMenu
    v-if="visible"
    :visible="visible"
    :position="position"
    :selected-graphic-ids="selectedGraphicIds"
    :is-graphic-locked="isGraphicLocked"
    :is-graphic-visible="isGraphicVisible"
    :is-group="isGroup"
    @toggle-lock="emit('toggleLock')"
    @toggle-visibility="emit('toggleVisibility')"
    @delete="emit('delete')"
    @duplicate="emit('duplicate')"
    @copy="emit('copy')"
    @paste="emit('paste')"
    @bring-to-front="emit('bringToFront')"
    @send-to-back="emit('sendToBack')"
    @bring-forward="emit('bringForward')"
    @send-backward="emit('sendBackward')"
    @group="emit('group')"
    @ungroup="emit('ungroup')"
    @export-data="emit('exportData')"
    @preview="emit('preview')"
    @export-scene-data="emit('exportSceneData')"
    @export-scene="emit('exportScene')"
  />
</template>

<script setup lang="ts">
import ContextMenu from './ContextMenu.vue';

defineProps<{
  visible: boolean;
  position: { x: number; y: number };
  selectedGraphicIds: string[];
  isGraphicLocked: boolean;
  isGraphicVisible: boolean;
  isGroup: boolean;
}>();

const emit = defineEmits<{
  'toggleLock': [];
  'toggleVisibility': [];
  'delete': [];
  'duplicate': [];
  'copy': [];
  'paste': [];
  'bringToFront': [];
  'sendToBack': [];
  'bringForward': [];
  'sendBackward': [];
  'group': [];
  'ungroup': [];
  'exportData': [];
  'preview': [];
  'exportSceneData': [];
  'exportScene': [];
}>();
</script>
