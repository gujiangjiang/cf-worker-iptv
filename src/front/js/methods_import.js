/**
 * 前端导入与逻辑处理模块
 */
export const importMethods = `
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    // 标准化名称：用于判定“是否为同一个频道” (完全匹配)
    normalizeName(name) {
        if (!name) return '';
        // 全角转半角
        let s = name.replace(/[\\uFF01-\\uFF5E]/g, function(c) { 
            return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); 
        }).replace(/\\u3000/g, ' ');
        s = s.toUpperCase();
        // 去除干扰字符，保留加号
        return s.replace(/[-_\\s\\.]/g, '');
    },

    // 清洗名称：去除常见的后缀，用于“疑似重复”的模糊匹配
    cleanChannelName(name) {
        if (!name) return '';
        let s = name.toUpperCase();
        
        // 1. 精准去除 "码率+分辨率" 格式后缀 
        // 修复：支持小数点的码率，例如 " 4.8M1080", " 18M2160"
        // \\d+(?:\\.\\d+)? 匹配整数或小数
        s = s.replace(/(?:[\\s-_]|^)\\d+(?:\\.\\d+)?M\\d*/g, ''); 
        
        // 2. 去除纯分辨率后缀 (如 " 1920*1080", " 1080P")
        s = s.replace(/\\s+\\d{3,4}[\\*x]\\d{3,4}/g, '');
        s = s.replace(/\\s+\\d{3,4}P/g, '');

        // 3. 去除视频属性 (FHD, HD, SD, HDR, HEVC, H.264/5)
        s = s.replace(/(?:[\\s-_]|^)(F?HD|SD|HEVC|HDR|H\\.26[45])/g, ''); 
        
        // 4. 去除括号内容 [xxx] (xxx)
        s = s.replace(/[\\[\\(].*?[\\]\\)]/g, ''); 
        s = s.replace(/测试/g, '');
        
        // 最后去除剩余符号和空格
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
                const existingCh = uniqueNewChannels[existingIndex];
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
            const key = this.normalizeName(ch.name); 
            if(key) existingMap.set(key, index);
        });

        const conflicts = []; 
        const safeToAdd = []; 

        uniqueNewChannels.forEach(newCh => {
            const newKey = this.normalizeName(newCh.name);
            const cleanNewKey = this.cleanChannelName(newCh.name);

            // A. 完全匹配检测
            if (existingMap.has(newKey)) {
                const existingIndex = existingMap.get(newKey);
                const existingChannel = this.channels[existingIndex];
                
                const existingUrls = new Set(existingChannel.sources.map(s => s.url));
                const isSubset = newCh.sources.every(s => existingUrls.has(s.url));

                if (isSubset) {
                    skippedDuplicateCount++;
                } else {
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

                if (nextChar && /\\d/.test(nextChar)) {
                    return false;
                }

                return true;
            });

            if (cleanKeyMatchIndex > -1) {
                fuzzyIndex = cleanKeyMatchIndex;
                conflicts.push({
                    newItem: newCh,
                    existingIndex: fuzzyIndex,
                    matchType: 'fuzzy',
                    suggestedName: this.channels[fuzzyIndex].name
                });
            } else {
                safeToAdd.push(newCh);
            }
        });

        if (safeToAdd.length > 0) {
            this.channels = [...safeToAdd, ...this.channels];
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