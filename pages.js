/**
 * pages.js
 * -----------------------------------------
 * Boss Cockpit App 页面架构
 * - 管理五个底部 Tab 的显示、历史记录与滚动位置
 * - 使用独立数据模块渲染次级页面
 * - 后续真实接口接入时，只需替换数据服务，不需要重做页面结构
 */

(() => {
  const validPages = ['home', 'project', 'file', 'me', 'data'];
  const pageNames = {
    home: '老板驾驶舱',
    project: '项目',
    file: '文件',
    me: '我的',
    data: '数据管理'
  };
  const marketEntryConfig = {
    shortcutName: 'OpenWenhua',
    downloadUrl: 'https://app.wenhua.com.cn/download.html'
  };
  const scrollPositions = new Map();
  let marketLaunchInProgress = false;
  let teslaCommandTimer = null;
  let teslaReturnPage = 'home';

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

  function getPageFromHash() {
    const page = window.location.hash.replace('#', '');
    return validPages.includes(page) ? page : 'home';
  }

  function activateAppTab(page, options = {}) {
    const targetPage = validPages.includes(page) ? page : 'home';
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

    const activeTabPage = targetPage === 'data' ? 'me' : targetPage;
    document.querySelectorAll('.nav-item').forEach(item => {
      const isActive = item.dataset.page === activeTabPage;
      item.classList.toggle('active', isActive);
      if (isActive) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    document.title = targetPage === 'home'
      ? '老板驾驶舱'
      : `${pageNames[targetPage]} · 老板驾驶舱`;

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

  function closeMarketFallback() {
    document.getElementById('market-entry-sheet')?.remove();
  }

  function getTeslaVehicle(vehicleId) {
    const vehicles = window.vehicleData || [];
    return vehicles.find(vehicle => vehicle.id === vehicleId) || vehicles[0];
  }

  function renderTeslaControl(vehicleId) {
    const vehicle = getTeslaVehicle(vehicleId);
    const hero = document.getElementById('tesla-control-hero');
    const commandGrid = document.getElementById('tesla-command-grid');
    const feedback = document.getElementById('tesla-feedback');
    if (!hero || !commandGrid || !feedback) return;

    hero.innerHTML = `
      <div class="tesla-control-hero ${vehicle.tone}">
        <div class="tesla-control-vehicle-mark" aria-hidden="true">${vehicle.mark}</div>
        <div class="tesla-control-vehicle-copy">
          <span class="tesla-control-kicker">TESLA CONTROL</span>
          <h1>${vehicle.name}</h1>
          <span>${vehicle.colorName} · ${vehicle.status || '状态模拟'}</span>
        </div>
        <span class="tesla-online-badge"><i aria-hidden="true"></i>快捷指令</span>
      </div>
    `;

    commandGrid.innerHTML = (vehicle.controls || []).map(command => {
      return `
        <button class="tesla-command-button" type="button" data-command="${command.id}">
          <span class="tesla-command-icon" aria-hidden="true">${command.icon}</span>
          <span class="tesla-command-label">${command.label}</span>
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
    if (!feedback || !command || !shortcutName) return;

    window.clearTimeout(teslaCommandTimer);
    document.querySelectorAll('.tesla-command-button').forEach(item => {
      item.disabled = true;
      item.classList.remove('is-complete');
    });
    button.classList.add('is-sending');
    feedback.className = 'tesla-feedback is-sending';
    feedback.innerHTML = `<span class="tesla-feedback-spinner" aria-hidden="true"></span>正在执行快捷指令…`;

    let shortcutLeftPage = false;
    const cleanupShortcutListeners = () => {
      document.removeEventListener('visibilitychange', handleShortcutVisibility);
      window.removeEventListener('pagehide', handleShortcutPageHide);
      window.removeEventListener('pageshow', handleShortcutPageShow);
    };
    const unlockButtons = () => {
      document.querySelectorAll('.tesla-command-button').forEach(item => {
        item.disabled = false;
      });
    };
    const showShortcutSuccess = () => {
      cleanupShortcutListeners();
      button.classList.remove('is-sending');
      button.classList.add('is-complete');
      unlockButtons();
      feedback.className = 'tesla-feedback is-complete';
      feedback.innerHTML = `<span aria-hidden="true">✓</span>${vehicle.name} · ${command.label}执行完成`;
    };
    const showShortcutMissing = () => {
      cleanupShortcutListeners();
      button.classList.remove('is-sending');
      unlockButtons();
      feedback.className = 'tesla-feedback is-error';
      feedback.innerHTML = `<span aria-hidden="true">!</span>请先创建对应快捷指令：${shortcutName}`;
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

  function showTeslaPage(vehicleId) {
    const vehicle = getTeslaVehicle(vehicleId);
    const activeView = document.querySelector('.app-view.is-active');
    if (activeView && activeView.dataset.view !== 'tesla') {
      teslaReturnPage = activeView.dataset.view || 'home';
    }

    document.querySelectorAll('.app-view').forEach(view => {
      const isTesla = view.id === 'view-tesla';
      view.hidden = !isTesla;
      view.classList.toggle('is-active', isTesla);
      view.setAttribute('aria-hidden', String(!isTesla));
    });
    document.querySelectorAll('.nav-item').forEach(item => {
      const isHome = item.dataset.page === 'home';
      item.classList.toggle('active', isHome);
      if (isHome) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    document.title = `${vehicle.name} · Tesla 控制`;
    renderTeslaControl(vehicle.id);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  }

  function closeTeslaPage() {
    window.clearTimeout(teslaCommandTimer);
    window.location.hash = teslaReturnPage || 'home';
  }

  function openTeslaControl(vehicleId) {
    if (!(window.vehicleData || []).some(vehicle => vehicle.id === vehicleId)) return;
    window.location.hash = vehicleId;
  }

  function showMarketFallback() {
    closeMarketFallback();

    const sheet = document.createElement('div');
    sheet.id = 'market-entry-sheet';
    sheet.className = 'market-entry-backdrop';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'market-entry-title');
    sheet.innerHTML = `
      <div class="market-entry-sheet">
        <div class="market-entry-handle" aria-hidden="true"></div>
        <span class="market-entry-symbol" aria-hidden="true">↗</span>
        <h2 id="market-entry-title">请先创建对应快捷指令</h2>
        <p>快捷指令名称：${marketEntryConfig.shortcutName}<br>老板驾驶舱继续负责决策信息与持仓管理，实时行情交给专业交易软件。</p>
        <a class="market-entry-download" href="${marketEntryConfig.downloadUrl}" target="_blank" rel="noopener">
          查看文华财经随身行
        </a>
        <button class="market-entry-dismiss" type="button">返回驾驶舱</button>
      </div>
    `;
    document.body.appendChild(sheet);
    sheet.querySelector('.market-entry-dismiss').addEventListener('click', closeMarketFallback);
    sheet.addEventListener('click', event => {
      if (event.target === sheet) closeMarketFallback();
    });
  }

  function launchExternalMarket() {
    if (marketLaunchInProgress) return;
    marketLaunchInProgress = true;

    if (!isIOSDevice()) {
      showMarketFallback();
      marketLaunchInProgress = false;
      return;
    }

    let appWasOpened = false;
    const cleanup = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        appWasOpened = true;
        cleanup();
        marketLaunchInProgress = false;
      }
    };
    const handlePageHide = () => {
      appWasOpened = true;
      cleanup();
      marketLaunchInProgress = false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    window.setTimeout(() => {
      cleanup();
      marketLaunchInProgress = false;
      if (!appWasOpened && document.visibilityState === 'visible') {
        showMarketFallback();
      }
    }, 1100);

    try {
      window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(marketEntryConfig.shortcutName)}`;
    } catch (error) {
      showMarketFallback();
      cleanup();
      marketLaunchInProgress = false;
    }
  }

  function renderProjectPage() {
    const list = document.getElementById('project-page-list');
    if (!list) return;

    const projects = window.projects || [];
    list.innerHTML = projects.map(project => `
      <article class="page-project-card">
        <div class="page-project-heading">
          <div>
            <h3>${project.name}</h3>
            <span>${project.status}</span>
          </div>
          <span class="page-state-badge">${project.status || '推进中'}</span>
        </div>
        <div class="page-project-next">
          <span>下一步</span>
          <strong>${project.nextStep || '持续推进'}</strong>
        </div>
        <div class="page-progress-copy">
          <span>当前进度</span>
          <strong>${project.progress}%</strong>
        </div>
        <div class="page-progress-track" aria-label="项目进度 ${project.progress}%">
          <span style="width:${project.progress}%"></span>
        </div>
        <button class="page-project-action page-action" type="button" data-id="${project.id}">
          查看项目详情 <span aria-hidden="true">→</span>
        </button>
      </article>
    `).join('');

    list.querySelectorAll('.page-project-action').forEach(button => {
      button.addEventListener('click', () => notify('项目详情（模拟数据）'));
    });
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
        <span>最近访问：${files[0]?.name || '暂无'}</span>
      </div>
      <div class="file-page-list">
        ${files.map(file => `
          <button class="page-file-row page-action" type="button" data-id="${file.id}">
            <span class="page-file-symbol" aria-hidden="true">${symbols[file.id] || '•'}</span>
            <span class="page-file-copy">
              <strong>${file.name}</strong>
              <span>${descriptions[file.id] || '企业资料'}</span>
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
      <p class="data-import-help">支持模块：<code>futuresData</code>、<code>vehicleData</code>、<code>projectData</code>、<code>accountData</code>、<code>positions</code>、<code>tradeLog</code>，以及首页的重点和文件数据。</p>
      <textarea class="data-import-textarea" id="data-import-input" spellcheck="false" placeholder='粘贴 JSON，例如：{"positions":[{"code":"RB2610","direction":"多","quantity":6,"multiplier":10,"cost":2997.5}]}'></textarea>
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

  function renderAppPages(options = {}) {
    renderProjectPage();
    renderFilePage();
    renderProfilePage();
    if (!options.skipData) renderDataPage();
  }

  function initAppTabs() {
    document.querySelector('[data-tesla-back]')?.addEventListener('click', closeTeslaPage);

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page === 'market') {
          launchExternalMarket();
          return;
        }
        const targetHash = `#${page}`;
        if (window.location.hash === targetHash) {
          activateAppTab(page);
        } else {
          window.location.hash = page;
        }
      });
    });

    window.addEventListener('hashchange', () => {
      if ((window.vehicleData || []).some(vehicle => vehicle.id === window.location.hash.slice(1))) {
        showTeslaPage(window.location.hash.slice(1));
        return;
      }
      if (window.location.hash === '#market') {
        window.history.replaceState(null, '', `#${getPageFromHash()}`);
        launchExternalMarket();
        return;
      }
      activateAppTab(getPageFromHash());
    });

    const requestedHash = window.location.hash.slice(1);
    if ((window.vehicleData || []).some(vehicle => vehicle.id === requestedHash)) {
      window.history.replaceState(null, '', '#home');
      activateAppTab('home', { restoreScroll: false });
      window.setTimeout(() => showTeslaPage(requestedHash), 0);
      return;
    }
    const initialPage = validPages.includes(requestedHash) ? requestedHash : 'home';
    if (requestedHash === 'market') {
      window.history.replaceState(null, '', '#home');
      window.setTimeout(launchExternalMarket, 0);
    } else if (!window.location.hash || !validPages.includes(requestedHash)) {
      window.history.replaceState(null, '', '#home');
    }
    activateAppTab(initialPage, { restoreScroll: false });
  }

  window.renderAppPages = renderAppPages;
  window.initAppTabs = initAppTabs;
  window.activateAppTab = activateAppTab;
  window.openTeslaControl = openTeslaControl;
})();
