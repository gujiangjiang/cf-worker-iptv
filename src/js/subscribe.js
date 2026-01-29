/**
 * 订阅导出模块
 * 功能：生成 M3U 和 TXT 格式的订阅内容
 */

import { corsHeaders, errorResponse } from './utils.js';

// 导出 M3U 格式
export async function handleM3uExport(request, env) {
    try {
        const data = await env.IPTV_KV.get("channels", { type: "json" });
        if (!data || !Array.isArray(data)) return new Response("#EXTM3U", { headers: corsHeaders });

        let m3uContent = "#EXTM3U\n";
        data.forEach(ch => {
            // 确保没有 undefined 出现
            const name = ch.name || "未知频道";
            const logo = ch.logo || "";
            const group = ch.group || "默认";
            const url = ch.url || "";
            m3uContent += `#EXTINF:-1 tvg-name="${name}" tvg-logo="${logo}" group-title="${group}",${name}\n${url}\n`;
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