// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import ConverterConfigComponent from './ConverterConfig.vue'; import { ConverterPlugin } from './ConverterPlugin';
import { converterPropertySchema } from './converterPropertySchema'; import ConverterGraphicComponent from './ConverterGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const ConverterConfig = ConverterConfigComponent; export const ConverterGraphic = ConverterGraphicComponent;
export { ConverterPlugin, converterPropertySchema }; export type { ConverterProps } from './ConverterPlugin';
export default createPlugin({ type: 'converter', category: 'mines', label: () => i18n.global.t('converter.label'),
  plugin: ConverterPlugin, schema: converterPropertySchema, defaultWidth: 110, defaultHeight: 90,
  config: ConverterConfigComponent, graphicComponent: ConverterGraphicComponent, graphicComponentName: 'ConverterGraphic',
});
