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
        // 去除常见的后缀模式，例如 " 4K", " 8M1080", " FHD", " [测试]"
        // \\s+ 匹配前面的空格，后面跟特定的技术参数
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
                const lastQuote = line.lastIndexOf('"'); // 简单的判断，防止逗号在引号内
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
        const existingMap = new Map(); // key: normalizedName, value: index
        this.channels.forEach((ch, index) => {
            const key = this.normalizeName(ch.name);
            if(key) existingMap.set(key, index);
        });

        const conflicts = []; // 待处理的冲突队列
        const safeToAdd = []; // 可以直接添加的频道

        uniqueNewChannels.forEach(newCh => {
            const newKey = this.normalizeName(newCh.name);
            const cleanNewKey = this.cleanChannelName(newCh.name); // 清洗后的 key 用于模糊匹配

            // A. 完全匹配检测
            if (existingMap.has(newKey)) {
                conflicts.push({
                    newItem: newCh,
                    existingIndex: existingMap.get(newKey),
                    matchType: 'exact',
                    suggestedName: this.channels[existingMap.get(newKey)].name
                });
                return;
            }

            // B. 模糊/疑似匹配检测
            let fuzzyIndex = -1;
            
            // B1. 尝试清洗名称后匹配 (如 "CCTV1 4K" -> "CCTV1")
            const cleanKeyMatchIndex = this.channels.findIndex(ch => this.normalizeName(ch.name) === cleanNewKey);
            if (cleanKeyMatchIndex > -1) {
                fuzzyIndex = cleanKeyMatchIndex;
            } 
            // B2. 包含关系检测 (如 "凤凰卫视中文台" vs "凤凰中文")
            else {
                // 只有当名字长度大于2才检测包含关系，避免 "CCTV" 匹配到所有台
                if (cleanNewKey.length > 2) {
                    fuzzyIndex = this.channels.findIndex(ch => {
                        const existingClean = this.cleanChannelName(ch.name);
                        if (existingClean.length <= 2) return false;
                        return existingClean.includes(cleanNewKey) || cleanNewKey.includes(existingClean);
                    });
                }
            }

            if (fuzzyIndex > -1) {
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
            // 新频道添加到列表头部
            this.channels = [...safeToAdd, ...this.channels];
        }

        // 4. 处理冲突
        if (conflicts.length > 0) {
            this.conflictModal.queue = conflicts;
            this.loadNextConflict();
        } else {
            this.showToast(\`导入完成，共添加 \${safeToAdd.length} 个新频道\`, 'success');
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
        
        // 默认动作：完全匹配默认合并，疑似匹配默认添加为新频道(为了安全)
        this.conflictModal.action = conflict.matchType === 'exact' ? 'merge' : 'new'; 
        
        // 准备 URL 列表供预览
        const oldUrls = existingItem.sources.map(s => s.url);
        const newUrls = conflict.newItem.sources.map(s => s.url);
        this.conflictModal.mergedUrls = [...new Set([...oldUrls, ...newUrls])];
        this.conflictModal.selectedPrimary = oldUrls.length > 0 ? oldUrls[0] : newUrls[0];
        
        this.conflictModal.show = true;
    },

    applyConflictLogic(action, index, newItem, primaryUrl, mergedUrlStrings) {
        if (action === 'new') {
            // 作为新频道添加
            this.channels.unshift(newItem); 
        }
        else if (action === 'old') {
            // 仅保留旧版 = 丢弃新版 (什么都不做)
        }
        else if (action === 'merge') {
            // 合并到现有频道
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
        
        // 处理当前显示的这一条
        this.applyConflictLogic(action, this.conflictModal.existingIndex, this.conflictModal.currentItem, this.conflictModal.selectedPrimary, this.conflictModal.mergedUrls);
        this.conflictModal.queue.shift(); // 移除当前

        // 处理剩余队列
        while(this.conflictModal.queue.length > 0) {
            const conflict = this.conflictModal.queue[0];
            
            // 注意：如果批量操作是 'merge'，且是 fuzzy 匹配，这里会强制合并到疑似对象
            // 这可能不是用户想要的，但既然用户点了“批量处理”，就按当前选择的 action 执行
            
            // 为了安全起见，如果是批量处理，我们仅对 matchType 相同的项应用逻辑？
            // 简便起见，这里全部应用。用户使用批量功能需谨慎。
            
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