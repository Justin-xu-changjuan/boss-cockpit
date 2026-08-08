/**
 * script.js
 * 老板驾驶舱 - 主逻辑
 * 
 * 【未来扩展位置】
 * 1. Tesla 控制：快捷按钮 → shortcuts:// 或 WebSocket
 * 2. 行情接口：已在 futureData.js 预留 getFutureQuotes()
 * 3. 数据库：data.js 中的数据可改为 API / IndexedDB
 * 4. AI助手：可接入 Grok / 其他大模型对话页
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  renderQuickActions();
  renderTodayFocus();
  renderFutures();
  renderPositions();
  renderProjects();
  renderFiles();
  initBottomNav();
  initTouchFeedback();
});

/* ========== 顶部：日期 + 欢迎语 ========== */
function initHeader() {
  const dateEl = document.getElementById('header-date');
  const welcomeEl = document.getElementById('welcome-text');

  const now = new Date();
  const options = { month: 'long', day: 'numeric', weekday: 'long' };
  dateEl.textContent = now.toLocaleDateString('zh-CN', options);

  const hour = now.getHours();
  let greeting = '晚上好，老板';
  if (hour >= 5 && hour < 11) greeting = '早上好，老板';
  else if (hour >= 11 && hour < 14) greeting = '中午好，老板';
  else if (hour >= 14 && hour < 18) greeting = '下午好，老板';
  
  welcomeEl.textContent = greeting;
}

/* ========== 模块1：快捷控制 ========== */
function renderQuickActions() {
  const container = document.getElementById('quick-grid');
  if (!container || !window.quickActions) return;

  container.innerHTML = window.quickActions.map(item => `
    <button class="quick-btn ${item.id === 'tesla' ? 'tesla' : ''}" 
            data-action="${item.action}" 
            data-id="${item.id}">
      <span class="icon">${item.icon}</span>
      <span class="label">${item.name}</span>
    </button>
  `).join('');

  // 事件绑定
  container.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleQuickAction(action);
    });
  });
}

/**
 * 快捷控制处理
 * 【未来 Tesla 接口位置】
 * 可在这里调用：
 *   window.location.href = 'shortcuts://run-shortcut?name=Tesla解锁';
 * 或 WebSocket / 后端转发
 */
function handleQuickAction(action) {
  const messages = {
    tesla: '🚗 Tesla 控制（预留）\n未来可接入快捷指令或车辆API',
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
    // 【行情接口位置】调用 futureData.js 中的方法
    const data = await window.getFutureQuotes();

    grid.innerHTML = data.map(item => {
      const isUp = item.change >= 0;
      const changeClass = isUp ? 'up' : 'down';
      const arrow = isUp ? '↑' : '↓';
      const sign = isUp ? '+' : '';

      return `
        <div class="future-card" data-id="${item.id}">
          <div class="future-name">
            <span>${item.name}</span>
            <span class="future-code">${item.code}</span>
          </div>
          <div class="future-price">${formatPrice(item.price)}</div>
          <div class="future-change ${changeClass}">
            <span class="trend-arrow">${arrow}</span>
            <span>${sign}${item.change}</span>
            <span>${sign}${item.changePercent.toFixed(2)}%</span>
          </div>
        </div>
      `;
    }).join('');

    // 点击卡片反馈
    grid.querySelectorAll('.future-card').forEach(card => {
      card.addEventListener('click', () => {
        showToast(`${card.querySelector('.future-name span').textContent} 详情（预留）`);
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

/* ========== 模块4：持仓观察 ========== */
function renderPositions() {
  const container = document.getElementById('position-list');
  if (!container || !window.positions) return;

  container.innerHTML = window.positions.map(pos => {
    const dirClass = pos.direction === '多' ? 'long' : 'short';
    return `
      <div class="position-card">
        <div class="position-header">
          <div class="position-name">${pos.name} <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">${pos.code}</span></div>
          <span class="position-direction ${dirClass}">${pos.direction}</span>
        </div>
        <div class="position-grid">
          <div class="position-field">
            <span class="position-label">成本</span>
            <span class="position-value">${pos.cost}</span>
          </div>
          <div class="position-field">
            <span class="position-label">目标</span>
            <span class="position-value">${pos.target}</span>
          </div>
          <div class="position-field">
            <span class="position-label">止损</span>
            <span class="position-value">${pos.stopLoss}</span>
          </div>
          <div class="position-field">
            <span class="position-label">备注</span>
            <span class="position-value" style="font-size:13px">${pos.note ? '有' : '-'}</span>
          </div>
        </div>
        ${pos.note ? `<div class="position-note">${pos.note}</div>` : ''}
      </div>
    `;
  }).join('');
}

/* ========== 模块5：企业项目 ========== */
function renderProjects() {
  const container = document.getElementById('project-list');
  if (!container || !window.projects) return;

  container.innerHTML = window.projects.map(proj => `
    <div class="project-card">
      <div class="project-info">
        <div class="project-name">${proj.name}</div>
        <div class="project-status ${proj.statusClass}">${proj.status}</div>
      </div>
      <button class="btn-detail" data-id="${proj.id}">查看详情</button>
    </div>
  `).join('');

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

  container.innerHTML = window.fileEntries.map(file => `
    <a href="${file.path}" class="file-item" data-id="${file.id}">
      <span class="file-icon">${file.icon}</span>
      <span class="file-name">${file.name}</span>
    </a>
  `).join('');

  container.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      showToast(`${item.querySelector('.file-name').textContent}（预留链接）`);
    });
  });
}

/* ========== 底部导航 ========== */
function initBottomNav() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      const page = item.dataset.page;
      // 第一阶段只做首页，其他页提示
      if (page !== 'home') {
        showToast(`${item.querySelector('.nav-label').textContent} 页面开发中`);
      }
      // 未来可切换不同主内容区
    });
  });
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
  document.querySelectorAll('.quick-btn, .future-card, .btn-detail, .file-item, .nav-item').forEach(el => {
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
