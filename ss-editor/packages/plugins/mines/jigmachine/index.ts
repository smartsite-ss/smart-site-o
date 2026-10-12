// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import JigmachineConfigComponent from './JigmachineConfig.vue'; import { JigmachinePlugin } from './JigmachinePlugin';
import { jigmachinePropertySchema } from './jigmachinePropertySchema'; import JigmachineGraphicComponent from './JigmachineGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const JigmachineConfig = JigmachineConfigComponent; export const JigmachineGraphic = JigmachineGraphicComponent;
export { JigmachinePlugin, jigmachinePropertySchema }; export type { JigmachineProps } from './JigmachinePlugin';
export default createPlugin({ type: 'jigmachine', category: 'mines', label: () => i18n.global.t('jigmachine.label'),
  plugin: JigmachinePlugin, schema: jigmachinePropertySchema, defaultWidth: 120, defaultHeight: 90,
  config: JigmachineConfigComponent, graphicComponent: JigmachineGraphicComponent, graphicComponentName: 'JigmachineGraphic',
});
