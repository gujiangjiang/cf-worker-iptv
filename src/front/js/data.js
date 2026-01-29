/**
 * 前端数据状态模块
 */
export const dataContent = `
    isAuth: false,
    password: '',
    channels: [],
    groups: [], // 分组列表
    settings: {
        epgUrl: '',
        catchup: '',
        catchupSource: ''
    },
    
    // Toast 状态
    toast: { show: false, message: '', type: 'success' },
    toastTimer: null,
    
    loading: false,
    importUrl: '',
    baseUrl: window.location.origin,
    sortableInstance: null,

    // 模态框显示状态
    modals: {
        settings: false,
        addChannel: false,
        groupManager: false
    },

    // 新增频道表单数据
    newChannelForm: {
        group: '默认',
        name: '',
        logo: '',
        url: ''
    },
    
    // 分组管理输入框
    newGroupInput: '',
    
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