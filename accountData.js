/** 账户总览数据：可由 dataStore / GPT / JSON 导入更新。金额单位为人民币。 */
(() => {
  window.BossData.register('accountData', {
    // 账户权益：来自每日账户截图 / GPT 录入
    equity: 500000,
    // 本金：固定默认 102000，可后台/JSON 修改
    capital: 102000,
    // 持仓保证金（占用金额）：来自账户截图 / GPT 录入
    margin: 137500,
    // 以下字段由系统计算，写入时会被重算覆盖：
    // profit = equity - capital
    // risk_rate = margin / equity
    // 兼容旧字段 availableFunds / floatingPnl（展示不再使用）
    availableFunds: null,
    floatingPnl: null
  });
})();
