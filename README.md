# 📺 Cloudflare Worker IPTV Manager

[![Deploy to Cloudflare Workers](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Workers-orange?logo=cloudflare&style=for-the-badge)](https://workers.cloudflare.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

一个基于 Cloudflare Workers 和 KV Storage 的轻量级 IPTV 直播源管理平台。

无需服务器，搭建简单，支持在线上传、远程导入、编辑 M3U 文件，并自动生成适用于 TiviMate、TVBox 等播放器的订阅链接。

## ✨ 特性

- **Serverless 架构**：完全运行在 Cloudflare 边缘节点，免费且高可用。
- **可视化管理**：提供 Web 界面进行 M3U 文件的导入、编辑、排序和删除。
- **访客权限控制**：
  - **系统设置**：管理员可配置是否允许未登录访客查看频道列表。
  - **订阅控制**：管理员可开关访客的订阅权限（M3U/TXT），禁止后需凭密码参数访问。
  - **安全视图**：未登录状态下自动隐藏编辑、导入等敏感操作接口。
- **分组管理系统**：支持独立的分组管理（添加/删除/排序），频道编辑时可直接从下拉列表选择分组。
- **精细化编辑**：支持独立编辑 **EPG名称** (`tvg-name`) 和 **显示名称** (列表标题)。
- **智能导入与去重**：
  - 导入时自动识别并添加新分组。
  - 智能检测同名频道，提供保留旧版、覆盖或 **多源合并** 选项。
  - 支持一键批量处理重复冲突。
- **UI 体验优化**：
  - **交互升级**：顶部菜单升级为下拉框，支持一键导出不同格式。
  - **M3U 参数配置**：支持添加多个 EPG 源，可拖拽排序。
  - **拖拽排序**：支持频道和分组的拖拽排序。
  - **安全机制**：关键操作（删除/清空）均提供二次确认模态框，登录页采用弹窗模式。
- **KV 数据存储**：利用 Cloudflare KV 实现数据持久化，读写分离。
- **多格式订阅输出**：
  - `/m3u`：标准 M3U8 格式（默认优先输出主源）。
  - `/m3u?mode=multi`：**多源 M3U 格式**（输出所有启用的同名源）。
  - `/txt`：TVBox/DIYP 专用格式。

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
   推送到 `main` 分支，系统将自动创建 KV 桶并完成部署。

### 方式三：手动部署 (Cloudflare 网页版)

适合不熟悉命令行且不想使用 GitHub Actions 的用户。

1. **创建 KV Namespace**：
   - 登录 Cloudflare Dash -> **Workers & Pages** -> **KV**。
   - 创建名为 `IPTV_KV` 的命名空间，**记下 ID**。
2. **创建 Worker**：
   - 创建新 Worker，将 `src/js/worker.js` (作为入口) 和 `src/front/template.js` 的代码手动合并或粘贴进去。
3. **配置变量**：
   - 在 Worker 设置中添加环境变量 `PASSWORD`。
   - 绑定 KV Namespace `IPTV_KV`。

### 方式四：本地部署 (Wrangler CLI)

1. **克隆项目**：
   ```bash
   git clone https://github.com/gujiangjiang/cf-worker-iptv.git
   cd cf-worker-iptv
   npm install
   ```
2. **创建 KV**：
   ```bash
   npx wrangler kv:namespace create IPTV_KV
   ```
   *将输出的 ID 填入 `wrangler.toml` 的 `id` 字段。*
3. **配置与部署**：
   - 修改 `wrangler.toml` 中的 `PASSWORD` 变量。
   - 执行部署命令： `npx wrangler deploy`

---

## 📖 使用指南

### 1. 登录与权限
- 访问首页，默认为**访客视图**（如果管理员关闭了访客查看，将显示"私有系统"）。
- 点击右上角 **“🔐 后台管理”**，输入密码进入完整模式。
- 登录后点击右上角 **“🛠️ 系统设置”**，可配置：
  - 是否允许访客查看列表。
  - 是否允许访客订阅（关闭后订阅链接需带 `?pwd=密码`）。

### 2. 后台管理
- **列表编辑**：支持分组管理、频道增删改查。
- **导入源**：支持本地/URL导入，自动识别分组与冲突。
- **保存**：点击右下角 **“💾”** 悬浮按钮。

### 3. 获取订阅地址
点击页面右上角的 **“📡 订阅 / 导出”** 下拉菜单获取：

| 格式 | 用途 | 地址示例 |
|:---|:---|:---|
| **标准 M3U** | 通用播放器 (TiviMate, PotPlayer) | `https://.../m3u` |
| **多源 M3U** | 支持多源切换的播放器 | `https://.../m3u?mode=multi` |
| **TXT** | TVBox, DIYP | `https://.../txt` |

*注：如果禁用了访客订阅，链接会自动追加 `?pwd=您的密码` 参数。*

---

## ⚠️ 限制与说明

- **Cloudflare KV 免费额度**：写入 1,000 次/天，读取 100,000 次/天。
- **缓存延迟**：KV 保存后可能需要几秒钟到一分钟才能在订阅接口更新。

## 📄 许可证

[MIT License](LICENSE)