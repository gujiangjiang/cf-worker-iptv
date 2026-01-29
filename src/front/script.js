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
                // Toast 状态
                toast: {
                    show: false,
                    message: '',
                    type: 'success' // success, error
                },
                toastTimer: null,
                
                showSettings: false,
                loading: false,
                importUrl: '',
                baseUrl: window.location.origin
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
            // 显示 Toast 消息
            showToast(message, type = 'success') {
                this.toast.message = message;
                this.toast.type = type;
                this.toast.show = true;
                
                if (this.toastTimer) clearTimeout(this.toastTimer);
                this.toastTimer = setTimeout(() => {
                    this.toast.show = false;
                }, 3000); // 3秒后自动消失
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
                        this.channels = await listRes.json();
                        const remoteSettings = await settingsRes.json();
                        this.settings = { ...this.settings, ...remoteSettings };
                        this.isAuth = true;
                        localStorage.setItem('iptv_pwd', this.password);
                    }
                } catch(e) {
                    this.showToast('连接服务器失败', 'error');
                }
                this.loading = false;
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
                let settingsFound = false;
                if(headerLine) {
                    const epgMatch = headerLine.match(/x-tvg-url="([^"]*)"/);
                    const catchupMatch = headerLine.match(/catchup="([^"]*)"/);
                    const sourceMatch = headerLine.match(/catchup-source="([^"]*)"/);
                    
                    if(epgMatch || catchupMatch || sourceMatch) {
                        if(epgMatch) this.settings.epgUrl = epgMatch[1];
                        if(catchupMatch) this.settings.catchup = catchupMatch[1];
                        if(sourceMatch) this.settings.catchupSource = sourceMatch[1];
                        settingsFound = true;
                        this.showSettings = true;
                    }
                }

                const newChannels = [];
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
                        currentInfo = {
                            group: getAttr('group-title') || '未分组',
                            logo: getAttr('tvg-logo') || '',
                            tvgName: tvgName || '',
                            name: namePart || tvgName || '未知频道'
                        };
                        
                    } else if (line && !line.startsWith('#')) {
                        if (currentInfo.name) {
                            newChannels.push({
                                ...currentInfo,
                                url: line
                            });
                            currentInfo = {};
                        }
                    }
                });
                
                if (newChannels.length === 0) {
                    this.showToast('未解析到有效频道，请检查文件格式', 'error');
                    return;
                }

                // 确认框涉及用户决策，仍保留为 confirm
                let msg = \`解析到 \${newChannels.length} 个频道。\`;
                if(settingsFound) msg += '\\n已自动提取并更新了全局设置。';
                msg += '\\n选择"确定"追加到现有列表，选择"取消"覆盖现有列表。';

                if(confirm(msg)) {
                        this.channels = [...this.channels, ...newChannels];
                } else {
                        this.channels = newChannels;
                }
                this.showToast(\`成功导入 \${newChannels.length} 个频道\`, 'success');
            },
            addChannel() {
                this.channels.unshift({ name: '新频道', tvgName: '', group: '默认', logo: '', url: '' });
            },
            removeChannel(index) {
                this.channels.splice(index, 1);
            },
            moveUp(index) {
                if (index > 0) {
                    const item = this.channels[index];
                    this.channels.splice(index, 1);
                    this.channels.splice(index - 1, 0, item);
                }
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