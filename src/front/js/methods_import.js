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
     * 频道名称清洗 (用于去重 Key 生成，以及新频道自动命名)
     * 修复：不再去除 "测试/修复" 等关键词，避免不同频道撞车
     * 修复：只去除带空格的 4K/8K，保留 CCTV16-4K 或 8K测试
     */
    cleanChannelName(name) {
        if (!name) return '';
        let s = name.toUpperCase();
        
        // 1. 去除 "默认" 前缀
        s = s.replace(/^默认/, '');

        // 2. 去除括号及内容 (支持全角/半角)
        s = s.replace(/[\\［\\［\\(\\[\\（].*?[\\］\\］\\)\\]\\）]/g, ''); 

        // 3. 码率/分辨率/编码清洗 (如 12M2160, 8M1080HEVC)
        // 使用非捕获组，确保只匹配作为后缀或独立部分的参数
        s = s.replace(/(?:[\\s-_]|^)(?:MAX)?\\d+(?:\\.\\d+)?M(?:\\d+)?(?:HDR|HEVC|H\\.26[45])?/g, '');
        
        // 4. 纯分辨率清洗 (如 1920x1080, 1080P)
        s = s.replace(/\\s+\\d{3,4}[\\*x]\\d{3,4}/g, '');
        s = s.replace(/(?:[\\s-_]|^)(?:576|720|1080|1440|2160|4320|8192)[IP]?/g, '');
        
        // 5. 4K/8K 清洗 (关键修改：只去除前面有空格的，保留 CCTV16-4K, 8K测试)
        s = s.replace(/\\s+(4K|8K)(?:\\b|$)/g, '');

        // 6. 技术参数后缀 (FHD, HDR, HEVC...)
        s = s.replace(/(?:[\\s-_]|^)(F?HD|SD|HEVC|HDR|H\\.26[45]|FPS\\d+)/g, ''); 
        
        // 7. 移除 "测试/修复/频道" 等词的逻辑已删除，防止过度清洗导致撞车
        // 比如 "4K修复" 和 "8K测试" 如果去掉了关键字和分辨率，可能都变成空或特殊字符
        
        // 8. 去除首尾空白及特殊字符，只保留核心名称
        return s.replace(/[-_\\s]/g, ''); 
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
            
            // 关键修改：预先获取清洗后的名称
            // 注意：清洗后的名称可能为空(极端情况)，如果为空则回退到原名
            const cleanedNameRaw = this.cleanChannelName(ch.name);
            const key = cleanedNameRaw || this.normalizeName(ch.name); 

            if (!key) { uniqueNewChannels.push(ch); return; }
            
            if (tempMap.has(key)) {
                const existingIndex = tempMap.get(key);
                uniqueNewChannels[existingIndex].sources.push(...ch.sources);
                internalMergeCount++;
            } else {
                // 如果是新频道，自动应用清洗后的名称 (如: "SiTV欢笑剧场 12M2160" -> "SiTV欢笑剧场")
                if (cleanedNameRaw && cleanedNameRaw !== ch.name.replace(/[-_\\s]/g, '')) {
                     // 这里做一个简单的判断，如果 cleanedNameRaw 是 ch.name 的一部分（去除了冗余），则应用
                     // 由于 cleanChannelName 返回的是去除所有特殊字符的纯文本，我们需要小心赋值
                     // 简单做法：如果清洗逻辑判定它是冗余后缀，我们这里可以尝试还原一个好看的显示名
                     // 但为了稳妥，我们使用正则替换后的逻辑来生成显示名
                     
                     // 重新执行一遍非破坏性的替换来获取显示名（保留中文间的字符，仅去除后缀）
                     let prettyName = ch.name;
                     prettyName = prettyName.replace(/^默认/, '');
                     prettyName = prettyName.replace(/[\\［\\［\\(\\[\\（].*?[\\］\\］\\)\\]\\）]/g, '');
                     prettyName = prettyName.replace(/(?:[\\s-_]|^)(?:MAX)?\\d+(?:\\.\\d+)?M(?:\\d+)?(?:HDR|HEVC|H\\.26[45])?/g, '');
                     prettyName = prettyName.replace(/\\s+\\d{3,4}[\\*x]\\d{3,4}/g, '');
                     prettyName = prettyName.replace(/(?:[\\s-_]|^)(?:576|720|1080|1440|2160|4320|8192)[IP]?/g, '');
                     prettyName = prettyName.replace(/\\s+(4K|8K)(?:\\b|$)/g, ''); // 仅去除带空格的4K
                     prettyName = prettyName.replace(/(?:[\\s-_]|^)(F?HD|SD|HEVC|HDR|H\\.26[45]|FPS\\d+)/g, '');
                     prettyName = prettyName.trim();
                     
                     if(prettyName) ch.name = prettyName;
                }

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
            // key 和 cleanKey 逻辑一致
            const keyRaw = this.cleanChannelName(newCh.name);
            const key = keyRaw || this.normalizeName(newCh.name);

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
            
            // 使用 key (cleanChannelName) 进行包含检测
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