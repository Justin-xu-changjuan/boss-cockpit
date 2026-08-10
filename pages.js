/**
 * pages.js
 * -----------------------------------------
 * Boss Cockpit App 页面架构
 * - 管理五个底部 Tab 的显示、历史记录与滚动位置
 * - 使用独立数据模块渲染次级页面
 * - 后续真实接口接入时，只需替换数据服务，不需要重做页面结构
 */

(() => {
  const appRoutes = ['home', 'market-watch', 'tesla', 'file', 'me', 'data', 'position', 'position-input'];
  const routeTitles = {
    home: '老板驾驶舱',
    tesla: 'Tesla',
    file: '文件',
    me: '我的',
    data: '数据管理',
    position: '我的持仓',
    'position-input': '持仓智能录入',
    'market-watch': '行情关注'
  };
  const scrollPositions = new Map();
  let teslaCommandTimer = null;
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
    return appRoutes.includes(route) ? route : 'home';
  }

  function activateRoute(route, options = {}) {
    const targetPage = appRoutes.includes(route) ? route : 'home';
    const activeView = document.querySelector('.app-view.is-active');
    const targetView = document.getElementById(`view-${targetPage}`);
    if (!targetView) return;

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
      : (['position', 'position-input'].includes(targetPage) ? 'home' : targetPage);
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

  function isIOSDevice() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
    feedback.textContent = '点击按钮将调用 iOS 快捷指令';

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

    window.clearTimeout(teslaCommandTimer);
    relatedButtons().forEach(item => {
      item.disabled = true;
      item.classList.remove('is-complete');
    });
    button.classList.add('is-sending');
    if (feedback) {
      feedback.className = 'tesla-feedback is-sending';
      feedback.innerHTML = `<span class="tesla-feedback-spinner" aria-hidden="true"></span>正在执行快捷指令…`;
    }
    notify(`${vehicle.shortName || vehicle.name} · ${command.label}…`);

    let shortcutLeftPage = false;
    const cleanupShortcutListeners = () => {
      document.removeEventListener('visibilitychange', handleShortcutVisibility);
      window.removeEventListener('pagehide', handleShortcutPageHide);
      window.removeEventListener('pageshow', handleShortcutPageShow);
    };
    const unlockButtons = () => {
      relatedButtons().forEach(item => {
        item.disabled = false;
      });
    };
    const showShortcutSuccess = () => {
      cleanupShortcutListeners();
      button.classList.remove('is-sending');
      button.classList.add('is-complete');
      unlockButtons();
      if (feedback) {
        feedback.className = 'tesla-feedback is-complete';
        feedback.innerHTML = `<span aria-hidden="true">✓</span>${escapeHTML(vehicle.name)} · ${escapeHTML(command.label)}执行完成`;
      }
      notify(`${vehicle.shortName || vehicle.name} · ${command.label}完成`);
    };
    const showShortcutMissing = () => {
      cleanupShortcutListeners();
      button.classList.remove('is-sending');
      unlockButtons();
      if (feedback) {
        feedback.className = 'tesla-feedback is-error';
        feedback.innerHTML = `<span aria-hidden="true">!</span>请先创建对应快捷指令：${escapeHTML(shortcutName)}`;
      }
      notify(`请先创建快捷指令：${shortcutName}`);
    };
    const handleShortcutVisibility = () => {
      if (document.visibilityState === 'hidden') {
        shortcutLeftPage = true;
      } else if (shortcutLeftPage) {
        showShortcutSuccess();
      }
    };
    const handleShortcutPageHide = () => {
      shortcutLeftPage = true;
    };
    const handleShortcutPageShow = () => {
      if (shortcutLeftPage) showShortcutSuccess();
    };

    document.addEventListener('visibilitychange', handleShortcutVisibility);
    window.addEventListener('pagehide', handleShortcutPageHide);
    window.addEventListener('pageshow', handleShortcutPageShow);

    // 桌面预览环境不会处理 shortcuts://，直接展示缺少快捷指令的回退状态。
    if (!isIOSDevice()) {
      teslaCommandTimer = window.setTimeout(showShortcutMissing, 720);
      return;
    }

    teslaCommandTimer = window.setTimeout(() => {
      if (!shortcutLeftPage && document.visibilityState === 'visible') {
        showShortcutMissing();
      }
    }, 1400);

    try {
      window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}`;
    } catch (error) {
      showShortcutMissing();
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
    window.clearTimeout(teslaCommandTimer);
    window.location.hash = teslaReturnPage || 'tesla';
  }

  function openTeslaControl(vehicleId) {
    if (!(window.vehicleData || []).some(vehicle => vehicle.id === vehicleId)) return;
    window.location.hash = vehicleId;
  }

  function renderFilePage() {
    const list = document.getElementById('file-page-list');
    if (!list) return;

    const files = window.fileEntries || [];
    const symbols = { finance: '¥', contract: '✓', project: '◆', image: '▧' };
    const descriptions = {
      finance: '报表、凭证与经营数据',
      contract: '合同、协议与签署资料',
      project: '项目方案与推进文件',
      image: '企业图片与视觉资产'
    };

    list.innerHTML = `
      <div class="file-page-summary">
        <div>
          <span class="page-muted-label">企业资料中心</span>
          <strong>${files.length} 类资料</strong>
        </div>
        <span>最近访问：${escapeHTML(files[0]?.name || '暂无')}</span>
      </div>
      <div class="file-page-list">
        ${files.map(file => `
          <button class="page-file-row page-action" type="button" data-id="${escapeHTML(file.id)}">
            <span class="page-file-symbol" aria-hidden="true">${escapeHTML(symbols[file.id] || '•')}</span>
            <span class="page-file-copy">
              <strong>${escapeHTML(file.name)}</strong>
              <span>${escapeHTML(descriptions[file.id] || '企业资料')}</span>
            </span>
            <span class="page-row-arrow" aria-hidden="true">›</span>
          </button>
        `).join('')}
      </div>
    `;

    list.querySelectorAll('.page-file-row').forEach(row => {
      row.addEventListener('click', () => {
        const file = files.find(item => item.id === row.dataset.id);
        notify(`${file?.name || '文件'}（模拟入口）`);
      });
    });
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
      <p class="data-import-help">支持模块：<code>futuresData</code>、<code>vehicleData</code>、<code>accountData</code>、<code>positions</code>、<code>fileEntries</code>。</p>
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

  function renderPositionInputPage() {
    const panel = document.getElementById('position-input-panel');
    if (!panel) return;
    panel.innerHTML = `
      <p class="position-input-help">只填合约代码和价格时，仅更新行情关注；方向、持仓数量、成本三项齐全时，同时新增或更新我的持仓。目标、止损和操作计划为可选持仓字段。</p>
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
    const quotes = Array.isArray(window.futuresData) ? window.futuresData : [];
    const tones = ['sand', 'lavender', 'sky', 'mint', 'peach'];
    grid.innerHTML = quotes.length ? quotes.map((quote, index) => {
      const tone = tones[index % tones.length];
      const spark = typeof window.buildSparkline === 'function'
        ? window.buildSparkline(`${quote?.code || 'x'}-${quote?.price || 0}`, {
            className: 'card-spark card-spark-market',
            tone,
            width: 200,
            height: 68,
            points: 15
          })
        : '';
      return `
      <article class="market-watch-card">
        ${spark}
        <div class="market-watch-card-head">
          <div><strong>${escapeHTML(quote?.code || '待补代码')}</strong><span>${escapeHTML(quote?.name || '关注合约')}</span></div>
          <span class="market-watch-unit">${escapeHTML(quote?.unit || '价格')}</span>
        </div>
        <strong class="market-watch-price">${quote?.price !== null && quote?.price !== undefined && quote?.price !== '' && Number.isFinite(Number(quote.price)) ? formatPagePrice(Number(quote.price)) : '—'}</strong>
      </article>
    `;
    }).join('') : '<div class="market-watch-empty">暂无关注合约</div>';
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

  function renderAppPages(options = {}) {
    const changedModules = Array.isArray(options.changedModules) ? new Set(options.changedModules) : null;
    if (!changedModules || changedModules.has('vehicleData')) renderTeslaFleetPage();
    if (!changedModules || changedModules.has('fileEntries')) renderFilePage();
    if (!changedModules) {
      renderProfilePage();
      renderDataPage();
      renderPositionInputPage();
    }
    if (!changedModules || changedModules.has('positions')) renderPositionPage();
    if (!changedModules || changedModules.has('futuresData')) renderMarketWatchPage();
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
    document.addEventListener('click', event => {
      if (event.target.closest('[data-position-preview]')) window.location.hash = 'position';
      if (event.target.closest('[data-market-watch-card]')) window.location.hash = 'market-watch';
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
    const initialPage = appRoutes.includes(requestedHash) ? requestedHash : 'home';
    if (!window.location.hash || !appRoutes.includes(requestedHash)) {
      window.history.replaceState(null, '', '#home');
    }
    activateRoute(initialPage, { restoreScroll: false });
  }

  window.renderAppPages = renderAppPages;
  window.initAppRouter = initAppRouter;
})();
