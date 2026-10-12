// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
import { TrackMovePlugin } from './TrackMovePlugin';
import { trackMovePropertySchema } from './trackMovePropertySchema';
import TrackMoveEditorComponent from './TrackMoveEditor.vue';
import TrackMoveIconComponent from './TrackMoveIcon.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export { TrackMovePlugin, trackMovePropertySchema };
export type { TrackPoint, TrackMoveConfig } from './trackMoveUtils';

export default createPlugin({
  type: 'track-move',
  category: 'industrial',
  version: pkg.version,
  label: () => i18n.global.t('track-move.label'),
  plugin: TrackMovePlugin,
  schema: trackMovePropertySchema,
  defaultWidth: 300,
  defaultHeight: 60,
  icon: TrackMoveIconComponent,
  config: TrackMoveEditorComponent,
});