// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import ScrewconveyorConfigComponent from './ScrewconveyorConfig.vue'; import { ScrewconveyorPlugin } from './ScrewconveyorPlugin';
import { screwconveyorPropertySchema } from './screwconveyorPropertySchema'; import ScrewconveyorGraphicComponent from './ScrewconveyorGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ScrewconveyorConfig = ScrewconveyorConfigComponent; export const ScrewconveyorGraphic = ScrewconveyorGraphicComponent;
export { ScrewconveyorPlugin, screwconveyorPropertySchema }; export type { ScrewconveyorProps } from './ScrewconveyorPlugin';
export default createPlugin({ type: 'screwconveyor', category: 'mines', label: () => i18n.global.t('screwconveyor.label'),
  plugin: ScrewconveyorPlugin, schema: screwconveyorPropertySchema, defaultWidth: 180, defaultHeight: 50,
  config: ScrewconveyorConfigComponent, graphicComponent: ScrewconveyorGraphicComponent, graphicComponentName: 'ScrewconveyorGraphic',
});
