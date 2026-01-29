/**
 * 前端 API 请求模块 (Login, Save, CRUD)
 */
export const apiMethods = `
    // 登录并加载数据
    async login() {
        this.loading = true;
        try {
            // 并行请求：列表、设置、分组
            const [listRes, settingsRes, groupsRes] = await Promise.all([
                fetch('/api/list', { headers: { 'Authorization': this.password } }),
                fetch('/api/settings', { headers: { 'Authorization': this.password } }),
                fetch('/api/groups', { headers: { 'Authorization': this.password } })
            ]);

            if(listRes.status === 401) {
                this.showToast('密码错误', 'error');
                localStorage.removeItem('iptv_pwd');
            } else {
                const rawList = await listRes.json();
                this.channels = rawList.map(this.standardizeChannel);

                const remoteSettings = await settingsRes.json();
                this.settings = { ...this.settings, ...remoteSettings };
                
                // 加载分组，如果没有，则从频道列表中提取
                let remoteGroups = await groupsRes.json();
                if (!remoteGroups || remoteGroups.length === 0) {
                    const extracted = new Set(this.channels.map(c => c.group || '默认'));
                    remoteGroups = Array.from(extracted);
                }
                this.groups = remoteGroups;

                this.isAuth = true;
                localStorage.setItem('iptv_pwd', this.password);
                
                // 修改：登录加载完数据后，进行一次分组排序
                this.sortChannelsByGroup();
                
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
            const [resList, resSettings, resGroups] = await Promise.all([
                fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': this.password },
                    body: JSON.stringify(this.channels)
                }),
                fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': this.password },
                    body: JSON.stringify(this.settings)
                }),
                fetch('/api/groups', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': this.password },
                    body: JSON.stringify(this.groups)
                })
            ]);

            if(resList.ok && resSettings.ok && resGroups.ok) this.showToast('保存成功！', 'success');
            else this.showToast('保存失败', 'error');
        } catch(e) {
            this.showToast('保存请求出错', 'error');
        }
        this.loading = false;
    },

    removeChannel(index) {
        this.openConfirmModal('deleteChannel', index);
    },
    
    clearAll() {
        this.openConfirmModal('clearAll');
    }
`;