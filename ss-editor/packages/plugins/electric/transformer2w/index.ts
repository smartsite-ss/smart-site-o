// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import Transformer2wConfigComponent from './Transformer2wConfig.vue';
import { Transformer2wPlugin } from './Transformer2wPlugin';
import { transformer2wPropertySchema } from './transformer2wPropertySchema';
import Transformer2wGraphicComponent from './Transformer2wGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Transformer2wConfig = Transformer2wConfigComponent;
export const Transformer2wGraphic = Transformer2wGraphicComponent;
export { Transformer2wPlugin, transformer2wPropertySchema };
export type { Transformer2wProps } from './Transformer2wPlugin';

export default createPlugin({
  type: 'transformer2w',
  category: 'electric',
  label: () => i18n.global.t('transformer2w.label'),
  plugin: Transformer2wPlugin,
  schema: transformer2wPropertySchema,
  defaultWidth: 70,
  defaultHeight: 100,
  config: Transformer2wConfigComponent,
  graphicComponent: Transformer2wGraphicComponent,
  graphicComponentName: 'Transformer2wGraphic',
});
