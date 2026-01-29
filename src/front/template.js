/**
 * 前端主模板文件
 * 负责组装 HTML 结构，引入分离的样式和逻辑模块
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
        
        <div v-if="conflictModal.show" class="modal-overlay">
            <div class="conflict-card">
                <div class="conflict-header">
                    <span>⚠️ 发现重复频道: {{ conflictModal.currentItem.name }}</span>
                    <span class="badge bg-danger">剩余: {{ conflictModal.queue.length }}</span>
                </div>
                <div class="conflict-body">
                    <p class="mb-2 text-muted small">系统检测到频道名称相似，请选择处理方式：</p>
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="radio" value="old" v-model="conflictModal.action">
                        <label class="form-check-label">仅保留旧版 (丢弃新导入)</label>
                    </div>
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="radio" value="new" v-model="conflictModal.action">
                        <label class="form-check-label">仅保留新版 (覆盖现有)</label>
                    </div>
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="radio" value="merge" v-model="conflictModal.action">
                        <label class="form-check-label">合并保留 (推荐) - 选择主要源：</label>
                    </div>
                    <div v-if="conflictModal.action === 'merge'" class="source-list">
                        <div class="source-item" v-for="(url, idx) in conflictModal.mergedUrls" :key="idx" @click="conflictModal.selectedPrimary = url">
                            <input type="radio" :checked="conflictModal.selectedPrimary === url" name="primaryUrl">
                            <span class="text-truncate">{{ url }}</span>
                            <span :class="['badge-src', isUrlFromOld(url) ? 'badge-old' : 'badge-new']">{{ isUrlFromOld(url) ? '现有' : '新导入' }}</span>
                        </div>
                    </div>
                    <div class="d-flex justify-content-end mt-4">
                        <button class="btn btn-outline-secondary me-2" @click="resolveAllConflicts">按此规则处理所有</button>
                        <button class="btn btn-primary" @click="resolveConflict">确认处理</button>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="modals.settings" class="modal-overlay" @click.self="modals.settings = false">
            <div class="modal-dialog modal-lg" style="pointer-events: auto">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">⚙️ 全局设置</h5>
                        <button type="button" class="btn-close" @click="modals.settings = false"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">EPG XML 地址 (x-tvg-url)</label>
                            <input type="text" class="form-control" v-model="settings.epgUrl" placeholder="https://...">
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">回看模式 (catchup)</label>
                                <select class="form-select" v-model="settings.catchup">
                                    <option value="">未设置 (None)</option>
                                    <option value="append">append (追加)</option>
                                    <option value="default">default (默认)</option>
                                    <option value="shift">shift (平移)</option>
                                    <option value="flussonic">flussonic</option>
                                    <option value="fs">fs</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">回看源规则 (catchup-source)</label>
                                <input type="text" class="form-control" v-model="settings.catchupSource" list="catchupSourceOptions">
                                <datalist id="catchupSourceOptions">
                                    <option value="?playseek=\${(b)yyyyMMddHHmmss}-\${(e)yyyyMMddHHmmss}">通用追加格式</option>
                                    <option value="?playseek=\${(b)timestamp}-\${(e)timestamp}">通用时间戳格式</option>
                                </datalist>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" @click="modals.settings = false">完成</button>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="modals.addChannel" class="modal-overlay" @click.self="modals.addChannel = false">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">➕ 新增频道</h5>
                        <button type="button" class="btn-close" @click="modals.addChannel = false"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">分组</label>
                            <select class="form-select" v-model="newChannelForm.group">
                                <option v-for="g in groups" :key="g" :value="g">{{ g }}</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">频道名称</label>
                            <input type="text" class="form-control" v-model="newChannelForm.name">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Logo URL</label>
                            <input type="text" class="form-control" v-model="newChannelForm.logo">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">直播源地址</label>
                            <input type="text" class="form-control" v-model="newChannelForm.url">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" @click="confirmAddChannel">添加</button>
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
                        <div class="d-flex justify-content-between align-items-center mb-2">
                             <small class="text-muted">已有分组 ({{ groups.length }})</small>
                             <button class="btn btn-sm btn-link text-decoration-none" @click="syncGroupsFromChannels">从列表同步</button>
                        </div>
                        <ul class="list-group" style="max-height: 400px; overflow-y: auto;">
                            <li class="list-group-item d-flex justify-content-between align-items-center" v-for="(g, idx) in groups" :key="idx">
                                {{ g }}
                                <button class="btn btn-sm btn-outline-danger border-0" @click="removeGroup(idx)">✖</button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <div class="toast-container position-fixed top-0 start-50 translate-middle-x p-3" style="z-index: 1050">
            <div :class="['toast', 'align-items-center', 'text-white', 'border-0', toastClass, toast.show ? 'show' : '']">
                <div class="d-flex">
                    <div class="toast-body fs-6">{{ toast.message }}</div>
                </div>
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
            <div class="mb-3">
                <label class="form-label">访问密码</label>
                <input type="password" class="form-control" v-model="password" @keyup.enter="login">
            </div>
            <button class="btn btn-primary w-100" @click="login">进入管理</button>
        </div>

        <div v-else>
            <button class="btn btn-primary floating-save-btn position-fixed bottom-0 end-0 m-4" @click="saveData" title="保存所有更改">💾</button>

            <div class="card p-3 mb-4 shadow-sm">
                <div class="row g-3">
                    <div class="col-12 d-flex justify-content-between align-items-center">
                         <h5 class="mb-0">快捷操作</h5>
                         <div>
                             <button class="btn btn-sm btn-outline-secondary me-2" @click="modals.groupManager = true">📁 分组管理</button>
                             <button class="btn btn-sm btn-outline-secondary" @click="modals.settings = true">⚙️ 全局设置</button>
                         </div>
                    </div>

                    <div class="col-md-5">
                        <label class="form-label">本地导入 (.m3u)</label>
                        <input type="file" class="form-control" @change="handleFileUpload" accept=".m3u,.m3u8">
                    </div>
                    <div class="col-md-7">
                        <label class="form-label">网络导入 (URL)</label>
                        <div class="input-group">
                            <input type="text" class="form-control" v-model="importUrl" placeholder="粘贴 M3U 链接...">
                            <button class="btn btn-primary" @click="handleUrlImport">导入</button>
                        </div>
                    </div>
                    <div class="col-12 d-flex justify-content-end border-top pt-3 mt-3">
                         <button class="btn btn-danger me-2" @click="clearAll">清空列表</button>
                         <button class="btn btn-success" @click="saveData">💾 保存所有</button>
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
                                    <th style="width: 5%" class="text-center">排序</th>
                                    <th style="width: 12%">分组</th>
                                    <th style="width: 12%">EPG 名称</th>
                                    <th style="width: 15%">显示名称</th>
                                    <th style="width: 15%">Logo URL</th>
                                    <th style="width: 35%">直播源 URL (主)</th>
                                    <th style="width: 6%" class="text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody id="channel-list">
                                <tr v-for="(item, index) in channels" :key="index" class="channel-row">
                                    <td class="text-center cursor-move drag-handle"><span class="text-secondary fs-5">⠿</span></td>
                                    <td>
                                        <select class="form-select form-select-sm" v-model="item.group">
                                            <option v-for="g in groups" :key="g" :value="g">{{ g }}</option>
                                        </select>
                                    </td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.tvgName"></td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.name"></td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.logo"></td>
                                    <td>
                                        <div class="input-group input-group-sm">
                                            <input type="text" class="form-control" v-model="item.urls[0]">
                                            <span v-if="item.urls.length > 1" class="input-group-text bg-warning text-dark">+{{item.urls.length-1}}</span>
                                        </div>
                                    </td>
                                    <td class="text-center">
                                        <button class="btn btn-sm btn-outline-danger border-0" @click="removeChannel(index)">✖</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <div v-if="loading" class="loading-overlay">
            <div class="spinner-border text-primary" role="status"></div>
        </div>
    </div>

    <script>
        ${jsContent}
    </script>
</body>
</html>
`;