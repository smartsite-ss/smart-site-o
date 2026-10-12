// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { GraphicFactory, type GraphicInfo, primaryCategories as primaryCategoriesJson } from '@scada-editor/plugin-sdk';
import pluginCategoryConfig from '../../../plugins/categories.json';

export interface PrimaryCategory {
  id: string;
  label: string;
  labelEn: string;
  icon: string;
  order: number;
  secondaryMapping: string[];
}

export interface SecondaryCategoryWithGraphics {
  id: string;
  name: string;
  graphics: GraphicInfo[];
}

export interface ThreeLevelCategoryTree {
  primary: PrimaryCategory;
  secondaries: SecondaryCategoryWithGraphics[];
}

interface PluginCategoryConfig {
  id: string;
  deployMode: 'bundled' | 'directory';
  label: string;
  labelEn: string;
}

const categoryConfig = pluginCategoryConfig as PluginCategoryConfig[];

let primaryCategories: PrimaryCategory[] = [];

function loadPrimaryCategories(): PrimaryCategory[] {
  if (primaryCategories.length > 0) return primaryCategories;
  primaryCategories = (primaryCategoriesJson as any[]).map((item) => ({
    id: item.id,
    label: item.label,
    labelEn: item.labelEn,
    icon: item.icon,
    order: item.order,
    secondaryMapping: item.secondaryMapping,
  }));
  primaryCategories.sort((a, b) => a.order - b.order);
  return primaryCategories;
}

export function getCategoryConfig(): PluginCategoryConfig[] {
  return categoryConfig;
}

export function getBundledCategoryIds(): string[] {
  return categoryConfig.filter((c) => c.deployMode === 'bundled').map((c) => c.id);
}

export function getDirectoryCategoryIds(): string[] {
  return categoryConfig.filter((c) => c.deployMode === 'directory').map((c) => c.id);
}

export function getAllCategoryIds(): string[] {
  return categoryConfig.map((c) => c.id);
}

export function getThreeLevelCategoryTree(): ThreeLevelCategoryTree[] {
  const primaries = loadPrimaryCategories();
  const allSecondaryCategoryIds = getAllCategoryIds();
  const allGraphics = GraphicFactory.getGraphicTypes();

  const secondaryDirToPrimary = new Map<string, string>();
  for (const primary of primaries) {
    for (const secDir of primary.secondaryMapping) {
      if (!secondaryDirToPrimary.has(secDir)) {
        secondaryDirToPrimary.set(secDir, primary.id);
      }
    }
  }

  const graphicBySecondary = new Map<string, GraphicInfo[]>();
  for (const graphic of allGraphics) {
    const secDir = graphic.category;
    if (!graphicBySecondary.has(secDir)) {
      graphicBySecondary.set(secDir, []);
    }
    graphicBySecondary.get(secDir)!.push(graphic);
  }

  return primaries.map((primary) => {
    const secondaries: SecondaryCategoryWithGraphics[] = [];

    for (const secDir of allSecondaryCategoryIds) {
      const resolvedPrimary = secondaryDirToPrimary.get(secDir) || 'general';
      if (resolvedPrimary !== primary.id) continue;

      const graphics = graphicBySecondary.get(secDir) || [];
      secondaries.push({
        id: secDir,
        name: secDir,
        graphics,
      });
    }

    return {
      primary,
      secondaries,
    };
  });
}

export function getPrimaryCategories(): PrimaryCategory[] {
  return loadPrimaryCategories();
}

export function getPluginCategories(): { id: string }[] {
  return getAllCategoryIds().map((id) => ({ id }));
}