/**
 * 前端 UI 交互逻辑模块 (Toast, Sortable)
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
        
        // 防止重复初始化
        if (this.sortableInstance) this.sortableInstance.destroy();

        this.sortableInstance = Sortable.create(el, {
            handle: '.drag-handle', // 指定只有拖拽手柄可以触发拖拽
            animation: 150, // 动画毫秒数
            ghostClass: 'sortable-ghost', // 占位符样式
            onEnd: (evt) => {
                // 同步数据顺序：从旧位置移除，插入新位置
                const item = this.channels[evt.oldIndex];
                this.channels.splice(evt.oldIndex, 1);
                this.channels.splice(evt.newIndex, 0, item);
            }
        });
    }
`;