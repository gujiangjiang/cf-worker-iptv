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

    toast: { show: false, message: '', type: 'success' },
    toastTimer: null,
    loading: false,
    importUrl: '',
    baseUrl: window.location.origin,
    sortableInstance: null,
    sourceSortableInstance: null,
    groupSortableInstance: null,
    epgSortableInstance: null,

    // 播放器状态
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
    
    // 冲突处理状态更新
    conflictModal: {
        show: false,
        queue: [], 
        currentItem: null, // 新导入的频道对象
        existingIndex: -1, // 已存在频道的索引
        matchType: 'exact', // 'exact' (完全匹配) | 'fuzzy' (模糊/疑似匹配)
        suggestedName: '', // 疑似匹配时，推荐合并到的目标名称
        action: 'merge', 
        mergedUrls: [], 
        selectedPrimary: '' 
    }
`;