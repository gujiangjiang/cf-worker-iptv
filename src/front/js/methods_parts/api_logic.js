/**
 * API 请求逻辑 (CRUD, Auth)
 */
export const apiLogic = `
    async initGuest() {
        this.loading = true;
        try {
            const res = await fetch('/api/guest/config');
            if (res.ok) {
                this.publicGuestConfig = await res.json();
                if (this.publicGuestConfig.allowViewList) {
                    await this.tryLoadList(); 
                }
            }
        } catch (e) { console.error(e); }
        this.loading = false;
    },

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

    async login(arg) {
        const isAutoLogin = (arg === true);
        if (!this.password) return this.showToast('请输入密码', 'warning');

        this.loading = true;
        try {
            const [listRes, settingsRes, groupsRes] = await Promise.all([
                fetch('/api/list', { headers: { 'Authorization': this.password } }),
                fetch('/api/settings', { headers: { 'Authorization': this.password } }),
                fetch('/api/groups', { headers: { 'Authorization': this.password } })
            ]);

            if(listRes.status === 401 || settingsRes.status === 401) {
                if (!isAutoLogin) this.showToast('密码错误', 'error');
                localStorage.removeItem('iptv_pwd');
            } else {
                const rawList = await listRes.json();
                this.channels = rawList.map(this.standardizeChannel);

                const remoteSettings = await settingsRes.json();
                this.settings = { 
                    ...this.settings, 
                    ...remoteSettings,
                    guestConfig: { 
                        allowViewList: false, allowSub: true, allowFormats: ['m3u', 'txt'],
                        ...remoteSettings.guestConfig
                    }
                };
                
                let remoteGroups = await groupsRes.json();
                if (!remoteGroups || remoteGroups.length === 0) {
                    const extracted = new Set(this.channels.map(c => c.group).filter(g => g && g !== '默认'));
                    remoteGroups = Array.from(extracted);
                } else {
                    remoteGroups = remoteGroups.filter(g => g !== '默认');
                }
                this.groups = remoteGroups;

                this.isAuth = true;
                this.modals.login = false; 
                localStorage.setItem('iptv_pwd', this.password);
                this.publicGuestConfig = JSON.parse(JSON.stringify(this.settings.guestConfig));

                this.sortChannelsByGroup();
                this.$nextTick(() => { this.initSortable(); });
                if (!isAutoLogin) this.showToast('登录成功', 'success');
            }
        } catch(e) {
            console.error(e);
            if (!isAutoLogin) this.showToast('连接服务器失败', 'error');
        }
        this.loading = false;
    },

    logout() {
        this.isAuth = false;
        this.password = '';
        localStorage.removeItem('iptv_pwd');
        this.channels = []; 
        this.settings.guestConfig = { allowViewList: false, allowSub: true, allowFormats: ['m3u', 'txt'] }; 
        this.showToast('已退出登录', 'info');
        this.initGuest();
    },

    async saveSettingsOnly() {
        this.loading = true;
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': this.password },
                body: JSON.stringify(this.settings)
            });
            if(res.ok) {
                this.showToast('系统设置已保存', 'success');
                this.publicGuestConfig = JSON.parse(JSON.stringify(this.settings.guestConfig));
            } else {
                this.showToast('保存设置失败', 'error');
            }
        } catch(e) { this.showToast('保存设置请求出错', 'error'); }
        this.loading = false;
    },

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
                this.publicGuestConfig = JSON.parse(JSON.stringify(this.settings.guestConfig));
            }
            else this.showToast('保存失败', 'error');
        } catch(e) { this.showToast('保存请求出错', 'error'); }
        this.loading = false;
    }
`;