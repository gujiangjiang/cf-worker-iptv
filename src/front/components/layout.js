/**
 * 组件：主页面布局
 * 包含：Toast、Header、登录页、主列表、Loading
 */
export const layoutTemplate = `
    <div class="toast-container position-fixed top-0 start-50 translate-middle-x p-3">
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
                            <button class="btn btn-sm btn-outline-secondary me-2" @click="openGroupManager">📁 分组管理</button>
                            <button class="btn btn-sm btn-outline-secondary" @click="openSettingsModal">⚙️ 全局设置</button>
                        </div>
                </div>
                <div class="col-md-5"><input type="file" class="form-control" @change="handleFileUpload" accept=".m3u,.m3u8"></div>
                <div class="col-md-7"><div class="input-group"><input type="text" class="form-control" v-model="importUrl" placeholder="输入 M3U 链接..."><button class="btn btn-primary" @click="handleUrlImport">导入</button></div></div>
                <div class="col-12 d-flex justify-content-end border-top pt-3 mt-3">
                        <button class="btn btn-danger me-2" @click="openConfirmModal('clearAll')">清空</button>
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
                                    <button class="btn btn-sm btn-outline-danger" @click="openConfirmModal('deleteChannel', index)">删除</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <div v-if="loading" class="loading-overlay"><div class="spinner-border text-primary"></div></div>
`;