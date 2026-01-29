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

            // 频道名称标准化 (模糊匹配逻辑)
            normalizeName(name) {
                if (!name) return '';
                // 1. 去除所有空格、横杠、下划线
                // 2. 转为大写
                // 3. 注意：保留 + 号，这样 CCTV5 和 CCTV5+ 会被视为不同
                return name.replace(/[-_\\s]/g, '').toUpperCase();
            },

            // 数据标准化：确保所有频道对象都有 urls 数组
            standardizeChannel(ch) {
                let urls = [];
                if (Array.isArray(ch.urls)) {
                    urls = ch.urls.filter(u => u && u.trim() !== ''); // 过滤空链接
                } else if (ch.url) {
                    urls = [ch.url];
                }
                
                // 确保 tvgName 存在
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

            // 核心导入逻辑：包含内部去重 + 外部冲突检测
            processImports(rawChannels) {
                let internalMergeCount = 0;
                
                // --- 第一步：内部去重 (处理导入文件本身的重复) ---
                const uniqueNewChannels = [];
                const tempMap = new Map(); // NormalizedKey -> index in uniqueNewChannels

                rawChannels.forEach(ch => {
                    ch = this.standardizeChannel(ch);
                    const key = this.normalizeName(ch.name);
                    
                    if (!key) {
                        uniqueNewChannels.push(ch); // 无名频道直接添加
                        return;
                    }

                    if (tempMap.has(key)) {
                        // 发现内部重复！自动合并源
                        const existingIndex = tempMap.get(key);
                        const existingCh = uniqueNewChannels[existingIndex];
                        
                        // 合并 URLs 并去重
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

                // --- 第二步：外部冲突检测 (与现有列表对比) ---
                const safeToAdd = [];
                const conflicts = [];
                
                // 建立现有频道的映射表
                const existingMap = new Map();
                this.channels.forEach((ch, index) => {
                    const key = this.normalizeName(ch.name);
                    if(key) existingMap.set(key, index);
                });

                uniqueNewChannels.forEach(newCh => {
                    const key = this.normalizeName(newCh.name);
                    
                    if (existingMap.has(key)) {
                        // 发现与现有数据冲突
                        conflicts.push({
                            newItem: newCh,
                            existingIndex: existingMap.get(key)
                        });
                    } else {
                        safeToAdd.push(newCh);
                    }
                });

                // 1. 添加无冲突的
                if (safeToAdd.length > 0) {
                    // 插入到列表头部
                    this.channels = [...safeToAdd, ...this.channels];
                }

                // 2. 处理冲突队列
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
                
                // 合并预览：去重
                this.conflictModal.mergedUrls = [...new Set([...oldUrls, ...newUrls])];
                // 默认选中旧的主源
                this.conflictModal.selectedPrimary = oldUrls.length > 0 ? oldUrls[0] : newUrls[0];
                
                this.conflictModal.show = true;
            },

            isUrlFromOld(url) {
                const existingItem = this.channels[this.conflictModal.existingIndex];
                return existingItem && existingItem.urls && existingItem.urls.includes(url);
            },

            resolveConflict() {
                const action = this.conflictModal.action;
                const index = this.conflictModal.existingIndex;
                const newItem = this.conflictModal.currentItem;

                if (action === 'new') {
                    // 覆盖：直接替换对象
                    this.channels[index] = newItem;
                } else if (action === 'merge') {
                    // 合并：更新 URLs
                    const primary = this.conflictModal.selectedPrimary;
                    let finalUrls = this.conflictModal.mergedUrls;
                    
                    // 调整主源顺序
                    finalUrls = finalUrls.filter(u => u !== primary);
                    finalUrls.unshift(primary);
                    
                    this.channels[index].urls = finalUrls;
                }
                // action === 'old' 则不做任何修改

                this.conflictModal.queue.shift();
                this.loadNextConflict();
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
                                urls: [line] // 初始封装为数组
                            });
                            currentInfo = {};
                        }
                    }
                });
                
                if (rawChannels.length === 0) {
                    this.showToast('未解析到有效频道', 'error');
                    return;
                }

                // 调用新的导入处理流程
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