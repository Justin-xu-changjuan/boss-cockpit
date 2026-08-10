/** 账户总览数据：可由 dataStore / JSON 导入更新。金额单位为人民币。 */
(() => {
  window.BossData.register('accountData', {
    equity: 500000,
    availableFunds: 362500,
    margin: 137500,
    floatingPnl: 750
  });
})();
