/**
 * Cloudflare Worker IPTV Manager - 主入口
 * 功能：路由分发，将请求转发给对应的处理模块
 */

import { html } from '../front/template.js';
import { corsHeaders } from './utils.js';
import * as api from './api.js';
import * as sub from './subscribe.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理 OPTIONS 预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 路由表
    switch (path) {
        case "/":
            // 首页：返回管理界面 HTML
            return new Response(html, {
                headers: { "Content-Type": "text/html;charset=UTF-8" },
            });

        case "/api/list":
            // API: 获取频道列表
            return api.handleList(request, env);

        case "/api/save":
            // API: 保存频道列表 (仅 POST)
            if (request.method === "POST") {
                return api.handleSave(request, env);
            }
            break;

        case "/api/fetch-m3u":
            // API: 远程抓取 M3U (仅 POST)
            if (request.method === "POST") {
                return api.handleFetchM3u(request, env);
            }
            break;

        case "/m3u":
            // 导出: M3U 订阅
            return sub.handleM3uExport(request, env);

        case "/txt":
            // 导出: TXT 订阅
            return sub.handleTxtExport(request, env);
            
        default:
            return new Response("Not Found", { status: 404 });
    }
    
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  },
};