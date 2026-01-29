/**
 * 通用模态框生成器
 * 功能：提供统一的模态框 HTML 结构，支持高度定制化
 */
export const createModal = ({
    condition,          // v-if 条件 (字符串)
    closeAction,        // 关闭操作 (字符串，如 "modals.login = false")
    title,              // 标题 HTML
    body,               // 内容主体 HTML
    footer = '',        // 页脚 HTML (可选)
    
    // 样式与配置
    zIndex = 1060,      // 层级
    size = '',          // 尺寸类: modal-lg, modal-xl, modal-sm
    scrollable = false, // 是否添加 modal-dialog-scrollable
    
    // 自定义类与样式 (用于覆盖默认样式)
    overlayClass = 'modal-overlay',
    dialogClass = 'modal-dialog',
    contentClass = 'modal-content',
    contentStyle = '',
    headerClass = 'modal-header',   // 静态 Header 类
    headerDynamicClass = '',        // 动态 Header 类 (Vue :class 绑定字符串)
    headerStyle = '',
    bodyClass = 'modal-body',
    bodyStyle = '',
    footerClass = 'modal-footer',
    footerStyle = ''
}) => {
    // 处理 Header 的 class 属性 (同时支持静态和动态)
    let headerClassAttr = `class="${headerClass}"`;
    if (headerDynamicClass) {
        headerClassAttr = `:class="['${headerClass}', ${headerDynamicClass}]"`;
    }

    return `
    <div v-if="${condition}" class="${overlayClass}" style="z-index: ${zIndex};" @click.self="${closeAction}">
        <div class="${dialogClass} ${size} ${scrollable ? 'modal-dialog-scrollable' : ''}">
            <div class="${contentClass}" style="${contentStyle}">
                
                <div ${headerClassAttr} style="${headerStyle}">
                    <h5 class="modal-title text-truncate">${title}</h5>
                    <button type="button" class="btn-close" ${headerClass.includes('text-white') ? 'class="btn-close-white"' : ''} @click="${closeAction}"></button>
                </div>

                <div class="${bodyClass}" style="${bodyStyle}">
                    ${body}
                </div>

                ${footer ? `
                <div class="${footerClass}" style="${footerStyle}">
                    ${footer}
                </div>
                ` : ''}
                
            </div>
        </div>
    </div>
    `;
};