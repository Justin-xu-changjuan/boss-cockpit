/**
 * gptImport.js
 * -----------------------------------------
 * 通用 GPT 结构化数据解析与写入。
 * 当前支持 futures（期货行情 + 持仓），预留 stocks / tesla / projects / finance / journal。
 *
 * 不依赖 DOM；由页面调用 window.GPTImport.apply(text)。
 */
(() => {
  const DOMAIN_HANDLERS = {};

  const unitByPrefix = {
    RB: '元/吨', HC: '元/吨', JM: '元/吨', J: '元/吨', I: '元/吨',
    CU: '元/吨', AL: '元/吨', ZN: '元/吨', NI: '元/吨',
    AU: '元/克', AG: '元/千克', SC: '元/桶'
  };

  function stripCodeFence(text) {
    let raw = String(text || '').trim();
    if (!raw) throw new Error('请先粘贴 GPT 生成的数据。');
    // 允许 ```json ... ``` 包裹
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) raw = fenced[1].trim();
    // 允许前后夹杂说明文字：截取第一个 { 到最后一个 }
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
    return raw;
  }

  function parseJSON(text) {
    const raw = stripCodeFence(text);
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      throw new Error('JSON 解析失败，请确认是合法 JSON。');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('顶层必须是 JSON 对象。');
    }
    return payload;
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const text = String(value).trim().replace(/,/g, '').replace(/[￥¥%\s]/g, '');
    if (!text || text === '-' || text === '—' || text === '--') return null;
    // 支持 +750 / -120.5
    const num = Number(text.replace(/^\+/, ''));
    if (!Number.isFinite(num)) return null;
    if (String(value).trim().startsWith('-') && num > 0) return -num;
    return num;
  }

  function normalizeDirection(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const lower = text.toLowerCase();
    if (['多', '多单', 'long', 'buy', 'l'].includes(lower) || text.includes('多')) return '多';
    if (['空', '空单', 'short', 'sell', 's'].includes(lower) || text.includes('空')) return '空';
    return text;
  }

  function inferUnit(code, name) {
    const prefix = String(code || '').toUpperCase().match(/^[A-Z]+/)?.[0] || '';
    if (unitByPrefix[prefix]) return unitByPrefix[prefix];
    if (String(name || '').includes('黄金') || prefix === 'AU') return '元/克';
    return '元/吨';
  }

  function todayLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** 期货域：GPT futures[] → 行情 + 持仓 + 当日日志 */
  function handleFuturesDomain(payload, meta) {
    const list = Array.isArray(payload.futures) ? payload.futures : null;
    if (!list) return null;
    if (!list.length) throw new Error('futures 数组为空。');

    const nowISO = new Date().toISOString();
    const date = String(payload.date || meta.date || todayLocal()).trim() || todayLocal();

    const quoteUpdates = [];
    const positionUpdates = [];
    const skipped = [];

    list.forEach((row, index) => {
      const code = String(row?.contract || row?.code || '').trim().toUpperCase();
      const name = String(row?.name || '').trim();
      if (!code) {
        skipped.push(`第 ${index + 1} 条缺少 contract/code`);
        return;
      }

      const price = toNumber(row?.price);
      const change = row?.change ?? row?.changePct ?? row?.涨跌 ?? null;
      const unit = String(row?.unit || '').trim() || inferUnit(code, name);
      const note = String(row?.note || row?.备注 || '').trim();
      const plan = String(row?.plan || row?.操作计划 || '').trim();

      quoteUpdates.push({
        code,
        name: name || code,
        price,
        unit,
        change: change === '' ? null : change,
        note,
        updatedAt: nowISO,
        source: 'gpt'
      });

      const direction = normalizeDirection(row?.position || row?.direction || '');
      const quantity = toNumber(row?.volume ?? row?.quantity);
      const cost = toNumber(row?.cost);
      const profit = toNumber(row?.profit ?? row?.floatingPnl);

      // 有方向或数量或成本时，尝试写入/更新持仓
      const hasPositionSignal = Boolean(direction) || quantity !== null || cost !== null;
      if (hasPositionSignal) {
        positionUpdates.push({
          code,
          direction: direction || '',
          quantity: quantity ?? 0,
          cost,
          currentPrice: price,
          floatingPnl: profit,
          target: toNumber(row?.target),
          stopLoss: toNumber(row?.stopLoss ?? row?.stop),
          plan: plan || note,
          note,
          updatedAt: nowISO,
          source: 'gpt'
        });
      }
    });

    if (!quoteUpdates.length) throw new Error('没有可识别的合约数据。');

    const result = window.BossData.applyGPTImport({
      domain: 'futures',
      date,
      updatedAt: nowISO,
      quotes: quoteUpdates,
      positions: positionUpdates,
      rawCount: list.length
    });

    return {
      domain: 'futures',
      date,
      updatedAt: nowISO,
      quotes: result.quotes,
      positions: result.positions,
      skipped,
      message: `已更新 ${result.quotes.updated + result.quotes.added} 个行情` +
        (result.positions.updated + result.positions.added
          ? `，${result.positions.updated + result.positions.added} 条持仓`
          : '') +
        `（${date}）`
    };
  }

  DOMAIN_HANDLERS.futures = handleFuturesDomain;

  // 预留扩展域（尚未实现具体写入，避免误用时报清晰错误）
  ['stocks', 'tesla', 'projects', 'finance', 'journal'].forEach(domain => {
    DOMAIN_HANDLERS[domain] = () => {
      throw new Error(`领域「${domain}」已预留，尚未接入写入逻辑。`);
    };
  });

  /**
   * 解析并应用 GPT 文本。
   * 识别顺序：显式 domain 字段 → futures 数组 → 其他预留键。
   */
  function apply(text) {
    const payload = parseJSON(text);
    const domainHint = String(payload.domain || payload.type || '').trim().toLowerCase();

    if (domainHint && DOMAIN_HANDLERS[domainHint]) {
      return DOMAIN_HANDLERS[domainHint](payload, { date: payload.date });
    }
    if (Array.isArray(payload.futures)) {
      return DOMAIN_HANDLERS.futures(payload, { date: payload.date });
    }
    if (Array.isArray(payload.stocks)) return DOMAIN_HANDLERS.stocks(payload, {});
    if (payload.tesla || payload.vehicles) return DOMAIN_HANDLERS.tesla(payload, {});
    if (payload.projects) return DOMAIN_HANDLERS.projects(payload, {});
    if (payload.finance) return DOMAIN_HANDLERS.finance(payload, {});
    if (payload.journal || payload.logs) return DOMAIN_HANDLERS.journal(payload, {});

    throw new Error('未识别的数据格式。期货请使用 { "date": "...", "futures": [ ... ] }。');
  }

  function registerDomain(name, handler) {
    DOMAIN_HANDLERS[String(name)] = handler;
  }

  window.GPTImport = {
    apply,
    parseJSON,
    registerDomain,
    todayLocal,
    // 给页面展示用的示例
    sampleFuturesJSON: `{
  "date": "2026-08-10",
  "futures": [
    {
      "name": "螺纹钢",
      "contract": "RB2610",
      "price": "3015",
      "position": "多单",
      "volume": "6",
      "cost": "2997.5",
      "profit": "1050",
      "plan": "目标 3120，止损 2960",
      "note": "GPT 示例"
    },
    {
      "name": "焦煤",
      "contract": "JM2609",
      "price": "1280",
      "position": "",
      "volume": "",
      "cost": "",
      "profit": "",
      "plan": "观望",
      "note": ""
    }
  ]
}`
  };
})();
