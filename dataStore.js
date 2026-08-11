/**
 * dataStore.js
 * 统一数据层：默认数据 -> localStorage -> 未来 API / AI JSON 导入
 * 支持模块整表替换，以及 GPT 增量合并 + 每日历史日志。
 */
(() => {
  const STORAGE_KEY = 'boss-cockpit-data-v1';
  const FIXED_CAPITAL = 102000;
  const modules = ['futuresData', 'vehicleData', 'accountData', 'tradingDecision', 'positions', 'fileEntries', 'homeDevices', 'dailyLogs', 'meta'];
  let stored = {};

  try {
    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch (error) {
    console.warn('[BossData] localStorage 不可用，将使用当前会话数据。', error);
  }
  const isLegacyDemoAccountSnapshot = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const allowedKeys = new Set([
      'equity', 'capital', 'margin', 'profit', 'risk_rate',
      'availableFunds', 'floatingPnl', 'updatedAt', 'source'
    ]);
    if (Object.keys(value).some(key => !allowedKeys.has(key))) return false;
    if (value.source || value.updatedAt) return false;
    if (Number(value.equity) !== 5e5 || Number(value.margin) !== 137500) return false;

    const isEarlySnapshot = value.capital === undefined
      && value.profit === undefined
      && value.risk_rate === undefined
      && Number(value.availableFunds) === 362500
      && (value.floatingPnl === undefined || Number(value.floatingPnl) === 750);
    const isNormalizedSnapshot = Number(value.capital) === FIXED_CAPITAL
      && Number(value.profit) === 398000
      && Number(value.risk_rate) === 0.275
      && Number(value.floatingPnl) === 398000
      && (value.availableFunds === null || Number(value.availableFunds) === 362500);
    return isEarlySnapshot || isNormalizedSnapshot;
  };
  const needsLegacyAccountMigration = isLegacyDemoAccountSnapshot(stored.accountData);
  if (needsLegacyAccountMigration) {
    stored.accountData = {
      equity: null,
      capital: FIXED_CAPITAL,
      margin: null,
      profit: null,
      risk_rate: null,
      availableFunds: null,
      floatingPnl: null,
      updatedAt: null,
      source: null
    };
  }
  const storedEntries = Object.entries(stored);
  stored = Object.fromEntries(storedEntries.filter(([moduleName]) => modules.includes(moduleName)));
  const needsStorageCleanup = needsLegacyAccountMigration
    || storedEntries.length !== Object.keys(stored).length;

  const clone = value => JSON.parse(JSON.stringify(value));

  const normalizeFutures = value => (Array.isArray(value) ? value : []).map(item => ({
    code: String(item?.code ?? '').trim(),
    name: String(item?.name ?? '').trim(),
    price: item?.price ?? null,
    unit: String(item?.unit ?? '').trim(),
    change: item?.change ?? null,
    note: String(item?.note ?? '').trim(),
    updatedAt: item?.updatedAt ?? null,
    source: item?.source ?? null
  }));

  const normalizePositions = value => (Array.isArray(value) ? value : []).map(item => ({
    code: String(item?.code ?? '').trim(),
    direction: String(item?.direction ?? '').trim(),
    quantity: item?.quantity ?? 0,
    cost: item?.cost ?? null,
    currentPrice: item?.currentPrice ?? null,
    floatingPnl: item?.floatingPnl ?? null,
    target: item?.target ?? null,
    stopLoss: item?.stopLoss ?? null,
    plan: String(item?.plan ?? '').trim(),
    note: String(item?.note ?? '').trim(),
    updatedAt: item?.updatedAt ?? null,
    source: item?.source ?? null
  }));

  const normalizeDailyLogs = value => (Array.isArray(value) ? value : []).map(item => ({
    date: String(item?.date ?? '').trim(),
    updatedAt: item?.updatedAt ?? null,
    source: item?.source ?? 'manual',
    domain: item?.domain ?? 'futures',
    futures: Array.isArray(item?.futures) ? item.futures : [],
    positions: Array.isArray(item?.positions) ? item.positions : [],
    account: item?.account ?? null,
    summary: item?.summary ?? null
  }));

  const normalizeMeta = value => ({
    lastGPTUpdateAt: value?.lastGPTUpdateAt ?? null,
    lastGPTDate: value?.lastGPTDate ?? null,
    lastGPTDomain: value?.lastGPTDomain ?? null,
    lastGPTMessage: value?.lastGPTMessage ?? null
  });

  const normalizeTradingDecision = value => {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const analysis = source.marketAnalysis && typeof source.marketAnalysis === 'object' && !Array.isArray(source.marketAnalysis)
      ? source.marketAnalysis
      : null;
    return {
      ...source,
      product: source.product ?? source.variety ?? source.品种 ?? analysis?.product ?? analysis?.variety ?? null,
      marketAnalysis: analysis,
      // 新版 marketAnalysis 映射到既有字段，旧版读取方与历史数据均可继续使用。
      weeklyPosition: source.weeklyPosition ?? analysis?.mainPosition ?? null,
      levels: source.levels ?? analysis?.technical ?? null,
      operationPlan: source.operationPlan ?? analysis?.operation ?? null,
      fundamentals: source.fundamentals ?? analysis?.fundamental ?? null,
      trend: source.trend ?? analysis?.trend ?? null
    };
  };

  const normalize = (moduleName, value) => {
    if (moduleName === 'futuresData') return normalizeFutures(value);
    if (moduleName === 'positions') return normalizePositions(value);
    if (moduleName === 'dailyLogs') return normalizeDailyLogs(value);
    if (moduleName === 'meta') return normalizeMeta(value || {});
    if (moduleName === 'tradingDecision') return normalizeTradingDecision(value);
    if (moduleName === 'accountData') {
      return normalizeAccount(value);
    }
    return value;
  };

  /** 账户：本金固定；累计盈亏/风险占用率自动计算 */
  const normalizeAccount = value => {
    const equityRaw = value?.equity;
    const marginRaw = value?.margin ?? value?.occupiedMargin ?? value?.risk_amount;
    const availableRaw = value?.availableFunds ?? value?.available ?? value?.available_funds;
    const equity = equityRaw === null || equityRaw === undefined || equityRaw === ''
      ? null
      : Number(equityRaw);
    const margin = marginRaw === null || marginRaw === undefined || marginRaw === ''
      ? null
      : Number(marginRaw);
    const available = availableRaw === null || availableRaw === undefined || availableRaw === ''
      ? null
      : Number(availableRaw);

    const eq = Number.isFinite(equity) ? equity : null;
    const cap = FIXED_CAPITAL;
    const mg = Number.isFinite(margin) ? margin : null;
    const availableFunds = Number.isFinite(available) ? available : null;

    const profit = eq !== null ? eq - cap : null;
    const risk_rate = eq !== null && eq > 0 && mg !== null ? mg / eq : null;

    return {
      equity: eq,
      capital: cap,
      margin: mg,
      // 计算字段（始终重算）
      profit,
      risk_rate,
      // 兼容旧字段：floatingPnl 同步为累计盈亏
      availableFunds,
      floatingPnl: profit,
      updatedAt: value?.updatedAt ?? null,
      source: value?.source ?? null
    };
  };

  const save = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.warn('[BossData] 保存本地数据失败。', error);
    }
  };
  if (needsStorageCleanup) save();

  const emit = detail => {
    window.dispatchEvent(new CustomEvent('bossdatachange', { detail }));
  };

  const register = (moduleName, defaults) => {
    const hasStoredValue = Array.isArray(stored[moduleName]) || (stored[moduleName] && typeof stored[moduleName] === 'object');
    const value = hasStoredValue
      ? (['accountData', 'meta'].includes(moduleName) ? { ...defaults, ...stored[moduleName] } : stored[moduleName])
      : defaults;
    stored[moduleName] = clone(normalize(moduleName, value));
    window[moduleName] = clone(stored[moduleName]);
    if (hasStoredValue && ['futuresData', 'positions', 'accountData', 'tradingDecision', 'dailyLogs', 'meta'].includes(moduleName)) save();
    return window[moduleName];
  };

  const applyModule = (moduleName, value) => {
    stored[moduleName] = clone(normalize(moduleName, value));
    window[moduleName] = clone(stored[moduleName]);
  };

  const replace = (moduleName, value) => {
    if (!modules.includes(moduleName)) throw new Error(`未知数据模块：${moduleName}`);
    applyModule(moduleName, value);
    save();
    emit({ module: moduleName });
  };

  const getModule = moduleName => clone(stored[moduleName] ?? (moduleName === 'meta' ? {} : []));

  /** 按 code 合并行情：有则覆盖字段，无则新增 */
  const mergeQuotes = (incoming = []) => {
    const current = normalizeFutures(stored.futuresData || []);
    let added = 0;
    let updated = 0;
    incoming.forEach(item => {
      const next = normalizeFutures([item])[0];
      if (!next.code) return;
      const index = current.findIndex(row => String(row.code).toUpperCase() === next.code.toUpperCase());
      if (index >= 0) {
        const prev = current[index];
        current[index] = {
          ...prev,
          ...next,
          // 空价格不覆盖已有价格
          price: next.price === null || next.price === '' ? prev.price : next.price,
          name: next.name || prev.name,
          unit: next.unit || prev.unit
        };
        updated += 1;
      } else {
        current.push(next);
        added += 1;
      }
    });
    applyModule('futuresData', current);
    return { added, updated, total: current.length };
  };

  /** 按 code 合并持仓；quantity 为 0 且无方向时仍保留记录（覆盖） */
  const mergePositions = (incoming = []) => {
    const current = normalizePositions(stored.positions || []);
    let added = 0;
    let updated = 0;
    incoming.forEach(item => {
      const next = normalizePositions([item])[0];
      if (!next.code) return;
      const index = current.findIndex(row => String(row.code).toUpperCase() === next.code.toUpperCase());
      if (index >= 0) {
        const prev = current[index];
        current[index] = {
          ...prev,
          ...next,
          direction: next.direction || prev.direction,
          quantity: next.quantity === 0 && prev.quantity ? next.quantity : (next.quantity ?? prev.quantity),
          cost: next.cost === null ? prev.cost : next.cost,
          currentPrice: next.currentPrice === null ? prev.currentPrice : next.currentPrice,
          floatingPnl: next.floatingPnl === null ? prev.floatingPnl : next.floatingPnl,
          target: next.target === null ? prev.target : next.target,
          stopLoss: next.stopLoss === null ? prev.stopLoss : next.stopLoss,
          plan: next.plan || prev.plan,
          note: next.note || prev.note
        };
        updated += 1;
      } else {
        current.push(next);
        added += 1;
      }
    });
    applyModule('positions', current);
    return { added, updated, total: current.length };
  };

  /** 按 date 覆盖当日日志，历史其他日期保留 */
  const upsertDailyLog = log => {
    const logs = normalizeDailyLogs(stored.dailyLogs || []);
    const date = String(log?.date || '').trim();
    if (!date) return { total: logs.length };
    const next = normalizeDailyLogs([{ ...log, date }])[0];
    const index = logs.findIndex(item => item.date === date && item.domain === next.domain);
    if (index >= 0) logs[index] = { ...logs[index], ...next };
    else logs.push(next);
    // 按日期倒序
    logs.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    applyModule('dailyLogs', logs);
    return { total: logs.length, date };
  };

  /** 合并账户字段：本金固定，只覆盖传入的真实账户字段；profit/risk_rate 始终重算 */
  const mergeAccount = (incoming = {}, options = {}) => {
    const current = normalizeAccount(stored.accountData || {});
    const next = { ...current };
    if (incoming.equity !== undefined && incoming.equity !== null && incoming.equity !== '') {
      next.equity = Number(incoming.equity);
    }
    if (incoming.margin !== undefined && incoming.margin !== null && incoming.margin !== '') {
      next.margin = Number(incoming.margin);
    }
    if (incoming.availableFunds !== undefined && incoming.availableFunds !== null && incoming.availableFunds !== '') {
      next.availableFunds = Number(incoming.availableFunds);
    }
    if (incoming.updatedAt) next.updatedAt = incoming.updatedAt;
    if (incoming.source) next.source = incoming.source;
    applyModule('accountData', next);
    if (options.persist !== false) {
      save();
      emit({ module: 'accountData', source: incoming.source || 'manual' });
    }
    return normalizeAccount(stored.accountData);
  };

  /**
   * GPT 增量导入（期货域 + 可选账户）
   * - 合并行情 / 持仓 / 账户
   * - 写入当日 dailyLogs（不删历史）
   * - 更新 meta 时间戳
   */
  const applyGPTImport = payload => {
    const date = String(payload?.date || '').trim();
    const updatedAt = payload?.updatedAt || new Date().toISOString();
    const quotes = Array.isArray(payload?.quotes) ? payload.quotes : [];
    const positions = Array.isArray(payload?.positions) ? payload.positions : [];
    const account = payload?.account && typeof payload.account === 'object' ? payload.account : null;
    const tradingDecision = payload?.tradingDecision && typeof payload.tradingDecision === 'object'
      ? payload.tradingDecision
      : null;
    const domain = payload?.domain || 'futures';

    const quoteStats = quotes.length ? mergeQuotes(quotes) : { added: 0, updated: 0, total: (stored.futuresData || []).length };
    const positionStats = positions.length ? mergePositions(positions) : { added: 0, updated: 0, total: (stored.positions || []).length };
    const accountResult = account
      ? mergeAccount({ ...account, updatedAt, source: 'gpt' }, { persist: false })
      : null;
    const tradingDecisionResult = tradingDecision
      ? normalizeTradingDecision(tradingDecision)
      : null;
    if (tradingDecisionResult) applyModule('tradingDecision', tradingDecisionResult);

    upsertDailyLog({
      date,
      updatedAt,
      source: 'gpt',
      domain,
      futures: quotes,
      positions,
      account: accountResult,
      summary: {
        quoteCount: quotes.length,
        positionCount: positions.length,
        accountUpdated: Boolean(accountResult)
      }
    });

    applyModule('meta', {
      ...(stored.meta || {}),
      lastGPTUpdateAt: updatedAt,
      lastGPTDate: date,
      lastGPTDomain: domain,
      lastGPTMessage: `GPT 更新 ${date}`
    });

    save();
    const modules = ['dailyLogs', 'meta'];
    if (quotes.length) modules.push('futuresData');
    if (positions.length) modules.push('positions');
    if (accountResult) modules.push('accountData');
    if (tradingDecisionResult) modules.push('tradingDecision');
    emit({ modules, source: 'gpt' });

    return {
      quotes: quoteStats,
      positions: positionStats,
      account: accountResult,
      tradingDecision: tradingDecisionResult,
      date,
      updatedAt
    };
  };

  const importJSON = input => {
    let payload = input;
    if (typeof input === 'string') payload = JSON.parse(input);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('JSON 顶层必须是对象。');
    }

    const aliases = {
      futures: 'futuresData',
      vehicles: 'vehicleData',
      logs: 'dailyLogs',
      history: 'dailyLogs'
    };
    const imported = Object.entries(payload).reduce((result, [key, value]) => {
      const moduleName = aliases[key] || key;
      if (modules.includes(moduleName)) result[moduleName] = value;
      return result;
    }, {});
    if (!Object.keys(imported).length) throw new Error('未找到可导入的数据模块。');

    const importedModules = Object.keys(imported);
    Object.entries(imported).forEach(([moduleName, value]) => {
      const importValue = moduleName === 'accountData' && value && typeof value === 'object'
        ? { ...value, updatedAt: new Date().toISOString(), source: 'json' }
        : value;
      applyModule(moduleName, importValue);
    });
    save();
    emit({ modules: importedModules });
    return importedModules;
  };

  // 默认注册空扩展模块，避免未加载时报错
  if (!stored.dailyLogs) applyModule('dailyLogs', []);
  if (!stored.meta) applyModule('meta', {});

  window.BossData = {
    storageKey: STORAGE_KEY,
    modules,
    register,
    replace,
    getModule,
    mergeQuotes,
    mergePositions,
    mergeAccount,
    upsertDailyLog,
    applyGPTImport,
    importJSON,
    exportJSON: () => JSON.stringify(stored, null, 2),
    clearLocalData: () => {
      window.localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };
  window.importBossData = importJSON;

  // 暴露到 window，便于页面读取
  window.dailyLogs = clone(stored.dailyLogs || []);
  window.meta = clone(stored.meta || {});
})();
