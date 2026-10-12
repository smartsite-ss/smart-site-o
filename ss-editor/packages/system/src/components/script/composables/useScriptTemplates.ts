// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ScriptEditorMode } from '../ScriptEditor.types';
import { API_DEFINITIONS, API_CATEGORY_LABELS, type ApiCategory } from '../utils/api-definitions';

// ── API 分类分组：从静态定义文件生成 ──

interface ApiGroup {
  label: string;
  items: Array<{ label: string; code: string }>;
}

function getApiGroups(): ApiGroup[] {
  const categoryMap = new Map<ApiCategory, Array<{ label: string; code: string }>>();

  for (const def of API_DEFINITIONS) {
    if (!categoryMap.has(def.category)) {
      categoryMap.set(def.category, []);
    }
    categoryMap.get(def.category)!.push({
      label: `${def.signature} — ${def.documentation}`,
      code: def.insertText,
    });
  }

  return Array.from(categoryMap.entries()).map(([cat, items]) => ({
    label: API_CATEGORY_LABELS[cat],
    items,
  }));
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

  return { getDefaultTemplate, getQuickSnippets, getApiGroups: getApiGroupsFromDefs };
}