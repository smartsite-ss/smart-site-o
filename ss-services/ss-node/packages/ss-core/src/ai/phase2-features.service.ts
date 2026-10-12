// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Phase 2 智能功能服务 — A004/A005/C002/C003/E003
 *
 * 五项功能的后端实现：
 *   - A004 智能数据绑定推荐：基于图元属性类型 + 设备关联 + 标签语义推荐候选数据标签
 *   - A005 智能布局优化：对页面图元进行自动对齐、间距调整、避让、美化
 *   - C002 上下文感知帮助：基于当前上下文（选中图元/页面/操作）检索相关帮助
 *   - C003 智能搜索：跨模块（页面/图元/标签/告警/文档）的语义搜索
 *   - E003 自然语言命令：解析自然语言意图，映射到具体命令执行
 *
 * 设计原则：
 *   - 每个功能独立方法，便于单测
 *   - 不直接依赖 LLM（避免测试时的网络调用），需要 LLM 增强的场景由调用方传入 LLM 结果
 *   - 依赖注入使用 @Optional()，避免缺少依赖时启动失败
 */

import { Injectable, Optional, Inject, Logger } from '@nestjs/common';
import { LLMProxyService } from './llm-proxy.service';
import { RAGQAService } from './rag-qa.service';

// ============================================================
// 类型定义
// ============================================================

/** 图元属性描述（用于绑定推荐） */
export interface GraphicProperty {
  type: string;
  property: string;
  dataType: 'number' | 'string' | 'boolean' | 'enum';
  unit?: string;
  description?: string;
}

/** 数据标签候选（用于绑定推荐） */
export interface DataTagCandidate {
  tagId: string;
  tagName: string;
  deviceId: string;
  deviceName?: string;
  dataType: string;
  unit?: string;
  description?: string;
  score: number;
  matchReasons: string[];
}

/** 绑定推荐请求 */
export interface BindingRecommendRequest {
  graphicType: string;
  graphicId?: string;
  properties: GraphicProperty[];
  deviceId?: string;
  /** 历史绑定记录，用于学习用户偏好 */
  historicalBindings?: Array<{ property: string; tagId: string }>;
  /** 可选的标签池（不传则由调用方自行查询） */
  candidateTags?: Array<{
    tagId: string;
    tagName: string;
    deviceId: string;
    deviceName?: string;
    dataType: string;
    unit?: string;
    description?: string;
  }>;
}

/** 绑定推荐响应 */
export interface BindingRecommendResponse {
  recommendations: Array<{
    property: string;
    candidates: DataTagCandidate[];
  }>;
  strategy: 'semantic' | 'unit-match' | 'device-priority' | 'historical';
}

/** 图元位置（用于布局优化） */
export interface GraphicRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string;
}

/** 布局优化请求 */
export interface LayoutOptimizeRequest {
  graphics: GraphicRect[];
  canvasWidth: number;
  canvasHeight: number;
  strategy?: 'grid' | 'flow' | 'cluster' | 'align';
  padding?: number;
  gap?: number;
}

/** 布局优化响应 */
export interface LayoutOptimizeResponse {
  graphics: GraphicRect[];
  changes: Array<{
    id: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    reason: string;
  }>;
  metrics: {
    aligned: number;
    spacingFixed: number;
    collisions: number;
  };
}

/** 上下文感知帮助请求 */
export interface ContextHelpRequest {
  context: {
    pageId?: string;
    selectedGraphicType?: string;
    selectedGraphicId?: string;
    operation?: string;
    recentActions?: string[];
  };
  question?: string;
}

/** 上下文感知帮助响应 */
export interface ContextHelpResponse {
  matchedDocs: Array<{
    title: string;
    content: string;
    score: number;
    source: string;
  }>;
  suggestions: string[];
  relatedOperations: string[];
}

/** 智能搜索请求 */
export interface SmartSearchRequest {
  query: string;
  scopes?: Array<'page' | 'graphic' | 'tag' | 'alarm' | 'device' | 'document'>;
  limit?: number;
}

/** 智能搜索响应 */
export interface SmartSearchResponse {
  results: Array<{
    scope: string;
    id: string;
    title: string;
    snippet: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;
  total: number;
  elapsed: number;
}

/** 自然语言命令解析请求 */
export interface CommandParseRequest {
  input: string;
  context?: {
    currentPageId?: string;
    selectedGraphicId?: string;
  };
}

/** 命令意图 */
export type CommandIntent =
  | 'page.create'
  | 'page.switch'
  | 'graphic.add'
  | 'graphic.select'
  | 'graphic.delete'
  | 'graphic.update'
  | 'binding.set'
  | 'script.run'
  | 'search'
  | 'help'
  | 'unknown';

/** 自然语言命令解析响应 */
export interface CommandParseResponse {
  intent: CommandIntent;
  confidence: number;
  params: Record<string, unknown>;
  alternatives?: Array<{ intent: CommandIntent; confidence: number }>;
  description: string;
}

// ============================================================
// 服务实现
// ============================================================

@Injectable()
export class Phase2FeaturesService {
  private readonly logger = new Logger(Phase2FeaturesService.name);

  constructor(
    @Optional() @Inject(LLMProxyService) private readonly proxy?: LLMProxyService,
    @Optional() @Inject(RAGQAService) private readonly ragQA?: RAGQAService,
  ) {}

  // ============================================================
  // A004 智能数据绑定推荐
  // ============================================================

  /**
   * 为图元属性推荐候选数据标签
   *
   * 打分策略（加权求和）：
   *   - 数据类型匹配：+40
   *   - 单位匹配：+25
   *   - 同设备优先：+20
   *   - 名称语义相似：+15
   *   - 历史绑定偏好：+10
   */
  recommendBindings(req: BindingRecommendRequest): BindingRecommendResponse {
    const candidates = req.candidateTags || [];
    const historical = req.historicalBindings || [];
    const recommendations: BindingRecommendResponse['recommendations'] = [];

    for (const prop of req.properties) {
      const scored: DataTagCandidate[] = candidates.map((tag) => {
        const matchReasons: string[] = [];
        let score = 0;

        // 数据类型匹配
        if (this.matchDataType(prop.dataType, tag.dataType)) {
          score += 40;
          matchReasons.push('数据类型匹配');
        }

        // 单位匹配
        if (prop.unit && tag.unit && prop.unit.toLowerCase() === tag.unit.toLowerCase()) {
          score += 25;
          matchReasons.push('单位匹配');
        }

        // 同设备优先
        if (req.deviceId && tag.deviceId === req.deviceId) {
          score += 20;
          matchReasons.push('同设备优先');
        }

        // 名称语义相似（简化版：子串匹配）
        if (
          this.semanticMatch(
            prop.description || prop.property,
            tag.tagName + ' ' + (tag.description || ''),
          )
        ) {
          score += 15;
          matchReasons.push('名称语义相似');
        }

        // 历史绑定偏好
        const historicalHit = historical.some(
          (h) => h.property === prop.property && h.tagId === tag.tagId,
        );
        if (historicalHit) {
          score += 10;
          matchReasons.push('历史绑定偏好');
        }

        return {
          tagId: tag.tagId,
          tagName: tag.tagName,
          deviceId: tag.deviceId,
          deviceName: tag.deviceName,
          dataType: tag.dataType,
          unit: tag.unit,
          description: tag.description,
          score,
          matchReasons,
        };
      });

      // 降序排序，取前 5
      scored.sort((a, b) => b.score - a.score);
      recommendations.push({
        property: prop.property,
        candidates: scored.slice(0, 5).filter((c) => c.score > 0),
      });
    }

    // 策略判定：优先级 device-priority > historical > unit-match > semantic
    const strategy: BindingRecommendResponse['strategy'] = req.deviceId
      ? 'device-priority'
      : historical.length > 0
        ? 'historical'
        : req.properties.some((p) => p.unit)
          ? 'unit-match'
          : 'semantic';

    return { recommendations, strategy };
  }

  private matchDataType(propType: GraphicProperty['dataType'], tagType: string): boolean {
    const tagLower = tagType.toLowerCase();
    if (propType === 'number')
      return (
        tagLower === 'number' ||
        tagLower === 'float' ||
        tagLower === 'int' ||
        tagLower === 'integer' ||
        tagLower === 'double'
      );
    if (propType === 'string') return tagLower === 'string' || tagLower === 'text';
    if (propType === 'boolean') return tagLower === 'boolean' || tagLower === 'bool';
    if (propType === 'enum') return true; // enum 兼容所有
    return false;
  }

  private semanticMatch(a: string, b: string): boolean {
    if (!a || !b) return false;
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    // 子串匹配
    if (aLower.includes(bLower) || bLower.includes(aLower)) return true;
    // 关键词匹配（按空格分词）
    const aWords = aLower.split(/\s+/).filter((w) => w.length >= 2);
    const bWords = bLower.split(/\s+/).filter((w) => w.length >= 2);
    return aWords.some((w) => bWords.some((bw) => bw.includes(w) || w.includes(bw)));
  }

  // ============================================================
  // A005 智能布局优化
  // ============================================================

  /**
   * 对页面图元进行布局优化
   *
   * 支持策略：
   *   - grid：网格对齐（默认）
   *   - flow：流式布局
   *   - cluster：聚类布局（按图元类型分组）
   *   - align：仅对齐（不改变大小）
   */
  optimizeLayout(req: LayoutOptimizeRequest): LayoutOptimizeResponse {
    const strategy = req.strategy || 'grid';
    const padding = req.padding ?? 20;
    const gap = req.gap ?? 10;
    const changes: LayoutOptimizeResponse['changes'] = [];

    if (req.graphics.length === 0) {
      return { graphics: [], changes: [], metrics: { aligned: 0, spacingFixed: 0, collisions: 0 } };
    }

    let optimized: GraphicRect[];
    switch (strategy) {
      case 'flow':
        optimized = this.layoutFlow(req.graphics, req.canvasWidth, padding, gap);
        break;
      case 'cluster':
        optimized = this.layoutCluster(req.graphics, padding, gap);
        break;
      case 'align':
        optimized = this.layoutAlign(req.graphics);
        break;
      case 'grid':
      default:
        optimized = this.layoutGrid(req.graphics, req.canvasWidth, padding, gap);
        break;
    }

    // 记录变化
    for (const g of optimized) {
      const original = req.graphics.find((og) => og.id === g.id);
      if (original && (original.x !== g.x || original.y !== g.y)) {
        changes.push({
          id: g.id,
          from: { x: original.x, y: original.y },
          to: { x: g.x, y: g.y },
          reason: strategy,
        });
      }
    }

    // 碰撞检测
    const collisions = this.detectCollisions(optimized);

    // 统计
    const aligned = changes.filter(
      (c) => Math.abs(c.from.x - c.to.x) < 1 || Math.abs(c.from.y - c.to.y) < 1,
    ).length;
    const spacingFixed = changes.length - aligned;

    return {
      graphics: optimized,
      changes,
      metrics: { aligned, spacingFixed, collisions },
    };
  }

  /** 网格布局：按行排列，自动换行 */
  private layoutGrid(
    graphics: GraphicRect[],
    canvasWidth: number,
    padding: number,
    gap: number,
  ): GraphicRect[] {
    const sorted = [...graphics].sort((a, b) => a.y - a.y || a.x - b.x);
    let currentX = padding;
    let currentY = padding;
    let rowMaxHeight = 0;

    return sorted.map((g) => {
      if (currentX + g.width > canvasWidth - padding) {
        // 换行
        currentX = padding;
        currentY += rowMaxHeight + gap;
        rowMaxHeight = 0;
      }
      const result: GraphicRect = { ...g, x: currentX, y: currentY };
      currentX += g.width + gap;
      rowMaxHeight = Math.max(rowMaxHeight, g.height);
      return result;
    });
  }

  /** 流式布局：按从左到右、从上到下顺序排列 */
  private layoutFlow(
    graphics: GraphicRect[],
    canvasWidth: number,
    padding: number,
    gap: number,
  ): GraphicRect[] {
    return this.layoutGrid(graphics, canvasWidth, padding, gap);
  }

  /** 聚类布局：按图元类型分组 */
  private layoutCluster(graphics: GraphicRect[], padding: number, gap: number): GraphicRect[] {
    const groups = new Map<string, GraphicRect[]>();
    for (const g of graphics) {
      const key = g.type || 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    }

    const result: GraphicRect[] = [];
    let yOffset = padding;
    for (const [, group] of groups) {
      let xOffset = padding;
      let maxRowHeight = 0;
      for (const g of group) {
        result.push({ ...g, x: xOffset, y: yOffset });
        xOffset += g.width + gap;
        maxRowHeight = Math.max(maxRowHeight, g.height);
      }
      yOffset += maxRowHeight + gap * 2;
    }
    return result;
  }

  /** 对齐布局：按最小 X/Y 对齐到网格 */
  private layoutAlign(graphics: GraphicRect[]): GraphicRect[] {
    const gridSize = 5;
    return graphics.map((g) => ({
      ...g,
      x: Math.round(g.x / gridSize) * gridSize,
      y: Math.round(g.y / gridSize) * gridSize,
    }));
  }

  /** 检测碰撞 */
  private detectCollisions(graphics: GraphicRect[]): number {
    let count = 0;
    for (let i = 0; i < graphics.length; i++) {
      for (let j = i + 1; j < graphics.length; j++) {
        const a = graphics[i];
        const b = graphics[j];
        if (
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y
        ) {
          count++;
        }
      }
    }
    return count;
  }

  // ============================================================
  // C002 上下文感知帮助
  // ============================================================

  /**
   * 基于当前编辑器上下文检索相关帮助文档
   *
   * 优先级：
   *   1. 若有具体问题，调用 RAG 检索
   *   2. 否则基于上下文（选中图元类型、操作）匹配内置帮助库
   */
  async getContextHelp(req: ContextHelpRequest): Promise<ContextHelpResponse> {
    const { context, question } = req;

    // 内置帮助文档库（按图元类型分类）
    const builtinDocs = this.getBuiltinHelpDocs();
    const matchedDocs: ContextHelpResponse['matchedDocs'] = [];
    const suggestions: string[] = [];
    const relatedOperations: string[] = [];

    // 若有具体问题且 RAG 可用，使用 RAG 检索
    if (question && this.ragQA) {
      try {
        const ragResult = await this.ragQA.ask({ question });
        if (ragResult.answer) {
          matchedDocs.push({
            title: 'RAG 检索结果',
            content: ragResult.answer,
            score: 0.95,
            source: 'rag-kb',
          });
        }
      } catch (err) {
        this.logger.warn(`RAG 检索失败: ${(err as Error).message}`);
      }
    }

    // 基于选中图元类型匹配
    if (context.selectedGraphicType) {
      const docs = builtinDocs.filter((d) =>
        d.graphicTypes?.includes(context.selectedGraphicType!),
      );
      for (const doc of docs) {
        matchedDocs.push({
          title: doc.title,
          content: doc.content,
          score: doc.score,
          source: 'builtin',
        });
        suggestions.push(...doc.suggestions);
        relatedOperations.push(...doc.relatedSteps);
      }
    }

    // 基于操作匹配
    if (context.operation) {
      const opDocs = builtinDocs.filter((d) => d.matchOperations?.includes(context.operation!));
      for (const doc of opDocs) {
        if (!matchedDocs.find((m) => m.title === doc.title)) {
          matchedDocs.push({
            title: doc.title,
            content: doc.content,
            score: doc.score * 0.8,
            source: 'builtin',
          });
        }
      }
    }

    // 去重
    const seen = new Set<string>();
    const deduped = matchedDocs.filter((m) => {
      if (seen.has(m.title)) return false;
      seen.add(m.title);
      return true;
    });

    return {
      matchedDocs: deduped.slice(0, 5),
      suggestions: [...new Set(suggestions)].slice(0, 5),
      relatedOperations: [...new Set(relatedOperations)].slice(0, 5),
    };
  }

  private getBuiltinHelpDocs(): Array<{
    title: string;
    content: string;
    score: number;
    graphicTypes?: string[];
    matchOperations?: string[];
    suggestions: string[];
    relatedSteps: string[];
  }> {
    return [
      {
        title: '图元数据绑定',
        content:
          '选中图元后，在右侧属性面板找到"数据绑定"区域，点击绑定按钮选择数据标签。支持单向绑定（标签→图元属性）和双向绑定。',
        score: 0.9,
        graphicTypes: ['valve', 'pump', 'motor', 'tank', 'pipe'],
        matchOperations: ['bind', 'select'],
        suggestions: ['如何绑定数据标签？', '如何取消绑定？', '支持哪些数据类型？'],
        relatedSteps: ['打开属性面板', '点击数据绑定', '选择标签'],
      },
      {
        title: '图元事件配置',
        content:
          '双击图元或右键菜单选择"事件配置"，可配置点击、双击、长按等交互事件，支持跳转页面、执行脚本、弹窗提示等动作。',
        score: 0.85,
        matchOperations: ['event', 'doubleClick'],
        suggestions: ['如何配置点击事件？', '如何跳转页面？', '如何执行脚本？'],
        relatedSteps: ['右键菜单', '事件配置', '选择动作类型'],
      },
      {
        title: '页面管理',
        content: '在左侧页面列表可新增、复制、删除页面。支持拖拽排序、页面模板、页面参数传递。',
        score: 0.8,
        matchOperations: ['page.create', 'page.switch'],
        suggestions: ['如何新增页面？', '如何使用页面模板？', '如何传递页面参数？'],
        relatedSteps: ['左侧页面列表', '右键新增', '选择模板'],
      },
    ];
  }

  // ============================================================
  // C003 智能搜索
  // ============================================================

  /**
   * 跨模块语义搜索
   *
   * 当前实现为本地匹配（基于关键词+子串）。
   * 生产环境可结合向量检索（需要候选数据源注入）。
   */
  smartSearch(req: SmartSearchRequest): SmartSearchResponse {
    const start = Date.now();
    const query = req.query.trim().toLowerCase();
    const limit = req.limit ?? 20;
    const scopes = req.scopes || ['page', 'graphic', 'tag', 'alarm', 'device', 'document'];

    if (!query) {
      return { results: [], total: 0, elapsed: 0 };
    }

    // 内置可搜索数据（实际场景由调用方注入或从 DB 查询）
    const corpus = this.getSearchableCorpus();
    const scored = corpus
      .filter((item) => scopes.includes(item.scope as any))
      .map((item) => {
        const score = this.scoreMatch(query, (item.title + ' ' + item.snippet).toLowerCase());
        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      results: scored,
      total: scored.length,
      elapsed: Date.now() - start,
    };
  }

  private scoreMatch(query: string, text: string): number {
    let score = 0;
    // 完全匹配
    if (text.includes(query)) score += 50;
    // 关键词匹配
    const words = query.split(/\s+/).filter((w) => w.length >= 2);
    for (const w of words) {
      if (text.includes(w)) score += 10;
    }
    // 前缀匹配
    if (text.startsWith(query)) score += 15;
    return score;
  }

  private getSearchableCorpus(): Array<{
    scope: string;
    id: string;
    title: string;
    snippet: string;
    metadata?: Record<string, unknown>;
  }> {
    // 实际场景应从 DB 查询；此处返回内置示例数据用于测试与展示
    return [
      {
        scope: 'page',
        id: 'page-1',
        title: '泵站监控主页',
        snippet: '展示泵站运行状态、流量、压力',
      },
      { scope: 'page', id: 'page-2', title: '锅炉温度监控', snippet: '锅炉温度、压力实时监控' },
      { scope: 'graphic', id: 'graphic-valve', title: '阀门图元', snippet: '可配置开关状态、流量' },
      {
        scope: 'graphic',
        id: 'graphic-pump',
        title: '水泵图元',
        snippet: '可配置运行状态、转速、流量',
      },
      { scope: 'tag', id: 'tag-temp-1', title: '锅炉温度', snippet: '温度传感器 0-200℃' },
      { scope: 'tag', id: 'tag-pressure-1', title: '出水压力', snippet: '压力变送器 0-1.6MPa' },
      { scope: 'alarm', id: 'alarm-1', title: '高温报警', snippet: '温度超过 90℃ 触发' },
      { scope: 'device', id: 'device-1', title: '1#水泵', snippet: '设备状态：运行中' },
      { scope: 'document', id: 'doc-1', title: '使用手册', snippet: 'Smart-SCADA 用户手册' },
    ];
  }

  // ============================================================
  // E003 自然语言命令解析
  // ============================================================

  /**
   * 解析自然语言命令意图
   *
   * 采用规则匹配（生产环境可结合 LLM 增强）：
   *   - "创建/新建/添加 页面" → page.create
   *   - "切换/打开 页面" → page.switch
   *   - "添加/放置 阀门/泵" → graphic.add
   *   - "选中/选择" → graphic.select
   *   - "删除/移除" → graphic.delete
   *   - "修改/更新 属性" → graphic.update
   *   - "绑定 数据" → binding.set
   *   - "执行/运行 脚本" → script.run
   *   - "搜索/查找" → search
   *   - "帮助/怎么" → help
   */
  parseCommand(req: CommandParseRequest): CommandParseResponse {
    const input = req.input.trim().toLowerCase();

    if (!input) {
      return { intent: 'unknown', confidence: 0, params: {}, description: '空输入' };
    }

    // 规则匹配表
    const rules: Array<{
      patterns: RegExp[];
      intent: CommandIntent;
      paramExtractor?: (m: RegExpMatchArray) => Record<string, unknown>;
      description: string;
    }> = [
      {
        patterns: [/(创建|新建|添加|新增|生成)\s*(一个)?\s*(新)?\s*页面/],
        intent: 'page.create',
        description: '创建新页面',
      },
      {
        patterns: [/(切换|打开|跳转|进入)\s*(到)?\s*页面/],
        intent: 'page.switch',
        description: '切换页面',
      },
      {
        patterns: [/(添加|放置|插入|画)\s*(一个)?\s*(阀门|水泵|泵|电机|水箱|管道|温度计|压力表)/],
        intent: 'graphic.add',
        paramExtractor: (m) => ({ graphicType: m[3] }),
        description: '添加图元',
      },
      {
        patterns: [/(选中|选择|点选)\s*(图元|元素)/],
        intent: 'graphic.select',
        description: '选中图元',
      },
      {
        patterns: [/(删除|移除|去掉|清除)\s*(图元|元素)/],
        intent: 'graphic.delete',
        description: '删除图元',
      },
      {
        patterns: [/(修改|更新|设置|调整)\s*(属性|位置|大小|颜色)/],
        intent: 'graphic.update',
        description: '修改图元属性',
      },
      {
        patterns: [/(绑定|关联)\s*(数据|标签)/],
        intent: 'binding.set',
        description: '设置数据绑定',
      },
      {
        patterns: [/(执行|运行|调用)\s*脚本/],
        intent: 'script.run',
        description: '运行脚本',
      },
      {
        patterns: [/(搜索|查找|找|查一下)/],
        intent: 'search',
        description: '搜索',
      },
      {
        patterns: [/(帮助|怎么|如何|说明|教程)/],
        intent: 'help',
        description: '获取帮助',
      },
    ];

    const alternatives: Array<{ intent: CommandIntent; confidence: number }> = [];

    for (const rule of rules) {
      for (const pattern of rule.patterns) {
        const match = input.match(pattern);
        if (match) {
          // 简单置信度计算：匹配长度 / 输入长度
          const confidence = Math.min(1, match[0].length / input.length + 0.3);
          const params = rule.paramExtractor ? rule.paramExtractor(match) : {};

          // 收集备选意图
          for (const other of rules) {
            if (other.intent !== rule.intent) {
              for (const p of other.patterns) {
                if (input.match(p)) {
                  alternatives.push({
                    intent: other.intent,
                    confidence: Math.min(1, input.match(p)![0].length / input.length + 0.2),
                  });
                  break;
                }
              }
            }
          }

          return {
            intent: rule.intent,
            confidence,
            params,
            alternatives: alternatives.sort((a, b) => b.confidence - a.confidence).slice(0, 3),
            description: rule.description,
          };
        }
      }
    }

    return {
      intent: 'unknown',
      confidence: 0,
      params: {},
      description: '未识别意图',
    };
  }
}
