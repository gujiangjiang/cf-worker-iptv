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
            }
        });
    },

    // 打开分组管理
    openGroupManager() {
        this.modals.groupManager = true;
        this.$nextTick(() => this.initGroupSortable());
    },

    // --- 批量添加频道到分组 ---
    openGroupChannelAdder(groupName) {
        this.groupAdderData.targetGroup = groupName;
        // 筛选出所有属于“默认”分组的频道作为候选
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
        }
        
        this.modals.groupChannelAdder = false;
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
            sources: [] 
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
        // 如果只有一个源，自动设为主源
        if (this.channelForm.sources.length === 1) {
            this.channelForm.sources[0].isPrimary = true;
        }
    },
    
    // 统一的确认弹窗触发器 (核心修改)
    openConfirmModal(actionType, index = -1) {
        // 重置状态
        this.confirmModal.actionType = actionType;
        this.confirmModal.targetIndex = index;
        this.confirmModal.inputPassword = '';
        this.confirmModal.requirePassword = false;
        this.confirmModal.type = 'danger'; // 默认为红色危险弹窗
        this.confirmModal.show = true;

        // 根据类型配置文案
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

    // 执行确认操作 (逻辑保持统一)
    executeConfirm() {
        const { actionType, targetIndex, inputPassword } = this.confirmModal;

        if (actionType === 'deleteSource') {
            this.channelForm.sources.splice(targetIndex, 1);
            // 删除后若只剩一个，自动设为主源
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
            // 归还频道到默认分组
            this.channels.forEach(ch => { if(ch.group === groupName) ch.group = '默认'; });
            // 删除分组
            this.groups.splice(targetIndex, 1);
            this.showToast('分组已删除');
        }
        else if (actionType === 'clearAll') {
            // 验证密码
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
    // 删除分组入口统一使用 openConfirmModal
    removeGroup(index) {
        this.openConfirmModal('deleteGroup', index);
    },
    syncGroupsFromChannels() {
        const extracted = new Set(this.channels.map(c => c.group || '默认'));
        const merged = new Set([...this.groups, ...extracted]);
        this.groups = Array.from(merged);
        this.showToast('已同步分组', 'success');
    }
`;