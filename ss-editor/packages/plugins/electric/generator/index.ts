// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import GeneratorConfigComponent from './GeneratorConfig.vue';
import { GeneratorPlugin } from './GeneratorPlugin';
import { generatorPropertySchema } from './generatorPropertySchema';
import GeneratorGraphicComponent from './GeneratorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const GeneratorConfig = GeneratorConfigComponent;
export const GeneratorGraphic = GeneratorGraphicComponent;
export { GeneratorPlugin, generatorPropertySchema };
export type { GeneratorProps } from './GeneratorPlugin';

export default createPlugin({
  type: 'generator',
  category: 'electric',
  label: () => i18n.global.t('generator.label'),
  plugin: GeneratorPlugin,
  schema: generatorPropertySchema,
  defaultWidth: 56,
  defaultHeight: 56,
  config: GeneratorConfigComponent,
  graphicComponent: GeneratorGraphicComponent,
  graphicComponentName: 'GeneratorGraphic',
});
