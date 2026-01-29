/**
 * 拖拽排序初始化模块 (SortableJS) - 深度优化版
 */
export const sortableMethods = `
    // 通用 Sortable 创建器
    _createSortable(elId, handleClass, onEndCallback) {
        const el = document.getElementById(elId);
        if (!el) return null;
        
        // 如果是主列表，需要鉴权
        if (elId === 'channel-list' && !this.isAuth) return null;

        return Sortable.create(el, {
            handle: '.' + handleClass,
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: onEndCallback
        });
    },

    initSortable() {
        if (this.sortableInstance) this.sortableInstance.destroy();
        this.sortableInstance = this._createSortable('channel-list', 'drag-handle', (evt) => {
            const item = this.channels[evt.oldIndex];
            this.channels.splice(evt.oldIndex, 1);
            this.channels.splice(evt.newIndex, 0, item);
        });
    },

    initSourceSortable() {
        if (this.sourceSortableInstance) this.sourceSortableInstance.destroy();
        this.sourceSortableInstance = this._createSortable('source-list-container', 'source-drag-handle', (evt) => {
            const item = this.channelForm.sources[evt.oldIndex];
            this.channelForm.sources.splice(evt.oldIndex, 1);
            this.channelForm.sources.splice(evt.newIndex, 0, item);
        });
    },

    initGroupSortable() {
        if (this.groupSortableInstance) this.groupSortableInstance.destroy();
        this.groupSortableInstance = this._createSortable('group-list-container', 'group-drag-handle', (evt) => {
            const item = this.groups[evt.oldIndex];
            this.groups.splice(evt.oldIndex, 1);
            this.groups.splice(evt.newIndex, 0, item);
            this.sortChannelsByGroup();
        });
    },

    initEpgSortable() {
        if (this.epgSortableInstance) this.epgSortableInstance.destroy();
        this.epgSortableInstance = this._createSortable('epg-list-container', 'epg-drag-handle', (evt) => {
            const item = this.settings.epgs[evt.oldIndex];
            this.settings.epgs.splice(evt.oldIndex, 1);
            this.settings.epgs.splice(evt.newIndex, 0, item);
        });
    },
`;