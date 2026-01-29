# 📺 Cloudflare Worker IPTV Manager

[![Deploy to Cloudflare Workers](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Workers-orange?logo=cloudflare&style=for-the-badge)](https://workers.cloudflare.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

一个基于 Cloudflare Workers 和 KV Storage 的轻量级 IPTV 直播源管理平台。

无需服务器，搭建简单，支持在线上传、远程导入、编辑 M3U 文件，并自动生成适用于 TiviMate、TVBox 等播放器的订阅链接。

## ✨ 特性

- **Serverless 架构**：完全运行在 Cloudflare 边缘节点，免费且高可用。
- **可视化管理**：提供 Web 界面进行 M3U 文件的导入、编辑、排序和删除。
- **精细化编辑**：支持独立编辑 **EPG名称** (`tvg-name`) 和 **显示名称** (列表标题)，满足不同播放器的匹配需求。
- **智能解析**：优化了 M3U 解析算法，支持任意顺序的属性标签，并能准确识别 EPG 信息。
- **UI 体验优化**：
  - **拖拽排序**：支持通过拖拽手柄 (⠿) 快速调整频道顺序。
  - **悬浮保存**：页面右下角常驻悬浮保存按钮，操作更便捷。
  - **Toast 提示**：内置美观的消息提示，替代原生弹窗。
- **高级配置支持**：支持编辑全局 EPG 地址 (`x-tvg-url`) 和回看参数 (`catchup`, `catchup-source`)。
- **双重导入**：支持本地文件上传 (.m3u) 和 远程 URL 链接导入。
- **KV 数据存储**：利用 Cloudflare KV 实现数据持久化，读写分离。
- **多格式订阅输出**：
  - `/m3u`：标准 M3U8 格式（包含 `tvg-logo`, `group-title`, `catchup` 等信息）。
  - `/txt`：TVBox/DIYP 专用格式（`频道名,URL`）。
- **安全鉴权**：后台管理页面受密码保护。
- **自动化运维**：支持 GitHub Actions 自动部署和 KV 自动管理。

---

## 🚀 部署方式

本项目提供四种部署方式，请根据您的需求选择其中一种。

### 方式一：一键部署 (最简单)

直接点击下方的按钮，跳转到 Cloudflare 进行部署。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/gujiangjiang/cf-worker-iptv)

*注意：部署完成后，您仍需在 Cloudflare 后台手动绑定 KV Namespace 并设置 `PASSWORD` 环境变量。*

### 方式二：GitHub 自动部署 (推荐)

利用 GitHub Actions 实现代码推送即部署，并自动管理 KV 存储。

1. **Fork 本仓库** 到你的 GitHub 账号。
2. **配置 Secrets**：
   在仓库的 `Settings` -> `Secrets and variables` -> `Actions` 中添加：
   - `CF_API_TOKEN`: Cloudflare API 令牌 (需具备 Workers 编辑权限)。
   - `CF_ACCOUNT_ID`: Cloudflare 账户 ID。
   - `PASSWORD`: 您的后台管理密码。
3. **触发部署**：
   任意推送到 `main` 分支，或在 Actions 页面手动运行工作流，系统将自动创建 KV 桶并完成部署。

### 方式三：手动部署 (Cloudflare 网页版)

适合不熟悉命令行且不想使用 GitHub Actions 的用户。

1. **创建 KV Namespace**：
   - 登录 Cloudflare Dash -> **Workers & Pages** -> **KV**。
   - 创建名为 `IPTV_KV` 的命名空间，**记下 ID**。
2. **创建 Worker**：
   - 创建新 Worker，将 `src/js/worker.js` (作为入口) 和 `src/front/template.js` 的代码手动合并或粘贴进去。
   - *提示：网页版编辑器对多文件模块支持较差，建议使用方式二或方式四。*
3. **配置变量**：
   - 在 Worker 设置中添加环境变量 `PASSWORD`。
   - 绑定 KV Namespace `IPTV_KV`。

### 方式四：本地部署 (Wrangler CLI)

适合开发者或习惯使用命令行的用户。

1. **环境准备**：确保本地已安装 Node.js 和 npm。
2. **克隆项目**：
   ```bash
   git clone https://github.com/gujiangjiang/cf-worker-iptv.git
   cd cf-worker-iptv
   npm install
   ```
3. **创建 KV**：
   ```bash
   npx wrangler kv:namespace create IPTV_KV
   ```
   *将输出的 ID 填入 `wrangler.toml` 的 `id` 字段。*
4. **配置与部署**：
   - 修改 `wrangler.toml` 中的 `PASSWORD` 变量。
   - 执行部署命令：
     ```bash
     npx wrangler deploy
     ```

---

## 📖 使用指南

部署成功后，访问您的 Worker 域名（例如 `https://iptv-manager.您的子域.workers.dev`）。

### 1. 后台管理
- 打开首页，输入您设置的 `PASSWORD`。
- **全局设置**：点击“⚙️ 全局设置”展开面板，配置 EPG 地址和回看参数。
- **列表编辑**：
  - **排序**：按住左侧的 **“⠿”** 图标拖动即可调整频道顺序。
  - **EPG 名称**：对应 `tvg-name`，用于电子节目单匹配。
  - **显示名称**：播放器列表显示的频道名称。
- **导入源**：通过本地文件或 URL 导入。
- **保存**：点击右下角 **“💾”** 悬浮按钮。

### 2. 获取订阅地址
在管理页面的右上角可以找到订阅链接：

| 格式 | 用途 | 地址示例 |
|:---|:---|:---|
| **M3U** | TiviMate, PotPlayer, Perfect Player, Kodi | `https://您的域名.workers.dev/m3u` |
| **TXT** | TVBox, DIYP, 骆驼壳 | `https://您的域名.workers.dev/txt` |

---

## ⚠️ 限制与说明

- **Cloudflare KV 免费额度**：
  - 写入（保存配置）：每天 1,000 次。
  - 读取（获取订阅）：每天 100,000 次。
- **缓存延迟**：KV 存储具有“最终一致性”，保存后可能需要几秒钟到一分钟才能在订阅接口更新，请耐心等待。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request。

## 📄 许可证

[MIT License](LICENSE)