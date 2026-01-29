/**
 * API 请求逻辑 (CRUD, Auth) - 修复版
 */
export const apiLogic = `
    async initGuest() {
        this.loading = true;
        try {
            // 访客接口不需要密码，但也兼容 fetchApi
            const config = await this.fetchApi('/api/guest/config');
            this.publicGuestConfig = config;
            if (config.allowViewList) {
                await this.tryLoadList(); 
            }
        } catch (e) { console.log('Guest init:', e.message); }
        this.loading = false;
    },

    async tryLoadList() {
        try {
            const rawList = await this.fetchApi('/api/list');
            this.channels = rawList.map(this.standardizeChannel);
            this.$nextTick(() => { this.initSortable(); });
            return true;
        } catch(e) { return false; }
    },

    async login(arg) {
        const isAutoLogin = (arg === true);
        if (!this.password) return this.showToast('请输入密码', 'warning');

        this.loading = true;
        try {
            const [rawList, remoteSettings, remoteGroups] = await Promise.all([
                this.fetchApi('/api/list', { skipAuthToast: isAutoLogin }),
                this.fetchApi('/api/settings', { skipAuthToast: isAutoLogin }),
                this.fetchApi('/api/groups', { skipAuthToast: isAutoLogin })
            ]);

            // 1. 处理列表
            this.channels = rawList.map(this.standardizeChannel);

            // 2. 处理设置
            this.settings = { 
                ...this.settings, 
                ...remoteSettings,
                guestConfig: { 
                    allowViewList: false, allowSub: true, allowFormats: ['m3u', 'txt'],
                    ...remoteSettings.guestConfig
                }
            };
            
            // 3. 处理分组
            let groups = remoteGroups;
            if (!groups || groups.length === 0) {
                const extracted = new Set(this.channels.map(c => c.group).filter(g => g && g !== '默认'));
                groups = Array.from(extracted);
            } else {
                groups = groups.filter(g => g !== '默认');
            }
            this.groups = groups;

            // 登录成功
            this.isAuth = true;
            this.modals.login = false; 
            localStorage.setItem('iptv_pwd', this.password);
            this.publicGuestConfig = JSON.parse(JSON.stringify(this.settings.guestConfig));

            this.sortChannelsByGroup();
            this.$nextTick(() => { this.initSortable(); });
            
            if (!isAutoLogin) this.showToast('登录成功', 'success');

        } catch(e) {
            console.error(e);
            if (!isAutoLogin && e.message !== 'Unauthorized') {
                this.showToast('连接服务器失败', 'error');
            }
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

    // 修复：增加 successMsg 参数，支持自定义成功提示语
    async saveSettingsOnly(successMsg = '设置已保存') {
        this.loading = true;
        try {
            // 修复：添加 returnText: true，防止解析纯文本响应时报错
            await this.fetchApi('/api/settings', {
                method: 'POST',
                body: JSON.stringify(this.settings),
                returnText: true 
            });
            this.showToast(successMsg, 'success');
            this.publicGuestConfig = JSON.parse(JSON.stringify(this.settings.guestConfig));
        } catch(e) { 
            this.showToast('保存设置失败: ' + e.message, 'error'); 
        }
        this.loading = false;
    },

    async saveData() {
        this.loading = true;
        try {
            // 修复：所有保存接口均添加 returnText: true
            await Promise.all([
                this.fetchApi('/api/save', { 
                    method: 'POST', 
                    body: JSON.stringify(this.channels),
                    returnText: true 
                }),
                this.fetchApi('/api/settings', { 
                    method: 'POST', 
                    body: JSON.stringify(this.settings),
                    returnText: true 
                }),
                this.fetchApi('/api/groups', { 
                    method: 'POST', 
                    body: JSON.stringify(this.groups),
                    returnText: true 
                })
            ]);

            this.showToast('保存成功！', 'success');
            this.publicGuestConfig = JSON.parse(JSON.stringify(this.settings.guestConfig));
        } catch(e) { 
            this.showToast('保存失败: ' + e.message, 'error'); 
        }
        this.loading = false;
    }
`;