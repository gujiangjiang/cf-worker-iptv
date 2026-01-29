/**
 * 前端 UI 交互逻辑模块
 */
export const uiMethods = `
    showToast(message, type = 'success') {
        this.toast.message = message;
        this.toast.type = type;
        this.toast.show = true;
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => { this.toast.show = false; }, 3000);
    },

    // 首页列表排序
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

    // 模态框内直播源排序
    initSourceSortable() {
        const el = document.getElementById('source-list-container');
        if (!el) return;
        if (this.sourceSortableInstance) this.sourceSortableInstance.destroy();
        this.sourceSortableInstance = Sortable.create(el, {
            handle: '.source-drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                const item = this.channelForm.sources[evt.oldIndex];
                this.channelForm.sources.splice(evt.oldIndex, 1);
                this.channelForm.sources.splice(evt.newIndex, 0, item);
            }
        });
    },

    // --- 全局设置 ---
    openSettingsModal() {
        // 打开时判断当前规则是否匹配预设
        const source = this.settings.catchupSource;
        if (source === '?playseek=\${(b)yyyyMMddHHmmss}-\${(e)yyyyMMddHHmmss}') {
            this.catchupMode = 'append';
        } else if (source === '?playseek=\${(b)timestamp}-\${(e)timestamp}') {
            this.catchupMode = 'timestamp';
        } else {
            this.catchupMode = 'custom';
        }
        this.modals.settings = true;
    },

    onCatchupModeChange() {
        // 切换模式时自动填充
        if (this.catchupMode === 'append') {
            this.settings.catchupSource = '?playseek=\${(b)yyyyMMddHHmmss}-\${(e)yyyyMMddHHmmss}';
        } else if (this.catchupMode === 'timestamp') {
            this.settings.catchupSource = '?playseek=\${(b)timestamp}-\${(e)timestamp}';
        }
        // 如果是 custom，保留当前值供用户编辑，或者置空也可以，这里选择保留体验更好
    },

    // --- 频道编辑/新增 ---
    openAddChannelModal() {
        this.editMode = false;
        this.editingIndex = -1;
        this.channelForm = {
            group: this.groups.length > 0 ? this.groups[0] : '默认',
            name: '', tvgName: '',
            useLogo: false, logo: '',
            sources: [{ url: '', enabled: true, isPrimary: true }]
        };
        this.logoPreviewUrl = '';
        this.modals.channelEditor = true;
        this.$nextTick(() => this.initSourceSortable());
    },

    // 打开编辑模式
    openEditChannelModal(index) {
        this.editMode = true;
        this.editingIndex = index;
        const ch = this.channels[index];
        // 深拷贝防止直接修改
        this.channelForm = JSON.parse(JSON.stringify(ch));
        this.logoPreviewUrl = this.channelForm.logo;
        this.modals.channelEditor = true;
        this.$nextTick(() => this.initSourceSortable());
    },

    // 保存频道
    saveChannel() {
        // 校验
        if(!this.channelForm.name) return this.showToast('频道名称不能为空', 'error');
        if(this.channelForm.sources.length === 0) return this.showToast('至少需要一个直播源', 'error');
        
        // 构造数据
        const channelData = {
            ...this.channelForm,
            tvgName: this.channelForm.tvgName || this.channelForm.name,
            logo: this.channelForm.useLogo ? this.channelForm.logo : ''
        };

        if(this.editMode) {
            this.channels[this.editingIndex] = channelData;
            this.showToast('修改已保存', 'success');
        } else {
            this.channels.unshift(channelData);
            this.showToast('新建成功', 'success');
        }
        this.modals.channelEditor = false;
    },

    // --- Logo 相关 ---
    checkLogo() {
        if(this.channelForm.logo) {
            this.logoPreviewUrl = this.channelForm.logo;
        }
    },

    // --- 直播源管理 ---
    addSource() {
        this.channelForm.sources.push({ url: '', enabled: true, isPrimary: false });
    },
    removeSource(idx) {
        this.channelForm.sources.splice(idx, 1);
    },
    
    // 只有启用的源才能选为主源
    onSourceEnableChange(idx) {
        const source = this.channelForm.sources[idx];
        if(!source.enabled) {
            source.isPrimary = false;
        }
    },
    // 单选逻辑：设置当前为主源，其他置否
    setPrimarySource(idx) {
        this.channelForm.sources.forEach((s, i) => {
            s.isPrimary = (i === idx);
        });
    },

    // --- 分组管理 ---
    addGroup() {
        const val = this.newGroupInput.trim();
        if(!val) return;
        if(this.groups.includes(val)) return this.showToast('分组已存在', 'error');
        this.groups.push(val);
        this.newGroupInput = '';
    },
    removeGroup(index) {
        const groupName = this.groups[index];
        const inUse = this.channels.some(ch => ch.group === groupName);
        if(inUse) {
            if(!confirm(\`分组 "\${groupName}" 正在被使用，删除后将重置为"默认"，确定？\`)) return;
            this.channels.forEach(ch => { if(ch.group === groupName) ch.group = '默认'; });
        }
        this.groups.splice(index, 1);
    },
    syncGroupsFromChannels() {
        const extracted = new Set(this.channels.map(c => c.group || '默认'));
        const merged = new Set([...this.groups, ...extracted]);
        this.groups = Array.from(merged);
        this.showToast('已同步分组', 'success');
    }
`;