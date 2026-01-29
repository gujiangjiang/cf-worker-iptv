/**
 * 订阅导出模块
 * 功能：生成 M3U 和 TXT 格式的订阅内容
 */

import { corsHeaders, errorResponse } from './utils.js';

// 导出 M3U 格式
export async function handleM3uExport(request, env) {
    try {
        const url = new URL(request.url);
        const mode = url.searchParams.get("mode"); // 获取模式参数

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
            
            // 提取有效源
            let sources = [];
            if (Array.isArray(ch.sources) && ch.sources.length > 0) {
                sources = ch.sources.filter(s => s.enabled);
            } else if (ch.url) {
                // 兼容旧数据
                sources = [{ url: ch.url, isPrimary: true }];
            }

            if (mode === 'multi') {
                // --- 多源模式：输出所有启用的源，名称相同 ---
                sources.forEach(s => {
                    m3uContent += `#EXTINF:-1 tvg-name="${tvgName}" tvg-logo="${logo}" group-title="${group}",${name}\n${s.url}\n`;
                });
            } else {
                // --- 标准模式：只输出一个主源 ---
                let mainUrl = "";
                // 优先找标记为主源的
                const primary = sources.find(s => s.isPrimary);
                if (primary) mainUrl = primary.url;
                else if (sources.length > 0) {
                    // 兜底：没有主源标记，取第一个
                    mainUrl = sources[0].url;
                }

                if (mainUrl) {
                    m3uContent += `#EXTINF:-1 tvg-name="${tvgName}" tvg-logo="${logo}" group-title="${group}",${name}\n${mainUrl}\n`;
                }
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

// 导出 TXT 格式 (保持不变)
export async function handleTxtExport(request, env) {
    try {
        const data = await env.IPTV_KV.get("channels", { type: "json" });
        if (!data || !Array.isArray(data)) return new Response("", { headers: corsHeaders });

        let txtContent = "";
        const groups = {};
        
        data.forEach(ch => {
            const group = ch.group || "默认";
            if(!groups[group]) groups[group] = [];
            groups[group].push(ch);
        });

        for (const [groupName, channels] of Object.entries(groups)) {
            txtContent += `${groupName},#genre#\n`;
            channels.forEach(ch => {
                let urlStr = "";
                
                if (Array.isArray(ch.sources) && ch.sources.length > 0) {
                    // 过滤出所有启用的源
                    const enabledUrls = ch.sources.filter(s => s.enabled).map(s => s.url);
                    urlStr = enabledUrls.join('#');
                } else if (ch.url) {
                    urlStr = ch.url;
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