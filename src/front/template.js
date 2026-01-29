/**
 * 前端主模板文件
 */
import { cssContent } from './styles.js';
import { jsContent } from './script.js';

export const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IPTV 源管理平台</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/vue@3.2.47/dist/vue.global.prod.js"></script>
    <style>
        ${cssContent}
    </style>
</head>
<body>
    <div id="app" class="container pb-5">
        
        <div v-if="modals.channelEditor" class="modal-overlay" @click.self="modals.channelEditor = false">
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
                                    <option v-for="g in groups" :key="g" :value="g">{{ g }}</option>
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
                            <div class="list-group" id="source-list-container">
                                <div v-for="(source, idx) in channelForm.sources" :key="idx" class="list-group-item source-row d-flex align-items-center gap-2">
                                    <span class="source-drag-handle text-secondary fs-5">⠿</span>
                                    <div class="form-check" title="是否启用该源">
                                        <input class="form-check-input" type="checkbox" v-model="source.enabled" @change="onSourceEnableChange(idx)">
                                    </div>
                                    <input type="text" class="form-control form-control-sm" v-model="source.url" :disabled="!source.enabled" placeholder="http://...">
                                    <div class="form-check" title="设为 M3U 主源">
                                        <input class="form-check-input" type="radio" :checked="source.isPrimary" @click="setPrimarySource(idx)" :disabled="!source.enabled">
                                        <label class="form-check-label small text-muted" v-if="source.isPrimary">主源</label>
                                    </div>
                                    <button class="btn btn-sm btn-outline-danger border-0" @click="removeSource(idx)">✖</button>
                                </div>
                            </div>
                            <div v-if="channelForm.sources.length === 0" class="text-center text-muted py-3 border rounded border-dashed">
                                暂无直播源，请添加
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
                        <ul class="list-group" style="max-height: 400px; overflow-y: auto;">
                            <li class="list-group-item d-flex justify-content-between align-items-center" v-for="(g, idx) in groups" :key="idx">
                                {{ g }}
                                <button class="btn btn-sm btn-outline-danger border-0" @click="removeGroup(idx)">✖</button>
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
                        <h5 class="modal-title">⚙️ 全局设置</h5>
                        <button type="button" class="btn-close" @click="modals.settings = false"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">EPG XML 地址</label>
                            <input type="text" class="form-control" v-model="settings.epgUrl" placeholder="例如: https://e.xml">
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">回看模式</label>
                                <select class="form-select" v-model="settings.catchup">
                                    <option value="">None</option>
                                    <option value="append">append</option>
                                    <option value="default">default</option>
                                    <option value="shift">shift</option>
                                    <option value="flussonic">flussonic</option>
                                    <option value="fs">fs</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">回看源规则</label>
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
                                <span v-if="settings.catchup || settings.catchupSource">
                                    <span v-if="settings.catchup">catchup="{{settings.catchup}}"</span>
                                    <span v-if="settings.catchupSource" class="ms-2">catchup-source="{{settings.catchupSource}}"</span>
                                </span>
                                <span v-else class="text-muted fst-italic">暂未配置回看参数</span>
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
                    <span>⚠️ 发现重复频道: {{ conflictModal.currentItem.name }}</span>
                    <span class="badge bg-danger">剩余: {{ conflictModal.queue.length }}</span>
                </div>
                <div class="conflict-body">
                    <div class="form-check mb-2"><input class="form-check-input" type="radio" value="old" v-model="conflictModal.action"><label class="form-check-label">仅保留旧版</label></div>
                    <div class="form-check mb-2"><input class="form-check-input" type="radio" value="new" v-model="conflictModal.action"><label class="form-check-label">仅保留新版</label></div>
                    <div class="form-check mb-3"><input class="form-check-input" type="radio" value="merge" v-model="conflictModal.action"><label class="form-check-label">合并保留 (推荐)</label></div>
                    <div v-if="conflictModal.action === 'merge'" class="source-list">
                        <div class="source-item" v-for="(url, idx) in conflictModal.mergedUrls" :key="idx" @click="conflictModal.selectedPrimary = url">
                            <input type="radio" :checked="conflictModal.selectedPrimary === url" name="primaryUrl"><span class="text-truncate">{{ url }}</span>
                        </div>
                    </div>
                    <div class="d-flex justify-content-end mt-4">
                        <button class="btn btn-outline-secondary me-2" @click="resolveAllConflicts">批量处理</button>
                        <button class="btn btn-primary" @click="resolveConflict">确认</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="toast-container position-fixed top-0 start-50 translate-middle-x p-3" style="z-index: 1050">
            <div :class="['toast', 'align-items-center', 'text-white', 'border-0', toastClass, toast.show ? 'show' : '']">
                <div class="d-flex"><div class="toast-body fs-6">{{ toast.message }}</div></div>
            </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>📺 IPTV 直播源管理</h3>
            <div>
                <a :href="baseUrl + '/m3u'" target="_blank" class="btn btn-outline-primary btn-sm me-2">获取 M3U</a>
                <a :href="baseUrl + '/txt'" target="_blank" class="btn btn-outline-success btn-sm">获取 TXT</a>
            </div>
        </div>

        <div v-if="!isAuth" class="card p-4 shadow-sm" style="max-width: 400px; margin: 0 auto;">
            <div class="mb-3"><label class="form-label">访问密码</label><input type="password" class="form-control" v-model="password" @keyup.enter="login"></div>
            <button class="btn btn-primary w-100" @click="login">进入管理</button>
        </div>

        <div v-else>
            <button class="btn btn-primary floating-save-btn position-fixed bottom-0 end-0 m-4" @click="saveData" title="保存">💾</button>

            <div class="card p-3 mb-4 shadow-sm">
                <div class="row g-3">
                    <div class="col-12 d-flex justify-content-between align-items-center">
                         <h5 class="mb-0">快捷操作</h5>
                         <div>
                             <button class="btn btn-sm btn-outline-secondary me-2" @click="modals.groupManager = true">📁 分组管理</button>
                             <button class="btn btn-sm btn-outline-secondary" @click="openSettingsModal">⚙️ 全局设置</button>
                         </div>
                    </div>
                    <div class="col-md-5"><input type="file" class="form-control" @change="handleFileUpload" accept=".m3u,.m3u8"></div>
                    <div class="col-md-7"><div class="input-group"><input type="text" class="form-control" v-model="importUrl" placeholder="输入 M3U 链接..."><button class="btn btn-primary" @click="handleUrlImport">导入</button></div></div>
                    <div class="col-12 d-flex justify-content-end border-top pt-3 mt-3">
                         <button class="btn btn-danger me-2" @click="clearAll">清空</button>
                         <button class="btn btn-success" @click="saveData">💾 保存云端</button>
                    </div>
                </div>
            </div>

            <div class="card shadow-sm">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>频道列表 ({{ channels.length }})</span>
                    <button class="btn btn-sm btn-primary" @click="openAddChannelModal">+ 新增频道</button>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0 align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 5%" class="text-center">序</th>
                                    <th style="width: 10%">分组</th>
                                    <th style="width: 15%">EPG 名称</th>
                                    <th style="width: 20%">显示名称</th>
                                    <th style="width: 10%">Logo</th>
                                    <th style="width: 25%">直播源概览</th>
                                    <th style="width: 15%" class="text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody id="channel-list">
                                <tr v-for="(item, index) in channels" :key="index" class="channel-row">
                                    <td class="text-center cursor-move drag-handle"><span class="text-secondary">⠿</span></td>
                                    <td><span class="badge bg-light text-dark border">{{ item.group }}</span></td>
                                    <td class="text-muted small">{{ item.tvgName }}</td>
                                    <td class="fw-bold">{{ item.name }}</td>
                                    <td>
                                        <img v-if="item.logo" :src="item.logo" height="30" class="rounded" onerror="this.style.display='none'">
                                        <span v-else class="text-muted small">-</span>
                                    </td>
                                    <td>
                                        <div class="d-flex align-items-center">
                                            <span class="badge bg-primary me-2">{{ item.sources.filter(s=>s.enabled).length }} 个启用</span>
                                            <small class="text-muted">共 {{ item.sources.length }} 个</small>
                                        </div>
                                    </td>
                                    <td class="text-center">
                                        <button class="btn btn-sm btn-outline-primary me-2" @click="openEditChannelModal(index)">编辑</button>
                                        <button class="btn btn-sm btn-outline-danger" @click="removeChannel(index)">删除</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <div v-if="loading" class="loading-overlay"><div class="spinner-border text-primary"></div></div>
    </div>

    <script>
        ${jsContent}
    </script>
</body>
</html>
`;