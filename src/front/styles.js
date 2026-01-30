/**
 * 前端样式模块
 */
export const cssContent = `
    /* --- 主题变量定义 --- */
    :root, [data-bs-theme="light"] {
        --bg-body: #f8f9fa;
        --bg-header: rgba(248, 249, 250, 0.90);
        --bg-modal: #ffffff;
        --modal-header-bg: #e7f1ff;
        --modal-header-color: #004085;
        --modal-footer-bg: #fff;
        --logo-box-bg: #f8f9fa;
        --logo-box-border: #ced4da;
        --conflict-header-bg: #f8d7da;
        --conflict-header-color: #842029;
    }

    [data-bs-theme="dark"] {
        --bg-body: #212529;
        --bg-header: rgba(33, 37, 41, 0.90);
        --bg-modal: #2b3035;
        --modal-header-bg: #2b3035;
        --modal-header-color: #dee2e6;
        --modal-footer-bg: #2b3035;
        --logo-box-bg: #2b3035;
        --logo-box-border: #495057;
        --conflict-header-bg: #58151c;
        --conflict-header-color: #ea868f;
    }

    /* 应用背景色 */
    body { background-color: var(--bg-body); transition: background-color 0.3s ease; }
    
    .container { max-width: 1300px; }
    #app { padding-top: 85px; } 

    /* 固定页眉样式 */
    .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 70px;
        background-color: var(--bg-header);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-shadow: 0 1px 10px rgba(0,0,0,0.08);
        z-index: 1030;
        display: flex;
        align-items: center;
        transition: background-color 0.3s ease;
    }

    .drag-handle { cursor: grab; user-select: none; }
    .drag-handle:active { cursor: grabbing; }
    .sortable-ghost { background-color: rgba(0,0,0,0.1) !important; opacity: 0.5; }
    
    /* Loading 遮罩 */
    .loading-overlay { 
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(255,255,255,0.8); 
        z-index: 9999; display: flex; justify-content: center; align-items: center; 
    }
    [data-bs-theme="dark"] .loading-overlay { background: rgba(0,0,0,0.7); }

    .toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
    .toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-20px); }
    .toast-container { z-index: 9999 !important; }
    
    /* --- 统一浮动按钮样式 --- */
    .floating-btn {
        width: 50px; height: 50px; font-size: 22px; border-radius: 50%;
        position: fixed; right: 35px; z-index: 1030;
        display: flex; align-items: center; justify-content: center; outline: none;
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); cursor: pointer;
    }
    .floating-btn:hover { transform: translateY(-5px) scale(1.05); }

    /* 保存按钮 */
    .btn-save-pos {
        bottom: 40px;
        color: #0d6efd; background: rgba(13, 110, 253, 0.2); border: 1px solid rgba(13, 110, 253, 0.3);
        box-shadow: 0 8px 32px 0 rgba(13, 110, 253, 0.15);
    }
    .btn-save-pos:hover {
        background: rgba(13, 110, 253, 0.35); box-shadow: 0 12px 40px 0 rgba(13, 110, 253, 0.25); color: #0a58ca;
    }
    [data-bs-theme="dark"] .btn-save-pos { color: #6ea8fe; border-color: rgba(13, 110, 253, 0.5); }

    /* 回到顶部按钮 */
    .btn-top-pos {
        bottom: 105px; 
        color: #212529; background: rgba(33, 37, 41, 0.15); border: 1px solid rgba(33, 37, 41, 0.25);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
    }
    .btn-top-pos:hover {
        background: rgba(33, 37, 41, 0.25); box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.15); color: #000;
    }
    [data-bs-theme="dark"] .btn-top-pos { color: #dee2e6; background: rgba(222, 226, 230, 0.15); border-color: rgba(222, 226, 230, 0.25); }
    [data-bs-theme="dark"] .btn-top-pos:hover { color: #fff; }

    /* 模态框美化 */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 1060; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px); }
    .confirm-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); z-index: 1200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }

    /* 模态框内容 */
    .modal-content { 
        background-color: var(--bg-modal); 
        border: none; border-radius: 12px; 
        box-shadow: 0 15px 40px rgba(0,0,0,0.25); overflow: hidden; 
    }
    [data-bs-theme="dark"] .modal-content { box-shadow: 0 15px 40px rgba(0,0,0,0.6); border: 1px solid #495057; }

    .modal-header { background-color: var(--modal-header-bg); color: var(--modal-header-color); border-bottom: none; padding: 15px 25px; transition: background-color 0.3s; }
    .modal-body { padding: 25px; } 
    .modal-footer { border-top: 1px solid rgba(0,0,0,0.1); padding: 15px 25px; background-color: var(--modal-footer-bg); }
    [data-bs-theme="dark"] .modal-footer { border-top-color: rgba(255,255,255,0.1); }
    
    .modal-header.bg-danger-subtle { background-color: #f8d7da; color: #842029; }
    [data-bs-theme="dark"] .modal-header.bg-danger-subtle { background-color: #58151c; color: #ea868f; }

    /* Logo 预览框 */
    .logo-preview-box {
        width: 80px; height: 60px;
        background-color: var(--logo-box-bg);
        border: 1px solid var(--logo-box-border);
        border-radius: 4px;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden; flex-shrink: 0;
    }
    .logo-preview-box img { max-width: 100%; max-height: 100%; object-fit: contain; }

    /* 源列表 */
    .source-row { transition: background 0.2s; }
    .source-row:hover { background-color: rgba(0,0,0,0.05); }
    [data-bs-theme="dark"] .source-row:hover { background-color: rgba(255,255,255,0.05); }

    .source-drag-handle { cursor: grab; color: #adb5bd; }
    .source-drag-handle:hover { color: #6c757d; }
    .group-drag-handle { cursor: grab; color: #adb5bd; font-size: 1.2rem; }
    .group-drag-handle:hover { color: #6c757d; }
    .epg-drag-handle { cursor: grab; color: #adb5bd; }
    .epg-drag-handle:hover { color: #6c757d; }

    /* 冲突卡片 */
    .conflict-card { 
        background-color: var(--bg-modal);
        width: 600px; max-width: 90%; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.3); 
        overflow: hidden; display: flex; flex-direction: column; 
    }
    [data-bs-theme="dark"] .conflict-card { border: 1px solid #495057; }
    
    .conflict-header { background: var(--conflict-header-bg); color: var(--conflict-header-color); padding: 15px 25px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
    .conflict-body { padding: 25px; }
    
    .source-list { list-style: none; padding: 0; margin: 15px 0; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
    [data-bs-theme="dark"] .source-list { border-color: #495057; }
    
    .source-item { padding: 12px 15px; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; cursor: pointer; }
    [data-bs-theme="dark"] .source-item { border-bottom-color: #495057; }
    .source-item:last-child { border-bottom: none; }
    
    .badge-src { font-size: 0.75rem; margin-left: auto; padding: 4px 8px; border-radius: 6px; }
    .badge-old { background: #6c757d; color: white; }
    .badge-new { background: #0d6efd; color: white; }

    .hover-link:hover { color: #0d6efd !important; text-decoration: underline !important; }

    /* 播放器模态框响应式主体 (配合 JS 移除 inline style) */
    .player-responsive-body {
        padding: 0; display: flex; justify-content: center; align-items: center; 
        background: #000; position: relative;
        min-height: 400px; /* 默认桌面高度 */
    }

    @media (max-width: 768px) {
        #app { padding-top: 70px; }
        .fixed-header { height: 60px; }
        .floating-btn { width: 42px; height: 42px; font-size: 18px; right: 15px; }
        .btn-save-pos { bottom: 25px; }
        .btn-top-pos { bottom: 80px; }
        .logo-preview-box { width: 60px; height: 45px; }
    }

    /* 移动端模态框深度优化 (小尺寸模式) */
    @media (max-width: 576px) {
        /* 强制模态框左右边距变小，利用屏幕宽度 */
        .modal-dialog {
            margin: 0.5rem;
            max-width: calc(100% - 1rem) !important;
        }
        /* 减小内边距，增加内容可用空间 */
        .modal-body {
            padding: 1rem;
        }
        
        /* 播放器在手机端降低高度，防止溢出屏幕 */
        .player-responsive-body {
            min-height: 240px !important;
        }

        /* 冲突检测卡片在手机端全宽 */
        .conflict-card {
            width: 100% !important;
            max-width: 100% !important;
        }
    }
`;