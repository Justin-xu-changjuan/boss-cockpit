/** 首页展示与全局轻交互。业务数据只读，不在首页修改。 */
(() => {
  let toastTimer = null;

  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);

  const formatPrice = value => {
    const price = Number(value);
    if (!Number.isFinite(price)) return '—';
    return price.toLocaleString('zh-CN', {
      maximumFractionDigits: price >= 10000 ? 0 : 1
    });
  };

  const formatMoney = value => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '—';
    return Math.abs(amount).toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  function initSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    window.setTimeout(() => splash.classList.add('is-hidden'), 900);
    window.setTimeout(() => splash.remove(), 1350);
  }

  function initHeader() {
    const dateElement = document.getElementById('header-date');
    const timeElement = document.getElementById('header-time');
    const welcomeElement = document.getElementById('welcome-text');
    if (!dateElement || !timeElement || !welcomeElement) return;

    const updateClock = () => {
      const now = new Date();
      dateElement.textContent = now.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
      timeElement.textContent = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const hour = now.getHours();
      let greeting = '晚上好，老板';
      if (hour >= 5 && hour < 11) greeting = '早上好，老板';
      else if (hour < 14) greeting = '中午好，老板';
      else if (hour < 18) greeting = '下午好，老板';
      welcomeElement.textContent = greeting;
    };

    updateClock();
    window.setInterval(updateClock, 60 * 1000);
  }

  function renderAccountOverview() {
    const container = document.getElementById('account-overview');
    if (!container) return;

    const account = window.accountData || {};
    const equity = Number(account.equity);
    const margin = Number(account.margin);
    const floatingPnl = Number(account.floatingPnl);
    const riskRatio = Number.isFinite(equity) && equity > 0 && Number.isFinite(margin)
      ? (margin / equity) * 100
      : null;
    const pnlClass = floatingPnl >= 0 ? 'account-value-up' : 'account-value-down';
    const pnlSign = floatingPnl > 0 ? '+' : (floatingPnl < 0 ? '-' : '');
    const formatAccountAmount = value => Number.isFinite(Number(value))
      ? `¥${formatMoney(value)}`
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
        <div><span>持仓保证金</span><strong>${formatAccountAmount(account.margin)}</strong></div>
        <div><span>总浮盈亏</span><strong class="${Number.isFinite(floatingPnl) ? pnlClass : ''}">${Number.isFinite(floatingPnl) ? `${pnlSign}¥${formatMoney(floatingPnl)}` : '待接入'}</strong></div>
        <div><span>风险比例</span><strong>${riskRatio === null ? '待接入' : `${riskRatio.toFixed(2)}%`}</strong></div>
      </div>
    `;
  }

  function renderHomeMarketPreview() {
    const grid = document.getElementById('home-futures-grid');
    if (!grid) return;
    const quotes = Array.isArray(window.futuresData) ? window.futuresData.slice(0, 4) : [];
    grid.innerHTML = quotes.length ? quotes.map(quote => {
      const code = escapeHTML(quote?.code || '待补代码');
      return `
        <button class="home-market-card" type="button" data-market-watch-card aria-label="查看行情 ${code}">
          <span class="home-market-card-top"><strong>${code}</strong><span>${escapeHTML(quote?.name || '关注合约')}</span></span>
          <span class="home-market-price">${formatPrice(quote?.price)}</span>
          <span class="home-market-unit">${escapeHTML(quote?.unit || '价格')}</span>
        </button>
      `;
    }).join('') : '<div class="market-watch-empty">暂无关注合约</div>';
  }

  function renderPositions() {
    const container = document.getElementById('position-list');
    if (!container) return;
    const positions = Array.isArray(window.positions)
      ? window.positions.filter(position => Number(position.quantity) > 0)
      : [];
    if (!positions.length) {
      container.innerHTML = '<div class="position-empty">暂无真实持仓</div>';
      return;
    }

    container.innerHTML = positions.map(position => {
      const direction = String(position.direction || '').trim();
      const isShort = ['空', '空头', 'short', 'sell'].includes(direction.toLowerCase());
      const floatingPnl = Number(position.floatingPnl);
      const pnlSign = floatingPnl > 0 ? '+' : (floatingPnl < 0 ? '-' : '');
      const pnlClass = floatingPnl >= 0 ? 'position-pnl-up' : 'position-pnl-down';
      const code = escapeHTML(position.code || '待补代码');
      return `
        <button class="position-card home-position-card" type="button" data-position-preview aria-label="查看持仓 ${code}">
          <span class="position-header">
            <strong class="position-name">${code}</strong>
            <span class="position-direction ${isShort ? 'short' : 'long'}">${escapeHTML(direction || '—')}</span>
          </span>
          <span class="position-grid">
            <span class="position-field"><span class="position-label">持仓数量</span><span class="position-value">${Number(position.quantity) || '—'} 手</span></span>
            <span class="position-field"><span class="position-label">成本</span><span class="position-value">${formatPrice(position.cost)}</span></span>
            <span class="position-field"><span class="position-label">当前价格</span><span class="position-value">${formatPrice(position.currentPrice)}</span></span>
            <span class="position-field"><span class="position-label">浮盈</span><span class="position-value ${Number.isFinite(floatingPnl) ? pnlClass : ''}">${Number.isFinite(floatingPnl) ? `${pnlSign}¥${formatMoney(floatingPnl)}` : '—'}</span></span>
            <span class="position-field"><span class="position-label">目标</span><span class="position-value">${formatPrice(position.target)}</span></span>
            <span class="position-field"><span class="position-label">止损</span><span class="position-value">${formatPrice(position.stopLoss)}</span></span>
          </span>
        </button>
      `;
    }).join('');
  }

  function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function initTouchFeedback() {
    document.addEventListener('touchstart', event => {
      const target = event.target.closest('button, .page-action');
      if (target && navigator.vibrate) navigator.vibrate(8);
    }, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initSplashScreen();
    initHeader();
    renderAccountOverview();
    renderHomeMarketPreview();
    renderPositions();
    window.renderAppPages?.();
    window.initAppRouter?.();
    initTouchFeedback();

    window.addEventListener('bossdatachange', event => {
      const changedModules = event.detail?.modules || [event.detail?.module].filter(Boolean);
      if (changedModules.includes('accountData')) renderAccountOverview();
      if (changedModules.includes('futuresData')) renderHomeMarketPreview();
      if (changedModules.includes('positions')) renderPositions();
      window.renderAppPages?.({ changedModules });
    });
  });

  window.showToast = showToast;
})();
