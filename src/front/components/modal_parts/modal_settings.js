/**
 * 设置相关模态框
 */
import { createModal } from './base_modal.js';

// 1. M3U 参数设置 (EPG, Catchup)
const settingsBody = `
    <div class="mb-4">
        <label class="form-label d-flex justify-content-between align-items-center">
            <span>📅 EPG 来源 (支持多选/排序)</span>
            <button class="btn btn-sm btn-outline-primary" @click="addEpg">+ 添加 EPG 源</button>
        </label>
        <div class="list-group" id="epg-list-container" style="max-height: 300px; overflow-y: auto;">
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
`;

export const settingsModal = createModal({
    condition: 'modals.settings',
    closeAction: 'modals.settings = false',
    title: '⚙️ M3U 参数设置',
    size: 'modal-lg',
    body: settingsBody,
    // 修复：改为调用 saveM3uSettings 这一保存方法
    footer: `<button class="btn btn-primary" @click="saveM3uSettings">确认并保存</button>`
});

// 2. 系统全局设置 (访客权限)
const sysSettingsBody = `
    <h6 class="border-bottom pb-2 mb-3">👤 访客权限控制</h6>
    
    <div class="form-check form-switch mb-3">
        <input class="form-check-input" type="checkbox" id="allowViewList" v-model="settings.guestConfig.allowViewList">
        <label class="form-check-label" for="allowViewList">
            允许访客查看频道列表
        </label>
    </div>

    <div class="card p-3 mb-3 bg-light border-0">
        <div class="form-check form-switch mb-0">
            <input class="form-check-input" type="checkbox" id="allowSub" v-model="settings.guestConfig.allowSub">
            <label class="form-check-label fw-bold" for="allowSub">
                允许访客订阅直播源 (导出)
            </label>
        </div>
        
        <div v-if="!settings.guestConfig.allowSub" class="mt-3 ps-2 border-start border-3 border-primary">
            <label class="form-label small text-dark fw-bold">🔐 独立订阅密码 (Token)</label>
            <div class="input-group input-group-sm">
                <input :type="showSubPass ? 'text' : 'password'" class="form-control" v-model="settings.subPassword" placeholder="为空则默认使用管理员密码">
                <button class="btn btn-outline-secondary" type="button" @click="showSubPass = !showSubPass" title="显示/隐藏密码">
                    {{ showSubPass ? '🙈' : '👁️' }}
                </button>
                <button class="btn btn-outline-primary" type="button" @click="generateSubPassword">🎲 生成</button>
            </div>
            <div class="form-text small text-muted mt-1">
                私有订阅链接将使用此密码进行验证。
            </div>
        </div>

        <div v-else class="mt-3 ps-2 border-start border-3 border-success">
            <label class="form-label small text-dark fw-bold">允许公开导出的格式</label>
            <div class="d-flex gap-3">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="m3u" v-model="settings.guestConfig.allowFormats">
                    <label class="form-check-label small">M3U / 多源</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="txt" v-model="settings.guestConfig.allowFormats">
                    <label class="form-check-label small">TXT</label>
                </div>
            </div>
        </div>
    </div>
`;

export const sysSettingsModal = createModal({
    condition: 'modals.systemSettings',
    closeAction: 'modals.systemSettings = false',
    title: '🛠️ 系统设置',
    zIndex: 1070,
    body: sysSettingsBody,
    footer: `<button class="btn btn-primary" @click="saveSystemSettingsAndClose">确定并保存</button>`
});