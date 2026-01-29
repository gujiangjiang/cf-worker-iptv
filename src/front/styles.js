/**
 * 前端样式模块
 * 导出 CSS 字符串
 */
export const cssContent = `
    body { background-color: #f8f9fa; }
    .container { max-width: 1300px; margin-top: 30px; }
    .channel-row input { font-size: 0.9rem; }
    
    /* 拖拽手柄样式 */
    .drag-handle { cursor: grab; user-select: none; }
    .drag-handle:active { cursor: grabbing; }
    .sortable-ghost { background-color: #e9ecef !important; opacity: 0.5; }
    
    /* 加载遮罩层 */
    .loading-overlay { 
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(255,255,255,0.8); z-index: 9999; 
        display: flex; justify-content: center; align-items: center; 
    }
    
    /* Toast 样式 */
    .toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
    .toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-20px); }
    
    /* 浮动保存按钮 */
    .floating-save-btn {
        width: 60px; height: 60px; font-size: 26px; border-radius: 50%;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 1030;
        transition: transform 0.2s, box-shadow 0.2s;
        display: flex; align-items: center; justify-content: center; padding: 0;
    }
    .floating-save-btn:hover { transform: scale(1.1) translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
    .floating-save-btn:active { transform: scale(0.95); }

    /* 冲突解决模态框样式 */
    .modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 1060;
        display: flex; align-items: center; justify-content: center;
    }
    .conflict-card {
        background: white; width: 600px; max-width: 90%;
        border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
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