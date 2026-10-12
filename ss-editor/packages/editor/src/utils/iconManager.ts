// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Add,
  Remove,
  ArrowUndo,
  ArrowRedo,
  Copy,
  Clipboard,
  Trash,
  Save,
  FolderOpen,
  Download,
  Print,
  Search,
  Settings,
  HelpCircle,
  InformationCircle,
  Warning,
  CheckmarkCircle,
  CloseCircle,
  TimeOutline,
  LocationOutline,
  BarChart,
  PieChart,
  TrendingUp,
  Grid,
  List,
  Layers,
  Eye,
  EyeOff,
  LockOpen,
  LockClosed,
  ColorPalette,
  Text,
  Image,
  Document,
  Square,
  Ellipse,
  Star
} from '@vicons/ionicons5';

// 图标名称枚举（语义化命名）
export enum IconName {
  // ===== 基础操作 =====
  add = 'add',
  remove = 'remove',
  undo = 'undo',
  redo = 'redo',
  copy = 'copy',
  paste = 'paste',
  delete = 'delete',

  // ===== 文件操作 =====
  save = 'save',
  open = 'open',
  download = 'download',
  print = 'print',

  // ===== 搜索与筛选 =====
  search = 'search',

  // ===== 系统设置 =====
  settings = 'settings',
  help = 'help',
  info = 'info',
  warning = 'warning',
  success = 'success',
  error = 'error',

  // ===== 数据可视化 =====
  time = 'time',
  location = 'location',
  chartBar = 'chart-bar',
  chartPie = 'chart-pie',
  trending = 'trending',

  // ===== 布局与视图 =====
  grid = 'grid',
  list = 'list',
  layers = 'layers',
  visible = 'visible',
  hidden = 'hidden',
  unlock = 'unlock',
  lock = 'lock',

  // ===== 内容编辑 =====
  color = 'color',
  text = 'text',
  image = 'image',

  // ===== 几何图形 =====
  document = 'document',
  square = 'square',
  ellipse = 'ellipse',
  star = 'star'
}

// 图标映射表（IconName → ionicons5 组件）
const iconMap: Record<IconName, any> = {
  // 基础操作
  [IconName.add]: Add,
  [IconName.remove]: Remove,
  [IconName.undo]: ArrowUndo,
  [IconName.redo]: ArrowRedo,
  [IconName.copy]: Copy,
  [IconName.paste]: Clipboard,
  [IconName.delete]: Trash,

  // 文件操作
  [IconName.save]: Save,
  [IconName.open]: FolderOpen,
  [IconName.download]: Download,
  [IconName.print]: Print,

  // 搜索与筛选
  [IconName.search]: Search,

  // 系统设置
  [IconName.settings]: Settings,
  [IconName.help]: HelpCircle,
  [IconName.info]: InformationCircle,
  [IconName.warning]: Warning,
  [IconName.success]: CheckmarkCircle,
  [IconName.error]: CloseCircle,

  // 数据可视化
  [IconName.time]: TimeOutline,
  [IconName.location]: LocationOutline,
  [IconName.chartBar]: BarChart,
  [IconName.chartPie]: PieChart,
  [IconName.trending]: TrendingUp,

  // 布局与视图
  [IconName.grid]: Grid,
  [IconName.list]: List,
  [IconName.layers]: Layers,
  [IconName.visible]: Eye,
  [IconName.hidden]: EyeOff,
  [IconName.unlock]: LockOpen,
  [IconName.lock]: LockClosed,

  // 内容编辑
  [IconName.color]: ColorPalette,
  [IconName.text]: Text,
  [IconName.image]: Image,

  // 几何图形
  [IconName.document]: Document,
  [IconName.square]: Square,
  [IconName.ellipse]: Ellipse,
  [IconName.star]: Star
};

/**
 * 获取图标组件
 * @param iconName 图标名称
 * @returns 图标组件或null
 */
export function getIcon(iconName: IconName): any | null {
  return iconMap[iconName] || null;
}

/**
 * 获取所有可用的图标名称列表
 */
export function getAvailableIcons(): IconName[] {
  return Object.values(IconName);
}

export default {
  IconName,
  getIcon,
  getAvailableIcons
};
