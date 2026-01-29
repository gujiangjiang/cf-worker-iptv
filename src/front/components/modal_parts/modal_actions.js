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
    dialogClass: 'modal-dialog', // 默认尺寸
    // 这里手动加 style 来限制宽度，模拟原本的 style="max-width: 400px"
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
    overlayClass: 'confirm-modal-overlay', // 特殊遮罩样式
    // 动态 header 颜色
    headerDynamicClass: "confirmModal.type === 'danger' ? 'bg-danger-subtle' : ''",
    body: confirmBody,
    footer: `
        <button class="btn btn-secondary" @click="confirmModal.show = false">取消</button>
        <button :class="['btn', confirmModal.type === 'danger' ? 'btn-danger' : 'btn-primary']" @click="executeConfirm">确认</button>
    `
});

// 4. 播放器模态框 (高度定制)
const playerBody = `
    <video id="video-player" controls style="width: 100%; max-height: 70vh; outline: none;" autoplay></video>
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
    <small class="text-white-50 text-truncate w-100 font-monospace mb-1">正在播放: {{ playingUrl }}</small>
    <small class="text-warning" style="font-size: 0.75rem;">提示: 如无法播放，可能是因为源地址是 HTTP 而当前页面是 HTTPS (混合内容限制)，请尝试允许浏览器加载不安全内容。</small>
`;

export const playerModal = createModal({
    condition: 'modals.player',
    closeAction: 'closePlayer',
    zIndex: 3000,
    size: 'modal-lg',
    
    // 定制化样式
    contentClass: 'modal-content bg-dark text-white',
    contentStyle: 'border: 1px solid #444;',
    headerStyle: 'background-color: transparent !important; color: white !important; border-bottom: 0;',
    bodyStyle: 'padding: 0; display: flex; justify-content: center; align-items: center; min-height: 400px; background: #000;',
    footerStyle: 'background-color: transparent !important; color: white !important; border-top: 0; flex-direction: column; align-items: flex-start;',
    
    title: `
        <span class="badge bg-danger me-2 animate-pulse">LIVE</span>
        {{ playingName }}
    `,
    body: playerBody,
    footer: playerFooter
});

// 5. 冲突解决模态框 (定制 Header)
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
    // 动态 header 样式：重复为红，疑似为黄
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
    // 冲突框使用自定义的外壳 class
    contentClass: 'conflict-card', 
    dialogClass: '', // 移除默认的 modal-dialog，因为 conflict-card 自带宽度样式
    overlayClass: 'modal-overlay' 
});