/**
 * API 业务模块
 * 功能：处理前端的数据交互请求 (列表获取、保存、远程抓取、全局配置)
 */

import { checkAuth, corsHeaders, jsonResponse, errorResponse } from './utils.js';

// 获取频道列表
export async function handleList(request, env) {
    if (!checkAuth(request, env)) return errorResponse("Unauthorized", 401);
    
    try {
        const data = await env.IPTV_KV.get("channels", { type: "json" });
        return jsonResponse(data || []);
    } catch (e) {
        return errorResponse("Internal Server Error", 500);
    }
}

// 保存频道列表
export async function handleSave(request, env) {
    if (!checkAuth(request, env)) return errorResponse("Unauthorized", 401);
    
    try {
        const body = await request.json();
        await env.IPTV_KV.put("channels", JSON.stringify(body));
        return new Response("Saved", { headers: corsHeaders });
    } catch (e) {
        return errorResponse("Invalid Data", 400);
    }
}

// 获取全局配置 (EPG, Catchup 等)
export async function handleGetSettings(request, env) {
    if (!checkAuth(request, env)) return errorResponse("Unauthorized", 401);
    try {
        const data = await env.IPTV_KV.get("settings", { type: "json" });
        return jsonResponse(data || {});
    } catch (e) {
        return errorResponse("Internal Server Error", 500);
    }
}

// 保存全局配置
export async function handleSaveSettings(request, env) {
    if (!checkAuth(request, env)) return errorResponse("Unauthorized", 401);
    try {
        const body = await request.json();
        await env.IPTV_KV.put("settings", JSON.stringify(body));
        return new Response("Settings Saved", { headers: corsHeaders });
    } catch (e) {
        return errorResponse("Invalid Data", 400);
    }
}

// 代理获取远程 M3U 内容 (解决前端跨域问题)
export async function handleFetchM3u(request, env) {
    if (!checkAuth(request, env)) return errorResponse("Unauthorized", 401);
    
    try {
        const body = await request.json();
        const targetUrl = body.url;
        
        if (!targetUrl) return errorResponse("Missing URL", 400);

        const response = await fetch(targetUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        
        if (!response.ok) return errorResponse("Fetch failed", response.status);
        
        const text = await response.text();
        return new Response(text, { headers: corsHeaders });
    } catch (err) {
        return errorResponse(err.message, 500);
    }
}