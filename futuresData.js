/** 期货数据模块：默认使用模拟数据，可由 localStorage / AI JSON 覆盖。 */
const futuresDefaults = [
  { id: 'rb2610', name: '螺纹钢', code: 'RB2610', price: 3037, change: 12, changePercent: 0.40, unit: '元/吨' },
  { id: 'jm2610', name: '焦煤', code: 'JM2610', price: 1186.5, change: -8.5, changePercent: -0.71, unit: '元/吨' },
  { id: 'jm2609', name: '焦煤', code: 'JM2609', price: 1186.5, change: -8.5, changePercent: -0.71, unit: '元/吨' },
  { id: 'au', name: '黄金', code: 'AU', price: 785.2, change: 3.6, changePercent: 0.46, unit: '元/克' },
  { id: 'cu', name: '铜', code: 'CU', price: 78650, change: -120, changePercent: -0.15, unit: '元/吨' }
];

const futuresData = window.BossData.register('futuresData', futuresDefaults);
// 保留旧代码和未来接口适配所需的名称。
window.futureData = futuresData;
window.getFutureQuotes = async () => new Promise(resolve => {
  window.setTimeout(() => resolve(window.futuresData || []), 300);
});
