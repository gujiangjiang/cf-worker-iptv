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

    cleanChannelName(name) {
        if (!name) return '';
        let s = name.toUpperCase();
        s = s.replace(/(?:[\\s-_]|^)\\d+(?:\\.\\d+)?M\\d*/g, ''); 
        s = s.replace(/\\s+\\d{3,4}[\\*x]\\d{3,4}/g, '');
        s = s.replace(/\\s+\\d{3,4}P/g, '');
        s = s.replace(/(?:[\\s-_]|^)(F?HD|SD|HEVC|HDR|H\\.26[45])/g, ''); 
        s = s.replace(/[\\[\\(].*?[\\]\\)]/g, ''); 
        s = s.replace(/测试/g, '');
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
            const key = this.normalizeName(ch.name); 
            if (!key) { uniqueNewChannels.push(ch); return; }
            
            if (tempMap.has(key)) {
                const existingIndex = tempMap.get(key);
                // 这里是新导入数据内部合并，因为 uniqueNewChannels 是新数组，索引是稳定的
                uniqueNewChannels[existingIndex].sources.push(...ch.sources);
                internalMergeCount++;
            } else {
                tempMap.set(key, uniqueNewChannels.length);
                uniqueNewChannels.push(ch);
            }
        });

        if (internalMergeCount > 0) this.showToast(\`导入文件中自动合并了 \${internalMergeCount} 个同名频道\`, 'success');

        const existingMap = new Map(); 
        // 记录 ID 映射，以便后续冲突处理时能找到正确的频道
        this.channels.forEach((ch, index) => {
            const key = this.normalizeName(ch.name); 
            if(key) existingMap.set(key, { index, id: ch.id });
        });

        const conflicts = []; 
        const safeToAdd = []; 

        uniqueNewChannels.forEach(newCh => {
            const newKey = this.normalizeName(newCh.name);
            const cleanNewKey = this.cleanChannelName(newCh.name);

            // A. 完全匹配检测
            if (existingMap.has(newKey)) {
                const { index: existingIndex, id: existingId } = existingMap.get(newKey);
                const existingChannel = this.channels[existingIndex];
                
                const existingUrls = new Set(existingChannel.sources.map(s => s.url));
                const isSubset = newCh.sources.every(s => existingUrls.has(s.url));

                if (isSubset) {
                    skippedDuplicateCount++;
                } else {
                    conflicts.push({
                        newItem: newCh,
                        existingId: existingId, // 关键修复：存储 ID 而不是 Index
                        matchType: 'exact',
                        suggestedName: existingChannel.name
                    });
                }
                return;
            }

            // B. 模糊/疑似匹配检测
            let fuzzyTarget = null;
            
            const cleanKeyMatchIndex = this.channels.findIndex(ch => {
                const existingClean = this.cleanChannelName(ch.name);
                if (existingClean === cleanNewKey) return true;
                if (cleanNewKey.length <= 2 || existingClean.length <= 2) return false;

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
                    existingId: fuzzyTarget.id, // 关键修复：存储 ID
                    matchType: 'fuzzy',
                    suggestedName: fuzzyTarget.name
                });
            } else {
                safeToAdd.push(newCh);
            }
        });

        // 1. 先将无冲突的频道加入 (这会导致原数组索引偏移)
        if (safeToAdd.length > 0) {
            this.channels = [...safeToAdd, ...this.channels];
            // 关键修复：新增数据后立即排序，确保"默认"分组沉底，防止看起来乱序
            this.sortChannelsByGroup();
        }

        // 2. 开始处理冲突队列
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
            // 所有冲突处理完后再排一次序，确保整洁
            this.sortChannelsByGroup();
            return;
        }
        
        const conflict = this.conflictModal.queue[0];
        
        // 关键修复：实时通过 ID 查找最新的 Index，解决数组长度变化导致的索引错乱
        const currentIdx = this.channels.findIndex(c => c.id === conflict.existingId);
        
        if (currentIdx === -1) {
            // 防御性代码：如果找不到原频道(可能已被删除)，则直接视为新频道添加
            this.channels.unshift(conflict.newItem);
            this.conflictModal.queue.shift();
            this.loadNextConflict();
            return;
        }

        const existingItem = this.channels[currentIdx];
        
        this.conflictModal.currentItem = conflict.newItem;
        this.conflictModal.existingIndex = currentIdx; // 更新为实时索引
        this.conflictModal.existingId = conflict.existingId; // 保存 ID
        this.conflictModal.matchType = conflict.matchType;
        this.conflictModal.suggestedName = conflict.suggestedName || existingItem.name;
        
        this.conflictModal.action = conflict.matchType === 'exact' ? 'merge' : 'new'; 
        this.conflictModal.manualTargetId = ''; // 重置手动选择
        
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
            // 丢弃，不做任何事
        }
        else if (action === 'merge') {
            // 合并到现有频道 (index)
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
        // 特殊处理手动模式
        if (this.conflictModal.action === 'manual') {
            const targetId = this.conflictModal.manualTargetId;
            if (!targetId) {
                return this.showToast('请先选择要合并的目标频道', 'warning');
            }
            
            // 关键修复：通过 ID 查找目标索引
            const targetIdx = this.channels.findIndex(c => c.id === targetId);
            if (targetIdx === -1) {
                return this.showToast('目标频道不存在', 'error');
            }
            
            // 重新计算合并：目标频道原有源 + 新导入源
            const targetItem = this.channels[targetIdx];
            const oldUrls = targetItem.sources.map(s => s.url);
            const newUrls = this.conflictModal.currentItem.sources.map(s => s.url);
            const mergedUrls = [...new Set([...oldUrls, ...newUrls])];
            const primaryUrl = oldUrls.length > 0 ? oldUrls[0] : newUrls[0]; // 默认保持原有主源

            this.applyConflictLogic('merge', targetIdx, null, primaryUrl, mergedUrls);
        } else {
            // 标准模式 (新增/丢弃/推荐合并)
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

    // 批量处理
    resolveAllConflicts() {
        const action = this.conflictModal.action;
        
        if (action === 'manual') {
            return this.showToast('手动纠错模式不支持批量应用，请逐个确认', 'warning');
        }
        
        // 处理当前显示的这一项
        this.applyConflictLogic(action, this.conflictModal.existingIndex, this.conflictModal.currentItem, this.conflictModal.selectedPrimary, this.conflictModal.mergedUrls);
        this.conflictModal.queue.shift();

        // 循环处理队列中剩余项
        // 注意：如果 action 是 'new'，channels 数组长度会不断变化，所以必须每次通过 ID 查找
        while(this.conflictModal.queue.length > 0) {
            const conflict = this.conflictModal.queue[0];
            const newItem = conflict.newItem;
            
            // 关键修复：实时查找索引
            const idx = this.channels.findIndex(c => c.id === conflict.existingId);
            
            // 如果找不到了（极端情况），对于 merge 操作只能作为 new 处理，或者跳过
            if (idx === -1 && action === 'merge') {
                 this.channels.unshift(newItem); // Fallback to new
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
        this.sortChannelsByGroup(); // 批量处理完后整理排序
    },

    cancelConflict() {
        this.conflictModal.show = false;
        this.conflictModal.queue = [];
        this.showToast('已停止后续导入', 'info');
        this.sortChannelsByGroup(); // 停止后也整理一下
    }
`;