/**
 * 前端数据状态模块
 */
export const dataContent = `
    isAuth: false,
    password: '',
    channels: [],
    groups: [],
    settings: {
        epgUrl: '',
        catchup: '',
        catchupSource: ''
    },
    catchupMode: 'custom', // 新增：回看规则模式 (append, timestamp, custom)

    toast: { show: false, message: '', type: 'success' },
    toastTimer: null,
    loading: false,
    importUrl: '',
    baseUrl: window.location.origin,
    sortableInstance: null,
    sourceSortableInstance: null, // 新增：模态框内源列表的排序实例
    groupSortableInstance: null, // 新增：分组排序实例

    modals: {
        settings: false,
        channelEditor: false,
        groupManager: false,
        groupChannelAdder: false,
        groupViewer: false       // 新增：分组频道查看器
    },

    // 批量添加频道数据状态
    groupAdderData: {
        targetGroup: '',
        candidates: [],
        selectedIndices: []
    },

    // 新增：分组频道查看器数据
    groupViewerData: {
        groupName: '',
        list: [] // { name, url, ... }
    },

    // 通用确认模态框状态
    confirmModal: {
        show: false,
        title: '',
        message: '',
        type: 'info', // 'info' | 'danger'
        actionType: '', // 'deleteSource' | 'deleteChannel' | 'clearAll'
        targetIndex: -1,
        inputPassword: '', // 清空列表时验证用
        requirePassword: false
    },

    // 频道编辑表单
    editMode: false, // false=新增, true=编辑
    editingIndex: -1,
    channelForm: {
        group: '默认',
        name: '',
        tvgName: '',
        useLogo: false, // 是否使用 Logo
        logo: '',
        sources: [] // { url: '', enabled: true, isPrimary: false }
    },
    logoPreviewUrl: '', // Logo 预览地址
    
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