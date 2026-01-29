/**
 * 前端数据状态模块
 */
export const dataContent = `
    isAuth: false,
    password: '', 
    channels: [],
    groups: [],
    
    settings: {
        epgs: [], 
        catchup: '',
        catchupSource: '',
        subPassword: '', 
        guestConfig: {
            allowViewList: false, 
            allowSub: true,       
            allowFormats: ['m3u', 'txt'] 
        }
    },
    
    publicGuestConfig: {
        allowViewList: false,
        allowSub: true,
        allowFormats: ['m3u', 'txt']
    },

    catchupMode: 'custom', 
    showSubPass: false,
    
    // 新增：控制回到顶部按钮的显示状态
    showBackToTop: false,

    toast: { show: false, message: '', type: 'success' },
    toastTimer: null,
    loading: false,
    importUrl: '',
    baseUrl: window.location.origin,
    sortableInstance: null,
    sourceSortableInstance: null,
    groupSortableInstance: null,
    epgSortableInstance: null,

    hlsInstance: null, 
    playingUrl: '',    
    playingName: '',   
    playingChannel: null, 

    modals: {
        login: false,           
        systemSettings: false,  
        settings: false,        
        channelEditor: false,
        groupManager: false,
        groupChannelAdder: false,
        groupViewer: false,
        player: false,
        import: false           
    },

    groupAdderData: {
        targetGroup: '',
        candidates: [],
        selectedIndices: []
    },

    groupViewerData: {
        groupName: '',
        list: [] 
    },

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
        matchType: 'exact', 
        suggestedName: '', 
        action: 'merge', 
        manualTargetIndex: -1, // 已废弃，保留兼容，逻辑切换为 manualTargetId
        manualTargetId: '',    // 新增：使用 ID 绑定手动目标
        mergedUrls: [], 
        selectedPrimary: '' 
    }
`;