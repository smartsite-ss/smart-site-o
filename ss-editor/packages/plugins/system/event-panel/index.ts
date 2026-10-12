// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

// 动态扫描 locales 目录，新增语言只需添加对应 json 文件，无需改动本文件
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import { EventPanelPlugin } from './EventPanelPlugin';
import { eventPanelPropertySchema } from './eventPanelPropertySchema';
import EventPanelGraphicComponent from './EventPanelGraphic.vue';
import EventPanelConfigComponent from './EventPanelConfig.vue';

export const EventPanelGraphic = EventPanelGraphicComponent;
export { EventPanelPlugin, eventPanelPropertySchema };
export type { EventPanelProps } from './EventPanelPlugin';
export { EVENT_TYPE_GROUPS, EVENT_STATUS_LIST, getEventTypeClass, getStatusClass } from './eventPanelUtils';
export type { EventTypeGroup, EventTypeGroupId } from './eventPanelUtils';

export default createPlugin({
  type: 'event-panel',
  category: 'system',
  version: pkg.version,
  label: () => i18n.global.t('eventPanel.label'),
  plugin: EventPanelPlugin,
  schema: eventPanelPropertySchema,
  config: EventPanelConfigComponent,
  defaultWidth: 480,
  defaultHeight: 320,
  graphicComponent: EventPanelGraphicComponent,
  graphicComponentName: 'EventPanelGraphic',
});
