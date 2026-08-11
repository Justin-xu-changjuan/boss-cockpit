/** 账户总览数据：可由 dataStore / GPT / JSON 导入更新。金额单位为人民币。 */
(() => {
  window.BossData.register('accountData', {
    // 账户权益：只来自真实录入；未录入时保持空值
    equity: null,
    // 本金：固定 102000
    capital: 102000,
    // 持仓保证金（占用金额）：来自账户截图 / GPT 录入
    margin: null,
    // 以下字段由系统计算，写入时会被重算覆盖：
    // profit = equity - capital
    // risk_rate = margin / equity
    // availableFunds 用于可用资金展示；floatingPnl 保留旧数据兼容
    availableFunds: 102000,
    floatingPnl: null
  });
})();
