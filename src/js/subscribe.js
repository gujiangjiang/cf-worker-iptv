/**
 * 订阅导出模块
 * 功能：生成 M3U 和 TXT 格式的订阅内容
 */

import { corsHeaders, errorResponse } from './utils.js';

// 导出 M3U 格式
export async function handleM3uExport(request, env) {
    try {
        const url = new URL(request.url);
        const mode = url.searchParams.get("mode");

        // 获取 频道、设置、分组 信息
        const [channels, settings, groups] = await Promise.all([
            env.IPTV_KV.get("channels", { type: "json" }),
            env.IPTV_KV.get("settings", { type: "json" }),
            env.IPTV_KV.get("groups", { type: "json" })
        ]);

        if (!channels || !Array.isArray(channels)) return new Response("#EXTM3U", { headers: corsHeaders });

        // 根据分组顺序重排频道
        if (groups && Array.isArray(groups)) {
            const groupOrder = {};
            groups.forEach((g, i) => { groupOrder[g] = i; });

            channels.sort((a, b) => {
                const gA = a.group || '默认';
                const gB = b.group || '默认';
                const isDefaultA = (gA === '默认');
                const isDefaultB = (gB === '默认');

                if (isDefaultA && isDefaultB) return 0;
                if (isDefaultA) return 1;
                if (isDefaultB) return -1;

                const indexA = groupOrder.hasOwnProperty(gA) ? groupOrder[gA] : 99999;
                const indexB = groupOrder.hasOwnProperty(gB) ? groupOrder[gB] : 99999;
                return indexA - indexB;
            });
        }

        let m3uContent = "#EXTM3U";
        
        if (settings) {
            // 处理 EPG：优先使用新的 epgs 数组，兼容旧的 epgUrl
            let epgUrlStr = "";
            if (Array.isArray(settings.epgs) && settings.epgs.length > 0) {
                // 过滤已启用的并拼接
                epgUrlStr = settings.epgs
                    .filter(e => e.enabled && e.url)
                    .map(e => e.url)
                    .join(',');
            } else if (settings.epgUrl) {
                // 旧版兼容
                epgUrlStr = settings.epgUrl;
            }

            if (epgUrlStr) m3uContent += ` x-tvg-url="${epgUrlStr}"`;
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
                else if (sources.length > 0) mainUrl = sources[0].url;

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

// 导出 TXT 格式
export async function handleTxtExport(request, env) {
    try {
        const [data, groupsList] = await Promise.all([
            env.IPTV_KV.get("channels", { type: "json" }),
            env.IPTV_KV.get("groups", { type: "json" })
        ]);

        if (!data || !Array.isArray(data)) return new Response("", { headers: corsHeaders });

        let txtContent = "";
        const groupsMap = {};
        
        // 1. 将频道按分组归类
        data.forEach(ch => {
            const group = ch.group || "默认";
            if(!groupsMap[group]) groupsMap[group] = [];
            groupsMap[group].push(ch);
        });

        // 2. 确定分组迭代顺序
        // 如果有自定义分组配置，优先使用配置顺序
        let sortedGroupNames = [];
        if (groupsList && Array.isArray(groupsList)) {
            sortedGroupNames = [...groupsList];
        }
        
        // 找出所有未在自定义列表中的分组（包括“默认”和新导入但未保存顺序的）
        const knownSet = new Set(sortedGroupNames);
        const otherGroups = Object.keys(groupsMap).filter(g => !knownSet.has(g));
        
        // 将剩余分组追加到最后 (默认分组会在这里面)
        // 我们可以稍微优化一下，把 '默认' 显式放到最后，其他未知的放在中间
        const defaultGroupIndex = otherGroups.indexOf('默认');
        if (defaultGroupIndex > -1) {
            otherGroups.splice(defaultGroupIndex, 1); // 移除默认
        }
        
        // 最终顺序: 自定义分组 -> 其他未知分组 -> 默认
        const finalOrder = [...sortedGroupNames, ...otherGroups];
        if (groupsMap['默认']) finalOrder.push('默认'); // 只有当存在默认分组数据时才添加

        // 3. 按顺序生成内容
        finalOrder.forEach(groupName => {
            const channels = groupsMap[groupName];
            if (channels && channels.length > 0) {
                txtContent += `${groupName},#genre#\n`;
                channels.forEach(ch => {
                    let urlStr = "";
                    if (Array.isArray(ch.sources) && ch.sources.length > 0) {
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
        });

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