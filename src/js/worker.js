/**
 * Cloudflare Worker IPTV Manager - 后端主逻辑
 * 功能：M3U解析、KV存储、订阅生成、API 处理
 */

import { html } from '../front/template.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 允许跨域（如果需要）
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 鉴权函数
    const checkAuth = (req) => {
      const auth = req.headers.get("Authorization");
      return auth === env.PASSWORD;
    };

    // 1. 首页：返回管理界面 (从 template.js 导入)
    if (path === "/") {
      return new Response(html, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // 2. API: 获取列表
    if (path === "/api/list") {
      if (!checkAuth(request)) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
      const data = await env.IPTV_KV.get("channels", { type: "json" });
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. API: 保存列表
    if (path === "/api/save" && request.method === "POST") {
      if (!checkAuth(request)) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
      const body = await request.json();
      await env.IPTV_KV.put("channels", JSON.stringify(body));
      return new Response("Saved", { headers: corsHeaders });
    }

    // 新增 API: 代理获取 M3U 内容 (解决前端跨域问题)
    if (path === "/api/fetch-m3u" && request.method === "POST") {
      if (!checkAuth(request)) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
      
      try {
        const body = await request.json();
        const targetUrl = body.url;
        
        if (!targetUrl) return new Response("Missing URL", { status: 400 });

        const response = await fetch(targetUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        
        if (!response.ok) return new Response("Fetch failed", { status: response.status });
        
        const text = await response.text();
        return new Response(text, { headers: corsHeaders });
      } catch (err) {
        return new Response(err.message, { status: 500 });
      }
    }

    // 4. 订阅输出: M3U 格式
    if (path === "/m3u") {
      const data = await env.IPTV_KV.get("channels", { type: "json" });
      if (!data || !Array.isArray(data)) return new Response("#EXTM3U", { headers: corsHeaders });

      let m3uContent = "#EXTM3U\n";
      data.forEach(ch => {
        m3uContent += `#EXTINF:-1 tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}\n${ch.url}\n`;
      });

      return new Response(m3uContent, {
        headers: { 
            ...corsHeaders,
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": 'inline; filename="playlist.m3u"' 
        },
      });
    }

    // 5. 订阅输出: TXT 格式 (多源/TVBox格式)
    if (path === "/txt") {
      const data = await env.IPTV_KV.get("channels", { type: "json" });
      if (!data || !Array.isArray(data)) return new Response("", { headers: corsHeaders });

      let txtContent = "";
      const groups = {};
      data.forEach(ch => {
        if(!groups[ch.group]) groups[ch.group] = [];
        groups[ch.group].push(ch);
      });

      for (const [groupName, channels] of Object.entries(groups)) {
          txtContent += `${groupName},#genre#\n`;
          channels.forEach(ch => {
              txtContent += `${ch.name},${ch.url}\n`;
          });
      }

      return new Response(txtContent, {
        headers: { 
            ...corsHeaders,
            "Content-Type": "text/plain; charset=utf-8" 
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};