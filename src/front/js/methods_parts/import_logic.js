/**
 * 导入处理逻辑 (解析, 网络请求, 冲突解决) - 深度优化版
 */
export const importLogic = `
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

    async handleUrlImport() {
        if (!this.importUrl) return this.showToast('请输入有效的 URL', 'error');
        this.loading = true;
        try {
            // 使用 returnText: true 获取文本内容
            const text = await this.fetchApi('/api/fetch-m3u', {
                method: 'POST',
                body: JSON.stringify({ url: this.importUrl }),
                returnText: true
            });
            
            this.parseM3U(text);
            this.importUrl = '';
            this.modals.import = false;
        } catch (e) {
            this.showToast('导入失败: ' + e.message, 'error');
        }
        this.loading = false;
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

    processImports(rawChannels) {
        let internalMergeCount = 0;
        let skippedDuplicateCount = 0; 
        
        const newGroups = new Set(this.groups);
        let groupsAdded = 0;
        rawChannels.forEach(ch => {
            if(ch.group && ch.group !== '默认' && !newGroups.has(ch.group)) {
                newGroups.add(ch.group);
                groupsAdded++;
            }
        });
        if(groupsAdded > 0) this.groups = Array.from(newGroups);

        // 1. 内部合并：新导入数据自身的去重
        const uniqueNewChannels = [];
        const tempMap = new Map();
        
        rawChannels.forEach(ch => {
            ch = this.standardizeChannel(ch); 
            const prettyName = this.prettifyName(ch.name);
            const prettyTvg = this.prettifyName(ch.tvgName);
            if (prettyName && prettyName !== ch.name) ch.name = prettyName;
            if (prettyTvg && prettyTvg !== ch.tvgName) ch.tvgName = prettyTvg;

            // 4K 频道特殊优化：CCTV/卫视的 4K 频道保留独立显示 (Name含4K)，但 EPG 去掉 4K 以匹配通用数据
            if (/(?:CCTV|卫视).*?4K/i.test(ch.name)) {
                 ch.tvgName = ch.tvgName.replace(/\\s*4K/gi, '').trim();
            }

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

        // 2. 准备现有数据索引 (精确匹配用)
        const existingMap = new Map(); 
        this.channels.forEach((ch, index) => {
            const key = this.cleanChannelName(ch.name); 
            if(key) existingMap.set(key, { index, id: ch.id });
        });

        // 3. 性能优化：预先缓存现有频道的"清洗名称"，避免在循环中重复计算 (O(N) 预处理)
        const cachedExistingChannels = this.channels.map(ch => ({
            original: ch,
            cleanName: this.cleanChannelName(ch.name)
        })).filter(item => item.cleanName);

        const conflicts = []; 
        const safeToAdd = []; 

        // 4. 对比新旧数据
        uniqueNewChannels.forEach(newCh => {
            const key = this.cleanChannelName(newCh.name) || this.normalizeName(newCh.name);
            
            // A. 精确匹配
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

            // B. 模糊匹配 (优化版：使用 cachedExistingChannels)
            let fuzzyTarget = null;
            const cleanNewKey = key;
            
            const cleanKeyMatchItem = cachedExistingChannels.find(cached => {
                const existingClean = cached.cleanName;
                if (existingClean === cleanNewKey) return true; // 理论上前面 Map 已经拦截了，但以防万一
                
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
                
                // 检查包含位置后一位是否为数字 (防止 CCTV1 匹配 CCTV11)
                const matchIndex = longStr.indexOf(shortStr);
                const nextChar = longStr[matchIndex + shortStr.length];
                if (nextChar && /\\d/.test(nextChar)) return false;
                
                return true;
            });

            if (cleanKeyMatchItem) {
                fuzzyTarget = cleanKeyMatchItem.original;
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
        } else if (action === 'merge') {
            const newSources = mergedUrlStrings.map(u => ({
                url: u, enabled: true, isPrimary: u === primaryUrl, _id: this.generateId()
            }));
            if (this.channels[index]) this.channels[index].sources = newSources;
        }
    },

    resolveConflict() {
        if (this.conflictModal.action === 'manual') {
            const targetId = this.conflictModal.manualTargetId;
            if (!targetId) return this.showToast('请先选择要合并的目标频道', 'warning');
            const targetIdx = this.channels.findIndex(c => c.id === targetId);
            if (targetIdx === -1) return this.showToast('目标频道不存在', 'error');
            
            const targetItem = this.channels[targetIdx];
            const oldUrls = targetItem.sources.map(s => s.url);
            const newUrls = this.conflictModal.currentItem.sources.map(s => s.url);
            const mergedUrls = [...new Set([...oldUrls, ...newUrls])];
            const primaryUrl = oldUrls.length > 0 ? oldUrls[0] : newUrls[0]; 
            this.applyConflictLogic('merge', targetIdx, null, primaryUrl, mergedUrls);
        } else {
            this.applyConflictLogic(
                this.conflictModal.action, this.conflictModal.existingIndex, this.conflictModal.currentItem, 
                this.conflictModal.selectedPrimary, this.conflictModal.mergedUrls
            );
        }
        this.conflictModal.queue.shift();
        this.loadNextConflict();
    },

    resolveAllConflicts() {
        const action = this.conflictModal.action;
        if (action === 'manual') return this.showToast('手动纠错模式不支持批量应用，请逐个确认', 'warning');
        
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