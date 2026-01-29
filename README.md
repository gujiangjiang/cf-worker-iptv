# 📺 Cloudflare Worker IPTV Manager

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/gujiangjiang/cf-worker-iptv)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

一个基于 Cloudflare Workers 和 KV Storage 的轻量级 IPTV 直播源管理平台。

无需服务器，搭建简单，支持在线上传、编辑 M3U 文件，并自动生成适用于 TiviMate、TVBox 等播放器的订阅链接。

## ✨ 特性

- **Serverless 架构**：完全运行在 Cloudflare 边缘节点，免费且高可用。
- **可视化管理**：提供 Web 界面进行 M3U 文件的导入、编辑、排序和删除。
- **KV 数据存储**：利用 Cloudflare KV 实现数据持久化，读写分离。
- **多格式订阅输出**：
  - `/m3u`：标准 M3U8 格式（支持 `tvg-logo`, `group-title` 等）。
  - `/txt`：TVBox/DIYP 专用格式（`频道名,URL`）。
- **安全鉴权**：后台管理页面受密码保护。

---

## 🚀 快速部署

### 方式一：使用 Cloudflare 网页后台（推荐新手）

1. **准备 KV Namespace**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
   - 进入 **Workers & Pages** -> **KV**。
   - 创建一个新的 Namespace，命名为 `IPTV_KV`。
   - **⚠️ 记下 Namespace ID**。

2. **创建 Worker**
   - 进入 **Workers & Pages** -> **Create Application** -> **Create Worker**。
   - 命名为 `iptv-manager` (或任意名称)，点击 **Deploy**。

3. **粘贴代码**
   - 点击 **Edit code**。
   - 将本项目中的 `worker.js` 内容完全覆盖粘贴进去。
   - 保存并部署。

4. **配置环境变量 (关键步骤)**
   - 返回 Worker 的 **Settings** -> **Variables** 页面。
   - **添加变量 (Environment Variables)**:
     - 变量名: `PASSWORD`
     - 值: `设置您的管理密码` (为了安全，建议点击 Encrypt)。
   - **绑定 KV (KV Namespace Bindings)**:
     - 变量名: `IPTV_KV` (**必须完全一致**)
     - KV Namespace: 选择第 1 步创建的 `IPTV_KV`。
   - 点击 **Save and deploy**。

### 方式二：使用 Wrangler CLI

1. 克隆项目
   ```bash
   git clone https://github.com/gujiangjiang/cf-worker-iptv.git
   cd cf-worker-iptv
   ```

2. 创建 KV
   ```bash
   npx wrangler kv:namespace create IPTV_KV
   ```
   *将输出的 ID 填入 wrangler.toml*

3. 配置 `wrangler.toml`
   ```toml
   name = "iptv-manager"
   main = "worker.js"
   compatibility_date = "2023-10-30"

   [[kv_namespaces]]
   binding = "IPTV_KV"
   id = "替换为你的_KV_ID"

   [vars]
   PASSWORD = "your_secret_password"
   ```

4. 部署
   ```bash
   npx wrangler deploy
   ```

---

## 📖 使用指南

部署成功后，访问您的 Worker 域名（例如 `https://iptv-manager.您的子域.workers.dev`）。

### 1. 后台管理
- 打开首页，输入您设置的 `PASSWORD`。
- 点击 **“导入 M3U 文件”** 上传本地源，或手动 **“新增频道”**。
- 编辑完成后，务必点击 **“💾 保存更改到云端”**。

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
  - *对于个人或家庭使用，这个额度通常是绰绰有余的。*
- **缓存延迟**：KV 存储具有“最终一致性”，保存后可能需要几秒钟到一分钟才能在订阅接口更新，请耐心等待。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request。

## 📄 许可证

[MIT License](LICENSE)