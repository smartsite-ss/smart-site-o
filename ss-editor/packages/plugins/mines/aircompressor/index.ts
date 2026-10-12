// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import AircompressorConfigComponent from './AircompressorConfig.vue';
import { AircompressorPlugin } from './AircompressorPlugin';
import { aircompressorPropertySchema } from './aircompressorPropertySchema';
import AircompressorGraphicComponent from './AircompressorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const AircompressorConfig = AircompressorConfigComponent;
export const AircompressorGraphic = AircompressorGraphicComponent;
export { AircompressorPlugin, aircompressorPropertySchema };
export type { AircompressorProps } from './AircompressorPlugin';

export default createPlugin({
  type: 'aircompressor',
  category: 'mines',
  label: () => i18n.global.t('aircompressor.label'),
  plugin: AircompressorPlugin,
  schema: aircompressorPropertySchema,
  defaultWidth: 120,
  defaultHeight: 100,
  config: AircompressorConfigComponent,
  graphicComponent: AircompressorGraphicComponent,
  graphicComponentName: 'AircompressorGraphic',
});
