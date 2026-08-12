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

  /**
   * 生成柔和 sparkline 装饰（确定性伪走势，不依赖真实历史数据）
   * tone: mint | lavender | sky | peach | sand
   */
  function buildSparkline(seedText, options = {}) {
    const {
      points = 18,
      width = 240,
      height = 72,
      tone = 'mint',
      className = 'card-spark'
    } = options;
    const seed = String(seedText || 'spark').split('').reduce((sum, ch, i) => sum + ch.charCodeAt(0) * (i + 3), 0);
    const values = [];
    let v = 0.45 + ((seed % 30) / 100);
    for (let i = 0; i < points; i += 1) {
      const wave = Math.sin((i + seed * 0.07) * 0.55) * 0.14;
      const drift = ((seed >> (i % 5)) & 3) * 0.02 - 0.03;
      v = Math.min(0.92, Math.max(0.12, v + wave * 0.35 + drift));
      values.push(v);
    }
    const stepX = width / Math.max(points - 1, 1);
    const coords = values.map((val, i) => {
      const x = i * stepX;
      const y = height - val * (height * 0.78) - height * 0.1;
      return [x, y];
    });
    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const area = `${line} L${width} ${height} L0 ${height} Z`;
    const gradId = `sg-${Math.abs(seed)}-${points}-${tone}`;
    const palettes = {
      mint: { stroke: '#4FA87A', fillA: 'rgba(79,168,122,0.42)', fillB: 'rgba(79,168,122,0.04)' },
      lavender: { stroke: '#8B74D6', fillA: 'rgba(139,116,214,0.40)', fillB: 'rgba(139,116,214,0.04)' },
      sky: { stroke: '#5AA3C8', fillA: 'rgba(90,163,200,0.40)', fillB: 'rgba(90,163,200,0.04)' },
      peach: { stroke: '#D4895C', fillA: 'rgba(212,137,92,0.40)', fillB: 'rgba(212,137,92,0.04)' },
      sand: { stroke: '#B89A6A', fillA: 'rgba(184,154,106,0.36)', fillB: 'rgba(184,154,106,0.04)' }
    };
    const p = palettes[tone] || palettes.mint;
    const last = coords[coords.length - 1] || [width, height / 2];
    return `
      <svg class="${className}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${p.fillA}"/>
            <stop offset="100%" stop-color="${p.fillB}"/>
          </linearGradient>
        </defs>
        <path d="${area}" fill="url(#${gradId})"></path>
        <path d="${line}" fill="none" stroke="${p.stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"></path>
        <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" fill="${p.stroke}" opacity="0.95"></circle>
      </svg>
    `;
  }

  function renderAccountOverview() {
    const container = document.getElementById('account-overview');
    if (!container) return;

    const account = window.accountData || {};
    const toOptionalNumber = value => {
      if (value === null || value === undefined || value === '') return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };
    const equity = toOptionalNumber(account.equity);
    const capital = toOptionalNumber(account.capital);
    const margin = toOptionalNumber(account.margin);
    const availableFunds = toOptionalNumber(account.availableFunds);
    // 累计盈亏 = 账户权益 - 本金（优先用规范化后的 profit）
    const normalizedProfit = toOptionalNumber(account.profit);
    const profit = normalizedProfit !== null
      ? normalizedProfit
      : (equity !== null && capital !== null ? equity - capital : null);
    // 风险占用率 = 持仓保证金 ÷ 账户权益
    const normalizedRiskRate = toOptionalNumber(account.risk_rate);
    const riskRate = normalizedRiskRate !== null
      ? normalizedRiskRate * (normalizedRiskRate <= 1 ? 100 : 1)
      : (equity !== null && equity > 0 && margin !== null ? (margin / equity) * 100 : null);

    const pnlClass = profit !== null
      ? (profit >= 0 ? 'account-value-up' : 'account-value-down')
      : '';
    const pnlSign = profit > 0 ? '+' : (profit < 0 ? '-' : '');
    const formatAccountAmount = value => toOptionalNumber(value) !== null
      ? `¥${formatMoney(value)}`
      : '暂无数据';
    const sparkTone = profit !== null && profit < 0 ? 'peach' : 'mint';
    const riskText = riskRate === null || !Number.isFinite(riskRate)
      ? '暂无数据'
      : `${riskRate.toFixed(2)}%`;

    container.innerHTML = `
      ${buildSparkline(`equity-${equity}-${profit}`, { className: 'card-spark card-spark-account', tone: sparkTone, width: 360, height: 96, points: 22 })}
      <div class="account-equity-row">
        <div>
          <span class="account-label">账户权益</span>
          <strong class="account-equity-value">${formatAccountAmount(account.equity)}</strong>
        </div>
        <span class="account-status-dot"><i aria-hidden="true"></i>${equity !== null ? (account.source === 'gpt' ? 'GPT录入' : '已录入') : '暂无数据'}</span>
      </div>
      <div class="account-metric-grid">
        <div>
          <span>本金</span>
          <strong>${formatAccountAmount(account.capital)}</strong>
        </div>
        <div>
          <span>累计盈亏</span>
          <strong class="${pnlClass}">${profit !== null ? `${pnlSign}¥${formatMoney(profit)}` : '暂无数据'}</strong>
        </div>
        <div>
          <span>可用资金</span>
          <strong>${formatAccountAmount(availableFunds)}</strong>
        </div>
        <div class="account-metric-risk">
          <span>风险占用</span>
          <strong>${riskText}</strong>
          <div class="account-risk-sub">
            <em>持仓保证金 <b>${formatAccountAmount(account.margin)}</b></em>
            <em>资金使用率 <b>${riskText}</b></em>
          </div>
        </div>
      </div>
    `;
  }

  function formatUpdateTime(value) {
    if (!value) return '暂无数据';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = number => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /** 有效持仓：有方向或数量>0 */
  function getActivePositions() {
    return (Array.isArray(window.positions) ? window.positions : []).filter(item => {
      const qty = Number(item?.quantity);
      const dir = String(item?.direction || '').trim();
      return (Number.isFinite(qty) && qty > 0) || Boolean(dir);
    });
  }

  function getHeldCodeSet(positions) {
    return new Set(
      positions.map(item => String(item.code || '').trim().toUpperCase()).filter(Boolean)
    );
  }

  function formatChange(change) {
    if (change === null || change === undefined || change === '') return null;
    if (typeof change === 'number' && Number.isFinite(change)) {
      const sign = change > 0 ? '+' : '';
      return { text: `${sign}${change}`, up: change >= 0 };
    }
    const text = String(change).trim();
    if (!text || text === '—' || text === '-') return null;
    const num = Number(String(text).replace(/%/g, '').replace(/,/g, ''));
    const up = Number.isFinite(num) ? num >= 0 : !text.startsWith('-');
    const normalized = text.includes('%') || !Number.isFinite(num)
      ? text
      : `${num > 0 ? '+' : ''}${num}`;
    return { text: normalized, up };
  }

  /**
   * 市场观察（首页预览）：仅未持仓的自选行情
   * 展示：品种、合约、最新价、涨跌、趋势小图
   */
  function renderHomeMarketPreview() {
    const grid = document.getElementById('home-futures-grid');
    if (!grid) return;
    const held = getHeldCodeSet(getActivePositions());
    const quotes = (Array.isArray(window.futuresData) ? window.futuresData : [])
      .filter(q => {
        const code = String(q?.code || '').trim().toUpperCase();
        return code && !held.has(code);
      })
      .slice(0, 4);
    const tones = ['sand', 'lavender', 'sky', 'mint'];
    const meta = window.meta || {};
    const homeSub = document.getElementById('home-market-subtitle');
    if (homeSub) {
      homeSub.textContent = meta.lastGPTUpdateAt
        ? `自选监控 · 更新 ${formatUpdateTime(meta.lastGPTUpdateAt)}`
        : '自选行情 · 未持仓品种';
    }
    grid.innerHTML = quotes.length ? quotes.map((quote, index) => {
      const code = escapeHTML(quote?.code || '待补代码');
      const tone = tones[index % tones.length];
      const ch = formatChange(quote?.change);
      const changeHtml = ch
        ? `<span class="home-market-change ${ch.up ? 'is-up' : 'is-down'}">${escapeHTML(ch.text)}</span>`
        : `<span class="home-market-change is-flat">—</span>`;
      return `
        <button class="home-market-card" type="button" data-market-watch-card aria-label="市场观察 ${code}">
          ${buildSparkline(`${quote?.code || 'x'}-${quote?.price || 0}-${quote?.change || ''}`, { className: 'card-spark card-spark-market', tone, width: 180, height: 64, points: 14 })}
          <span class="home-market-card-top">
            <strong>${escapeHTML(quote?.name || getContractName(quote?.code))}</strong>
            <span>${code}</span>
          </span>
          <span class="home-market-price">${formatPrice(quote?.price)}</span>
          <span class="home-market-unit-row">
            <span class="home-market-unit">${escapeHTML(quote?.unit || '价格')}</span>
            ${changeHtml}
          </span>
        </button>
      `;
    }).join('') : '<div class="market-watch-empty">暂无观察品种。未持仓的关注合约会显示在这里。</div>';
  }

  /**
   * 今日行情：交易驾驶中心
   * 仅展示有持仓的品种（不与市场观察重复）
   * 字段：品种/合约/最新价/方向/数量/成本/浮盈/计划/目标/止损
   */
  function renderTodayMarket() {
    const list = document.getElementById('today-market-list');
    const updatedEl = document.getElementById('today-market-updated');
    const subEl = document.getElementById('today-market-subtitle');
    if (!list) return;

    const quotes = Array.isArray(window.futuresData) ? window.futuresData : [];
    const positions = getActivePositions();
    const meta = window.meta || {};
    const logs = Array.isArray(window.dailyLogs) ? window.dailyLogs : [];
    const latestLog = logs.find(item => item.domain === 'futures') || logs[0];

    // 持仓更新时间只读取 GPT 导入时同步保存的 meta，不以日报或行情时间替代。
    const updatedAt = meta.lastGPTUpdateAt || null;
    if (updatedEl) updatedEl.textContent = `数据更新时间：${formatUpdateTime(updatedAt)}`;
    if (subEl) {
      subEl.textContent = latestLog?.date
        ? `交易驾驶中心 · ${latestLog.date}`
        : '交易驾驶中心 · 持仓品种';
    }

    const quoteByCode = new Map(
      quotes.map(item => [String(item.code || '').toUpperCase(), item])
    );

    const rows = positions.map(pos => {
      const code = String(pos.code || '').toUpperCase();
      const quote = quoteByCode.get(code) || {};
      const floatingPnl = Number(pos.floatingPnl);
      const pnlText = Number.isFinite(floatingPnl)
        ? `${floatingPnl > 0 ? '+' : ''}¥${formatMoney(floatingPnl)}`
        : '—';
      const pnlClass = Number.isFinite(floatingPnl)
        ? (floatingPnl >= 0 ? 'is-up' : 'is-down')
        : '';
      const direction = pos.direction || '—';
      const qty = Number(pos.quantity);
      const qtyText = Number.isFinite(qty) && qty ? `${qty} 手` : '—';
      const price = pos.currentPrice ?? quote.price;
      return `
        <article class="today-market-card" data-position-preview>
          <header class="today-market-head">
            <div>
              <strong>${escapeHTML(quote.name || getContractName(code))}</strong>
              <span>${escapeHTML(code || '—')}</span>
            </div>
            <div class="today-market-price-block">
              <em>最新价</em>
              <b>${formatPrice(price)}</b>
            </div>
          </header>
          <div class="today-market-grid today-market-grid-trade">
            <div><em>持仓方向</em><b>${escapeHTML(direction)}</b></div>
            <div><em>持仓数量</em><b>${escapeHTML(qtyText)}</b></div>
            <div><em>成本</em><b>${formatPrice(pos.cost)}</b></div>
            <div><em>浮盈亏</em><b class="${pnlClass}">${pnlText}</b></div>
            <div><em>目标价</em><b>${formatPrice(pos.target)}</b></div>
            <div><em>止损价</em><b>${formatPrice(pos.stopLoss)}</b></div>
            <div class="today-market-plan"><em>操作计划</em><b>${escapeHTML(pos.plan || pos.note || '—')}</b></div>
          </div>
        </article>
      `;
    });

    list.innerHTML = rows.length
      ? rows.join('')
      : '<div class="today-market-empty">暂无持仓。用「GPT智能录入」写入带持仓的合约后，将显示在这里。</div>';
  }

  function getContractName(code) {
    const raw = String(code || '').trim().toUpperCase();
    const prefix = raw.match(/^[A-Z]+/)?.[0] || '';
    const map = { RB: '螺纹钢', JM: '焦煤', AU: '黄金', CU: '铜', HC: '热卷', J: '焦炭' };
    return map[prefix] || raw || '合约';
  }

  /** 止损—成本—现价—目标 区间条（多/空都适用） */
  function buildPositionRange(position, isShort) {
    const cost = Number(position.cost);
    const price = Number(position.currentPrice);
    const target = Number(position.target);
    const stop = Number(position.stopLoss);
    const nums = [cost, price, target, stop].filter(Number.isFinite);
    if (nums.length < 2) return '';

    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const span = max - min || 1;
    const pct = value => Math.min(100, Math.max(0, ((value - min) / span) * 100));

    const stopPct = Number.isFinite(stop) ? pct(stop) : null;
    const costPct = Number.isFinite(cost) ? pct(cost) : null;
    const pricePct = Number.isFinite(price) ? pct(price) : 50;
    const targetPct = Number.isFinite(target) ? pct(target) : null;

    // 浅色底带：止损 → 目标（整段交易区间）
    let zoneLeft = 0;
    let zoneWidth = 100;
    if (stopPct !== null && targetPct !== null) {
      zoneLeft = Math.min(stopPct, targetPct);
      zoneWidth = Math.abs(targetPct - stopPct);
    }

    // 实色进度：止损 → 现价（走完了多少路，比「成本→现价」更长、更好读）
    let fillLeft = 0;
    let fillWidth = 0;
    if (stopPct !== null) {
      fillLeft = Math.min(stopPct, pricePct);
      fillWidth = Math.abs(pricePct - stopPct);
    } else if (costPct !== null) {
      fillLeft = Math.min(costPct, pricePct);
      fillWidth = Math.abs(pricePct - costPct);
    }

    const toTarget = Number.isFinite(target) && Number.isFinite(price) ? target - price : null;
    const toStop = Number.isFinite(stop) && Number.isFinite(price) ? price - stop : null;
    // 多：距目标 = target-price；距止损缓冲 = price-stop
    // 空：距目标 = price-target；距止损缓冲 = stop-price
    const distTarget = toTarget === null ? null : (isShort ? price - target : target - price);
    const distStop = toStop === null ? null : (isShort ? stop - price : price - stop);

    const fmtDist = v => {
      if (v === null || !Number.isFinite(v)) return '—';
      const sign = v > 0 ? '+' : '';
      return `${sign}${formatPrice(v)}`;
    };

    return `
      <span class="pos-range" aria-hidden="true">
        <span class="pos-range-track">
          <span class="pos-range-zone" style="left:${zoneLeft.toFixed(1)}%;width:${Math.max(zoneWidth, 2).toFixed(1)}%"></span>
          <span class="pos-range-fill ${isShort ? 'is-short' : 'is-long'}" style="left:${fillLeft.toFixed(1)}%;width:${Math.max(fillWidth, 2).toFixed(1)}%"></span>
          ${stopPct !== null ? `<span class="pos-range-mark stop" style="left:${stopPct.toFixed(1)}%" title="止损"></span>` : ''}
          ${costPct !== null ? `<span class="pos-range-mark cost" style="left:${costPct.toFixed(1)}%" title="成本"></span>` : ''}
          <span class="pos-range-mark price" style="left:${pricePct.toFixed(1)}%" title="现价"></span>
          ${targetPct !== null ? `<span class="pos-range-mark target" style="left:${targetPct.toFixed(1)}%" title="目标"></span>` : ''}
        </span>
        <span class="pos-range-labels">
          <span>止损 ${formatPrice(stop)}</span>
          <span>现价 ${formatPrice(price)}</span>
          <span>目标 ${formatPrice(target)}</span>
        </span>
      </span>
      <span class="pos-chips">
        <span class="pos-chip"><em>距目标</em><strong>${fmtDist(distTarget)}</strong></span>
        <span class="pos-chip"><em>止损缓冲</em><strong>${fmtDist(distStop)}</strong></span>
        <span class="pos-chip plan"><em>计划</em><strong>${escapeHTML(position.plan || '暂无')}</strong></span>
      </span>
    `;
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
      const codeRaw = position.code || '待补代码';
      const code = escapeHTML(codeRaw);
      const name = escapeHTML(getContractName(codeRaw));
      const sparkTone = floatingPnl < 0 ? 'peach' : 'mint';
      return `
        <button class="position-card home-position-card" type="button" data-position-preview aria-label="查看持仓 ${code}">
          ${buildSparkline(`${position.code}-${position.currentPrice}-${position.floatingPnl}`, { className: 'card-spark card-spark-position', tone: sparkTone, width: 320, height: 70, points: 16 })}
          <span class="pos-top">
            <span class="pos-top-left">
              <span class="pos-title-row">
                <strong class="position-name">${code}</strong>
                <span class="position-direction ${isShort ? 'short' : 'long'}">${escapeHTML(direction || '—')}</span>
              </span>
              <span class="pos-subname">${name} · ${Number(position.quantity) || '—'} 手</span>
            </span>
            <span class="pos-pnl ${Number.isFinite(floatingPnl) ? pnlClass : ''}">
              <span class="pos-pnl-label">浮盈</span>
              <strong>${Number.isFinite(floatingPnl) ? `${pnlSign}¥${formatMoney(floatingPnl)}` : '—'}</strong>
            </span>
          </span>
          <span class="pos-metrics">
            <span class="pos-metric"><span class="position-label">成本</span><span class="position-value">${formatPrice(position.cost)}</span></span>
            <span class="pos-metric"><span class="position-label">现价</span><span class="position-value">${formatPrice(position.currentPrice)}</span></span>
            <span class="pos-metric"><span class="position-label">目标</span><span class="position-value">${formatPrice(position.target)}</span></span>
            <span class="pos-metric"><span class="position-label">止损</span><span class="position-value">${formatPrice(position.stopLoss)}</span></span>
          </span>
          ${buildPositionRange(position, isShort)}
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
    renderTodayMarket();
    renderHomeMarketPreview();
    window.renderAppPages?.();
    window.initAppRouter?.();
    initTouchFeedback();

    window.addEventListener('bossdatachange', event => {
      const changedModules = event.detail?.modules || [event.detail?.module].filter(Boolean);
      if (changedModules.includes('accountData')) renderAccountOverview();
      if (
        changedModules.includes('futuresData')
        || changedModules.includes('positions')
        || changedModules.includes('meta')
        || changedModules.includes('dailyLogs')
      ) {
        renderTodayMarket();
        renderHomeMarketPreview();
      }
      window.renderAppPages?.({ changedModules });
    });
  });

  window.showToast = showToast;
  window.buildSparkline = buildSparkline;
})();
