/**
 * 前端导入与逻辑处理模块
 */
export const importMethods = `
    normalizeName(name) {
        if (!name) return '';
        return name.replace(/[-_\\s]/g, '').toUpperCase();
    },

    standardizeChannel(ch) {
        let urls = [];
        if (Array.isArray(ch.urls)) {
            urls = ch.urls.filter(u => u && u.trim() !== '');
        } else if (ch.url) {
            urls = [ch.url];
        }
        const displayName = ch.name || '未知频道';
        const tvgName = (ch.tvgName !== undefined && ch.tvgName !== null && ch.tvgName !== '') ? ch.tvgName : displayName;
        return {
            ...ch,
            name: displayName,
            tvgName: tvgName,
            urls: urls
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
        if(headerLine) {
            const epgMatch = headerLine.match(/x-tvg-url="([^"]*)"/);
            const catchupMatch = headerLine.match(/catchup="([^"]*)"/);
            const sourceMatch = headerLine.match(/catchup-source="([^"]*)"/);
            if(epgMatch || catchupMatch || sourceMatch) {
                if(epgMatch) this.settings.epgUrl = epgMatch[1];
                if(catchupMatch) this.settings.catchup = catchupMatch[1];
                if(sourceMatch) this.settings.catchupSource = sourceMatch[1];
                // 自动打开设置模态框提示用户
                this.modals.settings = true;
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
                    rawChannels.push({ ...currentInfo, urls: [line] });
                    currentInfo = {};
                }
            }
        });
        
        if (rawChannels.length === 0) {
            this.showToast('未解析到有效频道', 'error');
            return;
        }

        this.processImports(rawChannels);
    },

    processImports(rawChannels) {
        let internalMergeCount = 0;
        
        // 0. 提取并同步新分组
        const newGroups = new Set(this.groups);
        let groupsAdded = 0;
        rawChannels.forEach(ch => {
            if(ch.group && !newGroups.has(ch.group)) {
                newGroups.add(ch.group);
                groupsAdded++;
            }
        });
        if(groupsAdded > 0) {
            this.groups = Array.from(newGroups);
            this.showToast(\`自动添加了 \${groupsAdded} 个新分组\`, 'success');
        }

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
                const mergedUrls = [...new Set([...existingCh.urls, ...ch.urls])];
                uniqueNewChannels[existingIndex].urls = mergedUrls;
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
        const oldUrls = existingItem.urls || [];
        const newUrls = conflict.newItem.urls || [];
        this.conflictModal.mergedUrls = [...new Set([...oldUrls, ...newUrls])];
        this.conflictModal.selectedPrimary = oldUrls.length > 0 ? oldUrls[0] : newUrls[0];
        this.conflictModal.show = true;
    },

    isUrlFromOld(url) {
        const existingItem = this.channels[this.conflictModal.existingIndex];
        return existingItem && existingItem.urls && existingItem.urls.includes(url);
    },

    applyConflictLogic(action, index, newItem, primaryUrl, mergedUrls) {
        if (action === 'new') this.channels[index] = newItem;
        else if (action === 'merge') {
            let finalUrls = mergedUrls;
            if (primaryUrl) {
                finalUrls = finalUrls.filter(u => u !== primaryUrl);
                finalUrls.unshift(primaryUrl);
            }
            this.channels[index].urls = finalUrls;
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
            let mergedUrls = [];
            if (action === 'merge') {
                const oldUrls = existingItem.urls || [];
                const newUrls = newItem.urls || [];
                mergedUrls = [...new Set([...oldUrls, ...newUrls])];
                primaryUrl = oldUrls.length > 0 ? oldUrls[0] : newUrls[0];
            }
            this.applyConflictLogic(action, index, newItem, primaryUrl, mergedUrls);
            this.conflictModal.queue.shift();
        }
        this.conflictModal.show = false;
        this.showToast('已批量处理所有重复项', 'success');
    }
`;