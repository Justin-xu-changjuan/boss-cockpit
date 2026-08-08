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
const todayFocus = [
  { id: 1, text: '螺纹RB2610行情跟踪', priority: 'high' },
  { id: 2, text: '焦煤JM行情观察', priority: 'high' },
  { id: 3, text: 'AI算力项目推进', priority: 'medium' },
  { id: 4, text: '钛粉项目整理', priority: 'medium' }
];

// 持仓观察（模拟）
const positions = [
  {
    id: 'pos-rb',
    name: '螺纹钢',
    code: 'RB2610',
    direction: '多',
    cost: 3012,
    target: 3120,
    stopLoss: 2960,
    note: '趋势偏强，注意夜盘波动'
  },
  {
    id: 'pos-jm',
    name: '焦煤',
    code: 'JM2609',
    direction: '空',
    cost: 1205,
    target: 1150,
    stopLoss: 1230,
    note: '供应压力仍在，逢高做空'
  }
];

// 企业项目
const projects = [
  {
    id: 'proj-ai',
    name: 'AI算力项目',
    status: '调研阶段',
    statusClass: 'status-research',
    progress: 25
  },
  {
    id: 'proj-ti',
    name: '钛粉项目',
    status: '资料整理阶段',
    statusClass: 'status-organize',
    progress: 40
  }
];

// 文件入口
const fileEntries = [
  { id: 'finance', name: '财务资料', icon: '📁', path: '#' },
  { id: 'contract', name: '合同资料', icon: '📁', path: '#' },
  { id: 'project', name: '项目资料', icon: '📁', path: '#' },
  { id: 'image', name: '图片资料', icon: '📁', path: '#' }
];

// 快捷控制按钮
const quickActions = [
  { id: 'tesla', name: 'Tesla控制', icon: '🚗', action: 'tesla' },
  { id: 'image', name: '图片管理', icon: '📷', action: 'image' },
  { id: 'file', name: '文件管理', icon: '📁', action: 'file' },
  { id: 'ai', name: 'AI助手', icon: '🤖', action: 'ai' },
  { id: 'data', name: '数据分析', icon: '📊', action: 'data' },
  { id: 'setting', name: '设置', icon: '⚙️', action: 'setting' }
];

window.todayFocus = todayFocus;
window.positions = positions;
window.projects = projects;
window.fileEntries = fileEntries;
window.quickActions = quickActions;
