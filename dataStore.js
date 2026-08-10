/**
 * dataStore.js
 * 统一数据层：默认数据 -> localStorage -> 未来 API / AI JSON 导入
 */
(() => {
  const STORAGE_KEY = 'boss-cockpit-data-v1';
  const modules = ['futuresData', 'vehicleData', 'accountData', 'positions', 'fileEntries'];
  let stored = {};

  try {
    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch (error) {
    console.warn('[BossData] localStorage 不可用，将使用当前会话数据。', error);
  }
  const storedEntries = Object.entries(stored);
  stored = Object.fromEntries(storedEntries.filter(([moduleName]) => modules.includes(moduleName)));
  const needsStorageCleanup = storedEntries.length !== Object.keys(stored).length;

  const clone = value => JSON.parse(JSON.stringify(value));
  const normalizeFutures = value => (Array.isArray(value) ? value : []).map(item => ({
    code: String(item?.code ?? '').trim(),
    name: String(item?.name ?? '').trim(),
    price: item?.price ?? null,
    unit: String(item?.unit ?? '').trim()
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
    plan: String(item?.plan ?? '').trim()
  }));
  const normalize = (moduleName, value) => {
    if (moduleName === 'futuresData') return normalizeFutures(value);
    if (moduleName === 'positions') return normalizePositions(value);
    if (moduleName === 'accountData') {
      return {
        equity: value?.equity ?? null,
        availableFunds: value?.availableFunds ?? null,
        margin: value?.margin ?? value?.occupiedMargin ?? null,
        floatingPnl: value?.floatingPnl ?? null
      };
    }
    return value;
  };
  const save = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.warn('[BossData] 保存本地数据失败。', error);
    }
  };
  if (needsStorageCleanup) save();

  const register = (moduleName, defaults) => {
    const hasStoredValue = Array.isArray(stored[moduleName]) || (stored[moduleName] && typeof stored[moduleName] === 'object');
    const value = hasStoredValue
      ? (moduleName === 'accountData' ? { ...defaults, ...stored[moduleName] } : stored[moduleName])
      : defaults;
    stored[moduleName] = clone(normalize(moduleName, value));
    window[moduleName] = clone(stored[moduleName]);
    if (hasStoredValue && ['futuresData', 'positions'].includes(moduleName)) save();
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
    window.dispatchEvent(new CustomEvent('bossdatachange', { detail: { module: moduleName } }));
  };

  const importJSON = input => {
    let payload = input;
    if (typeof input === 'string') payload = JSON.parse(input);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('JSON 顶层必须是对象。');
    }

    const aliases = {
      futures: 'futuresData',
      vehicles: 'vehicleData'
    };
    const imported = Object.entries(payload).reduce((result, [key, value]) => {
      const moduleName = aliases[key] || key;
      if (modules.includes(moduleName)) result[moduleName] = value;
      return result;
    }, {});
    if (!Object.keys(imported).length) throw new Error('未找到可导入的数据模块。');

    const importedModules = Object.keys(imported);
    Object.entries(imported).forEach(([moduleName, value]) => applyModule(moduleName, value));
    save();
    window.dispatchEvent(new CustomEvent('bossdatachange', { detail: { modules: importedModules } }));
    return importedModules;
  };

  window.BossData = {
    storageKey: STORAGE_KEY,
    register,
    replace,
    importJSON,
    exportJSON: () => JSON.stringify(stored, null, 2),
    clearLocalData: () => {
      window.localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };
  window.importBossData = importJSON;
})();
