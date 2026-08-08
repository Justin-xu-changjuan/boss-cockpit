/**
 * futureData.js
 * -----------------------------------------
 * 期货行情模拟数据
 * 
 * 【未来接口位置】
 * 替换此文件内容为真实API调用即可。
 * 例如：
 *   async function fetchFutures() {
 *     const res = await fetch('https://your-api.com/futures');
 *     return await res.json();
 *   }
 * 
 * 当前阶段：纯模拟数据，方便界面开发与调试
 */

const futureData = [
  {
    id: 'rb2610',
    name: '螺纹钢',
    code: 'RB2610',
    price: 3037,
    change: 12,
    changePercent: 0.40,
    unit: '元/吨'
  },
  {
    id: 'jm2609',
    name: '焦煤',
    code: 'JM2609',
    price: 1186.5,
    change: -8.5,
    changePercent: -0.71,
    unit: '元/吨'
  },
  {
    id: 'au',
    name: '黄金',
    code: 'AU',
    price: 785.2,
    change: 3.6,
    changePercent: 0.46,
    unit: '元/克'
  },
  {
    id: 'cu',
    name: '铜',
    code: 'CU',
    price: 78650,
    change: -120,
    changePercent: -0.15,
    unit: '元/吨'
  }
];

/**
 * 模拟获取行情（未来替换为真实API）
 * @returns {Promise<Array>}
 */
async function getFutureQuotes() {
  // TODO: 未来接入真实行情接口
  // const response = await fetch('/api/futures');
  // return await response.json();
  
  // 模拟网络延迟
  return new Promise(resolve => {
    setTimeout(() => resolve(futureData), 300);
  });
}

// 导出（浏览器环境直接挂到 window）
window.futureData = futureData;
window.getFutureQuotes = getFutureQuotes;
