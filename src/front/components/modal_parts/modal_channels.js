/**
 * 频道与分组相关模态框
 */
import { createModal } from './base_modal.js';

// 1. 频道编辑器 (新增/修改)
const editorBody = `
    <div class="row g-3 mb-3">
        <div class="col-md-4">
            <label class="form-label">分组</label>
            <select class="form-select" v-model="channelForm.group">
                <option value="默认">默认 (未分组)</option>
                <option v-for="g in groups.filter(x => x !== '默认')" :key="g" :value="g">{{ g }}</option>
            </select>
        </div>
        <div class="col-md-4">
            <label class="form-label">EPG 名称</label>
            <input type="text" class="form-control" v-model="channelForm.tvgName" placeholder="XML中的tvg-name">
        </div>
        <div class="col-md-4">
            <label class="form-label">频道名称 (显示名)</label>
            <input type="text" class="form-control" v-model="channelForm.name">
        </div>
    </div>

    <div class="mb-4 p-3 bg-body-tertiary rounded border">
        <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" id="useLogo" v-model="channelForm.useLogo">
            <label class="form-check-label" for="useLogo">启用频道 Logo</label>
        </div>
        <div v-if="channelForm.useLogo" class="d-flex align-items-center gap-2">
            <input type="text" class="form-control" v-model="channelForm.logo" placeholder="Logo 图片 URL">
            <button class="btn btn-outline-secondary text-nowrap" @click="checkLogo">检测</button>
            <div class="logo-preview-box">
                <img v-if="logoPreviewUrl" :src="logoPreviewUrl" alt="Preview" @error="logoPreviewUrl=''">
                <span v-else class="text-muted small">预览</span>
            </div>
        </div>
    </div>

    <div class="mb-3">
        <label class="form-label d-flex justify-content-between">
            <span>📡 直播源列表 (拖拽排序)</span>
            <button class="btn btn-sm btn-outline-primary" @click="addSource">+ 添加源</button>
        </label>
        <div class="form-text mb-2 text-muted small">
            复选框为启用对应直播源，单选框为在启用的直播源中选择一个默认的直播源
        </div>
        <div class="list-group" id="source-list-container" style="max-height: 300px; overflow-y: auto;">
            <div v-for="(source, idx) in channelForm.sources" :key="source._id" class="list-group-item source-row d-flex align-items-center gap-2">
                <span class="source-drag-handle text-secondary fs-5">⠿</span>
                <div class="form-check" title="是否启用该源">
                    <input class="form-check-input" type="checkbox" v-model="source.enabled" @change="onSourceEnableChange(idx)">
                </div>
                <input type="text" class="form-control form-control-sm" v-model="source.url" :disabled="!source.enabled" placeholder="http://...">
                <div class="form-check" title="设为 M3U 主源">
                    <input class="form-check-input" type="radio" name="primary_source_radio" :checked="source.isPrimary" @click="setPrimarySource(idx)" :disabled="!source.enabled">
                </div>
                <button class="btn btn-sm btn-outline-danger border-0" @click="openConfirmModal('deleteSource', idx)">✖</button>
            </div>
        </div>
        <div v-if="channelForm.sources.length === 0" class="text-center text-muted py-3 border rounded border-dashed">
            暂无直播源，请点击上方按钮添加
        </div>
    </div>
`;

export const channelEditorModal = createModal({
    condition: 'modals.channelEditor',
    closeAction: 'modals.channelEditor = false',
    title: "{{ editMode ? '📝 编辑频道' : '➕ 新增频道' }}",
    size: 'modal-lg',
    zIndex: 1100,
    body: editorBody,
    footer: `<button class="btn btn-primary" @click="saveChannel">保存</button>`
});

// 2. 分组管理器
const groupManagerBody = `
    <div class="input-group mb-3">
        <input type="text" class="form-control" v-model="newGroupInput" placeholder="输入新分组名称" @keyup.enter="addGroup">
        <button class="btn btn-outline-primary" @click="addGroup">添加</button>
    </div>
    
    <div class="list-group mb-2 border-bottom pb-2">
        <div class="list-group-item d-flex align-items-center gap-2 bg-body-tertiary border">
            <span class="text-secondary text-center" style="width: 1.2rem;">🔒</span>
            <span class="flex-grow-1 fw-bold">默认 (未分组)</span>
            <span class="badge bg-secondary rounded-pill">{{ getGroupCount('默认') }}</span>
            <button class="btn btn-sm btn-outline-info text-nowrap ms-2" @click="viewGroupChannels('默认')">👁️ 查看</button>
        </div>
    </div>

    <ul class="list-group" id="group-list-container" style="max-height: 400px; overflow-y: auto;">
        <li class="list-group-item d-flex align-items-center gap-2" v-for="(g, idx) in groups" :key="g">
            <span class="group-drag-handle">⠿</span>
            <span class="flex-grow-1 text-truncate">{{ g }}</span>
            <span class="badge bg-secondary rounded-pill">{{ getGroupCount(g) }}</span>
            <button class="btn btn-sm btn-outline-info text-nowrap ms-1" @click="viewGroupChannels(g)" title="查看频道">👁️</button>
            <button class="btn btn-sm btn-outline-success text-nowrap" @click="openGroupChannelAdder(g)" title="从默认分组批量添加频道">➕</button>
            <button class="btn btn-sm btn-outline-danger border-0" @click="openConfirmModal('deleteGroup', idx)">✖</button>
        </li>
    </ul>
    <div class="mt-3 text-end">
        <button class="btn btn-sm btn-link text-decoration-none" @click="syncGroupsFromChannels">从现有频道同步</button>
    </div>
`;

export const groupManagerModal = createModal({
    condition: 'modals.groupManager',
    closeAction: 'modals.groupManager = false',
    title: '📁 分组管理',
    body: groupManagerBody
});

// 3. 分组频道添加器 (批量移动)
const groupAdderBody = `
    <p class="text-muted small">以下是所有“默认”分组的频道，请选择要移动的频道：</p>
    <div v-if="groupAdderData.candidates.length === 0" class="text-center py-4 text-muted border rounded border-dashed">
        暂无“默认”分组的频道
    </div>
    <div v-else class="list-group" style="max-height: 50vh; overflow-y: auto;">
        <label v-for="ch in groupAdderData.candidates" :key="ch.idx" class="list-group-item d-flex gap-2 align-items-center" style="cursor: pointer;">
            <input class="form-check-input flex-shrink-0" type="checkbox" :checked="groupAdderData.selectedIndices.includes(ch.idx)" @change="toggleCandidate(ch.idx)">
            <span class="text-truncate">{{ ch.name }}</span>
        </label>
    </div>
`;

export const groupAdderModal = createModal({
    condition: 'modals.groupChannelAdder',
    closeAction: 'modals.groupChannelAdder = false',
    title: '添加频道到 "{{ groupAdderData.targetGroup }}"',
    scrollable: true,
    zIndex: 1080,
    body: groupAdderBody,
    footer: `
        <span class="me-auto small text-muted">已选: {{ groupAdderData.selectedIndices.length }}</span>
        <button class="btn btn-secondary" @click="modals.groupChannelAdder = false">取消</button>
        <button class="btn btn-primary" @click="saveGroupChannels" :disabled="groupAdderData.selectedIndices.length === 0">确认添加</button>
    `
});

// 4. 分组频道查看器
const groupViewerBody = `
    <div v-if="groupViewerData.list.length === 0" class="text-center py-4 text-muted m-3 border rounded border-dashed">
        该分组下暂无频道
    </div>
    <div v-else style="max-height: 60vh; overflow-y: auto;">
        <ul class="list-group list-group-flush">
            <li v-for="(ch, idx) in groupViewerData.list" :key="idx" class="list-group-item d-flex align-items-center">
                <span class="text-truncate flex-grow-1 me-2" :title="ch.name">{{ ch.name }}</span>
                <span class="badge bg-light text-dark flex-shrink-0 border me-2">{{ ch.sources.length }}个源</span>
                <button v-if="isAuth" class="btn btn-sm btn-outline-primary border-0" @click="openEditChannelFromViewer(ch.originalIndex)" title="编辑频道">✏️</button>
            </li>
        </ul>
    </div>
`;

export const groupViewerModal = createModal({
    condition: 'modals.groupViewer',
    closeAction: 'modals.groupViewer = false',
    title: '📂 {{ groupViewerData.groupName }} ({{ groupViewerData.list.length }})',
    zIndex: 1090,
    size: 'modal-lg', // 优化：桌面端加宽显示
    body: groupViewerBody,
    bodyStyle: 'padding: 0;',
    footer: `<button class="btn btn-primary" @click="modals.groupViewer = false">关闭</button>`
});