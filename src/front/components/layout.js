/**
 * 组件：主页面布局
 * 包含：Toast、Header、登录页、主列表、页脚、Loading
 */
export const layoutTemplate = `
    <div class="toast-container position-fixed top-0 start-50 translate-middle-x p-3">
        <div :class="['toast', 'align-items-center', 'text-white', 'border-0', toastClass, toast.show ? 'show' : '']">
            <div class="d-flex"><div class="toast-body fs-6">{{ toast.message }}</div></div>
        </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-4">
        <h3>📺 IPTV 直播源管理</h3>
        
        <div class="d-flex gap-2">
            <div class="dropdown" v-if="isAuth || publicGuestConfig.allowSub">
                <button class="btn btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    📡 订阅 / 导出
                </button>
                <ul class="dropdown-menu">
                    <li v-if="isAuth || (publicGuestConfig.allowSub && publicGuestConfig.allowFormats.includes('m3u'))">
                        <a class="dropdown-item" :href="baseUrl + '/m3u' + (isAuth && !settings.guestConfig.allowSub ? '?pwd='+password : '')" target="_blank">📄 标准 M3U (单源)</a>
                    </li>
                    <li v-if="isAuth || (publicGuestConfig.allowSub && publicGuestConfig.allowFormats.includes('m3u'))">
                        <a class="dropdown-item" :href="baseUrl + '/m3u?mode=multi' + (isAuth && !settings.guestConfig.allowSub ? '&pwd='+password : '')" target="_blank">📑 多源 M3U (同名多源)</a>
                    </li>
                    
                    <li v-if="isAuth || (publicGuestConfig.allowSub && publicGuestConfig.allowFormats.includes('m3u') && publicGuestConfig.allowFormats.includes('txt'))"><hr class="dropdown-divider"></li>
                    
                    <li v-if="isAuth || (publicGuestConfig.allowSub && publicGuestConfig.allowFormats.includes('txt'))">
                        <a class="dropdown-item" :href="baseUrl + '/txt' + (isAuth && !settings.guestConfig.allowSub ? '?pwd='+password : '')" target="_blank">📝 TXT 格式</a>
                    </li>
                </ul>
            </div>
            
            <button v-if="!isAuth" class="btn btn-dark" @click="openLoginModal">🔐 后台管理</button>
            
            <button v-if="isAuth" class="btn btn-secondary" @click="openSystemSettings" title="系统设置">🛠️ 系统设置</button>
            <button v-if="isAuth" class="btn btn-outline-danger" @click="logout" title="退出登录">退出</button>
        </div>
    </div>

    <div class="flex-grow-1">
        <div v-if="!isAuth && !publicGuestConfig.allowViewList" class="card p-5 text-center shadow-sm">
            <div class="mb-3 display-1 text-muted">🔒</div>
            <h3>私有系统</h3>
            <p class="text-muted">当前系统未开放访客查看权限，请登录后台进行管理。</p>
            <div class="mt-3">
                <button class="btn btn-primary" @click="openLoginModal">管理员登录</button>
            </div>
        </div>

        <div v-else>
            <button v-if="isAuth" class="btn btn-primary floating-save-btn position-fixed bottom-0 end-0 m-4" @click="saveData" title="保存">💾</button>

            <div v-if="isAuth" class="card p-3 mb-4 shadow-sm">
                <div class="row g-3">
                    <div class="col-12 d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">快捷操作</h5>
                            <div>
                                <button class="btn btn-sm btn-outline-secondary me-2" @click="openGroupManager">📁 分组管理</button>
                                <button class="btn btn-sm btn-outline-secondary" @click="openSettingsModal">⚙️ M3U 参数</button>
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
                    <button v-if="isAuth" class="btn btn-sm btn-primary" @click="openAddChannelModal">+ 新增频道</button>
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
                                    <th v-if="isAuth" style="width: 15%" class="text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody id="channel-list">
                                <tr v-if="channels.length === 0">
                                    <td :colspan="isAuth ? 7 : 6" class="text-center py-5 text-muted">
                                        <div class="fs-1 mb-3 opacity-50">📭</div>
                                        <div class="fw-bold">当前暂无可用频道</div>
                                        <div class="small mt-1 opacity-75" v-if="isAuth">请点击右上角“新增频道”或使用导入功能添加数据</div>
                                        <div class="small mt-1 opacity-75" v-else>管理员暂未配置频道列表</div>
                                    </td>
                                </tr>

                                <tr v-for="(item, index) in channels" :key="item.id" class="channel-row">
                                    <td :class="['text-center', isAuth ? 'cursor-move drag-handle' : '']">
                                        <span class="text-secondary">{{ index + 1 }}</span>
                                    </td>
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
                                    <td v-if="isAuth" class="text-center">
                                        <div class="d-flex justify-content-center gap-2">
                                            <button class="btn btn-sm btn-outline-success border-0" @click="openPlayer(item)" title="预览播放">▶️</button>
                                            <button class="btn btn-sm btn-outline-primary border-0" @click="openEditChannelModal(index)" title="编辑">✏️</button>
                                            <button class="btn btn-sm btn-outline-danger border-0" @click="openConfirmModal('deleteChannel', index)" title="删除">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <footer class="text-center text-muted mt-5 mb-3 small user-select-none">
        <p class="mb-1">
            Powered by 
            <a href="https://github.com/gujiangjiang/cf-worker-iptv" target="_blank" class="text-decoration-none text-secondary fw-bold hover-link">
                Cloudflare Worker IPTV Manager
            </a>
        </p>
        <p class="mb-0 opacity-75">
            本项目开源免费，仅供学习与技术交流使用
        </p>
    </footer>
    
    <div v-if="loading" class="loading-overlay"><div class="spinner-border text-primary"></div></div>
`;