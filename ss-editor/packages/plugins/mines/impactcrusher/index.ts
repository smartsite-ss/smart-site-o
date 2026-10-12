// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import ImpactcrusherConfigComponent from './ImpactcrusherConfig.vue';
import { ImpactcrusherPlugin } from './ImpactcrusherPlugin';
import { impactcrusherPropertySchema } from './impactcrusherPropertySchema';
import ImpactcrusherGraphicComponent from './ImpactcrusherGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ImpactcrusherConfig = ImpactcrusherConfigComponent;
export const ImpactcrusherGraphic = ImpactcrusherGraphicComponent;
export { ImpactcrusherPlugin, impactcrusherPropertySchema };
export type { ImpactcrusherProps } from './ImpactcrusherPlugin';

export default createPlugin({
  type: 'impactcrusher',
  category: 'mines',
  label: () => i18n.global.t('impactcrusher.label'),
  plugin: ImpactcrusherPlugin,
  schema: impactcrusherPropertySchema,
  defaultWidth: 130,
  defaultHeight: 110,
  config: ImpactcrusherConfigComponent,
  graphicComponent: ImpactcrusherGraphicComponent,
  graphicComponentName: 'ImpactcrusherGraphic',
});
