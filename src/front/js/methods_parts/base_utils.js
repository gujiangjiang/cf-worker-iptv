/**
 * 基础工具函数
 * 包含: ID生成, Toast提示, 密码生成, 通用网络请求
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

    generateSubPassword() {
        this.settings.subPassword = Math.random().toString(36).substring(2, 10);
        this.showSubPass = true; 
    },

    // 通用 API 请求封装
    async fetchApi(url, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (this.password) headers['Authorization'] = this.password;

        try {
            const res = await fetch(url, { ...options, headers });
            
            // 统一处理 401 未授权
            if (res.status === 401) {
                // 如果是主动登录操作，让调用者自己处理错误提示；否则统一提示
                if (!options.skipAuthToast) {
                    this.showToast('密码错误或会话过期', 'error');
                    localStorage.removeItem('iptv_pwd');
                    this.isAuth = false;
                }
                throw new Error('Unauthorized'); // 中断后续逻辑
            }

            if (!res.ok) {
                throw new Error(res.statusText);
            }
            
            // 如果不需要解析 JSON (比如 m3u 文本)，在 options 里标记
            if (options.returnText) return await res.text();
            
            return await res.json();
        } catch (e) {
            throw e; // 继续抛出给调用者处理特定逻辑
        }
    },
`;