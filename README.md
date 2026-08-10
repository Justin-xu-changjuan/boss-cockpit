# 老板驾驶舱 (Boss Cockpit)

当前阶段：纯前端界面 + 模拟数据，适合 iPhone Safari，支持添加到主屏幕和 PWA standalone 体验。

## 文件结构

```
boss-cockpit/
├── index.html      # 主页面
├── style.css       # 样式（深色高级风格）
├── script.js       # 主逻辑与交互
├── dataStore.js    # 统一数据层、localStorage、AI JSON 导入
├── pages.js        # 页面路由与各模块页面渲染
├── data.js         # 持仓与文件默认数据
├── accountData.js  # 独立账户数据
├── futuresData.js  # 独立行情数据
├── vehicleData.js  # 独立车辆与快捷指令配置
├── README.md       # 项目说明
├── PRODUCT.md      # 产品与设计约束
├── manifest.json   # PWA 安装配置
└── icons/          # iPhone / PWA App 图标（180/192/512/1024）
    ├── app-icon-180.png
    ├── app-icon-192.png
    ├── app-icon-512.png
    └── app-icon-1024.png
```

当前版本采用首页、行情、Tesla、文件、我的五个底部 Tab，通过 hash 路由切换，并支持浏览器返回、刷新直达和页面滚动位置恢复。页面为纯静态前端，未接入外部接口。

第六阶段增加独立 Tesla 页面：底部导航进入 vehicleData 驱动的 Model X / Model 3 列表，首页不再展示 Tesla 卡片或车辆入口；点击车辆后进入对应控制页。控制按钮通过 iOS Shortcuts URL Scheme 调用对应快捷指令，不连接 Tesla API 或后端；未创建快捷指令时显示创建提示。

当前已配置快捷指令入口：Model 3 支持解锁、锁车、空调、后备箱；Model X 另支持左翼门、右翼门、关闭双翼门。

行情入口与底部“行情”统一进入 `market-watch` 页面，页面完整读取 `futuresData`，支持同品种不同月份合约并存；可在页面内添加关注合约（代码、名称、单位），新合约价格待录入时显示“—”。首页仅展示账户、持仓和行情摘要；“我的持仓”仅读取 `positions`。

数据通过 `accountData.js`、`futuresData.js`、`vehicleData.js`、`data.js` 分模块维护；`dataStore.js` 使用 `localStorage` 保存更新后的模块。可在控制台调用 `importBossData(json)` 导入 JSON，导入后页面自动刷新。

期货数据结构已分离：`futuresData` 只包含 `code`、`name`、`price`、`unit`；`positions` 只包含 `code`、`direction`、`quantity`、`cost`、`currentPrice`、`floatingPnl`、`target`、`stopLoss`、`plan`。行情更新和持仓录入分别只写入对应模块。

当前版本在“我的”页面增加了“数据管理”入口，可直接粘贴 JSON 导入；导入结果会保存到本机，并立即刷新首页及相关数据页面。

## 本地预览（Mac）

### 方法一：直接打开（最简单）
1. 用 Finder 找到 `index.html`
2. 右键 → 打开方式 → Safari 或 Chrome

> 注意：部分功能（如震动）在 file:// 协议下可能受限，推荐方法二。

### 方法二：本地服务器（推荐）
在终端进入项目目录后执行：

```bash
# 使用 Python（Mac 自带）
python3 -m http.server 8080

# 或使用 Node（如果已安装）
npx serve .
```

然后在浏览器访问：`http://localhost:8080`

iPhone 预览：确保 Mac 和 iPhone 在同一 Wi-Fi，访问 `http://你的Mac局域网IP:8080`

## 部署成公网网址

推荐以下免费方案（任选其一）：

### 1. Netlify（最简单拖拽）
1. 打开 [netlify.com](https://www.netlify.com)
2. 注册/登录
3. 把整个 `boss-cockpit` 文件夹拖到页面上
4. 立即获得一个公网网址（可自定义域名）

### 2. Vercel
```bash
npm i -g vercel
cd boss-cockpit
vercel
```

### 3. GitHub Pages
1. 新建 GitHub 仓库，上传代码
2. Settings → Pages → 选择 main 分支
3. 获得 `https://用户名.github.io/仓库名`

### 4. Cloudflare Pages / 腾讯云 / 阿里云静态托管
同理上传静态文件即可。

## 添加到 iPhone 主屏幕（像 App 一样使用）

1. 用 **Safari** 打开网页（必须是 Safari）
2. 点击底部分享按钮（方框+箭头）
3. 向下滑动找到 **「添加到主屏幕」**
4. 可修改名称，点击「添加」
5. 主屏幕出现图标，点击后全屏运行，无浏览器地址栏

> 已配置 `apple-mobile-web-app-capable`，体验接近原生 App。

## 后续扩展预留位置

| 功能           | 位置说明 |
|----------------|----------|
| Tesla 控制     | `vehicleData.js` → `controls[].shortcut` 配置快捷指令名称，通过 `shortcuts://run-shortcut` 调用 |
| 期货真实行情   | 在保持 `futuresData` 结构不变的前提下接入独立数据服务 |
| 数据库/持久化  | `dataStore.js` → 替换存储实现，或接入 IndexedDB / 后端 |
| AI 助手        | 快捷按钮 + 独立页面，可接入 Grok API 等 |
| 多页面切换     | 底部导航已预留，可扩展不同 section 显示/隐藏 |

## 设计说明

- 深色主题 + 圆角卡片
- 大触控区域，适合单手操作
- 流畅点击反馈 + 轻微震动（支持设备）
- 完全适配 iPhone 安全区域（刘海/底部横条）

## 数据层测试

在本地服务器打开页面后，可在浏览器控制台执行：

```js
importBossData({
  futuresData: [{ code: 'RB2610', name: '螺纹钢', price: 3050, unit: '元/吨' }],
  positions: [{ code: 'RB2610', direction: '多', quantity: 10, cost: 3000, currentPrice: 3050, floatingPnl: 500, target: 3200, stopLoss: 2950, plan: '按计划持有' }]
})
```

页面会自动刷新对应模块；执行 `location.reload()` 后导入值仍会保留。清理测试数据可执行 `BossData.clearLocalData()`。
