/**
 * script.js
 * 老板驾驶舱 - 主逻辑
 * 
 * 【未来扩展位置】
 * 1. Tesla 控制：快捷按钮 → iOS Shortcuts URL Scheme
 * 2. 行情接口：已在 futuresData.js 预留 getFutureQuotes()
 * 3. 数据库：data.js 中的数据可改为 API / IndexedDB
 * 4. AI助手：可接入 Grok / 其他大模型对话页
 */

document.addEventListener('DOMContentLoaded', () => {
  initSplashScreen();
  initHeader();
  renderOperatingStatus();
  renderAccountOverview();
  renderExecutiveDashboard();
  renderQuickActions();
  renderTodayFocus();
  renderFutures();
  renderPositions();
  renderTradeLog();
  renderProjects();
  renderFiles();
  window.renderAppPages?.();
  initBottomNav();
  initTouchFeedback();
  window.addEventListener('bossdatachange', () => {
    renderOperatingStatus();
    renderAccountOverview();
    renderExecutiveDashboard();
    renderTodayFocus();
    renderFutures();
    renderPositions();
    renderTradeLog();
    renderProjects();
    renderFiles();
    window.renderAppPages?.({ skipData: true });
  });
});

/* ========== App 启动层 ========== */
function initSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  window.setTimeout(() => {
    splash.classList.add('is-hidden');
  }, 900);

  window.setTimeout(() => {
    splash.remove();
  }, 1350);
}

/* ========== 顶部：日期 + 欢迎语 ========== */
function initHeader() {
  const dateEl = document.getElementById('header-date');
  const timeEl = document.getElementById('header-time');
  const welcomeEl = document.getElementById('welcome-text');

  const updateClock = () => {
    const now = new Date();
    const options = { month: 'long', day: 'numeric', weekday: 'long' };
    dateEl.textContent = now.toLocaleDateString('zh-CN', options);
    timeEl.textContent = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const hour = now.getHours();
    let greeting = '晚上好，老板';
    if (hour >= 5 && hour < 11) greeting = '早上好，老板';
    else if (hour >= 11 && hour < 14) greeting = '中午好，老板';
    else if (hour >= 14 && hour < 18) greeting = '下午好，老板';

    welcomeEl.textContent = greeting;
  };

  updateClock();
  window.setInterval(updateClock, 60 * 1000);
}

/* ========== 首屏：核心经营状态 ========== */
function renderOperatingStatus() {
  const container = document.getElementById('operating-status-grid');
  if (!container) return;

  const futures = window.futureData || [];
  const projects = window.projects || [];
  const focusItems = window.todayFocus || [];
  const upCount = futures.filter(item => item.change >= 0).length;
  const downCount = futures.length - upCount;
  const riskCount = focusItems.filter(item => item.priority === 'high').length;
  const investmentState = upCount > downCount ? '整体偏强' : '震荡观察';
  const operatingState = riskCount <= 2 ? '运行正常' : '需重点关注';

  container.innerHTML = `
    <article class="command-status-card">
      <div class="command-status-hero">
        <div class="status-orbit" aria-hidden="true">
          <span class="status-orbit-core"></span>
          <span class="status-orbit-ring"></span>
        </div>
        <div class="command-status-copy">
          <span class="command-status-eyebrow">TODAY'S OVERVIEW</span>
          <strong>企业运行正常</strong>
          <span>${riskCount} 项重点事项处于关注中</span>
        </div>
      </div>
      <div class="command-status-list">
        <div class="command-status-row">
          <span>企业状态</span>
          <strong>${operatingState}</strong>
          <i class="status-indicator healthy" aria-hidden="true"></i>
        </div>
        <div class="command-status-row">
          <span>投资状态</span>
          <strong>${investmentState} · ${upCount} 涨 ${downCount} 跌</strong>
          <i class="status-indicator watch" aria-hidden="true"></i>
        </div>
        <div class="command-status-row">
          <span>项目状态</span>
          <strong>${projects.length} 项推进中</strong>
          <i class="status-indicator active" aria-hidden="true"></i>
        </div>
      </div>
    </article>
  `;
}

/* ========== CEO 仪表盘 ========== */
function renderExecutiveDashboard() {
  const container = document.getElementById('executive-dashboard');
  if (!container) return;

  const projects = window.projects || [];
  const aiProject = projects.find(project => project.name.includes('AI'));
  const titaniumProject = projects.find(project => project.name.includes('钛粉'));
  const resources = [
    { name: '资产', value: '数据待接入', state: '待连接', tone: 'pending', icon: '◇' },
    { name: '项目', value: `${projects.length} 个推进中`, state: '进行中', tone: 'active', icon: '◆' },
    { name: '电力资源', value: '数据待接入', state: '待连接', tone: 'pending', icon: 'ϟ' },
    { name: 'AI 算力项目', value: aiProject?.status || '待补充', state: '重点', tone: 'focus', icon: 'AI' },
    { name: '钛粉项目', value: titaniumProject?.status || '待补充', state: '跟进', tone: 'active', icon: 'Ti' }
  ];

  container.innerHTML = resources.map(resource => `
    <article class="resource-card">
      <div class="resource-card-top">
        <span class="resource-icon" aria-hidden="true">${resource.icon}</span>
        <span class="resource-state ${resource.tone}">${resource.state}</span>
      </div>
      <span class="resource-name">${resource.name}</span>
      <strong class="resource-value">${resource.value}</strong>
    </article>
  `).join('');
}

/* ========== 模块1：快捷控制 ========== */
function renderQuickActions() {
  const container = document.getElementById('quick-grid');
  if (!container || !window.quickActions) return;

  const descriptions = {
    tesla: '车辆与场景控制',
    image: '图片资产中心',
    file: '资料快速访问',
    ai: '智能决策助手',
    data: '经营数据洞察',
    setting: '系统与偏好设置'
  };

  container.innerHTML = window.quickActions.map(item => {
    if (item.id === 'tesla') {
      return (window.vehicleData || []).map(vehicle => `
        <button class="quick-btn tesla-vehicle-card tesla-${vehicle.tone || 'default'}" type="button" data-vehicle="${vehicle.id}">
          <span class="tesla-vehicle-mark" aria-hidden="true">${vehicle.mark || 'T'}</span>
          <span class="quick-copy">
            <span class="label">${vehicle.shortName || vehicle.name}</span>
            <span class="quick-meta"><i aria-hidden="true"></i>${vehicle.colorName || ''} · ${vehicle.status || '状态模拟'}</span>
          </span>
          <span class="quick-arrow" aria-hidden="true">↗</span>
        </button>
      `).join('');
    }

    return `
      <button class="quick-btn" type="button"
              data-action="${item.action}" 
              data-id="${item.id}">
        <span class="quick-icon" aria-hidden="true">${item.icon}</span>
        <span class="quick-copy">
          <span class="label">${item.name}</span>
          <span class="quick-meta">${descriptions[item.action] || '快速入口'}</span>
        </span>
        <span class="quick-arrow" aria-hidden="true">↗</span>
      </button>
    `;
  }).join('');

  // 事件绑定
  container.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.vehicle) {
        window.openTeslaControl?.(btn.dataset.vehicle);
        return;
      }
      const action = btn.dataset.action;
      handleQuickAction(action);
    });
  });
}

/**
 * 快捷控制处理
 * 【Tesla 控制执行方式】
 * Tesla 不连接API，车辆控制由 pages.js 调用 iOS Shortcuts 完成。
 */
function handleQuickAction(action) {
  const messages = {
    tesla: '🚗 Tesla 控制（请从车辆卡片进入）',
    image: '📷 图片管理（即将上线）',
    file: '📁 文件管理（即将上线）',
    ai: '🤖 AI助手（即将上线）',
    data: '📊 数据分析（即将上线）',
    setting: '⚙️ 设置中心（即将上线）'
  };
  showToast(messages[action] || '功能开发中');
}

/* ========== 模块2：今日概览 ========== */
function renderTodayFocus() {
  const list = document.getElementById('focus-list');
  if (!list || !window.todayFocus) return;

  list.innerHTML = window.todayFocus.map(item => `
    <li class="focus-item">
      <span class="focus-dot ${item.priority}"></span>
      <span class="focus-text">${item.text}</span>
    </li>
  `).join('');
}

/* ========== 模块3：期货行情 ========== */
async function renderFutures() {
  const grid = document.getElementById('futures-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading">加载行情中...</div>';

  try {
    // 【行情接口位置】调用 futuresData.js 中的方法
    const data = await window.getFutureQuotes();

    const renderMiniCard = item => {
      const isUp = item.change >= 0;
      const changeClass = isUp ? 'up' : 'down';
      const sign = isUp ? '+' : '';
      const trend = isUp ? '偏强' : '承压';
      return `
        <article class="future-card market-mini" data-id="${item.id}">
          <div class="market-mini-head">
            <div>
              <span class="future-name">${item.name}</span>
              <span class="future-code">${item.code}</span>
            </div>
            <span class="trend-badge ${changeClass}">${trend}</span>
          </div>
          <strong class="market-mini-price">${formatPrice(item.price)}</strong>
          <div class="market-mini-change ${changeClass}">
            <span>${sign}${item.change}</span>
            <span>${sign}${item.changePercent.toFixed(2)}%</span>
          </div>
        </article>
      `;
    };

    const primary = data[0];
    const position = (window.positions || []).find(pos => (
      pos.code === primary.code || pos.name === primary.name
    ));
    const isUp = primary.change >= 0;
    const changeClass = isUp ? 'up' : 'down';
    const sign = isUp ? '+' : '';
    const riskIsNormal = !position || (
      position.direction === '多'
        ? primary.price > position.stopLoss
        : primary.price < position.stopLoss
    );

    grid.innerHTML = `
      <article class="future-card market-featured" data-id="${primary.id}">
        <div class="market-featured-head">
          <div>
            <span class="market-featured-code">${primary.code}</span>
            <span class="future-name">${primary.name}</span>
          </div>
          <span class="market-live"><i aria-hidden="true"></i> MARKET</span>
        </div>
        <div class="market-featured-quote">
          <strong class="future-price">${formatPrice(primary.price)}</strong>
          <div class="future-change ${changeClass}">
            <span>${isUp ? '↑' : '↓'} ${sign}${primary.change}</span>
            <span>${sign}${primary.changePercent.toFixed(2)}%</span>
          </div>
        </div>
        <div class="market-position-summary">
          <div><span>持仓</span><strong>${position ? `${position.direction}头持仓` : '保持观察'}</strong></div>
          <div><span>成本</span><strong>${position ? formatPrice(position.cost) : '—'}</strong></div>
          <div><span>风险</span><strong class="${riskIsNormal ? 'risk-normal' : 'risk-alert'}">${riskIsNormal ? '正常' : '预警'}</strong></div>
        </div>
        <div class="market-strategy">
          <span>我的策略</span>
          <strong>${position ? `目标 ${formatPrice(position.target)} · 止损 ${formatPrice(position.stopLoss)}` : '保持观察'}</strong>
        </div>
      </article>
      <div class="market-carousel" aria-label="其他行情，横向滑动">
        ${data.slice(1).map(renderMiniCard).join('')}
      </div>
    `;

    // 点击卡片反馈
    grid.querySelectorAll('.future-card').forEach(card => {
      card.addEventListener('click', () => {
        showToast(`${card.querySelector('.future-name').textContent} 详情（预留）`);
      });
    });
  } catch (err) {
    grid.innerHTML = '<div class="loading">行情加载失败</div>';
    console.error(err);
  }
}

function formatPrice(price) {
  if (price >= 10000) {
    return price.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  }
  return price.toLocaleString('zh-CN', { maximumFractionDigits: 1 });
}

function formatMoney(amount) {
  return Math.abs(Number(amount) || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function calculatePositionPnl(pos, quotes = (window.futuresData || window.futureData || [])) {
  const direction = String(pos.direction || '').toLowerCase();
  const isShort = ['空', '空头', 'short', 'sell'].includes(direction);
  const quote = quotes.find(item => item.code === pos.code || item.name === pos.name);
  const currentPrice = Number(pos.currentPrice ?? quote?.price);
  const quantity = Number(pos.quantity ?? pos.lots ?? 0);
  const multiplier = Number(pos.multiplier ?? (pos.code === 'RB2610' ? 10 : 1));
  if (!Number.isFinite(currentPrice) || !Number.isFinite(Number(pos.cost))) return 0;
  return (isShort ? Number(pos.cost) - currentPrice : currentPrice - Number(pos.cost)) * multiplier * quantity;
}

function renderAccountOverview() {
  const container = document.getElementById('account-overview');
  if (!container) return;

  const account = window.accountData || {};
  const totalFloatingPnl = (window.positions || [])
    .reduce((total, position) => total + calculatePositionPnl(position), 0);
  const equity = Number(account.equity);
  const margin = Number(account.margin ?? account.occupiedMargin);
  const riskRatio = Number.isFinite(equity) && equity > 0 && Number.isFinite(margin)
    ? (margin / equity) * 100
    : null;
  const pnlClass = totalFloatingPnl >= 0 ? 'account-value-up' : 'account-value-down';
  const pnlSign = totalFloatingPnl >= 0 ? '+' : '-';
  const formatAccountAmount = value => Number.isFinite(Number(value))
    ? `¥${formatMoney(Number(value))}`
    : '待接入';

  container.innerHTML = `
    <div class="account-equity-row">
      <div>
        <span class="account-label">账户权益</span>
        <strong class="account-equity-value">${formatAccountAmount(account.equity)}</strong>
      </div>
      <span class="account-status-dot"><i aria-hidden="true"></i>运行正常</span>
    </div>
    <div class="account-metric-grid">
      <div><span>可用资金</span><strong>${formatAccountAmount(account.availableFunds)}</strong></div>
      <div><span>持仓保证金</span><strong>${formatAccountAmount(account.margin ?? account.occupiedMargin)}</strong></div>
      <div><span>总浮盈亏</span><strong class="${pnlClass}">${pnlSign}¥${formatMoney(totalFloatingPnl)}</strong></div>
      <div><span>风险比例</span><strong>${riskRatio === null ? '待接入' : `${riskRatio.toFixed(2)}%`}</strong></div>
    </div>
  `;
}

/* ========== 模块4：持仓观察 ========== */
function renderPositions() {
  const container = document.getElementById('position-list');
  if (!container || !window.positions) return;

  const quotes = window.futuresData || window.futureData || [];
  container.innerHTML = window.positions.map(pos => {
    const direction = String(pos.direction || '').toLowerCase();
    const isShort = ['空', '空头', 'short', 'sell'].includes(direction);
    const dirClass = isShort ? 'short' : 'long';
    const quote = quotes.find(item => item.code === pos.code || item.name === pos.name);
    const currentPrice = Number(pos.currentPrice ?? quote?.price);
    const quantity = Number(pos.quantity ?? pos.lots ?? 0);
    const floatingPnl = calculatePositionPnl(pos, quotes);
    const pnlClass = floatingPnl >= 0 ? 'position-pnl-up' : 'position-pnl-down';
    const pnlSign = floatingPnl > 0 ? '+' : '';
    const plan = pos.plan || pos.note || '保持观察';
    return `
      <div class="position-card">
        <div class="position-header">
          <div class="position-name">${pos.name} <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">${pos.code}</span></div>
          <span class="position-direction ${dirClass}">${pos.direction}</span>
        </div>
        <div class="position-grid">
          <div class="position-field">
            <span class="position-label">当前价格</span>
            <span class="position-value">${Number.isFinite(currentPrice) ? formatPrice(currentPrice) : '—'}</span>
          </div>
          <div class="position-field">
            <span class="position-label">持仓数量</span>
            <span class="position-value">${quantity || '—'} 手</span>
          </div>
          <div class="position-field">
            <span class="position-label">成本</span>
            <span class="position-value">${Number.isFinite(Number(pos.cost)) ? formatPrice(Number(pos.cost)) : '—'}</span>
          </div>
          <div class="position-field">
            <span class="position-label">浮盈亏金额</span>
            <span class="position-value ${pnlClass}">${pnlSign}¥${formatMoney(floatingPnl)}</span>
          </div>
          <div class="position-field">
            <span class="position-label">目标</span>
            <span class="position-value">${pos.target ?? '—'}</span>
          </div>
          <div class="position-field">
            <span class="position-label">止损</span>
            <span class="position-value">${pos.stopLoss ?? '—'}</span>
          </div>
        </div>
        <div class="position-note"><span>操作计划</span>${plan}</div>
      </div>
    `;
  }).join('');
}

/* ========== 模块5：交易日志 ========== */
function renderTradeLog() {
  const container = document.getElementById('trade-log-list');
  if (!container) return;

  const logs = window.tradeLog || [];
  if (!logs.length) {
    container.innerHTML = '<div class="trade-log-empty">暂无交易记录</div>';
    return;
  }

  container.innerHTML = logs.slice(0, 5).map(log => {
    const directionClass = ['空', '空头', 'short', 'sell'].includes(String(log.direction || '').toLowerCase()) ? 'short' : 'long';
    const price = Number(log.price);
    return `
      <article class="trade-log-card">
        <div class="trade-log-head">
          <div>
            <strong>${log.symbol || log.code || '未命名品种'}</strong>
            <span>${log.date || '日期待补充'}</span>
          </div>
          <span class="trade-log-direction ${directionClass}">${log.direction || '—'}</span>
        </div>
        <div class="trade-log-metrics">
          <div><span>价格</span><strong>${Number.isFinite(price) ? formatPrice(price) : '—'}</strong></div>
          <div><span>数量</span><strong>${log.quantity ?? '—'} 手</strong></div>
          <div><span>操作</span><strong>${log.action || '—'}</strong></div>
        </div>
        <div class="trade-log-reason"><span>原因</span>${log.reason || '—'}</div>
        ${log.note ? `<div class="trade-log-note">${log.note}</div>` : ''}
      </article>
    `;
  }).join('');
}

/* ========== 模块5：企业项目 ========== */
function renderProjects() {
  const container = document.getElementById('project-list');
  if (!container || !window.projects) return;

  container.innerHTML = window.projects.map(proj => {
    const progress = Math.max(0, Math.min(100, Number(proj.progress) || 0));
    return `
    <article class="project-card">
      <div class="project-card-head">
        <div>
          <span class="project-kicker">KEY PROJECT</span>
          <div class="project-name">${proj.name}</div>
        </div>
        <span class="project-live-state">${proj.status || '推进中'}</span>
      </div>
      <div class="project-details">
        <div><span>阶段</span><strong>${proj.status}</strong></div>
        <div><span>进度</span><strong>${progress}%</strong></div>
        <div><span>下一步</span><strong>${proj.nextStep || '持续推进'}</strong></div>
      </div>
      <div class="project-progress" aria-label="进度 ${progress}%">
        <span style="width:${progress}%"></span>
      </div>
      <button class="btn-detail" data-id="${proj.id}">查看项目 <span aria-hidden="true">→</span></button>
    </article>
  `;
  }).join('');

  container.querySelectorAll('.btn-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('项目详情页（预留）');
    });
  });
}

/* ========== 模块6：文件入口 ========== */
function renderFiles() {
  const container = document.getElementById('file-grid');
  if (!container || !window.fileEntries) return;

  const recentFile = window.fileEntries[0];
  const fileSymbols = {
    finance: '¥',
    contract: '✓',
    project: '◆',
    image: '▧'
  };

  container.innerHTML = `
    <div class="document-center">
      <div class="document-overview">
        <div class="document-center-mark" aria-hidden="true">▱</div>
        <div>
          <span>最近访问</span>
          <strong>${recentFile?.name || '暂无记录'}</strong>
        </div>
        <span class="document-count">${window.fileEntries.length} 类资料</span>
      </div>
      <div class="document-category-list">
        ${window.fileEntries.map(file => `
          <a href="${file.path}" class="file-item" data-id="${file.id}">
            <span class="file-icon" aria-hidden="true">${fileSymbols[file.id] || '•'}</span>
            <span class="file-name">${file.name}</span>
            <span class="file-arrow" aria-hidden="true">›</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      showToast(`${item.querySelector('.file-name').textContent}（预留链接）`);
    });
  });
}

/* ========== 底部导航 ========== */
function initBottomNav() {
  window.initAppTabs?.();
}

/* ========== Toast ========== */
let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.classList.add('show');
  
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

/* ========== 触感反馈增强（可选） ========== */
function initTouchFeedback() {
  // 简单震动反馈（支持的设备）
  document.querySelectorAll('.quick-btn, .future-card, .btn-detail, .file-item, .nav-item, .page-action').forEach(el => {
    el.addEventListener('touchstart', () => {
      if (navigator.vibrate) {
        navigator.vibrate(8);
      }
    }, { passive: true });
  });
}

/* ========== 工具：刷新行情（未来可接定时器） ========== */
function refreshFutures() {
  renderFutures();
}

// 暴露给控制台方便调试
window.refreshFutures = refreshFutures;
window.showToast = showToast;
