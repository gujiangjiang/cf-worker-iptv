/**
 * 前端 API 请求模块 (Login, Save, CRUD)
 */
export const apiMethods = `
    // 登录并加载数据
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
                // 数据标准化处理
                this.channels = rawList.map(this.standardizeChannel);

                const remoteSettings = await settingsRes.json();
                this.settings = { ...this.settings, ...remoteSettings };
                this.isAuth = true;
                localStorage.setItem('iptv_pwd', this.password);
                
                // DOM 渲染后初始化拖拽
                this.$nextTick(() => { this.initSortable(); });
            }
        } catch(e) {
            console.error(e);
            this.showToast('连接服务器失败', 'error');
        }
        this.loading = false;
    },

    // 远程 URL 导入请求
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

    // 保存所有数据
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
    },

    // 基础操作
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
    }
`;