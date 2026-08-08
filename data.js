/**
 * data.js
 * -----------------------------------------
 * 页面所有模拟业务数据
 * 
 * 【未来数据库/接口位置】
 * 1. 今日重点、持仓、项目等可改为从后端或本地存储读取
 * 2. 可替换为 IndexedDB / localStorage / 真实API
 */

// 今日重点
const todayFocusDefaults = [
  { id: 1, text: '螺纹RB2610行情跟踪', priority: 'high' },
  { id: 2, text: '焦煤JM行情观察', priority: 'high' },
  { id: 3, text: 'AI算力项目推进', priority: 'medium' },
  { id: 4, text: '钛粉项目整理', priority: 'medium' }
];

// 持仓观察（模拟）
const positionsDefaults = [
  {
    id: 'pos-rb',
    name: '螺纹钢',
    code: 'RB2610',
    direction: '多',
    quantity: 6,
    multiplier: 10,
    cost: 2997.5,
    target: 3120,
    stopLoss: 2960,
    plan: '目标 3120，止损 2960',
    note: '多头持仓，关注夜盘波动'
  },
  {
    id: 'pos-jm2610',
    name: '焦煤',
    code: 'JM2610',
    direction: '空',
    quantity: 2,
    multiplier: 60,
    cost: 1205,
    target: 1150,
    stopLoss: 1230,
    plan: '目标 1150，止损 1230',
    note: '空头示例持仓，关注供应压力'
  }
];

// 文件入口
const fileEntriesDefaults = [
  { id: 'finance', name: '财务资料', icon: '📁', path: '#' },
  { id: 'contract', name: '合同资料', icon: '📁', path: '#' },
  { id: 'project', name: '项目资料', icon: '📁', path: '#' },
  { id: 'image', name: '图片资料', icon: '📁', path: '#' }
];

// 快捷控制按钮
const quickActionsDefaults = [
  { id: 'tesla', name: 'Tesla控制', icon: '🚗', action: 'tesla' },
  { id: 'image', name: '图片管理', icon: '📷', action: 'image' },
  { id: 'file', name: '文件管理', icon: '📁', action: 'file' },
  { id: 'ai', name: 'AI助手', icon: '🤖', action: 'ai' },
  { id: 'data', name: '数据分析', icon: '📊', action: 'data' },
  { id: 'setting', name: '设置', icon: '⚙️', action: 'setting' }
];

const todayFocus = window.BossData.register('todayFocus', todayFocusDefaults);
const positions = window.BossData.register('positions', positionsDefaults);
const fileEntries = window.BossData.register('fileEntries', fileEntriesDefaults);
const quickActions = window.BossData.register('quickActions', quickActionsDefaults);

window.todayFocus = todayFocus;
window.positions = positions;
// 项目数据已迁移至 projectData.js；此处保留其他首页模块的默认数据。
window.projects = window.projectData || [];
window.fileEntries = fileEntries;
window.quickActions = quickActions;
