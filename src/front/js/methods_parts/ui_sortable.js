/**
 * 拖拽排序初始化模块 (SortableJS)
 */
export const sortableMethods = `
    initSortable() {
        const el = document.getElementById('channel-list');
        if (!el) return;
        if (!this.isAuth) return; 

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
                this.sortChannelsByGroup();
            }
        });
    },

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
`;