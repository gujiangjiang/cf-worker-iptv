/**
 * 前端样式模块
 * 导出 CSS 字符串
 */
export const cssContent = `
    body { background-color: #f8f9fa; }
    .container { max-width: 1300px; margin-top: 30px; }
    .channel-row input { font-size: 0.9rem; }
    
    /* 拖拽手柄样式 */
    .drag-handle {
        cursor: grab;
        user-select: none;
    }
    .drag-handle:active {
        cursor: grabbing;
    }
    /* 拖拽占位符样式 (SortableJS 自动添加的类) */
    .sortable-ghost {
        background-color: #e9ecef !important;
        opacity: 0.5;
    }
    
    /* 加载遮罩层 */
    .loading-overlay { 
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%; 
        background: rgba(255,255,255,0.8); 
        z-index: 9999; 
        display: flex; 
        justify-content: center; 
        align-items: center; 
    }
    
    /* Toast 动画过渡 */
    .toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
    .toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-20px); }
    
    /* 浮动保存按钮 */
    .floating-save-btn {
        width: 60px;
        height: 60px;
        font-size: 26px;
        border-radius: 50%;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 1030;
        transition: transform 0.2s, box-shadow 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    }
    
    .floating-save-btn:hover {
        transform: scale(1.1) translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    }
    
    .floating-save-btn:active {
        transform: scale(0.95);
    }
`;