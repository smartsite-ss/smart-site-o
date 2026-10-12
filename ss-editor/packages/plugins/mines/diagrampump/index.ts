// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core'; import { createPlugin } from '@scada-editor/plugin-sdk';
import DiagrampumpConfigComponent from './DiagrampumpConfig.vue'; import { DiagrampumpPlugin } from './DiagrampumpPlugin';
import { diagrampumpPropertySchema } from './diagrampumpPropertySchema'; import DiagrampumpGraphicComponent from './DiagrampumpGraphic.vue';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export const DiagrampumpConfig = DiagrampumpConfigComponent; export const DiagrampumpGraphic = DiagrampumpGraphicComponent;
export { DiagrampumpPlugin, diagrampumpPropertySchema }; export type { DiagrampumpProps } from './DiagrampumpPlugin';
export default createPlugin({ type: 'diagrampump', category: 'mines', label: () => i18n.global.t('diagrampump.label'),
  plugin: DiagrampumpPlugin, schema: diagrampumpPropertySchema, defaultWidth: 100, defaultHeight: 75,
  config: DiagrampumpConfigComponent, graphicComponent: DiagrampumpGraphicComponent, graphicComponentName: 'DiagrampumpGraphic',
});
