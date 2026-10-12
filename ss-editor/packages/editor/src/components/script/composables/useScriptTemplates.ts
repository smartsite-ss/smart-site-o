// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ScriptEditorMode } from '../ScriptEditor.types';
import {
  API_REGISTRY,
  API_CATEGORY_LABELS,
  getApiByName,
  type ApiCategory,
  type ApiMethodDef,
} from '../rules/script-api-registry';

// ── API 分类分组：从规则注册表生成 ──

interface ApiGroupItem {
  /** 下拉显示文本 */
  label: string;
  /** 插入代码 */
  code: string;
  /** 方法名（用于查找详情） */
  name: string;
  /** 分类 */
  category: ApiCategory;
}

interface ApiGroup {
  label: string;
  items: ApiGroupItem[];
}

/** 从 API_REGISTRY 生成分类分组 */
function getApiGroups(): ApiGroup[] {
  const categoryMap = new Map<ApiCategory, ApiGroupItem[]>();

  for (const api of API_REGISTRY) {
    if (!categoryMap.has(api.category)) {
      categoryMap.set(api.category, []);
    }
    categoryMap.get(api.category)!.push({
      label: `${api.signature} — ${api.summary}`,
      code: api.insertText,
      name: api.name,
      category: api.category,
    });
  }

  return Array.from(categoryMap.entries()).map(([cat, items]) => ({
    label: API_CATEGORY_LABELS[cat],
    items,
  }));
}

/** 获取 API 详情（来自规则注册表） */
function getApiDetail(name: string): ApiMethodDef | undefined {
  return getApiByName(name);
}

/** 按分类获取 API 列表（含完整详情） */
function getApisByCategory(): Array<{ category: string; label: string; apis: ApiMethodDef[] }> {
  const categoryMap = new Map<ApiCategory, ApiMethodDef[]>();
  for (const api of API_REGISTRY) {
    if (!categoryMap.has(api.category)) {
      categoryMap.set(api.category, []);
    }
    categoryMap.get(api.category)!.push(api);
  }
  return Array.from(categoryMap.entries()).map(([cat, apis]) => ({
    category: cat,
    label: API_CATEGORY_LABELS[cat],
    apis,
  }));
}

/** 获取所有 API（含完整详情） */
function getAllApis(): ApiMethodDef[] {
  return API_REGISTRY;
}

// ── 基础模板 ──

const templates: Record<string, string> = {
  // filter 模式模板
  'filter:basic': `// 数据过滤脚本
// 可用变量：data（当前数据点）
// 示例：当数值大于阈值时改变颜色
if (data.number > 80) {
  data.color = '#ff0000';
} else {
  data.color = '#18a058';
}
return data;`,

  // driver 模式模板
  'driver:basic': `// 图元驱动脚本
// 可用变量：api（图元操作API）、data（数据点）、context（上下文）
api.setText(data.number + data.unit);
api.setBackground(data.color);

if (data.number > 80) {
  api.triggerAlarm({ tagId: context.graphicId, level: 'warning', message: '数值过高' });
}`,

  // interaction 模式模板
  'interaction:basic': `// 图元交互脚本
// 可用变量：api（图元操作API）、event（事件数据）、graphic（图元信息）
api.showGraphic('popup-' + event.graphicId);
api.setGraphicProps('popup-' + event.graphicId, {
  x: event.x + 10,
  y: event.y - 50,
  visible: true,
});`,

  // timer 模式模板
  'timer:basic': `// 页面定时器脚本
// 可用变量：page（页面API）、utils（工具函数）、data（数据）、timer（定时器信息）
const allGraphics = page.getGraphics();
for (const graphic of allGraphics) {
  const tagValue = data.readTag(graphic.tagId);
  if (tagValue !== null) {
    api.setGraphicProps(graphic.id, { text: String(tagValue) });
  }
}`,
};

export function useScriptTemplates(mode: ScriptEditorMode) {
  function getDefaultTemplate(): string {
    const key = `${mode}:basic`;
    return templates[key] ?? '// 在此编写脚本代码';
  }

  function getApiGroupsFromDefs(): ApiGroup[] {
    return getApiGroups();
  }

  /** 获取 API 详情（用于展示完整文档） */
  function getApiDetailFromRegistry(name: string): ApiMethodDef | undefined {
    return getApiDetail(name);
  }

  /** 获取分类 API 列表（含完整详情，用于 API 参考面板） */
  function getApiCategoriesFromRegistry(): Array<{ category: string; label: string; apis: ApiMethodDef[] }> {
    return getApisByCategory();
  }

  /** 获取所有 API（含完整详情） */
  function getAllApisFromRegistry(): ApiMethodDef[] {
    return getAllApis();
  }

  function getQuickSnippets(): Array<{ label: string; code: string }> {
    const snippets: Array<{ label: string; code: string }> = [];

    if (mode === 'driver') {
      snippets.push(
        { label: '设置文本', code: 'api.setText(data.number + data.unit);' },
        { label: '设置背景色', code: 'api.setBackground("#ff0000");' },
        { label: '条件设置', code: 'if (data.number > 80) { api.setBackground("#ff0000"); } else { api.setBackground("#18a058"); }' },
        { label: '触发告警', code: 'api.triggerAlarm({ tagId: context.graphicId, level: "warning", message: "数值异常" });' },
        { label: '颜色映射', code: 'api.setBackground(api.colorForValue(data.number, 0, 100));' },
      );
    } else if (mode === 'filter') {
      snippets.push(
        { label: '阈值过滤', code: 'if (data.number > 80) { data.color = "#ff0000"; }\nreturn data;' },
        { label: '四舍五入', code: 'data.number = api.round(data.number, 2);\nreturn data;' },
      );
    }

    return snippets;
  }

  return {
    getDefaultTemplate,
    getQuickSnippets,
    getApiGroups: getApiGroupsFromDefs,
    // 新增：来自规则注册表的丰富 API 数据
    getApiDetail: getApiDetailFromRegistry,
    getApiCategories: getApiCategoriesFromRegistry,
    getAllApis: getAllApisFromRegistry,
  };
}