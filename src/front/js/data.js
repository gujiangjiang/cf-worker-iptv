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
    hlsInstance: null, // hls.js 实例
    playingUrl: '',    // 当前播放地址
    playingName: '',   // 当前播放频道名

    modals: {
        login: false,           
        systemSettings: false,  
        settings: false,        
        channelEditor: false,
        groupManager: false,
        groupChannelAdder: false,
        groupViewer: false,
        player: false           // 新增：播放器弹窗
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
        action: 'merge', 
        mergedUrls: [], 
        selectedPrimary: '' 
    }
`;