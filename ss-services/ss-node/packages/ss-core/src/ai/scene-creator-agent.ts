// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 场景创建 Agent — P2-T02 智能画面创建（A001）
 *
 * 提供：
 *   1. 图元类型关键词映射（自然语言 → 图元类型名）
 *   2. 场景创建专用 System Prompt（含图元库、布局策略、工作流程示例）
 *   3. getSceneCreationSystemPrompt() 供 AgentOrchestrator 在场景意图时使用
 *
 * 关联决策：
 *   - D-003 ReAct 编排（12 次循环上限）
 *   - D-005 混合模式（复杂意图 → 后端 ReAct + 前端工具委托）
 */

/** 图元类型关键词条目 */
export interface GraphicTypeEntry {
  /** 图元类型名（scene.addGraphic 的 type 参数） */
  type: string;
  /** 中文名 */
  label: string;
  /** 所属分类 */
  category: string;
  /** 匹配关键词（用户可能使用的自然语言描述） */
  keywords: string[];
  /** 默认尺寸 [width, height] */
  defaultSize: [number, number];
}

/**
 * 图元类型关键词映射表
 *
 * 覆盖 7 大分类中的常用图元（工业、电力、矿产、通用）。
 * 每类图元包含多个中文关键词，供 LLM 匹配用户描述。
 */
export const GRAPHIC_TYPE_MAP: GraphicTypeEntry[] = [
  // ============================
  //  工业组件（industrial）
  // ============================
  {
    type: 'waterpump',
    label: '水泵',
    category: '工业组件',
    keywords: ['水泵', '泵', '抽水泵', '给水泵', '循环泵', '离心泵', 'water pump', 'pump'],
    defaultSize: [80, 80],
  },
  {
    type: 'pump',
    label: '工业泵',
    category: '工业组件',
    keywords: ['工业泵', '泵机', '泵组', '泵站'],
    defaultSize: [80, 80],
  },
  {
    type: 'valve',
    label: '阀门',
    category: '工业组件',
    keywords: ['阀门', '阀', '截止阀', '调节阀', '蝶阀', '球阀', '闸阀', 'valve'],
    defaultSize: [60, 60],
  },
  {
    type: 'pipe',
    label: '管道',
    category: '工业组件',
    keywords: ['管道', '管', '管线', '管路', 'pipe'],
    defaultSize: [200, 20],
  },
  {
    type: 'pipe-h',
    label: '水平管道',
    category: '工业组件',
    keywords: ['水平管道', '横管', '水平管'],
    defaultSize: [200, 20],
  },
  {
    type: 'pipe-v',
    label: '垂直管道',
    category: '工业组件',
    keywords: ['垂直管道', '竖管', '立管'],
    defaultSize: [20, 200],
  },
  {
    type: 'pipe-path',
    label: '弯管',
    category: '工业组件',
    keywords: ['弯管', '弯头', '管道弯头', '弧形管'],
    defaultSize: [100, 100],
  },
  {
    type: 'pipeline-h',
    label: '水平管线',
    category: '工业组件',
    keywords: ['水平管线', '横管线', '水平管路'],
    defaultSize: [300, 16],
  },
  {
    type: 'pipeline-v',
    label: '垂直管线',
    category: '工业组件',
    keywords: ['垂直管线', '竖管线', '垂直管路'],
    defaultSize: [16, 300],
  },
  {
    type: 'tank',
    label: '储罐',
    category: '工业组件',
    keywords: ['储罐', '罐', '水罐', '油罐', '储液罐', '缓冲罐', 'tank'],
    defaultSize: [100, 120],
  },
  {
    type: 'gauge',
    label: '仪表',
    category: '工业组件',
    keywords: ['仪表', '表', '表盘', '仪表盘', '显示表', 'gauge'],
    defaultSize: [80, 80],
  },
  {
    type: 'indicator',
    label: '指示灯',
    category: '工业组件',
    keywords: ['指示灯', '状态灯', '信号灯', '灯', '运行灯', 'indicator'],
    defaultSize: [40, 40],
  },
  {
    type: 'status-indicator',
    label: '状态指示器',
    category: '工业组件',
    keywords: ['状态指示器', '状态指示', '运行状态', '设备状态'],
    defaultSize: [60, 60],
  },
  {
    type: 'track-move',
    label: '运动轨迹',
    category: '工业组件',
    keywords: ['运动轨迹', '轨迹', '移动轨迹', '路径动画'],
    defaultSize: [300, 100],
  },

  // ============================
  //  电力组件（electric）
  // ============================
  {
    type: 'motor',
    label: '电机',
    category: '电力组件',
    keywords: ['电机', '电动机', '马达', 'motor'],
    defaultSize: [80, 80],
  },
  {
    type: 'generator',
    label: '发电机',
    category: '电力组件',
    keywords: ['发电机', '发电机组', 'generator'],
    defaultSize: [80, 100],
  },
  {
    type: 'breaker',
    label: '断路器',
    category: '电力组件',
    keywords: ['断路器', '开关', '断路开关', 'breaker'],
    defaultSize: [60, 80],
  },
  {
    type: 'transformer2w',
    label: '双绕组变压器',
    category: '电力组件',
    keywords: ['变压器', '双绕组变压器', '两绕组变压器', 'transformer'],
    defaultSize: [100, 80],
  },
  {
    type: 'transformer3w',
    label: '三绕组变压器',
    category: '电力组件',
    keywords: ['三绕组变压器', '三卷变压器', '三绕组'],
    defaultSize: [120, 100],
  },
  {
    type: 'ammeter',
    label: '电流表',
    category: '电力组件',
    keywords: ['电流表', '安培表', '电流计', 'ammeter'],
    defaultSize: [80, 80],
  },
  {
    type: 'voltmeter',
    label: '电压表',
    category: '电力组件',
    keywords: ['电压表', '伏特表', '电压计', 'voltmeter'],
    defaultSize: [80, 80],
  },
  {
    type: 'wattmeter',
    label: '功率表',
    category: '电力组件',
    keywords: ['功率表', '瓦特表', '功率计', 'wattmeter'],
    defaultSize: [80, 80],
  },
  {
    type: 'capacitor',
    label: '电容器',
    category: '电力组件',
    keywords: ['电容', '电容器', '补偿电容', 'capacitor'],
    defaultSize: [60, 80],
  },
  {
    type: 'reactor',
    label: '电抗器',
    category: '电力组件',
    keywords: ['电抗器', '电抗', 'reactor'],
    defaultSize: [80, 60],
  },
  {
    type: 'fuse',
    label: '熔断器',
    category: '电力组件',
    keywords: ['熔断器', '保险丝', '熔丝', 'fuse'],
    defaultSize: [40, 80],
  },
  {
    type: 'ct',
    label: '电流互感器',
    category: '电力组件',
    keywords: ['电流互感器', 'CT', '互感器'],
    defaultSize: [60, 60],
  },
  {
    type: 'pt',
    label: '电压互感器',
    category: '电力组件',
    keywords: ['电压互感器', 'PT', '变压器互感器'],
    defaultSize: [60, 60],
  },
  {
    type: 'busbar',
    label: '母线',
    category: '电力组件',
    keywords: ['母线', '汇流排', 'busbar'],
    defaultSize: [300, 10],
  },
  {
    type: 'ups',
    label: 'UPS电源',
    category: '电力组件',
    keywords: ['UPS', '不间断电源', '备用电源', 'ups'],
    defaultSize: [100, 120],
  },
  {
    type: 'loadswitch',
    label: '负荷开关',
    category: '电力组件',
    keywords: ['负荷开关', '负载开关'],
    defaultSize: [60, 80],
  },
  {
    type: 'ground',
    label: '接地',
    category: '电力组件',
    keywords: ['接地', '地线', '接地线', '接地装置'],
    defaultSize: [40, 60],
  },
  {
    type: 'groundswitch',
    label: '接地开关',
    category: '电力组件',
    keywords: ['接地开关', '接地刀闸'],
    defaultSize: [40, 60],
  },
  {
    type: 'insulator',
    label: '绝缘子',
    category: '电力组件',
    keywords: ['绝缘子', '绝缘', '瓷瓶'],
    defaultSize: [30, 60],
  },
  {
    type: 'arrester',
    label: '避雷器',
    category: '电力组件',
    keywords: ['避雷器', '防雷器', '浪涌保护器', 'arrester'],
    defaultSize: [40, 80],
  },
  {
    type: 'cablehead',
    label: '电缆头',
    category: '电力组件',
    keywords: ['电缆头', '电缆终端', '电缆接头'],
    defaultSize: [40, 40],
  },
  {
    type: 'closelamp',
    label: '合闸灯',
    category: '电力组件',
    keywords: ['合闸灯', '合闸指示', '闭合指示灯'],
    defaultSize: [30, 30],
  },
  {
    type: 'faultlamp',
    label: '故障灯',
    category: '电力组件',
    keywords: ['故障灯', '故障指示', '报警灯', 'fault lamp'],
    defaultSize: [30, 30],
  },
  {
    type: 'runlamp',
    label: '运行灯',
    category: '电力组件',
    keywords: ['运行灯', '运行指示', '运转灯', 'run lamp'],
    defaultSize: [30, 30],
  },
  {
    type: 'autotransformer',
    label: '自耦变压器',
    category: '电力组件',
    keywords: ['自耦变压器', '自耦变', '自耦'],
    defaultSize: [100, 80],
  },

  // ============================
  //  矿产组件（mining）
  // ============================
  {
    type: 'conveyerbelt',
    label: '传送带',
    category: '矿产组件',
    keywords: ['传送带', '皮带', '输送带', '皮带机', 'conveyor'],
    defaultSize: [200, 40],
  },
  {
    type: 'crusher',
    label: '破碎机',
    category: '矿产组件',
    keywords: ['破碎机', '粉碎机', 'crusher'],
    defaultSize: [80, 80],
  },
  {
    type: 'jawcrusher',
    label: '颚式破碎机',
    category: '矿产组件',
    keywords: ['颚式破碎机', '颚破', '颚式'],
    defaultSize: [100, 80],
  },
  {
    type: 'conecrusher',
    label: '圆锥破碎机',
    category: '矿产组件',
    keywords: ['圆锥破碎机', '圆锥破', '锥破'],
    defaultSize: [80, 100],
  },
  {
    type: 'impactcrusher',
    label: '反击式破碎机',
    category: '矿产组件',
    keywords: ['反击式破碎机', '反击破', '冲击破'],
    defaultSize: [100, 80],
  },
  {
    type: 'ballmill',
    label: '球磨机',
    category: '矿产组件',
    keywords: ['球磨机', '磨机', '磨矿机', 'ball mill'],
    defaultSize: [200, 100],
  },
  {
    type: 'sagmill',
    label: '半自磨机',
    category: '矿产组件',
    keywords: ['半自磨机', '自磨机', 'SAG', 'sag mill'],
    defaultSize: [220, 110],
  },
  {
    type: 'vibratingscreen',
    label: '振动筛',
    category: '矿产组件',
    keywords: ['振动筛', '筛分机', '振动筛分', '筛子'],
    defaultSize: [160, 60],
  },
  {
    type: 'cyclone',
    label: '旋流器',
    category: '矿产组件',
    keywords: ['旋流器', '水力旋流器', 'cyclone'],
    defaultSize: [60, 100],
  },
  {
    type: 'flotation',
    label: '浮选机',
    category: '矿产组件',
    keywords: ['浮选机', '浮选槽', '浮选', 'flotation'],
    defaultSize: [100, 80],
  },
  {
    type: 'thickener',
    label: '浓密机',
    category: '矿产组件',
    keywords: ['浓密机', '浓缩机', '沉降槽', 'thickener'],
    defaultSize: [120, 60],
  },
  {
    type: 'filterpress',
    label: '压滤机',
    category: '矿产组件',
    keywords: ['压滤机', '过滤机', '板框压滤', 'filter press'],
    defaultSize: [120, 100],
  },
  {
    type: 'mixingpool',
    label: '搅拌槽',
    category: '矿产组件',
    keywords: ['搅拌槽', '搅拌桶', '混合槽', '调浆槽'],
    defaultSize: [80, 80],
  },
  {
    type: 'slurrypump',
    label: '渣浆泵',
    category: '矿产组件',
    keywords: ['渣浆泵', '泥浆泵', '矿浆泵', 'slurry pump'],
    defaultSize: [80, 80],
  },
  {
    type: 'slurrypipe',
    label: '矿浆管',
    category: '矿产组件',
    keywords: ['矿浆管', '矿浆管道', '浆体管'],
    defaultSize: [200, 20],
  },
  {
    type: 'agitationtank',
    label: '搅拌桶',
    category: '矿产组件',
    keywords: ['搅拌桶', '搅拌罐', '调浆桶'],
    defaultSize: [80, 80],
  },
  {
    type: 'dustcollector',
    label: '除尘器',
    category: '矿产组件',
    keywords: ['除尘器', '集尘器', '收尘器', 'dust collector'],
    defaultSize: [100, 120],
  },
  {
    type: 'draughtfan',
    label: '风机',
    category: '矿产组件',
    keywords: ['风机', '通风机', '鼓风机', '引风机', 'fan'],
    defaultSize: [80, 80],
  },
  {
    type: 'coolingtower',
    label: '冷却塔',
    category: '矿产组件',
    keywords: ['冷却塔', '凉水塔', '冷却水塔', 'cooling tower'],
    defaultSize: [100, 120],
  },
  {
    type: 'dryer',
    label: '干燥机',
    category: '矿产组件',
    keywords: ['干燥机', '烘干机', '干燥器', 'dryer'],
    defaultSize: [200, 80],
  },
  {
    type: 'rotarykiln',
    label: '回转窑',
    category: '矿产组件',
    keywords: ['回转窑', '旋窑', '回转炉', 'rotary kiln'],
    defaultSize: [300, 80],
  },
  {
    type: 'magseparator',
    label: '磁选机',
    category: '矿产组件',
    keywords: ['磁选机', '磁选', '磁分离', 'magnetic separator'],
    defaultSize: [120, 80],
  },
  {
    type: 'jigmachine',
    label: '跳汰机',
    category: '矿产组件',
    keywords: ['跳汰机', '跳汰', 'jig'],
    defaultSize: [120, 80],
  },
  {
    type: 'shakingtable',
    label: '摇床',
    category: '矿产组件',
    keywords: ['摇床', '选矿摇床', ' shaking table'],
    defaultSize: [200, 100],
  },
  {
    type: 'spiralchute',
    label: '螺旋溜槽',
    category: '矿产组件',
    keywords: ['螺旋溜槽', '螺旋选矿', '螺旋'],
    defaultSize: [80, 120],
  },
  {
    type: 'pressuregauge',
    label: '压力表',
    category: '矿产组件',
    keywords: ['压力表', '压力计', '气压表', '液压表', 'pressure gauge'],
    defaultSize: [60, 60],
  },
  {
    type: 'flowmeter',
    label: '流量计',
    category: '矿产组件',
    keywords: ['流量计', '流量表', '计量表', 'flow meter'],
    defaultSize: [80, 60],
  },
  {
    type: 'tempsensor',
    label: '温度传感器',
    category: '矿产组件',
    keywords: ['温度传感器', '温度计', '测温', '温度探头', 'temperature sensor'],
    defaultSize: [40, 80],
  },
  {
    type: 'levelgauge',
    label: '液位计',
    category: '矿产组件',
    keywords: ['液位计', '液位', '料位计', '水位计', 'level gauge'],
    defaultSize: [40, 120],
  },
  {
    type: 'phmeter',
    label: 'pH计',
    category: '矿产组件',
    keywords: ['pH计', 'pH', '酸碱度', '酸度计', 'ph meter'],
    defaultSize: [60, 60],
  },
  {
    type: 'loadcell',
    label: '称重传感器',
    category: '矿产组件',
    keywords: ['称重传感器', '称重', '重量传感器', '皮带秤', 'load cell'],
    defaultSize: [60, 40],
  },
  {
    type: 'screwconveyor',
    label: '螺旋输送机',
    category: '矿产组件',
    keywords: ['螺旋输送机', '螺旋输送', '绞龙', 'screw conveyor'],
    defaultSize: [200, 60],
  },
  {
    type: 'bucketelevator',
    label: '斗式提升机',
    category: '矿产组件',
    keywords: ['斗式提升机', '提升机', '斗提', 'bucket elevator'],
    defaultSize: [80, 200],
  },
  {
    type: 'apronfeeder',
    label: '板式给料机',
    category: '矿产组件',
    keywords: ['板式给料机', '给料机', '喂料机', 'apron feeder'],
    defaultSize: [160, 60],
  },
  {
    type: 'vibfeeder',
    label: '振动给料机',
    category: '矿产组件',
    keywords: ['振动给料机', '振动给料', '振动喂料', 'vibrating feeder'],
    defaultSize: [160, 60],
  },
  {
    type: 'ceramicfilter',
    label: '陶瓷过滤机',
    category: '矿产组件',
    keywords: ['陶瓷过滤机', '陶瓷过滤', 'ceramic filter'],
    defaultSize: [120, 100],
  },
  {
    type: 'aircompressor',
    label: '空压机',
    category: '矿产组件',
    keywords: ['空压机', '空气压缩机', '压缩机', 'air compressor'],
    defaultSize: [80, 80],
  },
  {
    type: 'vfd',
    label: '变频器',
    category: '矿产组件',
    keywords: ['变频器', '变频', '调速器', 'VFD', 'frequency converter'],
    defaultSize: [80, 100],
  },
  {
    type: 'solenoidvalve',
    label: '电磁阀',
    category: '矿产组件',
    keywords: ['电磁阀', '电动阀', '电磁控制阀', 'solenoid valve'],
    defaultSize: [60, 80],
  },
  {
    type: 'ballvalve',
    label: '球阀',
    category: '矿产组件',
    keywords: ['球阀', '球形阀'],
    defaultSize: [60, 60],
  },
  {
    type: 'gatevalve',
    label: '闸阀',
    category: '矿产组件',
    keywords: ['闸阀', '闸板阀'],
    defaultSize: [60, 100],
  },
  {
    type: 'gaspipe',
    label: '气管',
    category: '矿产组件',
    keywords: ['气管', '气体管道', '风管', 'gas pipe'],
    defaultSize: [200, 20],
  },
  {
    type: 'shaftfurnace',
    label: '竖炉',
    category: '矿产组件',
    keywords: ['竖炉', '立炉', '高炉'],
    defaultSize: [100, 150],
  },
  {
    type: 'earcfurnace',
    label: '电弧炉',
    category: '矿产组件',
    keywords: ['电弧炉', '电炉', 'arc furnace'],
    defaultSize: [100, 100],
  },
  {
    type: 'estopbutton',
    label: '急停按钮',
    category: '矿产组件',
    keywords: ['急停按钮', '急停', '紧急停止', 'emergency stop'],
    defaultSize: [50, 50],
  },

  // ============================
  //  通用组件（general）
  // ============================
  {
    type: 'label',
    label: '标签',
    category: '通用组件',
    keywords: ['标签', '文本', '文字', '标题', 'label', 'text'],
    defaultSize: [120, 30],
  },
  {
    type: 'textbox',
    label: '文本框',
    category: '通用组件',
    keywords: ['文本框', '输入框', '文本输入', 'textbox'],
    defaultSize: [160, 36],
  },
  {
    type: 'button',
    label: '按钮',
    category: '通用组件',
    keywords: ['按钮', '按键', 'button'],
    defaultSize: [80, 36],
  },
  {
    type: 'image',
    label: '图片',
    category: '通用组件',
    keywords: ['图片', '图像', '图标', 'image', 'picture'],
    defaultSize: [100, 100],
  },
  {
    type: 'shape',
    label: '形状',
    category: '通用组件',
    keywords: ['形状', '矩形', '圆形', '椭圆', 'shape', 'rectangle'],
    defaultSize: [100, 100],
  },

  // ============================
  //  图表组件（chart）
  // ============================
  {
    type: 'chart',
    label: '图表',
    category: '图表组件',
    keywords: ['图表', '趋势图', '曲线图', '柱状图', '折线图', 'chart', 'trend'],
    defaultSize: [400, 300],
  },
];

/**
 * 匹配图元类型
 * 根据用户描述的关键词匹配最合适的图元类型
 *
 * @param description 用户自然语言描述（如"水泵"、"压力表"、"3台泵"）
 * @returns 匹配的图元类型条目数组（按匹配度降序）
 */
export function matchGraphicTypes(description: string): GraphicTypeEntry[] {
  const lowerDesc = description.toLowerCase();
  const scored: Array<{ entry: GraphicTypeEntry; score: number }> = [];

  for (const entry of GRAPHIC_TYPE_MAP) {
    let score = 0;
    for (const kw of entry.keywords) {
      const lowerKw = kw.toLowerCase();
      if (lowerDesc.includes(lowerKw)) {
        // 精确匹配得分更高
        score += lowerKw.length >= 3 ? 3 : 1;
      }
    }
    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.entry);
}

/**
 * 生成场景创建专用 System Prompt
 *
 * 包含：
 *   - 可用图元类型速查表（约 60 个常用类型）
 *   - 布局策略建议
 *   - 工作流程示例（泵站/配电/锅炉 场景）
 *   - 布局参数建议
 *
 * @returns 场景创建 System Prompt 字符串
 */
export function getSceneCreationSystemPrompt(): string {
  // 构建图元速查表（仅列出常用类型，限制 token 消耗）
  const categorySummary = buildCategorySummary();

  return `你是一个工业监控画面自动生成专家，可以根据用户描述自动创建 Smart SCADA 组态画面。

## 可用图元速查表

${categorySummary}

## 工作流程（严格按照此顺序）

1. **scene.createPage** — 创建新页面（名称 + 尺寸）
2. **scene.addGraphic** — 逐个添加图元（从上方速查表选取 type）
3. **scene.autoLayout** — 自动排版（所有图元添加完毕后调用）
4. **scene.setBinding** — 数据绑定（如用户指定了数据标签）

## 图元选择规则

- 从用户描述中提取设备关键词，对照上方速查表选择最匹配的图元类型
- 如用户描述模糊（如"仪表"），优先选 gauge（通用仪表）
- 如描述为"XX 表"且速查表无精确匹配，降级选择：压力表→pressuregauge、温度表→tempsensor、液位表→levelgauge
- 管道类（pipe/管线）用于连接设备，应根据画面布局酌情添加
- 每个图元给一个有意义的中文名称（name 参数）

## 布局策略

- 网格布局（grid）：适合仪表盘、配电柜、设备阵列等规整排列
  - 建议参数：columns 按设备数量合理设定（如 4 台设备 → columns=2 或 4）
  - 间距 spacing 建议 40-60
- 流式布局（flow）：适合流程图、管线图、工艺流程
- 环形布局（circle）：适合圆形设备组、储罐群

## 坐标建议

如不指定 autoLayout 而手动设坐标，请遵循：
- X 间距 ≥ 150（避免重叠）
- Y 间距 ≥ 120
- 同类设备对齐排列
- 仪表放在对应设备右侧或下方

## 典型场景示例

### 泵站画面
用户："创建泵站监控画面，包含 3 台水泵、进出口压力表、总管道和流量计"
工具调用序列：
1. scene.createPage({ name: "泵站监控", width: 1920, height: 1080 })
2. scene.addGraphic({ type: "waterpump", name: "1号泵", x: 100, y: 300 })
3. scene.addGraphic({ type: "waterpump", name: "2号泵", x: 350, y: 300 })
4. scene.addGraphic({ type: "waterpump", name: "3号泵", x: 600, y: 300 })
5. scene.addGraphic({ type: "pressuregauge", name: "进口压力", x: 100, y: 150 })
6. scene.addGraphic({ type: "pressuregauge", name: "出口压力", x: 850, y: 150 })
7. scene.addGraphic({ type: "flowmeter", name: "总管流量", x: 850, y: 350 })
8. scene.addGraphic({ type: "pipe-h", name: "进水总管", x: 0, y: 200, width: 900 })
9. scene.addGraphic({ type: "pipe-h", name: "出水总管", x: 0, y: 450, width: 900 })
10. scene.autoLayout({ mode: "grid", columns: 3, spacing: 50 })
11. (可选) scene.setBinding（如有数据标签）

### 配电画面
用户："创建配电柜监控画面，包含电压表、电流表、功率表、断路器和变压器"
工具调用序列：
1. scene.createPage({ name: "配电柜监控", width: 1920, height: 1080 })
2. scene.addGraphic({ type: "voltmeter", name: "母线电压" })
3. scene.addGraphic({ type: "ammeter", name: "母线电流" })
4. scene.addGraphic({ type: "wattmeter", name: "有功功率" })
5. scene.addGraphic({ type: "breaker", name: "主断路器" })
6. scene.addGraphic({ type: "transformer2w", name: "主变压器" })
7. scene.addGraphic({ type: "runlamp", name: "运行指示" })
8. scene.autoLayout({ mode: "grid", columns: 3, spacing: 50 })

## 注意事项

- 每次工具调用后等待 Observation 结果再继续
- 工具调用最多 12 次
- 如果用户描述的图元类型在速查表中不存在，使用最接近的替代类型并在回答中说明
- 创建画面后，简要总结创建了哪些图元及其用途`;
}

/**
 * 按分类构建图元速查摘要文本
 */
function buildCategorySummary(): string {
  const categoryMap = new Map<string, string[]>();

  for (const entry of GRAPHIC_TYPE_MAP) {
    const list = categoryMap.get(entry.category) || [];
    // 格式：type名(label中文名)-keywords
    const keywords = entry.keywords.slice(0, 4).join('/');
    list.push(
      `  - \`${entry.type}\`（${entry.label}，${entry.defaultSize[0]}×${entry.defaultSize[1]}）— ${keywords}`,
    );
    categoryMap.set(entry.category, list);
  }

  const sections: string[] = [];
  for (const [cat, items] of categoryMap) {
    sections.push(`### ${cat}\n${items.join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * 根据任务意图判断是否需要使用场景创建专用 Prompt
 */
export function isSceneCreationIntent(intent?: string): boolean {
  return intent === 'page_create' || intent === 'graphic_add' || intent === 'scene_create';
}
