/**
 * 前端 UI 交互逻辑模块 (Toast, Sortable, Modals, Groups)
 */
export const uiMethods = `
    // 显示 Toast 消息
    showToast(message, type = 'success') {
        this.toast.message = message;
        this.toast.type = type;
        this.toast.show = true;
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            this.toast.show = false;
        }, 3000);
    },

    // 初始化拖拽排序
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

    // --- 模态框操作 ---
    
    // 打开新增频道模态框
    openAddChannelModal() {
        this.newChannelForm = { group: this.groups.length > 0 ? this.groups[0] : '默认', name: '', logo: '', url: '' };
        this.modals.addChannel = true;
    },
    
    // 确认新增频道
    confirmAddChannel() {
        if(!this.newChannelForm.name || !this.newChannelForm.url) {
            return this.showToast('名称和链接不能为空', 'error');
        }
        // 构造新频道对象
        const ch = {
            group: this.newChannelForm.group,
            name: this.newChannelForm.name,
            tvgName: this.newChannelForm.name,
            logo: this.newChannelForm.logo,
            urls: [this.newChannelForm.url]
        };
        // 插入到顶部
        this.channels.unshift(ch);
        this.modals.addChannel = false;
        this.showToast('添加成功', 'success');
    },

    // --- 分组管理逻辑 ---
    
    // 添加分组
    addGroup() {
        const val = this.newGroupInput.trim();
        if(!val) return;
        if(this.groups.includes(val)) {
            return this.showToast('分组已存在', 'error');
        }
        this.groups.push(val);
        this.newGroupInput = '';
    },
    
    // 删除分组
    removeGroup(index) {
        // 检查是否有频道正在使用该分组
        const groupName = this.groups[index];
        const inUse = this.channels.some(ch => ch.group === groupName);
        if(inUse) {
            if(!confirm(\`分组 "\${groupName}" 正在被使用，删除后对应频道将变为"未分组"，确定删除吗？\`)) return;
            // 将对应频道的 group 重置为 '默认' 或 '未分组'
            this.channels.forEach(ch => {
                if(ch.group === groupName) ch.group = '默认';
            });
        }
        this.groups.splice(index, 1);
    },
    
    // 从频道列表同步分组 (提取所有已使用的分组)
    syncGroupsFromChannels() {
        const extracted = new Set(this.channels.map(c => c.group || '默认'));
        // 合并当前列表和提取的列表
        const merged = new Set([...this.groups, ...extracted]);
        this.groups = Array.from(merged);
        this.showToast('已从频道列表同步分组', 'success');
    }
`;