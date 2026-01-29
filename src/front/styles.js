/**
 * 前端样式模块
 */
export const cssContent = `
    /* ...原有基础样式... */
    body { background-color: #f8f9fa; }
    .container { max-width: 1300px; margin-top: 30px; }
    .drag-handle { cursor: grab; user-select: none; }
    .drag-handle:active { cursor: grabbing; }
    .sortable-ghost { background-color: #e9ecef !important; opacity: 0.5; }
    .loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); z-index: 9999; display: flex; justify-content: center; align-items: center; }
    .toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
    .toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-20px); }
    
    .floating-save-btn { width: 60px; height: 60px; font-size: 26px; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 1030; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
    .floating-save-btn:hover { transform: scale(1.1); }

    /* 模态框美化 */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 1060; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px); }
    .modal-content { border: none; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.25); background-color: #fff; overflow: hidden; }
    .modal-header { background-color: #e7f1ff; color: #004085; border-bottom: none; padding: 15px 25px; }
    .modal-body { padding: 25px; background-color: #fff; }
    .modal-footer { border-top: 1px solid #f0f0f0; padding: 15px 25px; background-color: #fff; }

    /* Logo 预览框 */
    .logo-preview-box {
        width: 40px; height: 38px;
        background-color: #f8f9fa;
        border: 1px solid #ced4da;
        border-radius: 4px;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
    }
    .logo-preview-box img { max-width: 100%; max-height: 100%; }

    /* 源列表样式 */
    .source-row { transition: background 0.2s; }
    .source-row:hover { background-color: #f8f9fa; }
    .source-drag-handle { cursor: grab; color: #adb5bd; }
    .source-drag-handle:hover { color: #6c757d; }

    /* 冲突卡片 (保持原样) */
    .conflict-card { background-color: #fff; width: 600px; max-width: 90%; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.3); overflow: hidden; display: flex; flex-direction: column; }
    .conflict-header { background: #f8d7da; color: #842029; padding: 15px 25px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
    .conflict-body { padding: 25px; }
    .source-list { list-style: none; padding: 0; margin: 15px 0; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
    .source-item { padding: 12px 15px; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; cursor: pointer; }
    .source-item:last-child { border-bottom: none; }
    .badge-src { font-size: 0.75rem; margin-left: auto; padding: 4px 8px; border-radius: 6px; }
    .badge-old { background: #6c757d; color: white; }
    .badge-new { background: #0d6efd; color: white; }
`;