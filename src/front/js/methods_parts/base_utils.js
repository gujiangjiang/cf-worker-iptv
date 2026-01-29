/**
 * 基础工具函数
 * 包含: ID生成, Toast提示, 密码生成等
 */
export const baseUtils = `
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    showToast(message, type = 'success') {
        this.toast.message = message;
        this.toast.type = type;
        this.toast.show = true;
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => { this.toast.show = false; }, 3000);
    },

    // 生成随机订阅密码
    generateSubPassword() {
        this.settings.subPassword = Math.random().toString(36).substring(2, 10);
        this.showSubPass = true; // 生成后自动显示明文以便查看
    },
`;