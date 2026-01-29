/**
 * API 业务模块
 * 功能：处理前端的数据交互请求 (列表获取、保存、远程抓取、全局配置)
 */

import { checkAuth, corsHeaders, jsonResponse, errorResponse } from './utils.js';

// --- 内部 Helper: 通用 KV 保存逻辑 ---
async function saveKVHelper(request, env, key, validator = null) {
    if (!checkAuth(request, env)) return errorResponse("Unauthorized", 401);
    try {
        const body = await request.json();
        // 如果提供了校验函数且校验失败，直接返回错误
        if (validator) {
            const error = validator(body);
            if (error) return errorResponse(error, 400);
        }
        await env.IPTV_KV.put(key, JSON.stringify(body));
        return new Response("Saved", { headers: corsHeaders });
    } catch (e) {
        return errorResponse("Invalid Data", 400);
    }
}

// 获取访客配置 (无需鉴权，只返回必要的公共信息)
export async function handleGetGuestConfig(request, env) {
    try {
        const settings = await env.IPTV_KV.get("settings", { type: "json" }) || {};
        const guestConfig = settings.guestConfig || {
            allowViewList: false, // 默认禁止访客看列表
            allowSub: true,       // 默认允许订阅 (兼容旧版行为)
            allowFormats: ['m3u', 'txt']
        };
        return jsonResponse(guestConfig);
    } catch (e) {
        return errorResponse("Internal Server Error", 500);
    }
}

// 获取频道列表
export async function handleList(request, env) {
    const isAuth = checkAuth(request, env);
    
    // 如果未登录，检查是否允许访客查看
    if (!isAuth) {
        const settings = await env.IPTV_KV.get("settings", { type: "json" }) || {};
        const guestConfig = settings.guestConfig || { allowViewList: false };
        if (!guestConfig.allowViewList) {
            return errorResponse("Unauthorized / Guest View Disabled", 401);
        }
    }
    
    try {
        const data = await env.IPTV_KV.get("channels", { type: "json" });
        return jsonResponse(data || []);
    } catch (e) {
        return errorResponse("Internal Server Error", 500);
    }
}

// 保存频道列表 (使用通用 Helper)
export async function handleSave(request, env) {
    return saveKVHelper(request, env, "channels");
}

// 获取全局配置 (包含访客设置等敏感信息，需要鉴权)
export async function handleGetSettings(request, env) {
    if (!checkAuth(request, env)) return errorResponse("Unauthorized", 401);
    try {
        const data = await env.IPTV_KV.get("settings", { type: "json" });
        return jsonResponse(data || {});
    } catch (e) {
        return errorResponse("Internal Server Error", 500);
    }
}

// 保存全局配置 (使用通用 Helper + 校验逻辑)
export async function handleSaveSettings(request, env) {
    return saveKVHelper(request, env, "settings", (body) => {
        if (body.guestConfig && typeof body.guestConfig !== 'object') {
            return "Invalid Guest Config";
        }
        return null;
    });
}

// 获取分组列表 (新增)
export async function handleGetGroups(request, env) {
    if (!checkAuth(request, env)) return errorResponse("Unauthorized", 401);
    try {
        const data = await env.IPTV_KV.get("groups", { type: "json" });
        // 如果没有存储过分组，返回空数组，前端会处理默认逻辑
        return jsonResponse(data || []);
    } catch (e) {
        return errorResponse("Internal Server Error", 500);
    }
}

// 保存分组列表 (使用通用 Helper)
export async function handleSaveGroups(request, env) {
    return saveKVHelper(request, env, "groups");
}

// 代理获取远程 M3U 内容
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