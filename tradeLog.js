/** 交易日志数据：记录决策过程，不参与持仓和账户计算。 */
const tradeLogDefaults = [
  {
    id: 'trade-20260808-rb',
    date: '2026-08-08',
    symbol: 'RB2610 螺纹钢',
    direction: '多',
    price: 2997.5,
    quantity: 6,
    action: '开仓',
    reason: '趋势偏强，确认支撑位',
    note: '设置 3120 目标，2960 止损'
  }
];

const tradeLog = window.BossData.register('tradeLog', tradeLogDefaults);
