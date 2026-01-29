/**
 * 订阅导出模块
 * 功能：生成 M3U 和 TXT 格式的订阅内容
 */

import { corsHeaders, errorResponse } from './utils.js';

// 导出 M3U 格式
export async function handleM3uExport(request, env) {
    try {
        const [channels, settings] = await Promise.all([
            env.IPTV_KV.get("channels", { type: "json" }),
            env.IPTV_KV.get("settings", { type: "json" })
        ]);

        if (!channels || !Array.isArray(channels)) return new Response("#EXTM3U", { headers: corsHeaders });

        let m3uContent = "#EXTM3U";
        
        // 拼接头部全局配置信息
        if (settings) {
            if (settings.epgUrl) m3uContent += ` x-tvg-url="${settings.epgUrl}"`;
            if (settings.catchup) m3uContent += ` catchup="${settings.catchup}"`;
            if (settings.catchupSource) m3uContent += ` catchup-source="${settings.catchupSource}"`;
        }
        m3uContent += "\n";

        channels.forEach(ch => {
            // 确保没有 undefined 出现
            const name = ch.name || "未知频道"; // 显示名称
            // 如果 tvgName 不存在（旧数据），则回退使用 name，保证兼容性
            const tvgName = ch.tvgName || name; 
            const logo = ch.logo || "";
            const group = ch.group || "默认";
            const url = ch.url || "";
            
            // 构造 EXTINF 行：tvg-name使用独立字段，尾部使用显示名称
            m3uContent += `#EXTINF:-1 tvg-name="${tvgName}" tvg-logo="${logo}" group-title="${group}",${name}\n${url}\n`;
        });

        return new Response(m3uContent, {
            headers: { 
                ...corsHeaders,
                "Content-Type": "text/plain; charset=utf-8",
                "Content-Disposition": 'inline; filename="playlist.m3u"' 
            },
        });
    } catch (e) {
        return errorResponse("Error generating M3U", 500);
    }
}

// 导出 TXT 格式 (TVBox/DIYP)
export async function handleTxtExport(request, env) {
    try {
        const data = await env.IPTV_KV.get("channels", { type: "json" });
        if (!data || !Array.isArray(data)) return new Response("", { headers: corsHeaders });

        let txtContent = "";
        const groups = {};
        
        // 按分组聚合
        data.forEach(ch => {
            const group = ch.group || "默认";
            if(!groups[group]) groups[group] = [];
            groups[group].push(ch);
        });

        // 生成文本
        for (const [groupName, channels] of Object.entries(groups)) {
            txtContent += `${groupName},#genre#\n`;
            channels.forEach(ch => {
                // TXT 格式只显示“显示名称”
                txtContent += `${ch.name},${ch.url}\n`;
            });
        }

        return new Response(txtContent, {
            headers: { 
                ...corsHeaders,
                "Content-Type": "text/plain; charset=utf-8" 
            },
        });
    } catch (e) {
        return errorResponse("Error generating TXT", 500);
    }
}