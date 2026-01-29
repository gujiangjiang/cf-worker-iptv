/**
 * 订阅导出模块
 * 功能：生成 M3U 和 TXT 格式的订阅内容
 */

import { corsHeaders, errorResponse } from './utils.js';

// 检查订阅权限辅助函数
function checkSubAuth(settings, urlParams, env, format) {
    const guestConfig = settings?.guestConfig || { allowSub: true, allowFormats: ['m3u', 'txt'] };
    
    // 1. 如果允许访客订阅，且格式在允许列表中 -> 通过
    const formatAllowed = guestConfig.allowFormats ? guestConfig.allowFormats.includes(format) : true;
    
    if (guestConfig.allowSub && formatAllowed) {
        return true;
    }

    // 2. 鉴权逻辑：检查 URL 参数中的 pwd
    const pwd = urlParams.get("pwd");
    if (!pwd) return false;

    // A. 匹配管理员密码 (最高权限)
    if (pwd === env.PASSWORD) return true;

    // B. 匹配独立订阅密码 (新增逻辑)
    // 只有当 settings 里设置了 subPassword 且不为空时才进行匹配
    if (settings && settings.subPassword && pwd === settings.subPassword) {
        return true;
    }

    return false;
}

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

        // 权限检查
        if (!checkSubAuth(settings, url.searchParams, env, 'm3u')) {
            return errorResponse("Access Denied: Invalid Password or Guest subscription disabled.", 403);
        }

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
            // 处理 EPG
            let epgUrlStr = "";
            if (Array.isArray(settings.epgs) && settings.epgs.length > 0) {
                epgUrlStr = settings.epgs
                    .filter(e => e.enabled && e.url)
                    .map(e => e.url)
                    .join(',');
            } else if (settings.epgUrl) {
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
                // --- 多源模式 ---
                sources.forEach(s => {
                    m3uContent += `#EXTINF:-1 tvg-name="${tvgName}" tvg-logo="${logo}" group-title="${group}",${name}\n${s.url}\n`;
                });
            } else {
                // --- 标准模式 ---
                let mainUrl = "";
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
        const url = new URL(request.url);

        const [data, groupsList, settings] = await Promise.all([
            env.IPTV_KV.get("channels", { type: "json" }),
            env.IPTV_KV.get("groups", { type: "json" }),
            env.IPTV_KV.get("settings", { type: "json" })
        ]);

        // 权限检查
        if (!checkSubAuth(settings, url.searchParams, env, 'txt')) {
             return errorResponse("Access Denied: Invalid Password or Guest subscription disabled.", 403);
        }

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
        let sortedGroupNames = [];
        if (groupsList && Array.isArray(groupsList)) {
            sortedGroupNames = [...groupsList];
        }
        
        const knownSet = new Set(sortedGroupNames);
        const otherGroups = Object.keys(groupsMap).filter(g => !knownSet.has(g));
        
        const defaultGroupIndex = otherGroups.indexOf('默认');
        if (defaultGroupIndex > -1) {
            otherGroups.splice(defaultGroupIndex, 1); 
        }
        
        const finalOrder = [...sortedGroupNames, ...otherGroups];
        if (groupsMap['默认']) finalOrder.push('默认'); 

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