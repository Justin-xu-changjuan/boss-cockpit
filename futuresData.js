/** 行情数据模块：只保存代码、名称、价格与单位。 */
(() => {
  window.BossData.register('futuresData', [
    { code: 'RB2610', name: '螺纹钢', price: 3010, unit: '元/吨' },
    { code: 'JM2609', name: '焦煤', price: 1277, unit: '元/吨' },
    { code: 'AU', name: '黄金', price: 785.2, unit: '元/克' },
    { code: 'CU', name: '铜', price: 78650, unit: '元/吨' }
  ]);
})();
