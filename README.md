# 老板驾驶舱 (Boss Cockpit)

当前阶段：纯前端界面 + 模拟数据，适合 iPhone Safari，支持添加到主屏幕和 PWA standalone 体验。

## 文件结构

```
boss-cockpit/
├── index.html      # 主页面
├── style.css       # 样式（深色高级风格）
├── script.js       # 主逻辑与交互
├── dataStore.js    # 统一数据层、localStorage、AI JSON 导入
├── data.js         # 今日重点、持仓、文件、快捷入口数据
├── futuresData.js  # 独立期货数据模块 + getFutureQuotes()
├── vehicleData.js  # 独立车辆与快捷指令配置
├── projectData.js  # 独立企业项目数据
├── README.md       # 项目说明
├── manifest.json    # PWA 安装配置
└── icons/           # iPhone / PWA App 图标（180/192/512/1024）
    ├── app-icon-180.png
    ├── app-icon-192.png
    ├── app-icon-512.png
    └── app-icon-1024.png
```

第二阶段已加入独立 App 启动层、CEO 英文副标题、玻璃拟态卡片、行情状态标签和 iOS 毛玻璃底部导航。页面仍为纯静态前端，不改变原有数据结构和交互逻辑。

第三阶段重组首页为 CEO 个人控制中心：新增今日经营状态、CEO 资源仪表盘、带说明的高级快捷入口，以及趋势判断和个人策略行情卡；原有今日重点、持仓、项目、文件和底部导航全部保留。

第四阶段按 iPhone App 首页思维重新排版：首屏合并为单一核心经营状态卡，行情改为 RB2610 主卡与横向滑动次级行情，项目与企业资料改为大幅 App 模块，快捷控制、持仓和资源概览采用横向信息流。业务数据结构和原有入口逻辑保持不变。

第五阶段建立完整 App Tab 页面架构：首页、行情、项目、文件、我的五个页面通过底部导航和 hash 路由切换，支持浏览器返回与页面滚动位置恢复。新增页面继续读取本地模拟数据，未接入外部接口，首页原有视觉与数据结构保持不变。

第六阶段增加 Tesla 快速控制中心：首页 Tesla 入口展示白色 Model X 和黑色 Model 3 两张车辆卡，点击进入对应控制页。控制按钮通过 iOS Shortcuts URL Scheme 调用对应快捷指令，不连接 Tesla API 或后端；未创建快捷指令时显示创建提示。

当前已配置快捷指令：Model 3 使用 `3_OpenTrunk`、`3_ClimateOn`；Model X 使用 `X_OpenTrunk`、`X_OpenRightRear`、`X_OpenLeftRear`、`X_OpenDriverDoor`、`X_CloseRearDoors`、`X_ClimateOn`。

行情入口使用快捷指令 `OpenWenhua`，通过 `shortcuts://run-shortcut?name=OpenWenhua` 打开文华财经随身行；行情页面不在 Boss Cockpit 内部展开。

第七阶段完成数据驱动架构：页面通过 `futuresData.js`、`vehicleData.js`、`projectData.js` 读取数据；`dataStore.js` 使用 `localStorage` 保存更新后的模块。可在控制台调用 `importBossData(json)` 导入 AI 生成的 JSON，导入后页面自动刷新。

当前版本在“我的”页面增加了“数据管理”入口，可直接粘贴 JSON 导入；导入结果会保存到本机，并立即刷新首页及项目页面。

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
| 期货真实行情   | `futuresData.js` → `getFutureQuotes()` 替换为真实 fetch |
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
  futuresData: [{ id: 'rb2610', name: '螺纹钢', code: 'RB2610', price: 3050, change: 13, changePercent: 0.43, unit: '元/吨' }],
  projectData: [{ id: 'proj-ai', name: 'AI算力项目', status: '合作沟通', progress: 50, nextStep: '确认方案' }]
})
```

页面会自动刷新对应模块；执行 `location.reload()` 后导入值仍会保留。清理测试数据可执行 `BossData.clearLocalData()`。
