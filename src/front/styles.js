/**
 * 前端样式模块
 */
export const cssContent = `
    body { background-color: #f8f9fa; }
    
    /* 调整布局：移除 margin-top，改用 padding-top 撑开顶部空间 */
    .container { max-width: 1300px; }
    #app { padding-top: 85px; } 

    /* 固定页眉样式 */
    .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 70px;
        background-color: rgba(248, 249, 250, 0.90); /* 微透明背景 */
        backdrop-filter: blur(10px); /* 毛玻璃特效 */
        -webkit-backdrop-filter: blur(10px);
        box-shadow: 0 1px 10px rgba(0,0,0,0.08);
        z-index: 1030; /* 层级高于内容，低于 Modal/Toast */
        display: flex;
        align-items: center;
        transition: all 0.3s ease;
    }

    .drag-handle { cursor: grab; user-select: none; }
    .drag-handle:active { cursor: grabbing; }
    .sortable-ghost { background-color: #e9ecef !important; opacity: 0.5; }
    .loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); z-index: 9999; display: flex; justify-content: center; align-items: center; }
    .toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
    .toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-20px); }
    
    /* 修复：将 Toast 层级提升到最高，超过播放器的 3000 */
    .toast-container { z-index: 9999 !important; }
    
    /* --- 统一浮动按钮样式 (基础结构) --- */
    .floating-btn {
        width: 50px;
        height: 50px;
        font-size: 22px;
        border-radius: 50%;
        position: fixed;
        right: 35px; /* 统一右侧距离 */
        z-index: 1030;
        display: flex;
        align-items: center;
        justify-content: center;
        outline: none;
        
        /* 磨砂玻璃核心效果 (背景色由具体类定义) */
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        cursor: pointer;
    }
    
    .floating-btn:hover {
        transform: translateY(-5px) scale(1.05);
    }

    /* --- 保存按钮 (蓝色系磨砂) --- */
    .btn-save-pos {
        bottom: 40px;
        color: #0d6efd; /* 蓝色图标 */
        background: rgba(13, 110, 253, 0.2); /* 蓝色微透背景 */
        border: 1px solid rgba(13, 110, 253, 0.3); /* 蓝色微透边框 */
        box-shadow: 0 8px 32px 0 rgba(13, 110, 253, 0.15);
    }
    .btn-save-pos:hover {
        background: rgba(13, 110, 253, 0.35); /* 悬停加深 */
        box-shadow: 0 12px 40px 0 rgba(13, 110, 253, 0.25);
        color: #0a58ca;
    }

    /* --- 回到顶部按钮 (深灰色系磨砂) --- */
    .btn-top-pos {
        bottom: 105px; 
        color: #212529; /* 深色图标 */
        background: rgba(33, 37, 41, 0.15); /* 深色微透背景 */
        border: 1px solid rgba(33, 37, 41, 0.25); /* 深色微透边框 */
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
    }
    .btn-top-pos:hover {
        background: rgba(33, 37, 41, 0.25); /* 悬停加深 */
        box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.15);
        color: #000;
    }

    /* 模态框美化 */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 1060; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px); }
    
    /* 确认弹窗层级 */
    .confirm-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); z-index: 1200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }

    .modal-content { border: none; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.25); background-color: #fff; overflow: hidden; }
    /* 注意：这里的全局样式会影响所有模态框，播放器需要单独覆盖 */
    .modal-header { background-color: #e7f1ff; color: #004085; border-bottom: none; padding: 15px 25px; }
    .modal-body { padding: 25px; background-color: #fff; }
    .modal-footer { border-top: 1px solid #f0f0f0; padding: 15px 25px; background-color: #fff; }
    .modal-header.bg-danger-subtle { background-color: #f8d7da; color: #842029; }

    /* Logo 预览框 - 修复：增大尺寸并优化显示 */
    .logo-preview-box {
        width: 80px; height: 60px;
        background-color: #f8f9fa;
        border: 1px solid #ced4da;
        border-radius: 4px;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
        flex-shrink: 0; /* 防止被挤压 */
    }
    .logo-preview-box img { max-width: 100%; max-height: 100%; object-fit: contain; }

    /* 源列表样式 */
    .source-row { transition: background 0.2s; }
    .source-row:hover { background-color: #f8f9fa; }
    .source-drag-handle { cursor: grab; color: #adb5bd; }
    .source-drag-handle:hover { color: #6c757d; }
    
    /* 分组拖拽手柄 */
    .group-drag-handle { cursor: grab; color: #adb5bd; font-size: 1.2rem; }
    .group-drag-handle:hover { color: #6c757d; }

    /* EPG 拖拽手柄 */
    .epg-drag-handle { cursor: grab; color: #adb5bd; }
    .epg-drag-handle:hover { color: #6c757d; }

    /* 冲突卡片 */
    .conflict-card { background-color: #fff; width: 600px; max-width: 90%; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.3); overflow: hidden; display: flex; flex-direction: column; }
    .conflict-header { background: #f8d7da; color: #842029; padding: 15px 25px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
    .conflict-body { padding: 25px; }
    .source-list { list-style: none; padding: 0; margin: 15px 0; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
    .source-item { padding: 12px 15px; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; cursor: pointer; }
    .source-item:last-child { border-bottom: none; }
    .badge-src { font-size: 0.75rem; margin-left: auto; padding: 4px 8px; border-radius: 6px; }
    .badge-old { background: #6c757d; color: white; }
    .badge-new { background: #0d6efd; color: white; }

    /* 页脚链接悬停效果 */
    .hover-link:hover { color: #0d6efd !important; text-decoration: underline !important; }
`;