/**
 * 模态框交互逻辑 (分组, 编辑, 设置, 确认)
 */
export const modalMethods = `
    // --- 分组逻辑 ---
    openGroupManager() {
        this.modals.groupManager = true;
        this.$nextTick(() => this.initGroupSortable());
    },
    addGroup() {
        const val = this.newGroupInput.trim();
        if(!val) return;
        if(val === '默认') return this.showToast('系统保留分组名称，无法手动添加', 'error');
        if(this.groups.includes(val)) return this.showToast('分组已存在', 'error');
        this.groups.push(val);
        this.newGroupInput = '';
        this.sortChannelsByGroup();
    },
    removeGroup(index) {
        this.openConfirmModal('deleteGroup', index);
    },
    syncGroupsFromChannels() {
        const extracted = this.channels.map(c => c.group).filter(g => g && g !== '默认');
        const merged = new Set([...this.groups, ...extracted]);
        merged.delete('默认');
        this.groups = Array.from(merged);
        this.showToast('已同步分组', 'success');
        this.sortChannelsByGroup();
    },
    sortChannelsByGroup() {
        const groupOrder = {};
        this.groups.forEach((g, i) => { groupOrder[g] = i; });
        this.channels.sort((a, b) => {
            const gA = a.group || '默认';
            const gB = b.group || '默认';
            const isDefaultA = (gA === '默认');
            const isDefaultB = (gB === '默认');
            if (isDefaultA && isDefaultB) return 0;
            if (isDefaultA) return 1; 
            if (isDefaultB) return -1; 
            const indexA = groupOrder.hasOwnProperty(gA) ? groupOrder[gA] : 99999;
            const indexB = groupOrder.hasOwnProperty(gB) ? groupOrder[gB] : 99999;
            return indexA - indexB;
        });
    },
    getGroupCount(groupName) {
        return this.channels.filter(ch => ch.group === groupName).length;
    },
    viewGroupChannels(groupName) {
        this.groupViewerData.groupName = groupName;
        this.groupViewerData.list = this.channels
            .map((ch, index) => ({ ...ch, originalIndex: index }))
            .filter(ch => ch.group === groupName);
        this.modals.groupViewer = true;
    },
    openGroupChannelAdder(groupName) {
        this.groupAdderData.targetGroup = groupName;
        this.groupAdderData.candidates = this.channels
            .map((ch, idx) => ({ idx, name: ch.name, group: ch.group }))
            .filter(ch => ch.group === '默认');
        this.groupAdderData.selectedIndices = [];
        this.modals.groupChannelAdder = true;
    },
    toggleCandidate(originalIndex) {
        const i = this.groupAdderData.selectedIndices.indexOf(originalIndex);
        if (i > -1) this.groupAdderData.selectedIndices.splice(i, 1);
        else this.groupAdderData.selectedIndices.push(originalIndex);
    },
    saveGroupChannels() {
        const target = this.groupAdderData.targetGroup;
        const count = this.groupAdderData.selectedIndices.length;
        if (count > 0) {
            this.groupAdderData.selectedIndices.forEach(idx => {
                if(this.channels[idx]) this.channels[idx].group = target;
            });
            this.showToast(\`成功将 \${count} 个频道移动到 "\${target}"\`);
            this.sortChannelsByGroup();
        }
        this.modals.groupChannelAdder = false;
    },

    // --- 设置逻辑 ---
    openSystemSettings() {
        this.modals.systemSettings = true;
        this.showSubPass = false;
    },
    async saveSystemSettingsAndClose() {
        await this.saveSettingsOnly();
        this.modals.systemSettings = false;
    },
    openSettingsModal() {
        if (this.settings.epgUrl && (!this.settings.epgs || this.settings.epgs.length === 0)) {
            this.settings.epgs = [{ url: this.settings.epgUrl, enabled: true, _id: this.generateId() }];
            delete this.settings.epgUrl;
        }
        if (!this.settings.epgs) this.settings.epgs = [];
        this.settings.epgs.forEach(e => { if(!e._id) e._id = this.generateId(); });
        const source = this.settings.catchupSource;
        if (source === '?playseek=\${(b)yyyyMMddHHmmss}-\${(e)yyyyMMddHHmmss}') this.catchupMode = 'append';
        else if (source === '?playseek=\${(b)timestamp}-\${(e)timestamp}') this.catchupMode = 'timestamp';
        else this.catchupMode = 'custom';
        this.modals.settings = true;
        this.$nextTick(() => this.initEpgSortable());
    },
    addEpg() {
        const len = this.settings.epgs.length;
        if (len > 0 && !this.settings.epgs[len - 1].url.trim()) return this.showToast('请先填写当前的 EPG 地址', 'warning');
        this.settings.epgs.push({ url: '', enabled: true, _id: this.generateId() });
    },
    removeEpg(index) { this.settings.epgs.splice(index, 1); },
    onCatchupModeChange() {
        if (this.catchupMode === 'append') this.settings.catchupSource = '?playseek=\${(b)yyyyMMddHHmmss}-\${(e)yyyyMMddHHmmss}';
        else if (this.catchupMode === 'timestamp') this.settings.catchupSource = '?playseek=\${(b)timestamp}-\${(e)timestamp}';
    },

    // --- 频道编辑逻辑 ---
    openImportModal() { this.modals.import = true; this.importUrl = ''; },
    openLoginModal() { this.modals.login = true; },
    openAddChannelModal() {
        this.editMode = false;
        this.editingIndex = -1;
        this.channelForm = { group: '默认', name: '', tvgName: '', useLogo: false, logo: '', sources: [] };
        this.logoPreviewUrl = '';
        this.modals.channelEditor = true;
        this.$nextTick(() => this.initSourceSortable());
    },
    openEditChannelFromViewer(index) { this.openEditChannelModal(index); },
    openEditChannelModal(index) {
        this.editMode = true;
        this.editingIndex = index;
        const ch = this.channels[index];
        this.channelForm = JSON.parse(JSON.stringify(ch));
        if(this.channelForm.sources) {
            this.channelForm.sources.forEach(s => { if(!s._id) s._id = this.generateId(); });
            // 数据清洗：确保单主源
            const primaryIndices = this.channelForm.sources.map((s, i) => s.isPrimary ? i : -1).filter(i => i !== -1);
            if (primaryIndices.length > 1) {
                this.channelForm.sources.forEach((s, i) => { s.isPrimary = (i === primaryIndices[0]); });
            } else if (primaryIndices.length === 0 && this.channelForm.sources.length > 0) {
                const firstEnabled = this.channelForm.sources.findIndex(s => s.enabled);
                if (firstEnabled !== -1) this.channelForm.sources[firstEnabled].isPrimary = true;
            }
        }
        if (!this.channelForm.group) this.channelForm.group = '默认';
        this.logoPreviewUrl = this.channelForm.logo;
        this.modals.channelEditor = true;
        this.$nextTick(() => this.initSourceSortable());
    },
    saveChannel() {
        if(!this.channelForm.name) return this.showToast('频道名称不能为空', 'error');
        if(this.channelForm.sources.length === 0) return this.showToast('至少需要一个直播源', 'error');
        const channelData = {
            ...this.channelForm,
            id: this.editMode ? this.channels[this.editingIndex].id : this.generateId(), 
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
        this.sortChannelsByGroup();
        if (this.modals.groupViewer) this.viewGroupChannels(this.groupViewerData.groupName);
        this.modals.channelEditor = false;
    },
    checkLogo() { if(this.channelForm.logo) this.logoPreviewUrl = this.channelForm.logo; },
    addSource() {
        const len = this.channelForm.sources.length;
        if (len > 0 && !this.channelForm.sources[len - 1].url.trim()) return this.showToast('请先填写当前的直播源链接', 'warning');
        this.channelForm.sources.push({ url: '', enabled: true, isPrimary: false, _id: this.generateId() });
        if (this.channelForm.sources.length === 1) this.channelForm.sources[0].isPrimary = true;
    },
    onSourceEnableChange(idx) {
        const source = this.channelForm.sources[idx];
        if(!source.enabled) source.isPrimary = false;
    },
    setPrimarySource(idx) {
        this.channelForm.sources.forEach((s, i) => { s.isPrimary = (i === idx); });
    },

    // --- 确认弹窗逻辑 ---
    openConfirmModal(actionType, index = -1) {
        this.confirmModal.actionType = actionType;
        this.confirmModal.targetIndex = index;
        this.confirmModal.inputPassword = '';
        this.confirmModal.requirePassword = false;
        this.confirmModal.type = 'danger'; 
        this.confirmModal.show = true;
        switch(actionType) {
            case 'deleteSource':
                this.confirmModal.title = '确认删除源';
                this.confirmModal.message = '确定要删除这个直播源吗？';
                break;
            case 'deleteChannel':
                const chName = this.channels[index]?.name || '未知';
                this.confirmModal.title = '确认删除频道';
                this.confirmModal.message = \`确定要删除频道 "\${chName}" 吗？\`;
                break;
            case 'deleteGroup':
                const groupName = this.groups[index];
                const count = this.channels.filter(c => c.group === groupName).length;
                this.confirmModal.title = '删除分组确认';
                let msg = \`确定要删除分组 "\${groupName}" 吗？\`;
                if (count > 0) msg += \`\\n\\n该分组下包含 \${count} 个频道，删除分组后，这些频道将自动归入“默认”分组。\`;
                this.confirmModal.message = msg;
                break;
            case 'clearAll':
                this.confirmModal.title = '⚠️ 危险操作警告';
                this.confirmModal.message = '此操作将清空所有频道且无法恢复！请输入管理密码确认：';
                this.confirmModal.requirePassword = true;
                break;
            default: this.confirmModal.show = false; break;
        }
    },
    executeConfirm() {
        const { actionType, targetIndex, inputPassword } = this.confirmModal;
        if (actionType === 'deleteSource') {
            this.channelForm.sources.splice(targetIndex, 1);
            if (this.channelForm.sources.length === 1) this.channelForm.sources[0].isPrimary = true;
            this.showToast('直播源已删除');
        } else if (actionType === 'deleteChannel') {
            this.channels.splice(targetIndex, 1);
            this.showToast('频道已删除');
            if (this.modals.groupViewer) this.viewGroupChannels(this.groupViewerData.groupName);
        } else if (actionType === 'deleteGroup') {
            const groupName = this.groups[targetIndex];
            this.channels.forEach(ch => { if(ch.group === groupName) ch.group = '默认'; });
            this.groups.splice(targetIndex, 1);
            this.showToast('分组已删除');
            this.sortChannelsByGroup();
        } else if (actionType === 'clearAll') {
            if (inputPassword !== this.password) return this.showToast('密码错误，无法清空', 'error');
            this.channels = [];
            this.showToast('列表已清空', 'success');
        }
        this.confirmModal.show = false;
    },
    removeChannel(index) { this.openConfirmModal('deleteChannel', index); },
    clearAll() { this.openConfirmModal('clearAll'); }
`;