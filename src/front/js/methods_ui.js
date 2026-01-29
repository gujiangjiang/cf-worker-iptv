/**
 * 前端 UI 交互逻辑模块 (聚合入口)
 * 包含: 基础工具, 数据处理, 播放器, 排序, 模态框交互
 */
import { baseUtils } from './methods_parts/base_utils.js';
import { dataUtils } from './methods_parts/data_utils.js';
import { playerMethods } from './methods_parts/ui_player.js';
import { sortableMethods } from './methods_parts/ui_sortable.js';
import { modalMethods } from './methods_parts/ui_modals.js';

export const uiMethods = `
    ${baseUtils}
    ${dataUtils}
    ${playerMethods}
    ${sortableMethods}
    ${modalMethods}
`;