/**
 * 前端样式模块
 * 导出 CSS 字符串
 */
export const cssContent = `
    body { background-color: #f8f9fa; }
    .container { max-width: 1300px; margin-top: 30px; }
    .channel-row input { font-size: 0.9rem; }
    
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
    
    /* 自定义滚动条等其他样式可在此添加 */
`;