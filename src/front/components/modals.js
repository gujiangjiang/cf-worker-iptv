/**
 * 组件：模态框集合
 * 包含：二次确认、频道编辑、分组管理、批量添加、全局设置、冲突处理、分组查看
 */
export const modalTemplate = `
    <div v-if="confirmModal.show" class="confirm-modal-overlay">
        <div class="modal-dialog" style="min-width: 350px;">
            <div class="modal-content">
                <div :class="['modal-header', confirmModal.type === 'danger' ? 'bg-danger-subtle' : '']">
                    <h5 class="modal-title">{{ confirmModal.title }}</h5>
                    <button type="button" class="btn-close" @click="confirmModal.show = false"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-3" style="white-space: pre-wrap;">{{ confirmModal.message }}</p>
                    
                    <div v-if="confirmModal.requirePassword">
                        <label class="form-label small text-muted">请输入管理密码以确认：</label>
                        <input type="password" class="form-control" v-model="confirmModal.inputPassword" placeholder="Current Password">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" @click="confirmModal.show = false">取消</button>
                    <button :class="['btn', confirmModal.type === 'danger' ? 'btn-danger' : 'btn-primary']" @click="executeConfirm">确认</button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="modals.groupChannelAdder" class="modal-overlay" style="z-index: 1080;" @click.self="modals.groupChannelAdder = false">
        <div class="modal-dialog modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">添加频道到 "{{ groupAdderData.targetGroup }}"</h5>
                    <button type="button" class="btn-close" @click="modals.groupChannelAdder = false"></button>
                </div>
                <div class="modal-body">
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
                </div>
                <div class="modal-footer">
                    <span class="me-auto small text-muted">已选: {{ groupAdderData.selectedIndices.length }}</span>
                    <button class="btn btn-secondary" @click="modals.groupChannelAdder = false">取消</button>
                    <button class="btn btn-primary" @click="saveGroupChannels" :disabled="groupAdderData.selectedIndices.length === 0">确认添加</button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="modals.groupViewer" class="modal-overlay" style="z-index: 1090;" @click.self="modals.groupViewer = false">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">📂 {{ groupViewerData.groupName }} ({{ groupViewerData.list.length }})</h5>
                    <button type="button" class="btn-close" @click="modals.groupViewer = false"></button>
                </div>
                <div class="modal-body p-0">
                    <div v-if="groupViewerData.list.length === 0" class="text-center py-4 text-muted m-3 border rounded border-dashed">
                        该分组下暂无频道
                    </div>
                    <div v-else style="max-height: 60vh; overflow-y: auto;">
                        <ul class="list-group list-group-flush">
                            <li v-for="(ch, idx) in groupViewerData.list" :key="idx" class="list-group-item d-flex align-items-center">
                                <span class="text-truncate flex-grow-1 me-2" :title="ch.name">{{ ch.name }}</span>
                                <span class="badge bg-light text-dark flex-shrink-0 border me-2">{{ ch.sources.length }}个源</span>
                                <button class="btn btn-sm btn-outline-primary border-0" @click="openEditChannelFromViewer(ch.originalIndex)" title="编辑频道">✏️</button>
                            </li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" @click="modals.groupViewer = false">关闭</button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="modals.channelEditor" class="modal-overlay" style="z-index: 1100;" @click.self="modals.channelEditor = false">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">{{ editMode ? '📝 编辑频道' : '➕ 新增频道' }}</h5>
                    <button type="button" class="btn-close" @click="modals.channelEditor = false"></button>
                </div>
                <div class="modal-body">
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

                    <div class="mb-4 p-3 bg-light rounded border">
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
                        <div class="list-group" id="source-list-container">
                            <div v-for="(source, idx) in channelForm.sources" :key="idx" class="list-group-item source-row d-flex align-items-center gap-2">
                                <span class="source-drag-handle text-secondary fs-5">⠿</span>
                                <div class="form-check" title="是否启用该源">
                                    <input class="form-check-input" type="checkbox" v-model="source.enabled" @change="onSourceEnableChange(idx)">
                                </div>
                                <input type="text" class="form-control form-control-sm" v-model="source.url" :disabled="!source.enabled" placeholder="http://...">
                                <div class="form-check" title="设为 M3U 主源">
                                    <input class="form-check-input" type="radio" :checked="source.isPrimary" @click="setPrimarySource(idx)" :disabled="!source.enabled">
                                </div>
                                <button class="btn btn-sm btn-outline-danger border-0" @click="openConfirmModal('deleteSource', idx)">✖</button>
                            </div>
                        </div>
                        <div v-if="channelForm.sources.length === 0" class="text-center text-muted py-3 border rounded border-dashed">
                            暂无直播源，请点击上方按钮添加
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" @click="saveChannel">保存</button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="modals.groupManager" class="modal-overlay" @click.self="modals.groupManager = false">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">📁 分组管理</h5>
                    <button type="button" class="btn-close" @click="modals.groupManager = false"></button>
                </div>
                <div class="modal-body">
                    <div class="input-group mb-3">
                        <input type="text" class="form-control" v-model="newGroupInput" placeholder="输入新分组名称" @keyup.enter="addGroup">
                        <button class="btn btn-outline-primary" @click="addGroup">添加</button>
                    </div>
                    
                    <div class="list-group mb-2 border-bottom pb-2">
                        <div class="list-group-item d-flex align-items-center gap-2 bg-light border-0">
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
                </div>
            </div>
        </div>
    </div>

    <div v-if="modals.settings" class="modal-overlay" @click.self="modals.settings = false">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">⚙️ M3U 参数设置</h5>
                    <button type="button" class="btn-close" @click="modals.settings = false"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-4">
                        <label class="form-label d-flex justify-content-between align-items-center">
                            <span>📅 EPG 来源 (支持多选/排序)</span>
                            <button class="btn btn-sm btn-outline-primary" @click="addEpg">+ 添加 EPG 源</button>
                        </label>
                        <div class="list-group" id="epg-list-container">
                            <div v-for="(item, idx) in settings.epgs" :key="idx" class="list-group-item d-flex align-items-center gap-2">
                                <span class="epg-drag-handle text-secondary fs-5" style="cursor: grab;">⠿</span>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" v-model="item.enabled" title="启用/禁用">
                                </div>
                                <input type="text" class="form-control form-control-sm" v-model="item.url" placeholder="https://epg.xml...">
                                <button class="btn btn-sm btn-outline-danger border-0" @click="removeEpg(idx)">✖</button>
                            </div>
                        </div>
                        <div v-if="settings.epgs.length === 0" class="text-center text-muted py-2 border rounded border-dashed bg-light small">
                            暂无 EPG 源，请点击添加
                        </div>
                    </div>

                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">回看模式 (Catchup Mode)</label>
                            <select class="form-select" v-model="settings.catchup">
                                <option value="">禁用</option>
                                <option value="append">追加</option>
                                <option value="default">默认</option>
                                <option value="shift">平移</option>
                                <option value="flussonic">flussonic</option>
                                <option value="fs">fs</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">回看源规则 (Catchup Source)</label>
                            <select class="form-select mb-2" v-model="catchupMode" @change="onCatchupModeChange">
                                <option value="append">通用追加格式 (年月日时分秒)</option>
                                <option value="timestamp">通用时间戳格式</option>
                                <option value="custom">自定义...</option>
                            </select>
                            
                            <input v-if="catchupMode === 'custom'" type="text" class="form-control" v-model="settings.catchupSource" placeholder="输入自定义规则...">
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <label class="form-label small text-muted">当前配置预览 (M3U 头部标签)</label>
                        <div class="p-3 bg-light border rounded font-monospace small text-break">
                            <div v-if="settings.epgs.filter(e=>e.enabled).length > 0" class="mb-1">
                                x-tvg-url="{{ settings.epgs.filter(e=>e.enabled).map(e=>e.url).join(',') }}"
                            </div>
                            <div v-if="settings.catchup">catchup="{{settings.catchup}}"</div>
                            <div v-if="settings.catchupSource">catchup-source="{{settings.catchupSource}}"</div>
                            <div v-if="!settings.catchup && !settings.catchupSource && settings.epgs.filter(e=>e.enabled).length === 0" class="text-muted fst-italic">暂未配置参数</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" @click="modals.settings = false">完成</button>
                </div>
            </div>
        </div>
    </div>
    
    <div v-if="conflictModal.show" class="modal-overlay">
        <div class="conflict-card">
            <div class="conflict-header">
                <div class="d-flex align-items-center gap-2 overflow-hidden">
                        <span class="text-truncate">⚠️ 发现重复频道: {{ conflictModal.currentItem.name }}</span>
                        <span class="badge bg-danger flex-shrink-0">剩余: {{ conflictModal.queue.length }}</span>
                </div>
                <button type="button" class="btn-close ms-2" @click="cancelConflict" aria-label="Close"></button>
            </div>
            <div class="conflict-body">
                <div class="form-check mb-2"><input class="form-check-input" type="radio" value="old" v-model="conflictModal.action"><label class="form-check-label">仅保留旧版</label></div>
                <div class="form-check mb-2"><input class="form-check-input" type="radio" value="new" v-model="conflictModal.action"><label class="form-check-label">仅保留新版</label></div>
                <div class="form-check mb-3"><input class="form-check-input" type="radio" value="merge" v-model="conflictModal.action"><label class="form-check-label">合并保留 (推荐)</label></div>
                <div v-if="conflictModal.action === 'merge'" class="source-list">
                    <div class="source-item" v-for="(url, idx) in conflictModal.mergedUrls" :key="idx" @click="conflictModal.selectedPrimary = url">
                        <input type="radio" :checked="conflictModal.selectedPrimary === url" name="primaryUrl" class="form-check-input me-2 flex-shrink-0">
                        <span class="text-truncate flex-grow-1" :title="url">{{ url }}</span>
                        <span v-if="conflictModal.selectedPrimary === url" class="badge bg-primary ms-2 flex-shrink-0">默认源</span>
                    </div>
                </div>
                <div class="d-flex justify-content-end mt-4">
                    <button class="btn btn-outline-secondary me-2" @click="resolveAllConflicts">批量处理</button>
                    <button class="btn btn-primary" @click="resolveConflict">确认</button>
                </div>
            </div>
        </div>
    </div>
`;