/**
 * 组件：模态框集合 (聚合入口)
 * 包含：二次确认、频道编辑、分组管理、批量添加、全局设置、冲突处理、分组查看、系统设置、登录、播放器、导入
 */
import { channelEditorModal, groupManagerModal, groupAdderModal, groupViewerModal } from './modal_parts/modal_channels.js';
import { settingsModal, sysSettingsModal } from './modal_parts/modal_settings.js';
import { loginModal, importModal, confirmModal, playerModal, conflictModal } from './modal_parts/modal_actions.js';

export const modalTemplate = `
    ${conflictModal}

    ${importModal}

    ${playerModal}

    ${loginModal}

    ${sysSettingsModal}

    ${confirmModal}

    ${groupAdderModal}

    ${groupViewerModal}

    ${channelEditorModal}

    ${groupManagerModal}

    ${settingsModal}
`;