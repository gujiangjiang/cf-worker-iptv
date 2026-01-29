/**
 * 前端数据状态模块
 */
export const dataContent = `
    isAuth: false,
    password: '',
    channels: [],
    settings: {
        epgUrl: '',
        catchup: '',
        catchupSource: ''
    },
    // Toast 状态
    toast: { show: false, message: '', type: 'success' },
    toastTimer: null,
    
    showSettings: false,
    loading: false,
    importUrl: '',
    baseUrl: window.location.origin,
    sortableInstance: null,
    
    // 冲突解决模态框状态
    conflictModal: {
        show: false,
        queue: [], 
        currentItem: null, 
        existingIndex: -1, 
        action: 'merge', 
        mergedUrls: [], 
        selectedPrimary: '' 
    }
`;