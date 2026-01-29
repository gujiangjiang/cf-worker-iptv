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

    /* --- 模态框通用样式美化 --- */
    
    .modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5); 
        z-index: 1060;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(3px); /* 增加背景模糊，更有质感 */
    }

    /* 统一所有 Bootstrap 模态框的外观 */
    .modal-content {
        border: none;
        border-radius: 12px; /* 更大的圆角 */
        box-shadow: 0 15px 40px rgba(0,0,0,0.25); /* 深度阴影，立体感更强 */
        overflow: hidden;
        background-color: #fff;
    }

    /* 模态框头部美化 */
    .modal-header {
        background-color: #e7f1ff; /* 使用浅蓝色作为默认头部背景，清新且不突兀 */
        color: #004085; /* 深蓝文字 */
        border-bottom: none; /* 移除分割线，更现代 */
        padding: 15px 25px;
    }
    
    .modal-title {
        font-weight: 700; /* 加粗标题 */
    }

    /* 模态框内容区 */
    .modal-body {
        padding: 25px;
        background-color: #fff;
    }

    /* 模态框底部 */
    .modal-footer {
        border-top: 1px solid #f0f0f0; /* 极淡的分割线 */
        padding: 15px 25px;
        background-color: #fff;
    }

    /* --- 冲突解决卡片专用 (保持原样，但微调以匹配整体风格) --- */
    .conflict-card {
        background-color: #fff; 
        width: 600px; max-width: 90%;
        border-radius: 12px; 
        box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        overflow: hidden; display: flex; flex-direction: column;
    }
    .conflict-header {
        background: #f8d7da; /* 红色背景表示警告/处理 */
        color: #842029; 
        padding: 15px 25px;
        font-weight: 700; 
        display: flex; justify-content: space-between; align-items: center;
    }
    .conflict-body { padding: 25px; }
    
    /* 列表项样式 */
    .source-list { list-style: none; padding: 0; margin: 15px 0; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
    .source-item { 
        padding: 12px 15px; border-bottom: 1px solid #dee2e6; 
        display: flex; align-items: center; font-size: 0.9rem; 
        word-break: break-all;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    .source-item:last-child { border-bottom: none; }
    .source-item:hover { background-color: #f1f3f5; }
    .source-item input[type="radio"] { margin-right: 12px; cursor: pointer; }
    .badge-src { font-size: 0.75rem; margin-left: auto; padding: 4px 8px; border-radius: 6px; font-weight: 500; }
    .badge-old { background: #6c757d; color: white; }
    .badge-new { background: #0d6efd; color: white; }
`;