// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import CeramicfilterConfigComponent from './CeramicfilterConfig.vue'; import { CeramicfilterPlugin } from './CeramicfilterPlugin';
import { ceramicfilterPropertySchema } from './ceramicfilterPropertySchema'; import CeramicfilterGraphicComponent from './CeramicfilterGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const CeramicfilterConfig = CeramicfilterConfigComponent; export const CeramicfilterGraphic = CeramicfilterGraphicComponent;
export { CeramicfilterPlugin, ceramicfilterPropertySchema }; export type { CeramicfilterProps } from './CeramicfilterPlugin';
export default createPlugin({ type: 'ceramicfilter', category: 'mines', label: () => i18n.global.t('ceramicfilter.label'),
  plugin: CeramicfilterPlugin, schema: ceramicfilterPropertySchema, defaultWidth: 130, defaultHeight: 100,
  config: CeramicfilterConfigComponent, graphicComponent: CeramicfilterGraphicComponent, graphicComponentName: 'CeramicfilterGraphic',
});
