/**
 * 前端样式模块
 * 导出 CSS 字符串
 */
export const cssContent = `
    body { background-color: #f8f9fa; }
    .container { max-width: 1300px; margin-top: 30px; }
    .channel-row input { font-size: 0.9rem; }
    
    .drag-handle { cursor: grab; user-select: none; }
    .drag-handle:active { cursor: grabbing; }
    .sortable-ghost { background-color: #e9ecef !important; opacity: 0.5; }
    
    .loading-overlay { 
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(255,255,255,0.8); z-index: 9999; 
        display: flex; justify-content: center; align-items: center; 
    }
    
    .toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
    .toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-20px); }
    
    .floating-save-btn {
        width: 60px; height: 60px; font-size: 26px; border-radius: 50%;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 1030;
        transition: transform 0.2s, box-shadow 0.2s;
        display: flex; align-items: center; justify-content: center; padding: 0;
    }
    .floating-save-btn:hover { transform: scale(1.1) translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
    .floating-save-btn:active { transform: scale(0.95); }

    /* --- 模态框样式修复 --- */
    
    /* 遮罩层：确保背景半透明黑 */
    .modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5); /* 黑色半透明 */
        z-index: 1060;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(2px); /* 可选：增加一点背景模糊效果 */
    }

    /* 修复 Bootstrap .modal-content 在自定义遮罩下可能无背景的问题 */
    .modal-content {
        background-color: #fff !important; /* 强制白色背景 */
        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15); /* 添加阴影 */
        border: 1px solid rgba(0,0,0,.2);
        border-radius: 0.5rem;
    }
    
    /* 冲突解决卡片专用样式 */
    .conflict-card {
        background-color: #fff !important; /* 强制白色背景 */
        width: 600px; max-width: 90%;
        border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        overflow: hidden; display: flex; flex-direction: column;
    }
    .conflict-header {
        background: #f8d7da; color: #842029; padding: 15px 20px;
        font-weight: bold; display: flex; justify-content: space-between; align-items: center;
    }
    .conflict-body { padding: 20px; }
    .source-list { list-style: none; padding: 0; margin: 10px 0; border: 1px solid #dee2e6; border-radius: 4px; }
    .source-item { 
        padding: 10px; border-bottom: 1px solid #dee2e6; 
        display: flex; align-items: center; font-size: 0.9rem; 
        word-break: break-all;
    }
    .source-item:last-child { border-bottom: none; }
    .source-item:hover { background-color: #f8f9fa; }
    .source-item input[type="radio"] { margin-right: 10px; cursor: pointer; }
    .badge-src { font-size: 0.75rem; margin-left: auto; padding: 2px 6px; border-radius: 4px; }
    .badge-old { background: #6c757d; color: white; }
    .badge-new { background: #0d6efd; color: white; }
`;