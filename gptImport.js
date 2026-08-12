/**
 * gptImport.js
 * -----------------------------------------
 * 通用 GPT 结构化数据解析与写入。
 * 当前支持 futures（期货行情 + 持仓），预留 stocks / tesla / projects / finance / journal。
 *
 * 不依赖 DOM；由页面调用 window.GPTImport.apply(text)。
 */
(() => {
  const DOMAIN_HANDLERS = {};

  const unitByPrefix = {
    RB: '元/吨', HC: '元/吨', JM: '元/吨', J: '元/吨', I: '元/吨',
    CU: '元/吨', AL: '元/吨', ZN: '元/吨', NI: '元/吨',
    AU: '元/克', AG: '元/千克', SC: '元/桶'
  };

  function stripCodeFence(text) {
    let raw = String(text || '').trim();
    if (!raw) throw new Error('请先粘贴 GPT 生成的数据。');
    // 允许 ```json ... ``` 包裹
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) raw = fenced[1].trim();
    // 允许前后夹杂说明文字：截取第一个 { 到最后一个 }
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
    return raw;
  }

  function parseJSON(text) {
    const raw = stripCodeFence(text);
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      throw new Error('JSON 解析失败，请确认是合法 JSON。');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('顶层必须是 JSON 对象。');
    }
    return payload;
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const text = String(value).trim().replace(/,/g, '').replace(/[￥¥%\s]/g, '');
    if (!text || text === '-' || text === '—' || text === '--') return null;
    // 支持 +750 / -120.5
    const num = Number(text.replace(/^\+/, ''));
    if (!Number.isFinite(num)) return null;
    if (String(value).trim().startsWith('-') && num > 0) return -num;
    return num;
  }

  function normalizeDirection(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const lower = text.toLowerCase();
    if (['多', '多单', 'long', 'buy', 'l'].includes(lower) || text.includes('多')) return '多';
    if (['空', '空单', 'short', 'sell', 's'].includes(lower) || text.includes('空')) return '空';
    return text;
  }

  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

  const firstDefined = (object, keys) => {
    for (const key of keys) {
      if (object?.[key] !== undefined) return object[key];
    }
    return null;
  };

  function inferUnit(code, name) {
    const prefix = String(code || '').toUpperCase().match(/^[A-Z]+/)?.[0] || '';
    if (unitByPrefix[prefix]) return unitByPrefix[prefix];
    if (String(name || '').includes('黄金') || prefix === 'AU') return '元/克';
    return '元/吨';
  }

  function todayLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** 从 payload 提取账户字段（本金字段兼容读取，但数据层固定为 102000） */
  function extractAccount(payload) {
    const src = payload?.account && typeof payload.account === 'object'
      ? payload.account
      : payload;
    if (!src || typeof src !== 'object') return null;

    const equity = toNumber(
      src.equity ?? src.账户权益 ?? src.account_equity ?? src.AccountEquity
    );
    const capital = toNumber(
      src.capital ?? src.本金 ?? src.principal ?? src.Principal
    );
    const margin = toNumber(
      src.margin
      ?? src.持仓保证金
      ?? src.占用保证金
      ?? src.occupiedMargin
      ?? src.risk_amount
      ?? src.风险占用
    );
    const availableFunds = toNumber(
      src.availableFunds ?? src.available_funds ?? src.可用资金 ?? src.available
    );

    // 至少有一个账户字段才算账户更新
    if (equity === null && capital === null && margin === null && availableFunds === null) return null;
    const account = {};
    if (equity !== null) account.equity = equity;
    if (capital !== null) account.capital = capital;
    if (margin !== null) account.margin = margin;
    if (availableFunds !== null) account.availableFunds = availableFunds;
    return account;
  }

  function extractTradingDecision(payload) {
    const source = payload?.tradingDecision && typeof payload.tradingDecision === 'object' && !Array.isArray(payload.tradingDecision)
      ? payload.tradingDecision
      : payload;
    if (!source || typeof source !== 'object' || Array.isArray(source)) return null;

    const legacyAnalysis = source.marketAnalysis && typeof source.marketAnalysis === 'object' && !Array.isArray(source.marketAnalysis)
      ? source.marketAnalysis
      : (payload?.marketAnalysis && typeof payload.marketAnalysis === 'object' && !Array.isArray(payload.marketAnalysis)
        ? payload.marketAnalysis
        : {});
    const hasDecision = ['tradingDecision', 'marketAnalysis', 'symbol', 'currentView', 'mainPosition', 'fundamental', 'technical', 'operation', 'weeklyPosition', 'levels', 'operationPlan', 'fundamentals']
      .some(key => Object.prototype.hasOwnProperty.call(payload || {}, key) || Object.prototype.hasOwnProperty.call(source, key));
    if (!hasDecision) return null;

    // 兼容旧 GPT 输入仅发生在导入边界；保存和渲染均只使用以下规范结构。
    const section = (value, fields) => {
      const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      return Object.fromEntries(fields.map(([field, aliases]) => [field, firstDefined(input, [field, ...aliases]) ?? null]));
    };
    return {
      symbol: source.symbol ?? source.product ?? source.variety ?? source.品种 ?? legacyAnalysis.symbol ?? legacyAnalysis.product ?? legacyAnalysis.variety ?? null,
      currentView: source.currentView ?? source.trend ?? legacyAnalysis.currentView ?? legacyAnalysis.trend ?? null,
      mainPosition: section(source.mainPosition ?? source.weeklyPosition ?? source.mainFunds ?? legacyAnalysis.mainPosition, [
        ['priceChange', ['price_change', '价格变动', '涨跌']],
        ['openInterestChange', ['open_interest_change', '持仓量变动', '持仓变化']],
        ['volume', ['成交量', '成交']],
        ['analysis', ['分析', 'comment']],
        ['capitalSignal', ['capital_signal', '资金信号', '资金流向']]
      ]),
      fundamental: section(source.fundamental ?? source.fundamentals ?? source.fundamentalAnalysis ?? legacyAnalysis.fundamental, [
        ['supply', ['供应']], ['demand', ['需求']], ['inventory', ['库存']], ['policy', ['政策']]
      ]),
      technical: section(source.technical ?? source.levels ?? legacyAnalysis.technical, [
        ['support', ['supportLevel', '支撑', '支撑位']], ['pressure', ['resistance', 'pressureLevel', '压力', '压力位']]
      ]),
      operation: section(source.operation ?? source.operationPlan ?? legacyAnalysis.operation, [
        ['strategy', ['operationStrategy', 'plan', '策略', '操作策略']],
        ['shortTerm', ['short_term', 'short', '短期', '短线']],
        ['mediumTerm', ['medium_term', 'medium', '中期', '中线']],
        ['risk', ['riskControl', '风险', '风控']]
      ])
    };
  }

  function hasPositionData(row) {
    return ['position', 'direction', 'side', 'quantity', 'volume', 'lots', 'cost', 'openPrice', 'floatingProfitLoss', 'floatingPnl', 'profit', 'targetPrice', 'target', '目标价']
      .some(key => hasOwn(row, key));
  }

  // 外部 GPT 字段优先；字段出现即使值为 0 也不得回退到旧字段。
  function firstPresent(row, keys) {
    for (const key of keys) {
      if (hasOwn(row, key)) return row[key];
    }
    return null;
  }

  function normalizePosition(row, updatedAt) {
    const code = String(row?.contract ?? row?.code ?? row?.symbol ?? '').trim().toUpperCase();
    return {
      code,
      direction: normalizeDirection(row?.direction ?? row?.position ?? row?.side ?? ''),
      quantity: toNumber(row?.quantity ?? row?.volume ?? row?.lots ?? row?.手数) ?? 0,
      cost: toNumber(row?.cost ?? row?.openPrice ?? row?.成本),
      currentPrice: toNumber(row?.currentPrice ?? row?.current_price ?? row?.price ?? row?.latestPrice ?? row?.最新价),
      floatingPnl: toNumber(firstPresent(row, ['floatingProfitLoss', 'floatingPnl', 'profit', '浮盈', '浮动盈亏'])),
      target: toNumber(firstPresent(row, ['targetPrice', 'target', '目标价'])),
      stopLoss: toNumber(row?.stopLoss ?? row?.stop ?? row?.止损),
      plan: String(row?.plan ?? row?.operationPlan ?? row?.操作计划 ?? '').trim(),
      note: String(row?.note ?? row?.备注 ?? '').trim(),
      updatedAt,
      source: 'gpt'
    };
  }

  /** 期货域：GPT futures[] + 可选 account → 行情 + 持仓 + 账户 + 当日日志 */
  function handleFuturesDomain(payload, meta) {
    const list = Array.isArray(payload.futures) ? payload.futures : [];
    if (hasOwn(payload, 'positions') && !Array.isArray(payload.positions)) {
      throw new Error('positions 必须是数组；传空数组 [] 可清空当前持仓。');
    }
    const account = extractAccount(payload);
    const tradingDecision = extractTradingDecision(payload);
    const positionsProvided = hasOwn(payload, 'positions') || list.some(hasPositionData);
    const positionRows = hasOwn(payload, 'positions')
      ? payload.positions
      : list.filter(hasPositionData);

    if (!list.length && !positionsProvided && !account && !tradingDecision) {
      throw new Error('未找到 futures、positions、account 或 tradingDecision 数据。');
    }

    const suppliedUpdatedAt = payload.updatedAt ?? payload.timestamp ?? payload.更新时间;
    const nowISO = suppliedUpdatedAt ? String(suppliedUpdatedAt) : new Date().toISOString();
    const date = String(payload.date || meta.date || todayLocal()).trim() || todayLocal();

    const quoteUpdates = [];
    const positionUpdates = [];
    const skipped = [];

    list.forEach((row, index) => {
      const code = String(row?.contract || row?.code || '').trim().toUpperCase();
      const name = String(row?.name || '').trim();
      if (!code) {
        skipped.push(`第 ${index + 1} 条缺少 contract/code`);
        return;
      }

      const price = toNumber(row?.price);
      const change = row?.change ?? row?.changePct ?? row?.涨跌 ?? null;
      const unit = String(row?.unit || '').trim() || inferUnit(code, name);
      const note = String(row?.note || row?.备注 || '').trim();
      const plan = String(row?.plan || row?.操作计划 || '').trim();

      quoteUpdates.push({
        code,
        name: name || code,
        price,
        unit,
        change: change === '' ? null : change,
        note,
        updatedAt: nowISO,
        source: 'gpt'
      });

    });

    positionRows.forEach((row, index) => {
      const position = normalizePosition(row, nowISO);
      if (!position.code) {
        skipped.push(`持仓第 ${index + 1} 条缺少 contract/code`);
        return;
      }
      positionUpdates.push(position);
    });

    if (!quoteUpdates.length && !positionsProvided && !account && !tradingDecision) throw new Error('没有可识别的数据。');

    const result = window.BossData.applyGPTImport({
      domain: 'futures',
      date,
      updatedAt: nowISO,
      quotes: quoteUpdates,
      positions: positionUpdates,
      positionsProvided,
      account,
      tradingDecision,
      rawCount: list.length
    });

    const parts = [];
    if (quoteUpdates.length) {
      parts.push(`${result.quotes.updated + result.quotes.added} 个行情`);
    }
    if (positionsProvided) {
      parts.push(`${result.positions.total} 条持仓`);
    }
    if (result.account) {
      parts.push('账户');
    }
    if (result.tradingDecision) {
      parts.push('交易决策');
    }

    return {
      domain: 'futures',
      date,
      updatedAt: nowISO,
      quotes: result.quotes,
      positions: result.positions,
      account: result.account,
      tradingDecision: result.tradingDecision,
      skipped,
      message: parts.length
        ? `已更新 ${parts.join('，')}（${date}）`
        : `无变更（${date}）`
    };
  }

  DOMAIN_HANDLERS.futures = handleFuturesDomain;
  // 单独 account 域：只更新账户
  DOMAIN_HANDLERS.account = (payload, meta) => {
    const account = extractAccount(payload);
    if (!account) throw new Error('未找到账户字段 equity / capital / margin / availableFunds。');
    return handleFuturesDomain({ ...payload, account, futures: payload.futures || [] }, meta);
  };
  DOMAIN_HANDLERS.tradingdecision = (payload, meta) => handleFuturesDomain(payload, meta);
  DOMAIN_HANDLERS['trading-decision'] = DOMAIN_HANDLERS.tradingdecision;

  // 预留扩展域（尚未实现具体写入，避免误用时报清晰错误）
  ['stocks', 'tesla', 'projects', 'finance', 'journal'].forEach(domain => {
    DOMAIN_HANDLERS[domain] = () => {
      throw new Error(`领域「${domain}」已预留，尚未接入写入逻辑。`);
    };
  });

  /**
   * 解析并应用 GPT 文本。
   * 识别顺序：显式 domain 字段 → futures 数组 → 其他预留键。
   */
  function apply(text) {
    const payload = parseJSON(text);
    const domainHint = String(payload.domain || payload.type || '').trim().toLowerCase();

    if (domainHint && DOMAIN_HANDLERS[domainHint]) {
      return DOMAIN_HANDLERS[domainHint](payload, { date: payload.date });
    }
    if (Array.isArray(payload.futures) || Array.isArray(payload.positions) || payload.account || extractTradingDecision(payload)) {
      return DOMAIN_HANDLERS.futures(payload, { date: payload.date });
    }
    // 顶层直接给 equity/margin 也视为账户更新
    if (
      payload.equity !== undefined
      || payload.capital !== undefined
      || payload.margin !== undefined
      || payload.availableFunds !== undefined
      || payload.账户权益 !== undefined
      || payload.本金 !== undefined
      || payload.持仓保证金 !== undefined
      || payload.可用资金 !== undefined
    ) {
      return DOMAIN_HANDLERS.account(payload, { date: payload.date });
    }
    if (Array.isArray(payload.stocks)) return DOMAIN_HANDLERS.stocks(payload, {});
    if (payload.tesla || payload.vehicles) return DOMAIN_HANDLERS.tesla(payload, {});
    if (payload.projects) return DOMAIN_HANDLERS.projects(payload, {});
    if (payload.finance) return DOMAIN_HANDLERS.finance(payload, {});
    if (payload.journal || payload.logs) return DOMAIN_HANDLERS.journal(payload, {});

    throw new Error('未识别的数据格式。可用 { "date","account","positions":[],"futures":[...] }。');
  }

  function registerDomain(name, handler) {
    DOMAIN_HANDLERS[String(name)] = handler;
  }

  window.GPTImport = {
    apply,
    parseJSON,
    registerDomain,
    todayLocal,
    // 给页面展示用的示例
    sampleFuturesJSON: `{
  "date": "2026-08-10",
  "futures": [
    {
      "name": "螺纹钢",
      "contract": "RB2610",
      "price": "3015",
      "position": "多单",
      "volume": "6",
      "cost": "2997.5",
      "profit": "1050",
      "plan": "目标 3120，止损 2960",
      "note": "GPT 示例"
    },
    {
      "name": "焦煤",
      "contract": "JM2609",
      "price": "1280",
      "position": "",
      "volume": "",
      "cost": "",
      "profit": "",
      "plan": "观望",
      "note": ""
    }
  ]
}`
  };
})();
