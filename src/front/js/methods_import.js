/**
 * 前端导入与逻辑处理模块
 */
export const importMethods = `
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    // 标准化名称：去除所有特殊符号，转大写，用于完全匹配
    normalizeName(name) {
        if (!name) return '';
        return name.replace(/[-_\\s]/g, '').toUpperCase();
    },

    // 清洗名称：去除常见的后缀（分辨率、码率、特殊标记），保留核心名称，用于模糊匹配
    cleanChannelName(name) {
        if (!name) return '';
        let s = name.toUpperCase();
        s = s.replace(/\\s+\\d+M\\d*/g, ''); // 去除 " 8M", " 8M1080"
        s = s.replace(/\\s+\\d+K/g, '');     // 去除 " 4K", " 8K"
        s = s.replace(/\\s+(F?HD|SD|HEVC|HDR)/g, ''); // 去除 HD, FHD, HDR
        s = s.replace(/[\\[\\(].*?[\\]\\)]/g, ''); // 去除括号内容 [xxx] (xxx)
        s = s.replace(/测试/g, '');
        return s.replace(/[-_\\s]/g, ''); // 最后去除剩余符号和空格
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
        let skippedDuplicateCount = 0; // 新增：统计完全包含被跳过的数量
        
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

        // 1. 内部去重 (完全同名直接合并)
        const uniqueNewChannels = [];
        const tempMap = new Map();
        
        rawChannels.forEach(ch => {
            ch = this.standardizeChannel(ch); 
            const key = this.normalizeName(ch.name);
            if (!key) { uniqueNewChannels.push(ch); return; }
            if (tempMap.has(key)) {
                const existingIndex = tempMap.get(key);
                const existingCh = uniqueNewChannels[existingIndex];
                uniqueNewChannels[existingIndex].sources.push(...ch.sources);
                internalMergeCount++;
            } else {
                tempMap.set(key, uniqueNewChannels.length);
                uniqueNewChannels.push(ch);
            }
        });

        if (internalMergeCount > 0) this.showToast(\`导入文件中自动合并了 \${internalMergeCount} 个同名频道\`, 'success');

        // 2. 构建现有频道映射表
        const existingMap = new Map(); 
        this.channels.forEach((ch, index) => {
            const key = this.normalizeName(ch.name);
            if(key) existingMap.set(key, index);
        });

        const conflicts = []; // 待处理的冲突队列
        const safeToAdd = []; // 可以直接添加的频道

        uniqueNewChannels.forEach(newCh => {
            const newKey = this.normalizeName(newCh.name);
            const cleanNewKey = this.cleanChannelName(newCh.name);

            // A. 完全匹配检测
            if (existingMap.has(newKey)) {
                const existingIndex = existingMap.get(newKey);
                const existingChannel = this.channels[existingIndex];
                
                // --- 新增逻辑：检测是否为完全子集 ---
                // 获取现有频道的所有 URL 集合
                const existingUrls = new Set(existingChannel.sources.map(s => s.url));
                
                // 检查新导入的所有源是否都已经存在
                const isSubset = newCh.sources.every(s => existingUrls.has(s.url));

                if (isSubset) {
                    // 如果所有新源都已经在老源里了，直接跳过，不需要用户确认
                    skippedDuplicateCount++;
                } else {
                    // 存在不一样的新源，才弹出冲突
                    conflicts.push({
                        newItem: newCh,
                        existingIndex: existingIndex,
                        matchType: 'exact',
                        suggestedName: existingChannel.name
                    });
                }
                return;
            }

            // B. 模糊/疑似匹配检测
            let fuzzyIndex = -1;
            const cleanKeyMatchIndex = this.channels.findIndex(ch => this.normalizeName(ch.name) === cleanNewKey);
            if (cleanKeyMatchIndex > -1) {
                fuzzyIndex = cleanKeyMatchIndex;
            } 
            else {
                if (cleanNewKey.length > 2) {
                    fuzzyIndex = this.channels.findIndex(ch => {
                        const existingClean = this.cleanChannelName(ch.name);
                        if (existingClean.length <= 2) return false;
                        return existingClean.includes(cleanNewKey) || cleanNewKey.includes(existingClean);
                    });
                }
            }

            if (fuzzyIndex > -1) {
                // 模糊匹配同样可以做一步子集检测，如果名字相似且源完全包含，也可以考虑跳过
                // 但为了安全起见（名字毕竟不一样），模糊匹配建议还是让用户确认一下比较好
                conflicts.push({
                    newItem: newCh,
                    existingIndex: fuzzyIndex,
                    matchType: 'fuzzy',
                    suggestedName: this.channels[fuzzyIndex].name
                });
            } else {
                // 无冲突，直接添加
                safeToAdd.push(newCh);
            }
        });

        // 3. 执行添加
        if (safeToAdd.length > 0) {
            this.channels = [...safeToAdd, ...this.channels];
        }

        // 4. 处理冲突
        if (conflicts.length > 0) {
            this.conflictModal.queue = conflicts;
            this.loadNextConflict();
        } else {
            let msg = \`导入完成，新增 \${safeToAdd.length} 个频道\`;
            if (skippedDuplicateCount > 0) {
                msg += \`，自动跳过 \${skippedDuplicateCount} 个完全重复项\`;
            }
            this.showToast(msg, 'success');
        }
    },

    loadNextConflict() {
        if (this.conflictModal.queue.length === 0) {
            this.conflictModal.show = false;
            this.showToast('所有导入项处理完毕', 'success');
            return;
        }
        
        const conflict = this.conflictModal.queue[0];
        const existingItem = this.channels[conflict.existingIndex];
        
        this.conflictModal.currentItem = conflict.newItem;
        this.conflictModal.existingIndex = conflict.existingIndex;
        this.conflictModal.matchType = conflict.matchType;
        this.conflictModal.suggestedName = conflict.suggestedName;
        
        this.conflictModal.action = conflict.matchType === 'exact' ? 'merge' : 'new'; 
        
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
            this.channels[index].sources = newSources;
        }
    },

    resolveConflict() {
        this.applyConflictLogic(
            this.conflictModal.action, 
            this.conflictModal.existingIndex, 
            this.conflictModal.currentItem, 
            this.conflictModal.selectedPrimary, 
            this.conflictModal.mergedUrls
        );
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
        this.showToast('已批量处理剩余项', 'success');
    },

    cancelConflict() {
        this.conflictModal.show = false;
        this.conflictModal.queue = [];
        this.showToast('已停止后续导入', 'info');
    }
`;