/**
 * 前端数据状态模块
 */
export const dataContent = `
    isAuth: false,
    password: '', // 用户输入的密码
    channels: [],
    groups: [],
    
    // 全局设置 (包含访客配置)
    settings: {
        epgs: [], // [{ url: '', enabled: true }]
        catchup: '',
        catchupSource: '',
        guestConfig: {
            allowViewList: false, // 是否允许未登录查看列表
            allowSub: true,       // 是否允许未登录订阅
            allowFormats: ['m3u', 'txt'] // 允许的格式
        }
    },
    
    // 访客状态 (未登录时从服务端获取的配置)
    publicGuestConfig: {
        allowViewList: false,
        allowSub: true,
        allowFormats: ['m3u', 'txt']
    },

    catchupMode: 'custom', 

    toast: { show: false, message: '', type: 'success' },
    toastTimer: null,
    loading: false,
    importUrl: '',
    baseUrl: window.location.origin,
    sortableInstance: null,
    sourceSortableInstance: null,
    groupSortableInstance: null,
    epgSortableInstance: null,

    modals: {
        login: false,           // 新增：登录弹窗
        systemSettings: false,  // 新增：系统设置弹窗
        settings: false,        // (原M3U参数设置，为了区分建议改名，但保持兼容暂时不变，UI上叫 "M3U 参数")
        channelEditor: false,
        groupManager: false,
        groupChannelAdder: false,
        groupViewer: false
    },

    // 批量添加频道数据状态
    groupAdderData: {
        targetGroup: '',
        candidates: [],
        selectedIndices: []
    },

    // 分组频道查看器数据
    groupViewerData: {
        groupName: '',
        list: [] 
    },

    // 通用确认模态框状态
    confirmModal: {
        show: false,
        title: '',
        message: '',
        type: 'info', 
        actionType: '', 
        targetIndex: -1,
        inputPassword: '', 
        requirePassword: false
    },

    // 频道编辑表单
    editMode: false, 
    editingIndex: -1,
    channelForm: {
        group: '默认',
        name: '',
        tvgName: '',
        useLogo: false, 
        logo: '',
        sources: [] 
    },
    logoPreviewUrl: '', 
    
    newGroupInput: '',
    
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