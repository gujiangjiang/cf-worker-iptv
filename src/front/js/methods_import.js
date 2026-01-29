/**
 * 前端导入与逻辑处理模块
 */
export const importMethods = `
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    normalizeName(name) {
        if (!name) return '';
        let s = name.replace(/[\\uFF01-\\uFF5E]/g, function(c) { 
            return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); 
        }).replace(/\\u3000/g, ' ');
        s = s.toUpperCase();
        return s.replace(/[-_\\s\\.]/g, '');
    },

    /**
     * 频道名称美化 (用于显示名和 EPG 名)
     * 功能：去除冗余后缀 (如 12M2160, 默认, 50fps)，保留原始大小写和核心名称
     */
    prettifyName(name) {
        if (!name) return '';
        let s = name.toString().trim(); // 保留原始大小写
        
        // 1. 去除 "默认" 前缀
        s = s.replace(/^默认/, '');

        // 2. 去除括号及内容 (支持全角/半角)
        s = s.replace(/[\\［\\［\\(\\[\\（].*?[\\］\\］\\)\\]\\）]/g, ''); 

        // 3. 码率/分辨率/编码清洗 (如 12M2160, 8M1080HEVC, Max16M)
        // 修复：添加 'i' 标志，支持 Max/max/MAX 及 hevc/HEVC 等大小写混合情况
        s = s.replace(/(?:[\\s-_]|^)(?:MAX)?\\d+(?:\\.\\d+)?M(?:\\d+)?(?:HDR|HEVC|H\\.26[45])?/gi, '');
        
        // 4. 纯分辨率清洗 (如 1920x1080, 1080P)
        s = s.replace(/\\s+\\d{3,4}[\\*x]\\d{3,4}/g, '');
        // 修复：添加 'i' 标志，支持 1080p/1080P
        s = s.replace(/(?:[\\s-_]|^)(?:576|720|1080|1440|2160|4320|8192)[IP]?/gi, '');
        
        // 5. 4K/8K 清洗 (只去除前面有空格的，保留 CCTV16-4K, 8K测试)
        s = s.replace(/\\s+(4K|8K)(?:\\b|$)/gi, '');

        // 6. 技术参数后缀 (FHD, HDR, HEVC, FPS...)
        // 修复：添加 'i' 标志
        s = s.replace(/(?:[\\s-_]|^)(F?HD|SD|HEVC|HDR|H\\.26[45]|FPS\\d+)/gi, ''); 
        
        return s.trim();
    },

    /**
     * 频道去重 Key 生成 (严格模式)
     * 功能：在美化基础上，转大写并去除所有特殊字符，用于比对重复
     */
    cleanChannelName(name) {
        if (!name) return '';
        // 先进行美化 (去除后缀)
        let s = this.prettifyName(name);
        // 再转大写并去除所有非字母数字字符
        return s.toUpperCase().replace(/[-_\\s]/g, '');
    },

    standardizeChannel(ch) {
        let sources = [];
        if (Array.isArray(ch.sources) && ch.sources.length > 0 && typeof ch.sources[0] === 'object') {
            sources = ch.sources.map(s => ({ ...s, _id: s._id || this.generateId() }));
        } else if (Array.isArray(ch.urls)) {
            sources = ch.urls.filter(u => u && u.trim()).map((u, idx) => ({
                url: u, enabled: true, isPrimary: idx === 0, _id: this.generateId()
            }));
        } else if (ch.url) {
            sources = [{ url: ch.url, enabled: true, isPrimary: true, _id: this.generateId() }];
        }

        if (sources.length > 0 && !sources.some(s => s.isPrimary && s.enabled)) {
            if(sources[0].enabled) sources[0].isPrimary = true;
        }

        const displayName = ch.name || '未知频道';
        const tvgName = (ch.tvgName !== undefined && ch.tvgName !== null) ? ch.tvgName : displayName;
        
        return {
            ...ch,
            id: ch.id || this.generateId(),
            name: displayName,
            tvgName: tvgName,
            logo: ch.logo || '',
            useLogo: !!ch.logo, 
            sources: sources
        };
    },

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.parseM3U(e.target.result);
            event.target.value = '';
            this.modals.import = false;
        };
        reader.readAsText(file);
    },

    parseM3U(content) {
        if (!content) return;
        const lines = content.split('\\n');
        const headerLine = lines.find(l => l.startsWith('#EXTM3U'));
        let settingsUpdated = false;
        
        if(headerLine) {
            const epgMatch = headerLine.match(/x-tvg-url="([^"]*)"/);
            const catchupMatch = headerLine.match(/catchup="([^"]*)"/);
            const sourceMatch = headerLine.match(/catchup-source="([^"]*)"/);
            
            if(epgMatch || catchupMatch || sourceMatch) {
                if(epgMatch) {
                    const urls = epgMatch[1].split(',');
                    this.settings.epgs = urls.filter(u => u.trim()).map(u => ({ 
                        url: u.trim(), enabled: true, _id: this.generateId()
                    }));
                }
                if(catchupMatch) this.settings.catchup = catchupMatch[1];
                if(sourceMatch) this.settings.catchupSource = sourceMatch[1];
                settingsUpdated = true;
            }
        }

        const rawChannels = [];
        let currentInfo = {};
        
        lines.forEach(line => {
            line = line.trim();
            if (line.includes('EXTINF:')) {
                let metaPart = line;
                let namePart = '';
                const lastComma = line.lastIndexOf(',');
                const lastQuote = line.lastIndexOf('"'); 
                if (lastComma > -1) {
                    metaPart = line.substring(0, lastComma);
                    namePart = line.substring(lastComma + 1).trim();
                }
                const getAttr = (key) => {
                    const regex = new RegExp(\`\${key}="([^"]*)"\`);
                    const match = metaPart.match(regex);
                    return match ? match[1] : '';
                };
                const tvgName = getAttr('tvg-name');
                const displayName = namePart || tvgName || '未知频道';
                currentInfo = {
                    group: getAttr('group-title') || '默认',
                    logo: getAttr('tvg-logo') || '',
                    tvgName: tvgName || displayName,
                    name: displayName
                };
            } else if (line && !line.startsWith('#')) {
                if (currentInfo.name) {
                    rawChannels.push({ 
                        ...currentInfo, 
                        sources: [{ url: line, enabled: true, isPrimary: true, _id: this.generateId() }] 
                    });
                    currentInfo = {};
                }
            }
        });
        
        if (rawChannels.length === 0) {
            this.showToast('未解析到有效频道', 'error');
            return;
        }
        if(settingsUpdated) this.showToast('已自动提取并更新 M3U 参数', 'success');
        this.processImports(rawChannels);
    },

    async handleUrlImport() {
        if (!this.importUrl) return this.showToast('请输入有效的 URL', 'error');
        this.loading = true;
        try {
            const res = await fetch('/api/fetch-m3u', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': this.password },
                body: JSON.stringify({ url: this.importUrl })
            });
            if (res.ok) {
                const text = await res.text();
                this.parseM3U(text);
                this.importUrl = '';
                this.modals.import = false;
            } else {
                this.showToast('导入失败: ' + res.statusText, 'error');
            }
        } catch (e) {
            this.showToast('网络请求出错，请检查链接', 'error');
        }
        this.loading = false;
    },

    processImports(rawChannels) {
        let internalMergeCount = 0;
        let skippedDuplicateCount = 0; 
        
        const newGroups = new Set(this.groups);
        let groupsAdded = 0;
        rawChannels.forEach(ch => {
            if(ch.group && !newGroups.has(ch.group)) {
                newGroups.add(ch.group);
                groupsAdded++;
            }
        });
        if(groupsAdded > 0) this.groups = Array.from(newGroups);

        const uniqueNewChannels = [];
        const tempMap = new Map();
        
        rawChannels.forEach(ch => {
            ch = this.standardizeChannel(ch); 
            
            // 1. 同步优化【频道名称】和【EPG名称】
            const prettyName = this.prettifyName(ch.name);
            const prettyTvg = this.prettifyName(ch.tvgName);
            
            // 如果优化后有变化且有效，则应用
            if (prettyName && prettyName !== ch.name) ch.name = prettyName;
            if (prettyTvg && prettyTvg !== ch.tvgName) ch.tvgName = prettyTvg;

            // 2. 生成去重 Key (使用 cleanChannelName 进行严格匹配)
            const key = this.cleanChannelName(ch.name) || this.normalizeName(ch.name); 

            if (!key) { uniqueNewChannels.push(ch); return; }
            
            if (tempMap.has(key)) {
                const existingIndex = tempMap.get(key);
                uniqueNewChannels[existingIndex].sources.push(...ch.sources);
                internalMergeCount++;
            } else {
                tempMap.set(key, uniqueNewChannels.length);
                uniqueNewChannels.push(ch);
            }
        });

        if (internalMergeCount > 0) this.showToast(\`导入文件中自动合并了 \${internalMergeCount} 个同名频道\`, 'success');

        const existingMap = new Map(); 
        this.channels.forEach((ch, index) => {
            const key = this.cleanChannelName(ch.name); 
            if(key) existingMap.set(key, { index, id: ch.id });
        });

        const conflicts = []; 
        const safeToAdd = []; 

        uniqueNewChannels.forEach(newCh => {
            // key 生成逻辑保持一致
            const key = this.cleanChannelName(newCh.name) || this.normalizeName(newCh.name);

            // A. 完全匹配检测
            if (existingMap.has(key)) {
                const { index: existingIndex, id: existingId } = existingMap.get(key);
                const existingChannel = this.channels[existingIndex];
                
                const existingUrls = new Set(existingChannel.sources.map(s => s.url));
                const isSubset = newCh.sources.every(s => existingUrls.has(s.url));

                if (isSubset) {
                    skippedDuplicateCount++;
                } else {
                    conflicts.push({
                        newItem: newCh,
                        existingId: existingId,
                        matchType: 'exact',
                        suggestedName: existingChannel.name
                    });
                }
                return;
            }

            // B. 模糊/疑似匹配检测
            let fuzzyTarget = null;
            
            // 使用 key (Cleaned Name) 进行包含检测
            const cleanNewKey = key;
            
            const cleanKeyMatchIndex = this.channels.findIndex(ch => {
                const existingClean = this.cleanChannelName(ch.name);
                if (!existingClean) return false;
                
                if (existingClean === cleanNewKey) return true;
                if (cleanNewKey.length <= 1 || existingClean.length <= 1) return false; 

                let longStr, shortStr;
                if (existingClean.includes(cleanNewKey)) {
                    longStr = existingClean;
                    shortStr = cleanNewKey;
                } else if (cleanNewKey.includes(existingClean)) {
                    longStr = cleanNewKey;
                    shortStr = existingClean;
                } else {
                    return false;
                }

                const matchIndex = longStr.indexOf(shortStr);
                const nextChar = longStr[matchIndex + shortStr.length];
                if (nextChar && /\\d/.test(nextChar)) return false;

                return true;
            });

            if (cleanKeyMatchIndex > -1) {
                fuzzyTarget = this.channels[cleanKeyMatchIndex];
                conflicts.push({
                    newItem: newCh,
                    existingId: fuzzyTarget.id,
                    matchType: 'fuzzy',
                    suggestedName: fuzzyTarget.name
                });
            } else {
                safeToAdd.push(newCh);
            }
        });

        if (safeToAdd.length > 0) {
            this.channels = [...safeToAdd, ...this.channels];
            this.sortChannelsByGroup();
        }

        if (conflicts.length > 0) {
            this.conflictModal.queue = conflicts;
            this.loadNextConflict();
        } else {
            let msg = \`导入完成，新增 \${safeToAdd.length} 个频道\`;
            if (skippedDuplicateCount > 0) {
                msg += \`，检测到 \${skippedDuplicateCount} 个完全一致或被包含的频道已自动忽略\`;
            }
            this.showToast(msg, 'success');
        }
    },

    loadNextConflict() {
        if (this.conflictModal.queue.length === 0) {
            this.conflictModal.show = false;
            this.showToast('所有导入项处理完毕', 'success');
            this.sortChannelsByGroup();
            return;
        }
        
        const conflict = this.conflictModal.queue[0];
        
        const currentIdx = this.channels.findIndex(c => c.id === conflict.existingId);
        
        if (currentIdx === -1) {
            this.channels.unshift(conflict.newItem);
            this.conflictModal.queue.shift();
            this.loadNextConflict();
            return;
        }

        const existingItem = this.channels[currentIdx];
        
        this.conflictModal.currentItem = conflict.newItem;
        this.conflictModal.existingIndex = currentIdx; 
        this.conflictModal.existingId = conflict.existingId; 
        this.conflictModal.matchType = conflict.matchType;
        this.conflictModal.suggestedName = conflict.suggestedName || existingItem.name;
        
        this.conflictModal.action = conflict.matchType === 'exact' ? 'merge' : 'new'; 
        this.conflictModal.manualTargetId = ''; 
        
        const oldUrls = existingItem.sources.map(s => s.url);
        const newUrls = conflict.newItem.sources.map(s => s.url);
        this.conflictModal.mergedUrls = [...new Set([...oldUrls, ...newUrls])];
        this.conflictModal.selectedPrimary = oldUrls.length > 0 ? oldUrls[0] : newUrls[0];
        
        this.conflictModal.show = true;
    },

    applyConflictLogic(action, index, newItem, primaryUrl, mergedUrlStrings) {
        if (action === 'new') {
            this.channels.unshift(newItem); 
        }
        else if (action === 'old') {
        }
        else if (action === 'merge') {
            const newSources = mergedUrlStrings.map(u => ({
                url: u,
                enabled: true,
                isPrimary: u === primaryUrl,
                _id: this.generateId()
            }));
            if (this.channels[index]) {
                this.channels[index].sources = newSources;
            }
        }
    },

    resolveConflict() {
        if (this.conflictModal.action === 'manual') {
            const targetId = this.conflictModal.manualTargetId;
            if (!targetId) {
                return this.showToast('请先选择要合并的目标频道', 'warning');
            }
            
            const targetIdx = this.channels.findIndex(c => c.id === targetId);
            if (targetIdx === -1) {
                return this.showToast('目标频道不存在', 'error');
            }
            
            const targetItem = this.channels[targetIdx];
            const oldUrls = targetItem.sources.map(s => s.url);
            const newUrls = this.conflictModal.currentItem.sources.map(s => s.url);
            const mergedUrls = [...new Set([...oldUrls, ...newUrls])];
            const primaryUrl = oldUrls.length > 0 ? oldUrls[0] : newUrls[0]; 

            this.applyConflictLogic('merge', targetIdx, null, primaryUrl, mergedUrls);
        } else {
            this.applyConflictLogic(
                this.conflictModal.action, 
                this.conflictModal.existingIndex, 
                this.conflictModal.currentItem, 
                this.conflictModal.selectedPrimary, 
                this.conflictModal.mergedUrls
            );
        }

        this.conflictModal.queue.shift();
        this.loadNextConflict();
    },

    resolveAllConflicts() {
        const action = this.conflictModal.action;
        
        if (action === 'manual') {
            return this.showToast('手动纠错模式不支持批量应用，请逐个确认', 'warning');
        }
        
        this.applyConflictLogic(action, this.conflictModal.existingIndex, this.conflictModal.currentItem, this.conflictModal.selectedPrimary, this.conflictModal.mergedUrls);
        this.conflictModal.queue.shift();

        while(this.conflictModal.queue.length > 0) {
            const conflict = this.conflictModal.queue[0];
            const newItem = conflict.newItem;
            
            const idx = this.channels.findIndex(c => c.id === conflict.existingId);
            
            if (idx === -1 && action === 'merge') {
                 this.channels.unshift(newItem); 
                 this.conflictModal.queue.shift();
                 continue;
            }
            
            let primaryUrl = '';
            let mergedUrlStrings = [];
            
            if (action === 'merge') {
                const existingItem = this.channels[idx];
                const oldUrls = existingItem.sources.map(s => s.url);
                const newUrls = newItem.sources.map(s => s.url);
                mergedUrlStrings = [...new Set([...oldUrls, ...newUrls])];
                primaryUrl = oldUrls.length > 0 ? oldUrls[0] : newUrls[0];
            }
            
            this.applyConflictLogic(action, idx, newItem, primaryUrl, mergedUrlStrings);
            this.conflictModal.queue.shift();
        }
        
        this.conflictModal.show = false;
        this.showToast('已批量处理剩余项', 'success');
        this.sortChannelsByGroup(); 
    },

    cancelConflict() {
        this.conflictModal.show = false;
        this.conflictModal.queue = [];
        this.showToast('已停止后续导入', 'info');
        this.sortChannelsByGroup(); 
    }
`;