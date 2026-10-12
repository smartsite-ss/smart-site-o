// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import ApronfeederConfigComponent from './ApronfeederConfig.vue'; import { ApronfeederPlugin } from './ApronfeederPlugin';
import { apronfeederPropertySchema } from './apronfeederPropertySchema'; import ApronfeederGraphicComponent from './ApronfeederGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ApronfeederConfig = ApronfeederConfigComponent; export const ApronfeederGraphic = ApronfeederGraphicComponent;
export { ApronfeederPlugin, apronfeederPropertySchema }; export type { ApronfeederProps } from './ApronfeederPlugin';
export default createPlugin({ type: 'apronfeeder', category: 'mines', label: () => i18n.global.t('apronfeeder.label'),
  plugin: ApronfeederPlugin, schema: apronfeederPropertySchema, defaultWidth: 160, defaultHeight: 45,
  config: ApronfeederConfigComponent, graphicComponent: ApronfeederGraphicComponent, graphicComponentName: 'ApronfeederGraphic',
});
