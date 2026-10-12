// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { reactive, watch, type Ref } from 'vue';
import type { PluginPropertySchema } from '../types/PluginPropertySchema';
import { buildDefaultsFromSchema } from '../registry/create-plugin';

export interface GraphicProperties {
  config?: Record<string, any>;
  [key: string]: any;
}

export function usePluginConfig(
  graphicProperties: Ref<GraphicProperties>,
  schema: PluginPropertySchema,
  emit?: (event: 'updateGraphicProperties') => void,
): Record<string, any> {
  const propsPath = schema.propsPath || 'customProps';
  const defaults = buildDefaultsFromSchema(schema);
  let isExternalUpdate = false;

  const readSource = (): Record<string, any> => {
    const raw = graphicProperties.value?.config || {};
    return raw[propsPath] ?? raw;
  };

  const source = readSource();
  const values = reactive<Record<string, any>>({ ...defaults });

  for (const field of schema.fields) {
    if (field.name in source) {
      values[field.name] = source[field.name];
    }
  }

  watch(
    () => graphicProperties.value?.config,
    (newRaw) => {
      if (!newRaw) return;
      isExternalUpdate = true;
      const newSource = newRaw[propsPath] ?? newRaw;
      for (const field of schema.fields) {
        if (field.name in newSource && values[field.name] !== newSource[field.name]) {
          values[field.name] = newSource[field.name];
        }
      }
      isExternalUpdate = false;
    },
    { deep: true },
  );

  watch(
    () => schema.fields.map((f) => values[f.name]),
    () => {
      if (isExternalUpdate) return;
      const gp = graphicProperties.value;
      if (!gp?.config) return;
      let target = gp.config;
      const segments = propsPath.split('.');
      for (const seg of segments) {
        if (!target[seg]) target[seg] = {};
        target = target[seg];
      }

      for (const field of schema.fields) {
        target[field.name] = values[field.name];
      }
      emit?.('updateGraphicProperties');
    },
    { deep: true },
  );

  return values;
}