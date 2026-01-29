/**
 * 前端导入与逻辑处理模块
 */
export const importMethods = `
    // 辅助：生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    normalizeName(name) {
        if (!name) return '';
        return name.replace(/[-_\\s]/g, '').toUpperCase();
    },

    // 数据标准化：确保每个对象都有唯一 ID
    standardizeChannel(ch) {
        let sources = [];
        
        // 1. 处理 sources
        if (Array.isArray(ch.sources) && ch.sources.length > 0 && typeof ch.sources[0] === 'object') {
            sources = ch.sources.map(s => ({
                ...s,
                _id: s._id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5) // 补全源 ID
            }));
        } 
        // 2. 处理 urls (字符串数组)
        else if (Array.isArray(ch.urls)) {
            sources = ch.urls.filter(u => u && u.trim()).map((u, idx) => ({
                url: u,
                enabled: true,
                isPrimary: idx === 0,
                _id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
            }));
        } 
        // 3. 处理单 url
        else if (ch.url) {
            sources = [{
                url: ch.url,
                enabled: true,
                isPrimary: true,
                _id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
            }];
        }

        // 确保主源逻辑
        if (sources.length > 0 && !sources.some(s => s.isPrimary && s.enabled)) {
            if(sources[0].enabled) sources[0].isPrimary = true;
        }

        const displayName = ch.name || '未知频道';
        const tvgName = (ch.tvgName !== undefined && ch.tvgName !== null) ? ch.tvgName : displayName;
        
        return {
            ...ch,
            id: ch.id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5), // 确保频道 ID
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
                    // 解析 M3U 时也生成 ID
                    this.settings.epgs = urls.filter(u => u.trim()).map(u => ({ 
                        url: u.trim(), 
                        enabled: true,
                        _id: this.generateId()
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
                if (lastComma > lastQuote && lastComma > -1) {
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
                    // M3U 导入默认生成
                    rawChannels.push({ 
                        ...currentInfo, 
                        sources: [{ 
                            url: line, 
                            enabled: true, 
                            isPrimary: true,
                            _id: this.generateId()
                        }] 
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
        
        // 0. 提取新分组
        const newGroups = new Set(this.groups);
        let groupsAdded = 0;
        rawChannels.forEach(ch => {
            if(ch.group && !newGroups.has(ch.group)) {
                newGroups.add(ch.group);
                groupsAdded++;
            }
        });
        if(groupsAdded > 0) this.groups = Array.from(newGroups);

        // 1. 内部去重
        const uniqueNewChannels = [];
        const tempMap = new Map();
        
        rawChannels.forEach(ch => {
            ch = this.standardizeChannel(ch); 
            const key = this.normalizeName(ch.name);
            if (!key) { uniqueNewChannels.push(ch); return; }
            if (tempMap.has(key)) {
                const existingIndex = tempMap.get(key);
                const existingCh = uniqueNewChannels[existingIndex];
                // 合并 sources
                const mergedSources = [...existingCh.sources, ...ch.sources];
                uniqueNewChannels[existingIndex].sources = mergedSources;
                internalMergeCount++;
            } else {
                tempMap.set(key, uniqueNewChannels.length);
                uniqueNewChannels.push(ch);
            }
        });

        if (internalMergeCount > 0) this.showToast(\`自动合并了 \${internalMergeCount} 个同名频道的源\`, 'success');

        // 2. 外部冲突检测
        const safeToAdd = [];
        const conflicts = [];
        const existingMap = new Map();
        this.channels.forEach((ch, index) => {
            const key = this.normalizeName(ch.name);
            if(key) existingMap.set(key, index);
        });

        uniqueNewChannels.forEach(newCh => {
            const key = this.normalizeName(newCh.name);
            if (existingMap.has(key)) {
                conflicts.push({ newItem: newCh, existingIndex: existingMap.get(key) });
            } else {
                safeToAdd.push(newCh);
            }
        });

        if (safeToAdd.length > 0) this.channels = [...safeToAdd, ...this.channels];
        if (conflicts.length > 0) {
            this.conflictModal.queue = conflicts;
            this.loadNextConflict();
        } else {
            this.showToast(\`成功导入 \${safeToAdd.length} 个新频道\`, 'success');
        }
    },

    loadNextConflict() {
        if (this.conflictModal.queue.length === 0) {
            this.conflictModal.show = false;
            this.showToast('所有冲突处理完毕', 'success');
            return;
        }
        const conflict = this.conflictModal.queue[0];
        const existingItem = this.channels[conflict.existingIndex];
        this.conflictModal.currentItem = conflict.newItem;
        this.conflictModal.existingIndex = conflict.existingIndex;
        this.conflictModal.action = 'merge'; 
        
        // 提取纯 URL 用于展示
        const oldUrls = existingItem.sources.map(s => s.url);
        const newUrls = conflict.newItem.sources.map(s => s.url);
        this.conflictModal.mergedUrls = [...new Set([...oldUrls, ...newUrls])];
        this.conflictModal.selectedPrimary = oldUrls.length > 0 ? oldUrls[0] : newUrls[0];
        this.conflictModal.show = true;
    },

    isUrlFromOld(url) {
        const existingItem = this.channels[this.conflictModal.existingIndex];
        return existingItem && existingItem.sources.some(s => s.url === url);
    },

    // 冲突应用逻辑 (适配新结构)
    applyConflictLogic(action, index, newItem, primaryUrl, mergedUrlStrings) {
        if (action === 'new') this.channels[index] = newItem;
        else if (action === 'merge') {
            // 合并时重新生成源对象，带ID
            const newSources = mergedUrlStrings.map(u => ({
                url: u,
                enabled: true,
                isPrimary: u === primaryUrl,
                _id: this.generateId()
            }));
            this.channels[index].sources = newSources;
        }
    },

    resolveConflict() {
        this.applyConflictLogic(this.conflictModal.action, this.conflictModal.existingIndex, this.conflictModal.currentItem, this.conflictModal.selectedPrimary, this.conflictModal.mergedUrls);
        this.conflictModal.queue.shift();
        this.loadNextConflict();
    },

    resolveAllConflicts() {
        const action = this.conflictModal.action;
        this.applyConflictLogic(action, this.conflictModal.existingIndex, this.conflictModal.currentItem, this.conflictModal.selectedPrimary, this.conflictModal.mergedUrls);
        this.conflictModal.queue.shift();
        while(this.conflictModal.queue.length > 0) {
            const conflict = this.conflictModal.queue[0];
            const index = conflict.existingIndex;
            const existingItem = this.channels[index];
            const newItem = conflict.newItem;
            let primaryUrl = '';
            let mergedUrlStrings = [];
            if (action === 'merge') {
                const oldUrls = existingItem.sources.map(s => s.url);
                const newUrls = newItem.sources.map(s => s.url);
                mergedUrlStrings = [...new Set([...oldUrls, ...newUrls])];
                primaryUrl = oldUrls.length > 0 ? oldUrls[0] : newUrls[0];
            }
            this.applyConflictLogic(action, index, newItem, primaryUrl, mergedUrlStrings);
            this.conflictModal.queue.shift();
        }
        this.conflictModal.show = false;
        this.showToast('已批量处理所有重复项', 'success');
    },

    // 新增：取消冲突处理
    cancelConflict() {
        this.conflictModal.show = false;
        this.conflictModal.queue = [];
        this.showToast('已取消导入', 'info');
    }
`;