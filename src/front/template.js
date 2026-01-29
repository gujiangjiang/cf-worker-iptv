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
        <div class="toast-container position-fixed top-0 start-50 translate-middle-x p-3" style="z-index: 1050">
            <div :class="['toast', 'align-items-center', 'text-white', 'border-0', toastClass, toast.show ? 'show' : '']" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body fs-6">
                        {{ toast.message }}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="toast.show = false" aria-label="Close"></button>
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
            <button class="btn btn-primary floating-save-btn position-fixed bottom-0 end-0 m-4"
                    @click="saveData"
                    title="保存所有更改">
                💾
            </button>

            <div class="card p-3 mb-4 shadow-sm">
                <div class="row g-3">
                    <div class="col-12 d-flex justify-content-between align-items-center">
                         <h5 class="mb-0">数据导入 & 设置</h5>
                         <button class="btn btn-sm btn-outline-secondary" @click="showSettings = !showSettings">
                            {{ showSettings ? '收起设置' : '⚙️ 全局设置' }}
                         </button>
                    </div>
                    
                    <div v-if="showSettings" class="col-12 border-bottom pb-3">
                        <div class="row g-2">
                            <div class="col-md-4">
                                <label class="form-label small text-muted">EPG XML 地址 (x-tvg-url)</label>
                                <input type="text" class="form-control form-control-sm" v-model="settings.epgUrl" placeholder="https://...">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small text-muted">回看模式 (catchup)</label>
                                <select class="form-select form-select-sm" v-model="settings.catchup">
                                    <option value="">未设置 (None)</option>
                                    <option value="append">append (追加)</option>
                                    <option value="default">default (默认)</option>
                                    <option value="shift">shift (平移)</option>
                                    <option value="flussonic">flussonic</option>
                                    <option value="fs">fs</option>
                                </select>
                            </div>
                            <div class="col-md-5">
                                <label class="form-label small text-muted">回看源规则 (catchup-source)</label>
                                <input type="text" class="form-control form-control-sm" v-model="settings.catchupSource" list="catchupSourceOptions" placeholder="选择或输入规则...">
                                <datalist id="catchupSourceOptions">
                                    <option value="?playseek=\${(b)yyyyMMddHHmmss}-\${(e)yyyyMMddHHmmss}">通用追加格式 (年月日时分秒)</option>
                                    <option value="?playseek=\${(b)timestamp}-\${(e)timestamp}">通用时间戳格式</option>
                                </datalist>
                            </div>
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
                         <button class="btn btn-success" @click="saveData">💾 保存所有更改 (列表+配置)</button>
                    </div>
                </div>
            </div>

            <div class="card shadow-sm">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>频道列表 ({{ channels.length }})</span>
                    <button class="btn btn-sm btn-primary" @click="addChannel">+ 新增频道</button>
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
                                    <th style="width: 35%">直播源 URL</th>
                                    <th style="width: 6%" class="text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody id="channel-list">
                                <tr v-for="(item, index) in channels" :key="index" class="channel-row">
                                    <td class="text-center cursor-move drag-handle" title="按住拖动排序">
                                        <span class="text-secondary fs-5">⠿</span>
                                    </td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.group"></td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.tvgName" placeholder="tvg-name"></td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.name" placeholder="列表显示名"></td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.logo" placeholder="http://..."></td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.url"></td>
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