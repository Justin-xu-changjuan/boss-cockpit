# 老板驾驶舱 (Boss Cockpit)

第一阶段：纯前端界面 + 模拟数据，适合 iPhone Safari，支持添加到主屏幕。

## 文件结构

```
boss-cockpit/
├── index.html      # 主页面
├── style.css       # 样式（深色高级风格）
├── script.js       # 主逻辑与交互
├── data.js         # 业务模拟数据（今日重点、持仓、项目、文件）
├── futureData.js   # 期货行情模拟数据 + 接口预留
└── README.md
```

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
| Tesla 控制     | `script.js` → `handleQuickAction('tesla')` 可改为 `shortcuts://` 或 API |
| 期货真实行情   | `futureData.js` → `getFutureQuotes()` 替换为真实 fetch |
| 数据库/持久化  | `data.js` 中数据可改为 localStorage / IndexedDB / 后端 |
| AI 助手        | 快捷按钮 + 独立页面，可接入 Grok API 等 |
| 多页面切换     | 底部导航已预留，可扩展不同 section 显示/隐藏 |

## 设计说明

- 深色主题 + 圆角卡片
- 大触控区域，适合单手操作
- 流畅点击反馈 + 轻微震动（支持设备）
- 完全适配 iPhone 安全区域（刘海/底部横条）
