// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import VibratingScreenConfigComponent from './VibratingScreenConfig.vue';
import { VibratingScreenPlugin } from './VibratingScreenPlugin';
import { vibratingscreenPropertySchema } from './vibratingscreenPropertySchema';
import VibratingScreenGraphicComponent from './VibratingScreenGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const VibratingScreenConfig = VibratingScreenConfigComponent;
export const VibratingScreenGraphic = VibratingScreenGraphicComponent;
export { VibratingScreenPlugin, vibratingscreenPropertySchema };
export type { VibratingScreenProps } from './VibratingScreenPlugin';

export default createPlugin({
  type: 'vibratingscreen',
  category: 'mines',
  label: () => i18n.global.t('vibratingscreen.label'),
  plugin: VibratingScreenPlugin,
  schema: vibratingscreenPropertySchema,
  defaultWidth: 200,
  defaultHeight: 80,
  config: VibratingScreenConfigComponent,
  graphicComponent: VibratingScreenGraphicComponent,
  graphicComponentName: 'VibratingScreenGraphic',
});
