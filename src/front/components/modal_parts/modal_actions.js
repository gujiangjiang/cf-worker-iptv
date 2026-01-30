/**
 * 动作与工具类模态框 (登录、导入、播放、冲突、确认)
 */
import { createModal } from './base_modal.js';

// 1. 登录模态框
export const loginModal = createModal({
    condition: 'modals.login',
    closeAction: 'modals.login = false',
    title: '🔐 后台管理登录',
    zIndex: 2000,
    dialogClass: 'modal-dialog', 
    contentStyle: 'max-width: 400px; margin: 0 auto;', 
    body: `
        <div class="mb-3">
            <label class="form-label">访问密码</label>
            <input type="password" class="form-control" v-model="password" @keyup.enter="login" placeholder="请输入管理员密码" autofocus>
        </div>
    `,
    footer: `<button class="btn btn-primary w-100" @click="login" :disabled="loading">{{ loading ? '登录中...' : '进入系统' }}</button>`
});

// 2. 导入模态框
const importBody = `
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
`;

export const importModal = createModal({
    condition: 'modals.import',
    closeAction: 'modals.import = false',
    title: '📥 导入直播源',
    zIndex: 1070,
    body: importBody
});

// 3. 二次确认模态框
const confirmBody = `
    <p class="mb-3" style="white-space: pre-wrap;">{{ confirmModal.message }}</p>
    <div v-if="confirmModal.requirePassword">
        <label class="form-label small text-muted">请输入管理密码以确认：</label>
        <input type="password" class="form-control" v-model="confirmModal.inputPassword" placeholder="Current Password">
    </div>
`;

export const confirmModal = createModal({
    condition: 'confirmModal.show',
    closeAction: 'confirmModal.show = false',
    title: '{{ confirmModal.title }}',
    zIndex: 3500, // 修复: 提升层级至最高，确保在编辑器(1100)、登录框(2000)、播放器(3000)之上
    overlayClass: 'confirm-modal-overlay', // 特殊遮罩样式
    headerDynamicClass: "confirmModal.type === 'danger' ? 'bg-danger-subtle' : ''",
    body: confirmBody,
    footer: `
        <button class="btn btn-secondary" @click="confirmModal.show = false">取消</button>
        <button :class="['btn', confirmModal.type === 'danger' ? 'btn-danger' : 'btn-primary']" @click="executeConfirm">确认</button>
    `
});

// 4. 播放器模态框 (深度优化)
const playerBody = `
    <div style="position: relative; width: 100%; height: 100%;">
        <video id="video-player" controls style="width: 100%; max-height: 70vh; outline: none;" autoplay></video>
        
        <div v-if="playerError === 'mixed_content'" class="position-absolute top-50 start-50 translate-middle text-center p-4 rounded" style="background: rgba(0,0,0,0.85); width: 80%; backdrop-filter: blur(5px);">
            <div class="fs-1 mb-3">🛡️</div>
            <h5 class="text-white mb-2">播放被浏览器拦截</h5>
            <p class="text-white-50 small mb-3">
                当前页面为 HTTPS 安全协议，但直播源是 HTTP 协议。<br>
                浏览器默认禁止此类“混合内容”请求。
            </p>
            <div class="d-grid gap-2 col-10 mx-auto">
                <button class="btn btn-sm btn-outline-light" @click="forceHttpsPlay">尝试强制 HTTPS 播放</button>
                <div class="text-warning small mt-2 border border-warning rounded p-2 text-start">
                    <strong>📢 解决方法：</strong><br>
                    请点击浏览器地址栏左侧的 🔒 图标 -> 网站设置 -> 将“不安全内容”设为“允许”，然后刷新页面。
                </div>
            </div>
        </div>
    </div>
`;

const playerFooter = `
    <div v-if="playingChannel && playingChannel.sources.filter(s => s.enabled).length > 1" class="w-100 mb-2">
        <label class="small text-white-50 mb-1">切换直播源:</label>
        <select class="form-select form-select-sm bg-secondary text-white border-0" :value="playingUrl" @change="switchPlayerSource($event.target.value)">
            <option v-for="(source, idx) in playingChannel.sources.filter(s => s.enabled)" :key="source._id || idx" :value="source.url">
                源 {{ idx + 1 }}: {{ source.url }}
            </option>
        </select>
    </div>
    
    <div class="d-flex align-items-center justify-content-between w-100 gap-2">
        <small class="text-white-50 text-truncate font-monospace flex-grow-1" :title="playingUrl">{{ playingUrl }}</small>
        
        <button v-if="playingUrl.startsWith('http:') && !playingUrl.startsWith('https:')" class="btn btn-sm btn-outline-warning text-nowrap" @click="forceHttpsPlay" title="尝试把 URL 改为 https">
            转 HTTPS
        </button>
        
        <button class="btn btn-sm btn-light text-nowrap" @click="copyToClipboard(playingUrl)" title="复制直播源链接">
            📋 复制
        </button>
    </div>
    
    <small v-if="!playerError" class="text-white-50 mt-2 w-100 text-start" style="font-size: 0.75rem;">
        💡 提示: 如果一直加载失败，请点击右侧“复制”按钮，使用 PotPlayer 等本地播放器播放。
    </small>
`;

export const playerModal = createModal({
    condition: 'modals.player',
    closeAction: 'closePlayer',
    zIndex: 3000,
    size: 'modal-lg',
    
    // 定制化样式 (配合 CSS 类实现响应式高度)
    contentClass: 'modal-content bg-dark text-white',
    contentStyle: 'border: 1px solid #444;',
    headerStyle: 'background-color: transparent !important; color: white !important; border-bottom: 0;',
    // bodyStyle 已移除，改为使用 bodyClass 配合 CSS
    bodyClass: 'player-responsive-body', 
    footerStyle: 'background-color: transparent !important; color: white !important; border-top: 1px solid #333; flex-direction: column; align-items: flex-start;',
    
    title: `
        <span class="badge bg-danger me-2 animate-pulse">LIVE</span>
        {{ playingName }}
    `,
    body: playerBody,
    footer: playerFooter
});

// 5. 冲突解决模态框
const conflictBody = `
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
    <div class="form-check mb-2">
        <input class="form-check-input" type="radio" value="merge" v-model="conflictModal.action">
        <label class="form-check-label">
            {{ conflictModal.matchType === 'fuzzy' ? '合并到现有频道 (视为同一频道)' : '合并保留 (推荐)' }}
        </label>
    </div>
    
    <div class="form-check mb-3">
        <input class="form-check-input" type="radio" value="manual" v-model="conflictModal.action">
        <label class="form-check-label fw-bold text-primary">手动选择合并目标 (纠错)</label>
    </div>

    <div v-if="conflictModal.action === 'manual'" class="mb-3 ps-4 animate-fade-in">
        <label class="form-label small text-muted">请选择要归入的目标频道：</label>
        <select class="form-select" v-model="conflictModal.manualTargetId">
            <option value="" disabled>-- 请选择 --</option>
            <option v-for="(ch, idx) in channels" :key="ch.id" :value="ch.id">
                {{ ch.name }} ({{ ch.group }})
            </option>
        </select>
    </div>

    <div v-if="conflictModal.action === 'merge'" class="source-list bg-light" style="max-height: 200px; overflow-y: auto;">
        <div class="p-2 border-bottom small text-muted">合并后的源列表预览 (选择默认源):</div>
        <div class="source-item" v-for="(url, idx) in conflictModal.mergedUrls" :key="idx" @click="conflictModal.selectedPrimary = url">
            <input type="radio" :checked="conflictModal.selectedPrimary === url" name="primaryUrl" class="form-check-input me-2 flex-shrink-0">
            <span class="text-truncate flex-grow-1 font-monospace small" :title="url">{{ url }}</span>
            <span v-if="conflictModal.selectedPrimary === url" class="badge bg-primary ms-2 flex-shrink-0">默认</span>
        </div>
    </div>

    <div class="d-flex justify-content-end mt-4 gap-2">
        <button class="btn btn-outline-secondary" @click="resolveAllConflicts" :disabled="conflictModal.action === 'manual'">对剩余项全部应用</button>
        <button class="btn btn-primary px-4" @click="resolveConflict">确认</button>
    </div>
`;

export const conflictModal = createModal({
    condition: 'conflictModal.show',
    closeAction: 'cancelConflict',
    zIndex: 2000,
    headerDynamicClass: "conflictModal.matchType === 'fuzzy' ? 'bg-warning-subtle text-dark' : 'bg-danger-subtle text-danger'",
    title: `
        <div class="d-flex align-items-center gap-2 overflow-hidden">
            <span v-if="conflictModal.matchType === 'exact'" class="fw-bold">⚠️ 发现重复频道</span>
            <span v-else class="fw-bold">🤔 发现疑似频道</span>
            <span class="badge bg-secondary flex-shrink-0">剩余: {{ conflictModal.queue.length }}</span>
        </div>
    `,
    body: conflictBody,
    bodyStyle: 'max-height: 70vh; overflow-y: auto;',
    contentClass: 'conflict-card', 
    dialogClass: '', 
    overlayClass: 'modal-overlay' 
});