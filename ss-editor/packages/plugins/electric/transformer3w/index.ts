// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import Transformer3wConfigComponent from './Transformer3wConfig.vue';
import { Transformer3wPlugin } from './Transformer3wPlugin';
import { transformer3wPropertySchema } from './transformer3wPropertySchema';
import Transformer3wGraphicComponent from './Transformer3wGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const Transformer3wConfig = Transformer3wConfigComponent;
export const Transformer3wGraphic = Transformer3wGraphicComponent;
export { Transformer3wPlugin, transformer3wPropertySchema };
export type { Transformer3wProps } from './Transformer3wPlugin';

export default createPlugin({
  type: 'transformer3w',
  category: 'electric',
  label: () => i18n.global.t('transformer3w.label'),
  plugin: Transformer3wPlugin,
  schema: transformer3wPropertySchema,
  defaultWidth: 100,
  defaultHeight: 100,
  config: Transformer3wConfigComponent,
  graphicComponent: Transformer3wGraphicComponent,
  graphicComponentName: 'Transformer3wGraphic',
});
