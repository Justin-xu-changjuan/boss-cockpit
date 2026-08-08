/**
 * dataStore.js
 * 统一数据层：默认数据 -> localStorage -> 未来 API / AI JSON 导入
 */
(() => {
  const STORAGE_KEY = 'boss-cockpit-data-v1';
  const modules = ['futuresData', 'vehicleData', 'projectData', 'accountData', 'tradeLog', 'todayFocus', 'positions', 'fileEntries', 'quickActions'];
  let stored = {};

  try {
    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch (error) {
    console.warn('[BossData] localStorage 不可用，将使用当前会话数据。', error);
  }

  const clone = value => JSON.parse(JSON.stringify(value));
  const normalize = (moduleName, value) => {
    if (moduleName === 'accountData') {
      return {
        equity: value?.equity ?? null,
        availableFunds: value?.availableFunds ?? null,
        margin: value?.margin ?? value?.occupiedMargin ?? null
      };
    }
    return value;
  };
  const syncAliases = moduleName => {
    if (moduleName === 'futuresData') window.futureData = window.futuresData;
    if (moduleName === 'projectData') window.projects = window.projectData;
  };
  const save = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.warn('[BossData] 保存本地数据失败。', error);
    }
  };

  const register = (moduleName, defaults) => {
    const value = Array.isArray(stored[moduleName]) || (stored[moduleName] && typeof stored[moduleName] === 'object')
      ? stored[moduleName]
      : defaults;
    stored[moduleName] = clone(normalize(moduleName, value));
    window[moduleName] = clone(stored[moduleName]);
    syncAliases(moduleName);
    return window[moduleName];
  };

  const replace = (moduleName, value) => {
    if (!modules.includes(moduleName)) throw new Error(`未知数据模块：${moduleName}`);
    stored[moduleName] = clone(normalize(moduleName, value));
    window[moduleName] = clone(stored[moduleName]);
    syncAliases(moduleName);
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
      vehicles: 'vehicleData',
      projects: 'projectData'
    };
    const imported = Object.entries(payload).reduce((result, [key, value]) => {
      const moduleName = aliases[key] || key;
      if (modules.includes(moduleName)) result[moduleName] = value;
      return result;
    }, {});
    if (!Object.keys(imported).length) throw new Error('未找到可导入的数据模块。');

    Object.entries(imported).forEach(([moduleName, value]) => replace(moduleName, value));
    return Object.keys(imported);
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
