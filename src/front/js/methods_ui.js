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

    // 分组管理模态框排序
    initGroupSortable() {
        const el = document.getElementById('group-list-container');
        if (!el) return;
        if (this.groupSortableInstance) this.groupSortableInstance.destroy();
        this.groupSortableInstance = Sortable.create(el, {
            handle: '.group-drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                const item = this.groups[evt.oldIndex];
                this.groups.splice(evt.oldIndex, 1);
                this.groups.splice(evt.newIndex, 0, item);
                
                // 修改：分组排序变更后，立即重排频道列表
                this.sortChannelsByGroup();
            }
        });
    },

    // 新增：EPG 列表排序
    initEpgSortable() {
        const el = document.getElementById('epg-list-container');
        if (!el) return;
        if (this.epgSortableInstance) this.epgSortableInstance.destroy();
        this.epgSortableInstance = Sortable.create(el, {
            handle: '.epg-drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                const item = this.settings.epgs[evt.oldIndex];
                this.settings.epgs.splice(evt.oldIndex, 1);
                this.settings.epgs.splice(evt.newIndex, 0, item);
            }
        });
    },

    // 打开分组管理
    openGroupManager() {
        this.modals.groupManager = true;
        this.$nextTick(() => this.initGroupSortable());
    },

    // 新增：根据分组顺序重排频道列表
    sortChannelsByGroup() {
        // 建立分组索引映射
        const groupOrder = {};
        this.groups.forEach((g, i) => { groupOrder[g] = i; });
        
        this.channels.sort((a, b) => {
            const gA = a.group || '默认';
            const gB = b.group || '默认';
            
            // 策略：默认分组始终排在最后
            const isDefaultA = (gA === '默认');
            const isDefaultB = (gB === '默认');
            
            if (isDefaultA && isDefaultB) return 0;
            if (isDefaultA) return 1; // A是默认，往后排
            if (isDefaultB) return -1; // B是默认，A往前排
            
            // 均非默认，按 groups 列表顺序
            const indexA = groupOrder.hasOwnProperty(gA) ? groupOrder[gA] : 99999;
            const indexB = groupOrder.hasOwnProperty(gB) ? groupOrder[gB] : 99999;
            
            return indexA - indexB;
        });
    },

    // 获取分组下频道数量
    getGroupCount(groupName) {
        return this.channels.filter(ch => ch.group === groupName).length;
    },

    // 查看分组内的频道列表
    viewGroupChannels(groupName) {
        this.groupViewerData.groupName = groupName;
        this.groupViewerData.list = this.channels
            .map((ch, index) => ({ ...ch, originalIndex: index }))
            .filter(ch => ch.group === groupName);
        this.modals.groupViewer = true;
    },

    openEditChannelFromViewer(index) {
        this.modals.groupViewer = false;
        this.$nextTick(() => {
            this.openEditChannelModal(index);
        });
    },

    // --- 批量添加频道 ---
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

    // --- M3U 参数 (全局设置) ---
    openSettingsModal() {
        // 数据迁移：如果存在旧的 epgUrl 且 epgs 为空，则迁移
        if (this.settings.epgUrl && (!this.settings.epgs || this.settings.epgs.length === 0)) {
            this.settings.epgs = [{ url: this.settings.epgUrl, enabled: true }];
            delete this.settings.epgUrl;
        }
        // 初始化数组
        if (!this.settings.epgs) this.settings.epgs = [];

        // 回看模式初始化
        const source = this.settings.catchupSource;
        if (source === '?playseek=\${(b)yyyyMMddHHmmss}-\${(e)yyyyMMddHHmmss}') {
            this.catchupMode = 'append';
        } else if (source === '?playseek=\${(b)timestamp}-\${(e)timestamp}') {
            this.catchupMode = 'timestamp';
        } else {
            this.catchupMode = 'custom';
        }
        this.modals.settings = true;
        this.$nextTick(() => this.initEpgSortable());
    },

    // 新增：添加 EPG
    addEpg() {
        this.settings.epgs.push({ url: '', enabled: true });
    },

    // 新增：删除 EPG
    removeEpg(index) {
        this.settings.epgs.splice(index, 1);
    },

    onCatchupModeChange() {
        if (this.catchupMode === 'append') {
            this.settings.catchupSource = '?playseek=\${(b)yyyyMMddHHmmss}-\${(e)yyyyMMddHHmmss}';
        } else if (this.catchupMode === 'timestamp') {
            this.settings.catchupSource = '?playseek=\${(b)timestamp}-\${(e)timestamp}';
        }
    },

    // --- 频道编辑/新增 ---
    openAddChannelModal() {
        this.editMode = false;
        this.editingIndex = -1;
        this.channelForm = {
            group: '默认',
            name: '', tvgName: '',
            useLogo: false, logo: '',
            sources: [] 
        };
        this.logoPreviewUrl = '';
        this.modals.channelEditor = true;
        this.$nextTick(() => this.initSourceSortable());
    },

    openEditChannelModal(index) {
        this.editMode = true;
        this.editingIndex = index;
        const ch = this.channels[index];
        this.channelForm = JSON.parse(JSON.stringify(ch));
        if (!this.channelForm.group) {
            this.channelForm.group = '默认';
        }
        this.logoPreviewUrl = this.channelForm.logo;
        this.modals.channelEditor = true;
        this.$nextTick(() => this.initSourceSortable());
    },

    saveChannel() {
        if(!this.channelForm.name) return this.showToast('频道名称不能为空', 'error');
        if(this.channelForm.sources.length === 0) return this.showToast('至少需要一个直播源', 'error');
        
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
        // 修改：保存后确保顺序正确（例如新增了频道）
        this.sortChannelsByGroup();
        this.modals.channelEditor = false;
    },

    checkLogo() {
        if(this.channelForm.logo) {
            this.logoPreviewUrl = this.channelForm.logo;
        }
    },

    // --- 直播源管理 ---
    addSource() {
        this.channelForm.sources.push({ url: '', enabled: true, isPrimary: false });
        if (this.channelForm.sources.length === 1) {
            this.channelForm.sources[0].isPrimary = true;
        }
    },
    
    // 统一的确认弹窗触发器
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
                if (count > 0) {
                    msg += \`\\n\\n该分组下包含 \${count} 个频道，删除分组后，这些频道将自动归入“默认”分组。\`;
                }
                this.confirmModal.message = msg;
                break;

            case 'clearAll':
                this.confirmModal.title = '⚠️ 危险操作警告';
                this.confirmModal.message = '此操作将清空所有频道且无法恢复！请输入管理密码确认：';
                this.confirmModal.requirePassword = true;
                break;
                
            default:
                this.confirmModal.show = false;
                break;
        }
    },

    executeConfirm() {
        const { actionType, targetIndex, inputPassword } = this.confirmModal;

        if (actionType === 'deleteSource') {
            this.channelForm.sources.splice(targetIndex, 1);
            if (this.channelForm.sources.length === 1) {
                this.channelForm.sources[0].isPrimary = true;
            }
            this.showToast('直播源已删除');
        } 
        else if (actionType === 'deleteChannel') {
            this.channels.splice(targetIndex, 1);
            this.showToast('频道已删除');
        }
        else if (actionType === 'deleteGroup') {
            const groupName = this.groups[targetIndex];
            this.channels.forEach(ch => { if(ch.group === groupName) ch.group = '默认'; });
            this.groups.splice(targetIndex, 1);
            this.showToast('分组已删除');
            // 修改：分组删除后，频道归入默认，需要重排
            this.sortChannelsByGroup();
        }
        else if (actionType === 'clearAll') {
            if (inputPassword !== this.password) {
                return this.showToast('密码错误，无法清空', 'error');
            }
            this.channels = [];
            this.showToast('列表已清空', 'success');
        }

        this.confirmModal.show = false;
    },

    onSourceEnableChange(idx) {
        const source = this.channelForm.sources[idx];
        if(!source.enabled) {
            source.isPrimary = false;
        }
    },
    
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
        // 修改：新增分组虽然暂时没有频道，但保持同步是个好习惯
        this.sortChannelsByGroup();
    },
    
    removeGroup(index) {
        this.openConfirmModal('deleteGroup', index);
    },
    
    syncGroupsFromChannels() {
        const extracted = new Set(this.channels.map(c => c.group || '默认'));
        const merged = new Set([...this.groups, ...extracted]);
        this.groups = Array.from(merged);
        this.showToast('已同步分组', 'success');
        this.sortChannelsByGroup();
    }
`;