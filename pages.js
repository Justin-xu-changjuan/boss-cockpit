/**
 * pages.js
 * -----------------------------------------
 * Boss Cockpit App 页面架构
 * - 管理五个底部 Tab 的显示、历史记录与滚动位置
 * - 使用独立数据模块渲染次级页面
 * - 后续真实接口接入时，只需替换数据服务，不需要重做页面结构
 */

(() => {
  const appRoutes = ['home', 'market-watch', 'tesla', 'smart-home', 'me', 'data', 'position', 'position-input', 'gpt-import', 'trade-decision'];
  const routeTitles = {
    home: '老板驾驶舱',
    tesla: 'Tesla',
    'smart-home': '家居',
    me: '我的',
    data: '数据管理',
    position: '我的持仓',
    'position-input': '持仓智能录入',
    'gpt-import': 'GPT智能录入',
    'market-watch': '市场观察',
    'trade-decision': '交易决策'
  };
  const scrollPositions = new Map();
  let teslaCommandTimer = null;
  let teslaCommandCleanup = null;
  let teslaReturnPage = 'home';
  let appRouterInitialized = false;

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[character]);
  }

  function safeClassToken(value, fallback = 'default') {
    const token = String(value || '').trim().toLowerCase();
    return /^[a-z0-9_-]+$/.test(token) ? token : fallback;
  }

  function notify(message) {
    if (typeof window.showToast === 'function') {
      window.showToast(message);
    }
  }

  function formatPagePrice(price) {
    if (price >= 10000) {
      return price.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
    }
    return price.toLocaleString('zh-CN', { maximumFractionDigits: 1 });
  }

  function getRouteFromHash() {
    const route = window.location.hash.replace('#', '');
    if (route === 'file') return 'smart-home';
    return appRoutes.includes(route) ? route : 'home';
  }

  function activateRoute(route, options = {}) {
    const targetPage = appRoutes.includes(route) ? route : 'home';
    const activeView = document.querySelector('.app-view.is-active');
    const targetView = document.getElementById(`view-${targetPage}`);
    if (!targetView) return;

    if (targetPage === 'trade-decision') renderTradeDecisionPage();

    if (activeView?.dataset.view === 'tesla-control' && teslaCommandCleanup) {
      teslaCommandCleanup();
    }

    if (activeView && activeView !== targetView) {
      scrollPositions.set(activeView.dataset.view, window.scrollY);
    }

    document.querySelectorAll('.app-view').forEach(view => {
      const isTarget = view === targetView;
      view.hidden = !isTarget;
      view.classList.toggle('is-active', isTarget);
      view.setAttribute('aria-hidden', String(!isTarget));
    });

    const activeTabPage = targetPage === 'data'
      ? 'me'
      : (['position', 'position-input', 'gpt-import', 'trade-decision'].includes(targetPage)
        ? (targetPage === 'gpt-import' ? 'market-watch' : 'home')
        : targetPage);
    document.querySelectorAll('.nav-item').forEach(item => {
      const isActive = item.dataset.page === activeTabPage;
      item.classList.toggle('active', isActive);
      if (isActive) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    document.title = targetPage === 'home'
      ? '老板驾驶舱'
      : `${routeTitles[targetPage]} · 老板驾驶舱`;

    if (options.restoreScroll !== false) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPositions.get(targetPage) || 0, behavior: 'auto' });
      });
    }
  }

  function isAppleDevice() {
    const userAgent = navigator.userAgent || '';
    const platform = navigator.platform || '';
    return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent)
      || /MacIntel|MacPPC|Mac68K/i.test(platform);
  }

  function getTeslaVehicle(vehicleId) {
    const vehicles = window.vehicleData || [];
    return vehicles.find(vehicle => vehicle.id === vehicleId) || vehicles[0];
  }

  function renderTeslaFleetPage() {
    const list = document.getElementById('tesla-fleet-list');
    if (!list) return;
    const vehicles = Array.isArray(window.vehicleData) ? window.vehicleData : [];
    if (!vehicles.length) {
      list.innerHTML = '<div class="tesla-fleet-empty">暂无车辆数据</div>';
      return;
    }

    // 双列并排：全部控制直接展示，无二级「完整控制页」
    const maxControls = vehicles.reduce((n, v) => Math.max(n, (v.controls || []).length), 0);
    list.classList.add('tesla-fleet-grid-soft');
    list.innerHTML = vehicles.map((vehicle, index) => {
      const tone = safeClassToken(vehicle.tone, index === 0 ? 'white' : 'black');
      const palette = index === 0 ? 'mint' : 'lavender';
      const controls = Array.isArray(vehicle.controls) ? vehicle.controls : [];
      const battery = tone === 'white' ? 78 : 64;
      const range = tone === 'white' ? '312' : '268';
      const temp = tone === 'white' ? '22.5' : '21.0';
      // 用空位补齐控制格数，保证两卡同高
      const pads = Math.max(0, maxControls - controls.length);
      return `
        <article class="tesla-soft-card tesla-tone-${tone} tesla-palette-${palette}" data-vehicle-card="${escapeHTML(vehicle.id)}">
          <header class="tesla-soft-head">
            <div class="tesla-soft-mark" aria-hidden="true">${escapeHTML(vehicle.mark || 'T')}</div>
            <div class="tesla-soft-titles">
              <strong>${escapeHTML(vehicle.shortName || vehicle.name || 'Tesla')}</strong>
              <span>${escapeHTML(vehicle.colorName || '车身')}</span>
            </div>
            <span class="tesla-soft-badge"><i aria-hidden="true"></i>在线</span>
          </header>

          <div class="tesla-soft-hero">
            <div class="tesla-soft-hero-main">
              <em>预估续航</em>
              <strong>${range}<small>km</small></strong>
              <span class="tesla-soft-pill">+${battery === 78 ? '2.4' : '1.1'}%</span>
            </div>
            <div class="tesla-soft-hero-side">
              <span>电量 <b>${battery}%</b></span>
              <span>座舱 <b>${temp}°</b></span>
              <span>车锁 <b>已锁</b></span>
            </div>
          </div>

          <div class="tesla-soft-climate">
            <div class="tesla-soft-climate-copy">
              <span>电池健康</span>
              <strong>${battery}%</strong>
            </div>
            <div class="tesla-soft-climate-bar" aria-hidden="true">
              <span style="width:${battery}%"></span>
            </div>
          </div>

          <div class="tesla-soft-controls-label">全部控制</div>
          <div class="tesla-soft-controls" role="group" aria-label="${escapeHTML(vehicle.shortName || '车辆')}全部控制">
            ${controls.map(command => `
              <button class="tesla-soft-btn" type="button"
                data-vehicle-id="${escapeHTML(vehicle.id)}"
                data-command="${escapeHTML(command.id)}">
                <span class="tesla-soft-btn-ico" aria-hidden="true">${escapeHTML(command.icon || '•')}</span>
                <span>${escapeHTML(command.label)}</span>
              </button>
            `).join('')}
            ${Array.from({ length: pads }).map(() => `
              <div class="tesla-soft-btn tesla-soft-btn-pad" aria-hidden="true"></div>
            `).join('')}
          </div>
        </article>
      `;
    }).join('');

    list.querySelectorAll('[data-command][data-vehicle-id]').forEach(button => {
      button.addEventListener('click', () => {
        const vehicle = getTeslaVehicle(button.dataset.vehicleId);
        if (!vehicle) return;
        handleTeslaCommand(button, vehicle);
      });
    });
  }

  function renderTeslaControl(vehicleId) {
    const vehicle = getTeslaVehicle(vehicleId);
    const hero = document.getElementById('tesla-control-hero');
    const commandGrid = document.getElementById('tesla-command-grid');
    const feedback = document.getElementById('tesla-feedback');
    if (!hero || !commandGrid || !feedback) return;

    hero.innerHTML = `
      <div class="tesla-control-hero ${safeClassToken(vehicle.tone)}">
        <div class="tesla-control-vehicle-mark" aria-hidden="true">${escapeHTML(vehicle.mark)}</div>
        <div class="tesla-control-vehicle-copy">
          <span class="tesla-control-kicker">TESLA CONTROL</span>
          <h1>${escapeHTML(vehicle.name)}</h1>
          <span>${escapeHTML(vehicle.colorName)} · ${escapeHTML(vehicle.status || '状态模拟')}</span>
        </div>
        <span class="tesla-online-badge"><i aria-hidden="true"></i>快捷指令</span>
      </div>
    `;

    commandGrid.innerHTML = (vehicle.controls || []).map(command => {
      return `
        <button class="tesla-command-button" type="button" data-command="${escapeHTML(command.id)}">
          <span class="tesla-command-icon" aria-hidden="true">${escapeHTML(command.icon)}</span>
          <span class="tesla-command-label">${escapeHTML(command.label)}</span>
          <span class="tesla-command-state">Shortcut</span>
        </button>
      `;
    }).join('');

    feedback.className = 'tesla-feedback';
    feedback.textContent = '点击按钮将请求系统快捷指令';

    commandGrid.querySelectorAll('.tesla-command-button').forEach(button => {
      button.addEventListener('click', () => handleTeslaCommand(button, vehicle));
    });
  }

  function handleTeslaCommand(button, vehicle) {
    if (button.disabled) return;

    const feedback = document.getElementById('tesla-feedback');
    const command = (vehicle.controls || []).find(item => item.id === button.dataset.command);
    const shortcutName = command?.shortcut;
    if (!command || !shortcutName) return;

    const scope = button.closest('[data-vehicle-card], .tesla-command-grid, .tesla-control-main') || document;
    const relatedButtons = () => scope.querySelectorAll(
      '.tesla-command-button, .tesla-soft-btn, .tesla-soft-chip'
    );

    if (teslaCommandCleanup) teslaCommandCleanup();
    window.clearTimeout(teslaCommandTimer);
    relatedButtons().forEach(item => {
      item.disabled = true;
      item.classList.remove('is-complete');
    });
    button.classList.add('is-sending');
    if (feedback) {
      feedback.className = 'tesla-feedback is-sending';
      feedback.innerHTML = `<span class="tesla-feedback-spinner" aria-hidden="true"></span>正在请求快捷指令…`;
    }
    notify(`${vehicle.shortName || vehicle.name} · ${command.label}…`);

    let shortcutLeftPage = false;
    const cleanupShortcutListeners = () => {
      document.removeEventListener('visibilitychange', handleShortcutVisibility);
      window.removeEventListener('pagehide', handleShortcutPageHide);
      window.removeEventListener('pageshow', handleShortcutPageShow);
      window.clearTimeout(teslaCommandTimer);
      button.classList.remove('is-sending');
      unlockButtons();
      if (teslaCommandCleanup === cleanupShortcutListeners) {
        teslaCommandCleanup = null;
        teslaCommandTimer = null;
      }
    };
    const unlockButtons = () => {
      relatedButtons().forEach(item => {
        item.disabled = false;
      });
    };
    const showShortcutRequested = () => {
      cleanupShortcutListeners();
      button.classList.remove('is-sending');
      unlockButtons();
      if (feedback) {
        feedback.className = 'tesla-feedback';
        feedback.innerHTML = `<span aria-hidden="true">i</span>已请求快捷指令，请在快捷指令中确认执行结果`;
      }
      notify(`${vehicle.shortName || vehicle.name} · 已请求${command.label}，请确认执行结果`);
    };
    const showShortcutRequestError = () => {
      cleanupShortcutListeners();
      button.classList.remove('is-sending');
      unlockButtons();
      if (feedback) {
        feedback.className = 'tesla-feedback is-error';
        feedback.innerHTML = `<span aria-hidden="true">!</span>未能请求快捷指令，请检查系统快捷指令是否存在：${escapeHTML(shortcutName)}`;
      }
      notify(`未能请求快捷指令：${shortcutName}`);
    };
    const handleShortcutVisibility = () => {
      if (document.visibilityState === 'hidden') {
        shortcutLeftPage = true;
      } else if (shortcutLeftPage) {
        showShortcutRequested();
      }
    };
    const handleShortcutPageHide = () => {
      shortcutLeftPage = true;
    };
    const handleShortcutPageShow = () => {
      if (shortcutLeftPage) showShortcutRequested();
    };

    if (!isAppleDevice()) {
      button.classList.remove('is-sending');
      unlockButtons();
      if (feedback) {
        feedback.className = 'tesla-feedback is-error';
        feedback.innerHTML = '<span aria-hidden="true">!</span>当前设备不支持系统快捷指令，请在 iPhone、iPad 或 Mac 上打开';
      }
      notify('当前设备不支持系统快捷指令');
      return;
    }

    teslaCommandCleanup = cleanupShortcutListeners;
    document.addEventListener('visibilitychange', handleShortcutVisibility);
    window.addEventListener('pagehide', handleShortcutPageHide);
    window.addEventListener('pageshow', handleShortcutPageShow);

    teslaCommandTimer = window.setTimeout(() => {
      showShortcutRequested();
    }, 900);

    try {
      window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}`;
    } catch (error) {
      showShortcutRequestError();
    }
  }

  function showTeslaControlPage(vehicleId) {
    const vehicle = getTeslaVehicle(vehicleId);
    const activeView = document.querySelector('.app-view.is-active');
    if (activeView && activeView.dataset.view !== 'tesla-control') {
      teslaReturnPage = activeView.dataset.view || 'home';
    }

    document.querySelectorAll('.app-view').forEach(view => {
      const isTesla = view.id === 'view-tesla-control';
      view.hidden = !isTesla;
      view.classList.toggle('is-active', isTesla);
      view.setAttribute('aria-hidden', String(!isTesla));
    });
    document.querySelectorAll('.nav-item').forEach(item => {
      const isTesla = item.dataset.page === 'tesla';
      item.classList.toggle('active', isTesla);
      if (isTesla) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    document.title = `${vehicle.name} · Tesla 控制`;
    renderTeslaControl(vehicle.id);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  }

  function closeTeslaControlPage() {
    if (teslaCommandCleanup) teslaCommandCleanup();
    window.location.hash = teslaReturnPage || 'tesla';
  }

  function openTeslaControl(vehicleId) {
    if (!(window.vehicleData || []).some(vehicle => vehicle.id === vehicleId)) return;
    window.location.hash = vehicleId;
  }

  function renderSmartHomePage() {
    const list = document.getElementById('smart-home-device-list');
    if (!list) return;

    const devices = Array.isArray(window.homeDevices) ? window.homeDevices : [];
    const coffeeMaker = devices.find(device => device.id === 'coffee-maker');
    const airConditioner = devices.find(device => device.id === 'air-conditioner');
    const doorLock = devices.find(device => device.id === 'door-lock');
    if (!coffeeMaker || !airConditioner || !doorLock) {
      list.innerHTML = '<p class="smart-home-empty">家居设备配置不完整，暂无法显示控制面板。</p>';
      return;
    }

    list.innerHTML = `
      <article class="smart-home-card smart-home-card-coffee" aria-labelledby="coffee-maker-title">
        <div class="smart-home-card-heading">
          <span class="smart-home-device-icon" aria-hidden="true">☕</span>
          <div>
            <h3 id="coffee-maker-title">${escapeHTML(coffeeMaker.name)}</h3>
            <p id="coffee-maker-connection" role="status" aria-live="polite">正在连接家居服务…</p>
          </div>
        </div>
        <div class="smart-home-power-row">
          <div>
            <strong id="coffee-maker-state">状态读取中</strong>
            <span id="coffee-maker-detail">开关将在确认设备在线后可用</span>
          </div>
          <button class="home-power-toggle is-unknown" id="coffee-maker-toggle" type="button" disabled aria-describedby="coffee-maker-state coffee-maker-detail">
            <span class="home-power-toggle-track" aria-hidden="true"><span></span></span>
            <span class="sr-only">咖啡机状态读取中</span>
          </button>
        </div>
      </article>
      <article class="smart-home-card" aria-labelledby="air-conditioner-title">
        <div class="smart-home-card-heading">
          <span class="smart-home-device-icon smart-home-device-icon-sky" aria-hidden="true">⌇</span>
          <div>
            <h3 id="air-conditioner-title">${escapeHTML(airConditioner.name)}</h3>
            <p><span class="smart-home-status-dot is-pending" aria-hidden="true"></span>待接入</p>
          </div>
        </div>
        <div class="smart-home-unavailable-row">
          <span>尚未连接控制服务，暂不显示实时状态。</span>
          <button type="button" disabled>控制不可用</button>
        </div>
      </article>
      <article class="smart-home-card" aria-labelledby="door-lock-title">
        <div class="smart-home-card-heading">
          <span class="smart-home-device-icon smart-home-device-icon-lavender" aria-hidden="true">⌑</span>
          <div>
            <h3 id="door-lock-title">${escapeHTML(doorLock.name)}</h3>
            <p><span class="smart-home-status-dot is-pending" aria-hidden="true"></span>待接入</p>
          </div>
        </div>
        <div class="smart-home-unavailable-row">
          <span>尚未连接控制服务，暂不显示实时状态。</span>
          <button type="button" disabled>控制不可用</button>
        </div>
      </article>
    `;

    const toggle = document.getElementById('coffee-maker-toggle');
    const state = document.getElementById('coffee-maker-state');
    const detail = document.getElementById('coffee-maker-detail');
    const connection = document.getElementById('coffee-maker-connection');
    let knownPower = null;
    let requestInFlight = false;

    const paintUnknown = message => {
      toggle.disabled = true;
      toggle.className = 'home-power-toggle is-unknown';
      toggle.removeAttribute('aria-pressed');
      toggle.querySelector('.sr-only').textContent = '咖啡机状态未确认，开关不可用';
      state.textContent = '状态未确认';
      detail.textContent = '未能确认设备当前开关，未执行本地模拟。';
      connection.textContent = message;
    };
    const paintPower = on => {
      knownPower = Boolean(on);
      toggle.disabled = false;
      toggle.className = `home-power-toggle ${knownPower ? 'is-on' : 'is-off'}`;
      toggle.setAttribute('aria-pressed', String(knownPower));
      toggle.querySelector('.sr-only').textContent = `咖啡机当前${knownPower ? '已开启，点按关闭' : '已关闭，点按开启'}`;
      state.textContent = knownPower ? '已开启' : '已关闭';
      detail.textContent = '可通过已连接的米家智能插座控制';
      connection.textContent = '已连接到家居服务';
    };
    const requestJSON = async (url, options) => {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
      let payload;
      try {
        payload = await response.json();
      } catch (error) {
        throw new Error('服务响应不可用');
      }
      if (!response.ok || !payload?.ok || typeof payload.on !== 'boolean') {
        throw new Error('家居服务暂不可用');
      }
      return payload;
    };
    const refreshStatus = async () => {
      try {
        const payload = await requestJSON('/api/status');
        paintPower(payload.on);
      } catch (error) {
        paintUnknown('未连接到家居服务');
      }
    };

    toggle.addEventListener('click', async () => {
      if (requestInFlight || knownPower === null) return;
      requestInFlight = true;
      toggle.disabled = true;
      connection.textContent = knownPower ? '正在关闭咖啡机…' : '正在开启咖啡机…';
      try {
        const payload = await requestJSON('/api/power', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: knownPower ? 'off' : 'on' })
        });
        paintPower(payload.on);
      } catch (error) {
        paintUnknown('控制未完成，未连接到家居服务');
      } finally {
        requestInFlight = false;
      }
    });

    refreshStatus();
  }

  function renderProfilePage() {
    const profile = document.getElementById('profile-page-panel');
    const settings = document.getElementById('settings-page-list');
    if (!profile || !settings) return;

    profile.innerHTML = `
      <div class="profile-avatar" aria-hidden="true">B</div>
      <div class="profile-copy">
        <strong>老板</strong>
        <span>个人 CEO 驾驶舱</span>
      </div>
      <span class="profile-status"><i aria-hidden="true"></i>运行正常</span>
    `;

    const settingItems = [
      { id: 'data-management', name: '数据管理', value: 'JSON 导入', symbol: '⇄', targetPage: 'data' },
      { id: 'data-connection', name: '数据连接', value: '模拟数据', symbol: '⌁' },
      { id: 'notification', name: '通知与提醒', value: '尚未接入', symbol: '◌' },
      { id: 'appearance', name: '外观模式', value: '深色', symbol: '◐' },
      { id: 'app', name: 'App 模式', value: 'PWA Standalone', symbol: '◇' }
    ];

    settings.innerHTML = settingItems.map(item => `
      <button class="settings-row page-action" type="button" data-id="${item.id}"${item.targetPage ? ` data-target-page="${item.targetPage}"` : ''}>
        <span class="settings-symbol" aria-hidden="true">${item.symbol}</span>
        <span class="settings-name">${item.name}</span>
        <span class="settings-value">${item.value}</span>
        <span class="page-row-arrow" aria-hidden="true">›</span>
      </button>
    `).join('');

    settings.querySelectorAll('.settings-row').forEach(row => {
      row.addEventListener('click', () => {
        if (row.dataset.targetPage) {
          window.location.hash = row.dataset.targetPage;
          return;
        }
        notify(`${row.querySelector('.settings-name').textContent}（预留）`);
      });
    });
  }

  function renderDataPage() {
    const panel = document.getElementById('data-import-panel');
    if (!panel) return;

    panel.innerHTML = `
      <p class="data-import-help">支持模块：<code>futuresData</code>、<code>vehicleData</code>、<code>accountData</code>、<code>positions</code>、<code>fileEntries</code>、<code>homeDevices</code>。</p>
      <textarea class="data-import-textarea" id="data-import-input" spellcheck="false" placeholder='粘贴 JSON，例如：{"positions":[{"code":"RB2610","direction":"多","quantity":6,"cost":2997.5,"currentPrice":3010,"floatingPnl":750,"target":3120,"stopLoss":2960,"plan":"目标 3120，止损 2960"}]}'></textarea>
      <div class="data-import-actions">
        <button class="data-import-button" type="button" id="data-import-submit">导入数据</button>
        <button class="data-import-secondary" type="button" id="data-export-copy">复制当前数据</button>
      </div>
      <p class="data-import-feedback" id="data-import-feedback" role="status" aria-live="polite">导入后会自动保存到本机。</p>
    `;

    const input = panel.querySelector('#data-import-input');
    const feedback = panel.querySelector('#data-import-feedback');
    panel.querySelector('#data-import-submit').addEventListener('click', () => {
      try {
        const modules = window.importBossData(input.value.trim());
        feedback.className = 'data-import-feedback is-success';
        feedback.textContent = `已导入 ${modules.join('、')}，首页数据已刷新。`;
      } catch (error) {
        feedback.className = 'data-import-feedback is-error';
        feedback.textContent = `导入失败：${error.message || 'JSON 格式不正确'}`;
      }
    });
    panel.querySelector('#data-export-copy').addEventListener('click', async () => {
      const json = window.BossData?.exportJSON?.() || '{}';
      try {
        await navigator.clipboard.writeText(json);
        feedback.className = 'data-import-feedback is-success';
        feedback.textContent = '当前数据已复制，可交给 AI 继续整理。';
      } catch (error) {
        input.value = json;
        feedback.className = 'data-import-feedback';
        feedback.textContent = '当前数据已填入输入框，请手动复制。';
      }
    });
  }

  function renderGptImportPage() {
    const input = document.getElementById('gpt-import-input');
    const feedback = document.getElementById('gpt-import-feedback');
    const submit = document.getElementById('gpt-import-submit');
    const sample = document.getElementById('gpt-import-sample');
    const clear = document.getElementById('gpt-import-clear');
    if (!input || !feedback || !submit) return;

    if (submit.dataset.bound === '1') return;
    submit.dataset.bound = '1';

    sample?.addEventListener('click', () => {
      input.value = window.GPTImport?.sampleFuturesJSON || '';
      feedback.className = 'gpt-import-feedback';
      feedback.textContent = '已填入示例，可直接点「一键更新行情」试跑。';
    });

    clear?.addEventListener('click', () => {
      input.value = '';
      feedback.className = 'gpt-import-feedback';
      feedback.textContent = '已清空。';
      input.focus();
    });

    submit.addEventListener('click', () => {
      try {
        if (!window.GPTImport?.apply) throw new Error('GPT 解析模块未加载。');
        const result = window.GPTImport.apply(input.value);
        feedback.className = 'gpt-import-feedback is-success';
        feedback.textContent = result.message || '更新成功。';
        notify(result.message || 'GPT 数据已更新');
        // 稍等事件刷新后回首页看「今日行情」
        window.setTimeout(() => {
          window.location.hash = 'home';
        }, 450);
      } catch (error) {
        feedback.className = 'gpt-import-feedback is-error';
        feedback.textContent = `更新失败：${error.message}`;
      }
    });
  }

  function renderPositionInputPage() {
    const panel = document.getElementById('position-input-panel');
    if (!panel) return;
    panel.innerHTML = `
      <p class="position-input-help">手动录入（保留）。只填合约代码和价格时，仅更新行情关注；方向、持仓数量、成本三项齐全时，同时新增或更新我的持仓。批量更新请用「GPT智能录入」。</p>
      <form class="position-input-form" id="position-input-form" autocomplete="off">
        <div class="position-input-form-grid">
          <label class="position-input-field">
            <span>合约代码 <em>*</em></span>
            <input name="code" type="text" maxlength="16" autocomplete="off" placeholder="例如 RB2610" required>
          </label>
          <label class="position-input-field">
            <span>价格 <em>*</em></span>
            <input name="price" type="number" inputmode="decimal" step="any" autocomplete="off" placeholder="例如 3015" required>
          </label>
          <label class="position-input-field">
            <span>方向</span>
            <input name="direction" type="text" maxlength="8" autocomplete="off" placeholder="多 / 空">
          </label>
          <label class="position-input-field">
            <span>持仓数量</span>
            <input name="quantity" type="number" inputmode="numeric" min="0" step="1" autocomplete="off" placeholder="例如 6">
          </label>
          <label class="position-input-field">
            <span>成本</span>
            <input name="cost" type="number" inputmode="decimal" step="any" autocomplete="off" placeholder="例如 2997.5">
          </label>
          <label class="position-input-field">
            <span>目标</span>
            <input name="target" type="number" inputmode="decimal" step="any" autocomplete="off" placeholder="可选">
          </label>
          <label class="position-input-field">
            <span>止损</span>
            <input name="stopLoss" type="number" inputmode="decimal" step="any" autocomplete="off" placeholder="可选">
          </label>
          <label class="position-input-field position-input-plan-field">
            <span>操作计划</span>
            <textarea name="plan" rows="3" maxlength="240" placeholder="可选，例如：目标 3120，止损 2960"></textarea>
          </label>
        </div>
        <button class="position-input-submit" type="submit">保存并返回持仓</button>
        <p class="position-input-feedback" id="position-input-feedback" role="status" aria-live="polite">数据会保存到本机，并返回我的持仓。</p>
      </form>
    `;
    const form = panel.querySelector('#position-input-form');
    const feedback = panel.querySelector('#position-input-feedback');
    form.addEventListener('submit', event => {
      event.preventDefault();
      try {
        const result = updatePositionFromForm(form);
        feedback.className = 'position-input-feedback is-success';
        feedback.textContent = result.positionUpdated
          ? `已更新行情，并保存 ${result.code} 持仓。`
          : `已更新 ${result.code} 行情，未修改 positions。`;
        window.location.hash = 'position';
      } catch (error) {
        feedback.className = 'position-input-feedback is-error';
        feedback.textContent = `录入失败：${error.message}`;
      }
    });
    window.setTimeout(() => form.reset(), 0);
  }

  function updatePositionFromForm(form) {
    const code = String(form.elements.code?.value || '').trim().toUpperCase();
    const priceText = String(form.elements.price?.value || '').trim();
    const direction = String(form.elements.direction?.value || '').trim();
    const quantityText = String(form.elements.quantity?.value || '').trim();
    const costText = String(form.elements.cost?.value || '').trim();
    const targetText = String(form.elements.target?.value || '').trim();
    const stopLossText = String(form.elements.stopLoss?.value || '').trim();
    const plan = String(form.elements.plan?.value || '').trim();
    if (!code) throw new Error('请填写合约代码。');
    if (!priceText || !Number.isFinite(Number(priceText))) throw new Error('请填写有效价格。');

    const price = Number(priceText);
    const positionFields = [direction, quantityText, costText];
    const hasAnyPositionField = positionFields.some(Boolean);
    const hasCompletePosition = positionFields.every(Boolean)
      && Number.isFinite(Number(quantityText))
      && Number.isFinite(Number(costText));
    if (hasAnyPositionField && !hasCompletePosition) {
      // 只要代码和价格有效，行情仍然可以更新；不完整的持仓字段不会写入 positions。
      const missing = [];
      if (!direction) missing.push('方向');
      if (!quantityText || !Number.isFinite(Number(quantityText))) missing.push('有效持仓数量');
      if (!costText || !Number.isFinite(Number(costText))) missing.push('有效成本');
      updatePositionQuote(code, price);
      throw new Error(`行情已更新，但持仓字段不完整（还需${missing.join('、')}），未修改 positions。`);
    }

    const parseOptionalNumber = (text, label) => {
      if (!text) return null;
      if (!Number.isFinite(Number(text))) throw new Error(`请填写有效${label}。`);
      return Number(text);
    };
    const target = hasCompletePosition ? parseOptionalNumber(targetText, '目标') : null;
    const stopLoss = hasCompletePosition ? parseOptionalNumber(stopLossText, '止损') : null;
    const currentQuotes = updatePositionQuote(code, price);
    if (!hasCompletePosition) return { code, positionUpdated: false, currentQuotes };

    const quantity = Number(quantityText);
    const cost = Number(costText);
    const currentPositions = Array.isArray(window.positions) ? [...window.positions] : [];
    const positionKey = item => `${String(item?.code || '').trim().toUpperCase()}::${String(item?.direction || '').trim().toUpperCase()}`;
    const key = `${code}::${direction.toUpperCase()}`;
    const existing = currentPositions.find(item => positionKey(item) === key);
    const nextPositions = currentPositions.filter(item => positionKey(item) !== key);

    // 数量为 0 表示平仓；仍保留本次行情更新，但不保留 0 手持仓卡片。
    if (quantity > 0) {
      nextPositions.push({
        code,
        direction,
        quantity,
        cost,
        currentPrice: price,
        floatingPnl: existing?.floatingPnl ?? null,
        target: target ?? existing?.target ?? null,
        stopLoss: stopLoss ?? existing?.stopLoss ?? null,
        plan: plan || existing?.plan || ''
      });
    }
    window.BossData.replace('positions', nextPositions);
    return { code, positionUpdated: true, currentQuotes };
  }

  function updatePositionQuote(code, price) {
    const currentQuotes = Array.isArray(window.futuresData) ? [...window.futuresData] : [];
    const nameByPrefix = { RB: '螺纹钢', JM: '焦煤', HC: '热卷', J: '焦炭', AU: '黄金', CU: '铜' };
    const unitByPrefix = { AU: '元/克' };
    const index = currentQuotes.findIndex(item => String(item?.code || '').trim().toUpperCase() === code);
    const prefix = code.match(/^[A-Z]+/)?.[0] || '';
    const existing = index >= 0 ? currentQuotes[index] : null;
    const quote = {
      code,
      name: existing?.name || nameByPrefix[prefix] || code,
      price,
      unit: existing?.unit || unitByPrefix[prefix] || '元/吨'
    };
    if (index >= 0) currentQuotes[index] = quote;
    else currentQuotes.push(quote);
    window.BossData.replace('futuresData', currentQuotes);
    return currentQuotes;
  }

  function renderMarketWatchPage() {
    const grid = document.getElementById('market-watch-grid');
    if (!grid) return;
    // 市场观察：排除已持仓合约，避免与「今日行情」重复
    const held = new Set(
      (Array.isArray(window.positions) ? window.positions : [])
        .filter(p => {
          const qty = Number(p?.quantity);
          const dir = String(p?.direction || '').trim();
          return (Number.isFinite(qty) && qty > 0) || Boolean(dir);
        })
        .map(p => String(p.code || '').trim().toUpperCase())
        .filter(Boolean)
    );
    const quotes = (Array.isArray(window.futuresData) ? window.futuresData : [])
      .filter(q => {
        const code = String(q?.code || '').trim().toUpperCase();
        return code && !held.has(code);
      });
    const tones = ['sand', 'lavender', 'sky', 'mint', 'peach'];
    const formatChange = change => {
      if (change === null || change === undefined || change === '') return null;
      const text = String(change).trim();
      if (!text || text === '—' || text === '-') return null;
      const num = Number(text.replace(/%/g, '').replace(/,/g, ''));
      const up = Number.isFinite(num) ? num >= 0 : !text.startsWith('-');
      return { text, up };
    };
    grid.innerHTML = quotes.length ? quotes.map((quote, index) => {
      const tone = tones[index % tones.length];
      const code = escapeHTML(quote?.code || '待补代码');
      const name = escapeHTML(quote?.name || '观察品种');
      const spark = typeof window.buildSparkline === 'function'
        ? window.buildSparkline(`${quote?.code || 'x'}-${quote?.price || 0}-${quote?.change || ''}`, {
            className: 'card-spark card-spark-market',
            tone,
            width: 200,
            height: 68,
            points: 15
          })
        : '';
      const ch = formatChange(quote?.change);
      const changeHtml = ch
        ? `<span class="market-watch-change ${ch.up ? 'is-up' : 'is-down'}">${escapeHTML(ch.text)}</span>`
        : `<span class="market-watch-change is-flat">—</span>`;
      const priceText = quote?.price !== null && quote?.price !== undefined && quote?.price !== '' && Number.isFinite(Number(quote.price))
        ? formatPagePrice(Number(quote.price))
        : '—';
      return `
      <article class="market-watch-card">
        ${spark}
        <div class="market-watch-card-head">
          <div><strong>${name}</strong><span>${code}</span></div>
          <span class="market-watch-unit">${escapeHTML(quote?.unit || '价格')}</span>
        </div>
        <strong class="market-watch-price">${priceText}</strong>
        <div class="market-watch-foot">${changeHtml}</div>
      </article>
    `;
    }).join('') : '<div class="market-watch-empty">暂无观察品种（已持仓合约不会出现在此）</div>';
  }

  function renderPositionPage() {
    const list = document.getElementById('position-page-list');
    if (!list) return;
    const positions = (window.positions || []).filter(position => Number(position.quantity) > 0);
    if (!positions.length) {
      list.innerHTML = '<div class="position-empty">暂无真实持仓</div>';
      return;
    }
    const positionNameByPrefix = {
      RB: '螺纹钢',
      JM: '焦煤',
      AU: '黄金',
      CU: '铜',
      HC: '热卷',
      J: '焦炭'
    };
    const formatPositionValue = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
      ? '—'
      : formatPagePrice(Number(value));

    list.innerHTML = positions.map(position => {
      const code = String(position.code || '—').trim().toUpperCase();
      const prefix = code.match(/^[A-Z]+/)?.[0] || '';
      const name = positionNameByPrefix[prefix] || code;
      const floatingPnl = Number(position.floatingPnl);
      const pnlText = Number.isFinite(floatingPnl)
        ? `${floatingPnl > 0 ? '+' : ''}¥${Math.abs(floatingPnl).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '—';
      const pnlClass = floatingPnl >= 0 ? 'position-pnl-up' : 'position-pnl-down';
      const direction = String(position.direction || '').toLowerCase();
      const directionClass = ['空', '空头', 'short', 'sell'].includes(direction) ? 'short' : 'long';
      const spark = typeof window.buildSparkline === 'function'
        ? window.buildSparkline(`${code}-${position.currentPrice}-${floatingPnl}`, {
            className: 'card-spark card-spark-position',
            tone: floatingPnl < 0 ? 'peach' : 'mint',
            width: 320,
            height: 80,
            points: 18
          })
        : '';
      return `
        <article class="position-card position-page-card">
          ${spark}
          <div class="position-contract-meta">
            <div class="position-field"><span class="position-label">合约名称</span><strong class="position-value">${escapeHTML(name)}</strong></div>
            <div class="position-field"><span class="position-label">合约代码</span><strong class="position-value">${escapeHTML(code)}</strong></div>
          </div>
          <div class="position-header">
            <span class="position-direction ${directionClass}">${escapeHTML(position.direction || '—')}</span>
          </div>
          <div class="position-grid">
            <div class="position-field"><span class="position-label">持仓数量</span><span class="position-value">${position.quantity || '—'} 手</span></div>
            <div class="position-field"><span class="position-label">成本</span><span class="position-value">${formatPositionValue(position.cost)}</span></div>
            <div class="position-field"><span class="position-label">当前价格</span><span class="position-value">${formatPositionValue(position.currentPrice)}</span></div>
            <div class="position-field"><span class="position-label">浮盈</span><span class="position-value ${Number.isFinite(floatingPnl) ? pnlClass : ''}">${pnlText}</span></div>
            <div class="position-field"><span class="position-label">目标</span><span class="position-value">${formatPositionValue(position.target)}</span></div>
            <div class="position-field"><span class="position-label">止损</span><span class="position-value">${formatPositionValue(position.stopLoss)}</span></div>
          </div>
          <div class="position-plan"><span class="position-label">操作计划</span><span class="position-value">${escapeHTML(position.plan || '—')}</span></div>
        </article>
      `;
    }).join('');
  }

  function setMarketWatchFormOpen(isOpen) {
    const form = document.getElementById('market-watch-add-form');
    const toggle = document.querySelector('[data-market-add-toggle]');
    if (!form || !toggle) return;
    form.hidden = !isOpen;
    toggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) form.querySelector('input[name="code"]')?.focus();
  }

  function saveMarketWatchContract(form) {
    const code = String(form.elements.code?.value || '').trim().toUpperCase();
    const name = String(form.elements.name?.value || '').trim();
    const unit = String(form.elements.unit?.value || '').trim();
    if (!code || !name || !unit) throw new Error('请完整填写合约代码、合约名称和单位。');

    const currentQuotes = Array.isArray(window.futuresData) ? [...window.futuresData] : [];
    if (currentQuotes.some(item => String(item?.code || '').trim().toUpperCase() === code)) {
      throw new Error('该合约代码已在关注列表中。');
    }

    const quote = {
      code,
      name,
      price: null,
      unit
    };
    window.BossData.replace('futuresData', [...currentQuotes, quote]);
    return quote;
  }

  function renderTradeDecisionPage() {
    const list = document.getElementById('trade-decision-list');
    if (!list) return;

    const decision = window.tradingDecision && typeof window.tradingDecision === 'object'
      ? window.tradingDecision
      : {};
    const weeklyPosition = decision.weeklyPosition ?? null;
    const hasValue = value => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.some(hasValue);
      if (typeof value === 'object') return Object.values(value).some(hasValue);
      return true;
    };
    const renderValue = value => {
      if (!hasValue(value)) return '<span class="trade-decision-missing">待录入</span>';
      if (Array.isArray(value)) {
        return `<ul class="trade-decision-values">${value.map(item => `<li>${renderValue(item)}</li>`).join('')}</ul>`;
      }
      if (typeof value === 'object') {
        return `<div class="trade-detail-list">${Object.entries(value).map(([key, item]) => `
          <div><span>${escapeHTML(key)}</span><div class="trade-decision-value">${renderValue(item)}</div></div>
        `).join('')}</div>`;
      }
      return `<span class="trade-decision-value">${escapeHTML(value)}</span>`;
    };
    const pickValue = (source, keys) => {
      if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
      const key = keys.find(name => hasValue(source[name]));
      return key ? source[key] : null;
    };
    const weeklyProductName = pickValue(weeklyPosition, ['name', 'variety', 'product', '品种名称', '品种']);
    const levelsProductName = decision.levels && typeof decision.levels === 'object' && !Array.isArray(decision.levels)
      ? Object.keys(decision.levels).find(hasValue) || null
      : null;
    const productName = hasValue(weeklyProductName) ? weeklyProductName : levelsProductName;
    const weeklyDirection = pickValue(weeklyPosition, ['direction', 'positionDirection', '方向']);
    const planForProduct = hasValue(productName)
      && decision.operationPlan
      && typeof decision.operationPlan === 'object'
      && !Array.isArray(decision.operationPlan)
      ? decision.operationPlan[productName]
      : null;
    const planDirection = pickValue(planForProduct, ['bias', 'direction', '方向']);
    const direction = hasValue(weeklyDirection) ? weeklyDirection : planDirection;
    const directionRaw = hasValue(direction) ? String(direction).trim() : '';
    const directionKey = directionRaw.toLowerCase();
    const longValues = new Set(['多', '多单', 'long', 'buy', '偏多']);
    const shortValues = new Set(['空', '空单', 'short', 'sell', '偏空']);
    const directionText = longValues.has(directionKey)
      ? '偏多'
      : (shortValues.has(directionKey) ? '偏空' : (directionRaw || '待录入'));
    const directionClass = shortValues.has(directionKey)
      ? 'is-short'
      : (longValues.has(directionKey) ? 'is-long' : 'is-neutral');
    const sections = [
      ['主力持仓', weeklyPosition],
      ['基本面', decision.fundamentals],
      ['关键位置', decision.levels],
      ['操作计划', decision.operationPlan]
    ];

    list.innerHTML = `
      <article class="trade-decision-card">
        <header class="trade-decision-hero">
          <div>
            <span class="trade-decision-eyebrow">交易决策</span>
            <h3>${hasValue(productName) ? escapeHTML(productName) : '待录入'}</h3>
          </div>
          <span class="trade-direction-badge ${directionClass}">${escapeHTML(directionText)}</span>
        </header>
        ${sections.map(([title, value]) => `
          <section class="trade-decision-block" aria-label="${title}">
            <h4>${title}</h4>
            ${renderValue(value)}
          </section>
        `).join('')}
      </article>
    `;
  }

  function renderAppPages(options = {}) {
    const changedModules = Array.isArray(options.changedModules) ? new Set(options.changedModules) : null;
    if (!changedModules || changedModules.has('vehicleData')) renderTeslaFleetPage();
    if (!changedModules || changedModules.has('homeDevices')) renderSmartHomePage();
    if (!changedModules) {
      renderProfilePage();
      renderDataPage();
      renderPositionInputPage();
      renderGptImportPage();
    }
    if (!changedModules || changedModules.has('positions')) renderPositionPage();
    if (!changedModules || changedModules.has('tradingDecision')) {
      renderTradeDecisionPage();
    }
    if (!changedModules || changedModules.has('futuresData') || changedModules.has('meta')) {
      renderMarketWatchPage();
      // 行情页副标题显示最近 GPT 更新时间
      const sub = document.getElementById('market-watch-subtitle');
      const meta = window.meta || {};
      if (sub && meta.lastGPTUpdateAt) {
        const t = new Date(meta.lastGPTUpdateAt);
        const label = Number.isNaN(t.getTime())
          ? meta.lastGPTUpdateAt
          : t.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        sub.textContent = `最近 GPT 更新：${label}`;
      }
    }
  }

  function initAppRouter() {
    if (appRouterInitialized) return;
    appRouterInitialized = true;
    document.querySelector('[data-tesla-back]')?.addEventListener('click', closeTeslaControlPage);
    document.querySelector('[data-position-input-back]')?.addEventListener('click', () => {
      window.location.hash = 'position';
    });
    document.querySelector('[data-position-back]')?.addEventListener('click', () => {
      window.location.hash = 'home';
    });
    document.querySelector('[data-position-input-from-page]')?.addEventListener('click', () => {
      renderPositionInputPage();
      window.location.hash = 'position-input';
    });
    document.querySelector('[data-gpt-import-back]')?.addEventListener('click', () => {
      window.location.hash = 'home';
    });
    document.querySelector('[data-trade-decision-back]')?.addEventListener('click', () => {
      window.location.hash = 'home';
    });
    document.addEventListener('click', event => {
      if (event.target.closest('[data-position-preview]')) window.location.hash = 'position';
      if (event.target.closest('[data-market-watch-card]')) window.location.hash = 'market-watch';
      if (event.target.closest('[data-gpt-import]')) {
        renderGptImportPage();
        window.location.hash = 'gpt-import';
      }
      if (event.target.closest('[data-trade-decision]')) window.location.hash = 'trade-decision';
    });
    document.querySelectorAll('[data-market-watch]').forEach(button => {
      button.addEventListener('click', () => {
        window.location.hash = 'market-watch';
      });
    });
    document.querySelector('[data-market-watch-back]')?.addEventListener('click', () => {
      window.location.hash = 'home';
    });
    document.querySelector('[data-market-add-toggle]')?.addEventListener('click', event => {
      const isOpen = event.currentTarget.getAttribute('aria-expanded') === 'true';
      setMarketWatchFormOpen(!isOpen);
    });
    document.querySelector('[data-market-add-cancel]')?.addEventListener('click', () => {
      const form = document.getElementById('market-watch-add-form');
      form?.reset();
      setMarketWatchFormOpen(false);
    });
    document.getElementById('market-watch-add-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const feedback = document.getElementById('market-watch-form-feedback');
      try {
        const quote = saveMarketWatchContract(form);
        form.reset();
        setMarketWatchFormOpen(false);
        if (feedback) {
          feedback.className = 'market-watch-form-feedback is-success';
          feedback.textContent = `已添加 ${quote.code}，行情列表已更新。`;
        }
      } catch (error) {
        if (feedback) {
          feedback.className = 'market-watch-form-feedback is-error';
          feedback.textContent = error.message;
        }
      }
    });

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        const targetHash = `#${page}`;
        if (window.location.hash === targetHash) {
          activateRoute(page);
        } else {
          window.location.hash = page;
        }
      });
    });

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#file') {
        window.history.replaceState(null, '', '#smart-home');
        activateRoute('smart-home');
        return;
      }
      if ((window.vehicleData || []).some(vehicle => vehicle.id === window.location.hash.slice(1))) {
        showTeslaControlPage(window.location.hash.slice(1));
        return;
      }
      activateRoute(getRouteFromHash());
    });

    const requestedHash = window.location.hash.slice(1);
    if ((window.vehicleData || []).some(vehicle => vehicle.id === requestedHash)) {
      activateRoute('tesla', { restoreScroll: false });
      window.setTimeout(() => showTeslaControlPage(requestedHash), 0);
      return;
    }
    const initialPage = getRouteFromHash();
    if (requestedHash === 'file') {
      window.history.replaceState(null, '', '#smart-home');
    } else if (!window.location.hash || !appRoutes.includes(requestedHash)) {
      window.history.replaceState(null, '', '#home');
    }
    activateRoute(initialPage, { restoreScroll: false });
  }

  window.renderAppPages = renderAppPages;
  window.initAppRouter = initAppRouter;
})();
