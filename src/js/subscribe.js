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
            const name = ch.name || "未知频道";
            const tvgName = ch.tvgName || name; 
            const logo = ch.logo || "";
            const group = ch.group || "默认";
            
            // 数据结构兼容：优先取 urls 数组的第一个作为主源，如果没有则取旧版 url 字段
            let mainUrl = "";
            if (Array.isArray(ch.urls) && ch.urls.length > 0) {
                mainUrl = ch.urls[0];
            } else {
                mainUrl = ch.url || "";
            }
            
            if (mainUrl) {
                m3uContent += `#EXTINF:-1 tvg-name="${tvgName}" tvg-logo="${logo}" group-title="${group}",${name}\n${mainUrl}\n`;
            }
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
                // 多源处理：将 urls 数组用 # 连接
                let urlStr = "";
                if (Array.isArray(ch.urls) && ch.urls.length > 0) {
                    urlStr = ch.urls.join('#');
                } else {
                    urlStr = ch.url || "";
                }

                if (urlStr) {
                    txtContent += `${ch.name},${urlStr}\n`;
                }
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