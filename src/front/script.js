/**
 * 前端逻辑模块
 * 导出 Vue 应用的 JS 代码字符串
 */
export const jsContent = `
    const { createApp } = Vue;
    createApp({
        data() {
            return {
                isAuth: false,
                password: '',
                channels: [],
                settings: {
                    epgUrl: '',
                    catchup: '',
                    catchupSource: ''
                },
                toast: { show: false, message: '', type: 'success' },
                toastTimer: null,
                showSettings: false,
                loading: false,
                importUrl: '',
                baseUrl: window.location.origin,
                sortableInstance: null,
                
                // 冲突解决模态框状态
                conflictModal: {
                    show: false,
                    queue: [], 
                    currentItem: null, 
                    existingIndex: -1, 
                    action: 'merge', 
                    mergedUrls: [], 
                    selectedPrimary: '' 
                }
            }
        },
        computed: {
            toastClass() {
                return this.toast.type === 'error' ? 'bg-danger' : 'bg-success';
            }
        },
        mounted() {
            const savedPwd = localStorage.getItem('iptv_pwd');
            if(savedPwd) {
                this.password = savedPwd;
                this.login();
            }
        },
        methods: {
            showToast(message, type = 'success') {
                this.toast.message = message;
                this.toast.type = type;
                this.toast.show = true;
                if (this.toastTimer) clearTimeout(this.toastTimer);
                this.toastTimer = setTimeout(() => {
                    this.toast.show = false;
                }, 3000);
            },

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

            async login() {
                this.loading = true;
                try {
                    const [listRes, settingsRes] = await Promise.all([
                        fetch('/api/list', { headers: { 'Authorization': this.password } }),
                        fetch('/api/settings', { headers: { 'Authorization': this.password } })
                    ]);

                    if(listRes.status === 401) {
                        this.showToast('密码错误', 'error');
                        localStorage.removeItem('iptv_pwd');
                    } else {
                        const rawList = await listRes.json();
                        this.channels = rawList.map(this.standardizeChannel);

                        const remoteSettings = await settingsRes.json();
                        this.settings = { ...this.settings, ...remoteSettings };
                        this.isAuth = true;
                        localStorage.setItem('iptv_pwd', this.password);
                        
                        this.$nextTick(() => { this.initSortable(); });
                    }
                } catch(e) {
                    console.error(e);
                    this.showToast('连接服务器失败', 'error');
                }
                this.loading = false;
            },
            
            initSortable() {
                const el = document.getElementById('channel-list');
                if (!el) return;
                if (this.sortableInstance) this.sortableInstance.destroy();
                this.sortableInstance = Sortable.create(el, {
                    handle: '.drag-handle',
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    onEnd: (evt) => {
                        const item = this.channels[evt.oldIndex];
                        this.channels.splice(evt.oldIndex, 1);
                        this.channels.splice(evt.newIndex, 0, item);
                    }
                });
            },

            processImports(rawChannels) {
                let internalMergeCount = 0;
                
                // 1. 内部去重
                const uniqueNewChannels = [];
                const tempMap = new Map();

                rawChannels.forEach(ch => {
                    ch = this.standardizeChannel(ch);
                    const key = this.normalizeName(ch.name);
                    
                    if (!key) {
                        uniqueNewChannels.push(ch);
                        return;
                    }

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

                if (internalMergeCount > 0) {
                    this.showToast(\`自动合并了 \${internalMergeCount} 个同名频道的源\`, 'success');
                }

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
                        conflicts.push({
                            newItem: newCh,
                            existingIndex: existingMap.get(key)
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

            // 抽离的通用应用逻辑
            applyConflictLogic(action, index, newItem, primaryUrl, mergedUrls) {
                if (action === 'new') {
                    this.channels[index] = newItem;
                } else if (action === 'merge') {
                    let finalUrls = mergedUrls;
                    // 确保主源置顶
                    if (primaryUrl) {
                        finalUrls = finalUrls.filter(u => u !== primaryUrl);
                        finalUrls.unshift(primaryUrl);
                    }
                    this.channels[index].urls = finalUrls;
                }
                // action === 'old' 则不做任何修改
            },

            // 处理单条冲突 (按钮：确认处理)
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

            // 处理所有剩余冲突 (按钮：按此规则处理所有)
            resolveAllConflicts() {
                const action = this.conflictModal.action;

                // 1. 处理当前正在显示的一条 (尊重用户当前的选择)
                this.applyConflictLogic(
                    action,
                    this.conflictModal.existingIndex,
                    this.conflictModal.currentItem,
                    this.conflictModal.selectedPrimary,
                    this.conflictModal.mergedUrls
                );
                this.conflictModal.queue.shift();

                // 2. 循环处理队列中剩余的项
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
                        // 批量处理时的默认规则：现有源优先
                        primaryUrl = oldUrls.length > 0 ? oldUrls[0] : newUrls[0];
                    }

                    this.applyConflictLogic(action, index, newItem, primaryUrl, mergedUrls);
                    this.conflictModal.queue.shift();
                }

                // 3. 关闭模态框
                this.conflictModal.show = false;
                this.showToast('已批量处理所有重复项', 'success');
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
            
            async handleUrlImport() {
                if (!this.importUrl) return this.showToast('请输入有效的 URL', 'error');
                this.loading = true;
                try {
                    const res = await fetch('/api/fetch-m3u', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': this.password
                        },
                        body: JSON.stringify({ url: this.importUrl })
                    });
                    
                    if (res.ok) {
                        const text = await res.text();
                        this.parseM3U(text);
                        this.importUrl = '';
                    } else {
                        this.showToast('导入失败: ' + res.statusText, 'error');
                    }
                } catch (e) {
                    this.showToast('网络请求出错，请检查链接', 'error');
                }
                this.loading = false;
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
                        this.showSettings = true;
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
                            group: getAttr('group-title') || '未分组',
                            logo: getAttr('tvg-logo') || '',
                            tvgName: tvgName || displayName,
                            name: displayName
                        };
                        
                    } else if (line && !line.startsWith('#')) {
                        if (currentInfo.name) {
                            rawChannels.push({
                                ...currentInfo,
                                urls: [line]
                            });
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
            addChannel() {
                this.channels.unshift({ name: '新频道', tvgName: '新频道', group: '默认', logo: '', urls: [''] });
            },
            removeChannel(index) {
                this.channels.splice(index, 1);
            },
            clearAll() {
                if(confirm('确定要清空所有频道吗？')) {
                    this.channels = [];
                    this.showToast('列表已清空', 'success');
                }
            },
            async saveData() {
                this.loading = true;
                try {
                    const [resList, resSettings] = await Promise.all([
                        fetch('/api/save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': this.password },
                            body: JSON.stringify(this.channels)
                        }),
                        fetch('/api/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': this.password },
                            body: JSON.stringify(this.settings)
                        })
                    ]);

                    if(resList.ok && resSettings.ok) this.showToast('保存成功！', 'success');
                    else this.showToast('保存失败', 'error');
                } catch(e) {
                    this.showToast('保存请求出错', 'error');
                }
                this.loading = false;
            }
        }
    }).mount('#app');
`;