/**
 * 组件：模态框集合
 * 包含：二次确认、频道编辑、分组管理、批量添加、全局设置、冲突处理、分组查看、系统设置、登录、播放器、导入
 */
export const modalTemplate = `
    <div v-if="conflictModal.show" class="modal-overlay" style="z-index: 2000;">
        <div class="conflict-card">
            <div :class="['conflict-header', conflictModal.matchType === 'fuzzy' ? 'bg-warning-subtle text-dark' : 'bg-danger-subtle text-danger']">
                <div class="d-flex align-items-center gap-2 overflow-hidden">
                    <span v-if="conflictModal.matchType === 'exact'" class="fw-bold">⚠️ 发现重复频道</span>
                    <span v-else class="fw-bold">🤔 发现疑似频道</span>
                    <span class="badge bg-secondary flex-shrink-0">剩余: {{ conflictModal.queue.length }}</span>
                </div>
                <button type="button" class="btn-close" @click="cancelConflict" aria-label="Close"></button>
            </div>
            
            <div class="conflict-body">
                <div v-if="conflictModal.matchType === 'fuzzy'" class="alert alert-warning py-2 mb-3 small">
                    <strong>名称相似检测：</strong><br>
                    导入频道：<span class="fw-bold text-primary">{{ conflictModal.currentItem.name }}</span><br>
                    现有频道：<span class="fw-bold text-dark">{{ conflictModal.suggestedName }}</span>
                </div>
                <div v-else class="mb-3 fw-bold">
                    频道名称: {{ conflictModal.currentItem.name }}
                </div>

                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" value="new" v-model="conflictModal.action">
                    <label class="form-check-label">作为新频道添加 (保留两者)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" value="old" v-model="conflictModal.action">
                    <label class="form-check-label">丢弃导入的频道 (仅保留现有)</label>
                </div>
                <div class="form-check mb-3">
                    <input class="form-check-input" type="radio" value="merge" v-model="conflictModal.action">
                    <label class="form-check-label">
                        {{ conflictModal.matchType === 'fuzzy' ? '合并到现有频道 (视为同一频道)' : '合并保留 (推荐)' }}
                    </label>
                </div>

                <div v-if="conflictModal.action === 'merge'" class="source-list bg-light">
                    <div class="p-2 border-bottom small text-muted">合并后的源列表预览 (选择默认源):</div>
                    <div class="source-item" v-for="(url, idx) in conflictModal.mergedUrls" :key="idx" @click="conflictModal.selectedPrimary = url">
                        <input type="radio" :checked="conflictModal.selectedPrimary === url" name="primaryUrl" class="form-check-input me-2 flex-shrink-0">
                        <span class="text-truncate flex-grow-1 font-monospace small" :title="url">{{ url }}</span>
                        <span v-if="conflictModal.selectedPrimary === url" class="badge bg-primary ms-2 flex-shrink-0">默认</span>
                    </div>
                </div>

                <div class="d-flex justify-content-end mt-4 gap-2">
                    <button class="btn btn-outline-secondary" @click="resolveAllConflicts">对剩余项全部应用</button>
                    <button class="btn btn-primary px-4" @click="resolveConflict">确认</button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="modals.import" class="modal-overlay" style="z-index: 1070;" @click.self="modals.import = false">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">📥 导入直播源</h5>
                    <button type="button" class="btn-close" @click="modals.import = false"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-4">
                        <label class="form-label fw-bold">📁 方式一：本地文件 (.m3u, .m3u8)</label>
                        <input type="file" class="form-control" @change="handleFileUpload" accept=".m3u,.m3u8">
                        <div class="form-text">选择文件后将立即开始解析并导入。</div>
                    </div>
                    
                    <hr class="my-4">

                    <div class="mb-2">
                        <label class="form-label fw-bold">🌐 方式二：网络链接</label>
                        <div class="input-group">
                            <input type="text" class="form-control" v-model="importUrl" placeholder="https://example.com/playlist.m3u">
                            <button class="btn btn-primary" @click="handleUrlImport" :disabled="loading">
                                <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                                导入
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="modals.player" class="modal-overlay" style="z-index: 3000;">
        <div class="modal-dialog modal-lg">
            <div class="modal-content bg-dark text-white" style="border: 1px solid #444;">
                <div class="modal-header border-bottom-0 d-flex justify-content-between align-items-center" style="background-color: transparent !important; color: white !important;">
                    <h5 class="modal-title text-truncate d-flex align-items-center" style="max-width: 90%;">
                        <span class="badge bg-danger me-2 animate-pulse">LIVE</span>
                        {{ playingName }}
                    </h5>
                    <button type="button" class="btn-close btn-close-white" @click="closePlayer"></button>
                </div>
                <div class="modal-body p-0 d-flex justify-content-center bg-black align-items-center" style="min-height: 400px; background: #000;">
                     <video id="video-player" controls style="width: 100%; max-height: 70vh; outline: none;" autoplay></video>
                </div>
                 <div class="modal-footer border-top-0 py-2 d-flex flex-column align-items-start" style="background-color: transparent !important; color: white !important;">
                    
                    <div v-if="playingChannel && playingChannel.sources.filter(s => s.enabled).length > 1" class="w-100 mb-2">
                        <label class="small text-white-50 mb-1">切换直播源:</label>
                        <select class="form-select form-select-sm bg-secondary text-white border-0" :value="playingUrl" @change="switchPlayerSource($event.target.value)">
                            <option v-for="(source, idx) in playingChannel.sources.filter(s => s.enabled)" :key="source._id || idx" :value="source.url">
                                源 {{ idx + 1 }}: {{ source.url }}
                            </option>
                        </select>
                    </div>

                    <small class="text-white-50 text-truncate w-100 font-monospace mb-1">正在播放: {{ playingUrl }}</small>
                    <small class="text-warning" style="font-size: 0.75rem;">提示: 如无法播放，可能是因为源地址是 HTTP 而当前页面是 HTTPS (混合内容限制)，请尝试允许浏览器加载不安全内容。</small>
                </div>
            </div>
        </div>
    </div>

    <div v-if="modals.login" class="modal-overlay" style="z-index: 2000;">
        <div class="modal-dialog" style="max-width: 400px;">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">🔐 后台管理登录</h5>
                    <button type="button" class="btn-close" @click="modals.login = false"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">访问密码</label>
                        <input type="password" class="form-control" v-model="password" @keyup.enter="login" placeholder="请输入管理员密码" autofocus>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary w-100" @click="login" :disabled="loading">{{ loading ? '登录中...' : '进入系统' }}</button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="modals.systemSettings" class="modal-overlay" style="z-index: 1070;" @click.self="modals.systemSettings = false">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">🛠️ 系统设置</h5>
                    <button type="button" class="btn-close" @click="modals.systemSettings = false"></button>
                </div>
                <div class="modal-body">
                    <h6 class="border-bottom pb-2 mb-3">🛡️ 安全与权限</h6>
                    
                    <div class="mb-3">
                        <label class="form-label">独立订阅密码 (Token)</label>
                        <div class="input-group">
                            <input type="text" class="form-control" v-model="settings.subPassword" placeholder="为空则默认使用管理员密码">
                            <button class="btn btn-outline-secondary" type="button" @click="settings.subPassword = Math.random().toString(36).substring(2, 10)">🎲 生成</button>
                        </div>
                        <div class="form-text small text-muted">
                            设置此密码后，订阅链接将使用该密码，不再暴露管理员密码。
                        </div>
                    </div>

                    <div class="form-check form-switch mb-3">
                        <input class="form-check-input" type="checkbox" id="allowViewList" v-model="settings.guestConfig.allowViewList">
                        <label class="form-check-label" for="allowViewList">
                            允许访客查看频道列表
                        </label>
                    </div>

                    <div class="form-check form-switch mb-3">
                        <input class="form-check-input" type="checkbox" id="allowSub" v-model="settings.guestConfig.allowSub">
                        <label class="form-check-label" for="allowSub">
                            允许访客订阅直播源 (导出)
                        </label>
                    </div>

                    <div class="mb-3" v-if="settings.guestConfig.allowSub">
                        <label class="form-label">允许访客导出的格式</label>
                        <div class="d-flex gap-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="m3u" v-model="settings.guestConfig.allowFormats">
                                <label class="form-check-label">M3U / 多源</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="txt" v-model="settings.guestConfig.allowFormats">
                                <label class="form-check-label">TXT</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" @click="saveSystemSettingsAndClose">确定并保存</button>
                </div>
            </div>
        </div>
    </div>

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
                                <button v-if="isAuth" class="btn btn-sm btn-outline-primary border-0" @click="openEditChannelFromViewer(ch.originalIndex)" title="编辑频道">✏️</button>
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
                            <div v-for="(source, idx) in channelForm.sources" :key="source._id" class="list-group-item source-row d-flex align-items-center gap-2">
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
                            <div v-for="(item, idx) in settings.epgs" :key="item._id" class="list-group-item d-flex align-items-center gap-2">
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
`;