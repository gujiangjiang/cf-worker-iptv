/**
 * 前端 API 请求模块 (Login, Save, CRUD)
 */
export const apiMethods = `
    // 初始化：获取访客配置，并尝试加载列表
    async initGuest() {
        this.loading = true;
        try {
            const res = await fetch('/api/guest/config');
            if (res.ok) {
                this.publicGuestConfig = await res.json();
                
                // 如果允许访客查看，尝试加载列表
                if (this.publicGuestConfig.allowViewList) {
                    await this.tryLoadList(); 
                }
            }
        } catch (e) {
            console.error(e);
        }
        this.loading = false;
    },

    // 尝试加载列表 (不带密码，或者带密码)
    async tryLoadList() {
        const headers = {};
        if (this.password) headers['Authorization'] = this.password;

        try {
            const listRes = await fetch('/api/list', { headers });
            if (listRes.ok) {
                const rawList = await listRes.json();
                this.channels = rawList.map(this.standardizeChannel);
                this.$nextTick(() => { this.initSortable(); });
                return true;
            }
        } catch(e) { console.error(e); }
        return false;
    },

    // 登录并加载完整数据
    async login() {
        if (!this.password) return this.showToast('请输入密码', 'warning');

        this.loading = true;
        try {
            // 验证密码并获取所有数据
            const [listRes, settingsRes, groupsRes] = await Promise.all([
                fetch('/api/list', { headers: { 'Authorization': this.password } }),
                fetch('/api/settings', { headers: { 'Authorization': this.password } }),
                fetch('/api/groups', { headers: { 'Authorization': this.password } })
            ]);

            if(listRes.status === 401 || settingsRes.status === 401) {
                this.showToast('密码错误', 'error');
                localStorage.removeItem('iptv_pwd');
            } else {
                // 1. 处理频道列表
                const rawList = await listRes.json();
                this.channels = rawList.map(this.standardizeChannel);

                // 2. 处理设置 (合并默认值)
                const remoteSettings = await settingsRes.json();
                this.settings = { 
                    ...this.settings, 
                    ...remoteSettings,
                    guestConfig: { // 确保 guestConfig 结构完整
                        allowViewList: false,
                        allowSub: true,
                        allowFormats: ['m3u', 'txt'],
                        ...remoteSettings.guestConfig
                    }
                };
                
                // 3. 处理分组
                let remoteGroups = await groupsRes.json();
                if (!remoteGroups || remoteGroups.length === 0) {
                    const extracted = new Set(this.channels.map(c => c.group || '默认'));
                    remoteGroups = Array.from(extracted);
                }
                this.groups = remoteGroups;

                // 登录成功状态更新
                this.isAuth = true;
                this.modals.login = false; // 关闭登录弹窗
                localStorage.setItem('iptv_pwd', this.password);
                
                this.sortChannelsByGroup();
                this.$nextTick(() => { this.initSortable(); });
                this.showToast('登录成功', 'success');
            }
        } catch(e) {
            console.error(e);
            this.showToast('连接服务器失败', 'error');
        }
        this.loading = false;
    },

    // 退出登录
    logout() {
        this.isAuth = false;
        this.password = '';
        localStorage.removeItem('iptv_pwd');
        this.channels = []; // 清空数据
        this.settings.guestConfig = { allowViewList: false }; // 重置敏感配置
        this.showToast('已退出登录', 'info');
        
        // 重新初始化访客状态
        this.initGuest();
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

            if(resList.ok && resSettings.ok && resGroups.ok) {
                this.showToast('保存成功！', 'success');
                // 更新一下本地的 publicGuestConfig，以便退出后立马生效
                this.publicGuestConfig = JSON.parse(JSON.stringify(this.settings.guestConfig));
            }
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