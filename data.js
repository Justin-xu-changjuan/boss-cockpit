/** 持仓、文件入口与家居设备默认数据；模块实例统一由 BossData 暴露到 window。 */
(() => {
  const positionsDefaults = [
    {
      code: 'RB2610',
      direction: '多',
      quantity: 6,
      cost: 2997.5,
      currentPrice: 3010,
      floatingPnl: 750,
      target: 3120,
      stopLoss: 2960,
      plan: '目标 3120，止损 2960'
    }
  ];

  const fileEntriesDefaults = [
    { id: 'finance', name: '财务资料' },
    { id: 'contract', name: '合同资料' },
    { id: 'project', name: '项目资料' },
    { id: 'image', name: '图片资料' }
  ];

  const homeDevicesDefaults = [
    { id: 'coffee-maker', name: '咖啡机', type: 'power', api: 'mijia-plug' },
    { id: 'air-conditioner', name: '空调', type: 'placeholder' },
    { id: 'door-lock', name: '门锁', type: 'placeholder' }
  ];

  const tradingDecisionDefaults = {
    product: null,
    marketAnalysis: null,
    trend: null,
    weeklyPosition: null,
    levels: null,
    operationPlan: null,
    fundamentals: null
  };

  window.BossData.register('tradingDecision', tradingDecisionDefaults);
  window.BossData.register('positions', positionsDefaults);
  window.BossData.register('fileEntries', fileEntriesDefaults);
  window.BossData.register('homeDevices', homeDevicesDefaults);
})();
