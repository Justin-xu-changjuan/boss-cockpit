/** 企业项目数据模块：项目状态、阶段和进度均可由 AI JSON / localStorage 更新。 */
const projectDefaults = [
  { id: 'proj-ai', name: 'AI算力项目', status: '调研阶段', statusClass: 'status-research', progress: 25, nextStep: '合作方沟通' },
  { id: 'proj-ti', name: '钛粉项目', status: '资料整理阶段', statusClass: 'status-organize', progress: 40, nextStep: '完善项目资料' }
];

const projectData = window.BossData.register('projectData', projectDefaults);
// 兼容既有渲染函数和次级页面。
window.projects = projectData;
