// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { Component } from 'vue';
import type { RenderBackend, RenderBackendCategory } from './RenderBackend';
import type { DeployMode } from './DeployMode';
import type { PluginPropertySchema, SchemaMigration, PluginTestDefinition } from './PluginPropertySchema';
import type { IPluginInstance } from './IPluginInstance';

export interface IPluginManifest {
  type: string;
  label: string;
  description?: string;
  category: RenderBackendCategory;
  renderBackend: RenderBackend;
  deployMode?: DeployMode;
  graphic: new (...args: any[]) => IPluginInstance;
  schema: PluginPropertySchema;
  schemaVersion: number;
  migrations?: SchemaMigration[];
  version?: string;
  icon?: Component;
  config?: Component;
  locales?: Record<string, () => Promise<Record<string, any>>>;
  defaultWidth?: number;
  defaultHeight?: number;

  aiMeta?: {
    description: string;
    exampleProps: string;
    useCase: string;
  };

  __test__?: PluginTestDefinition;
}