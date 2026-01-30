/**
 * 基础工具函数
 * 包含: ID生成, Toast提示, 密码生成, 通用网络请求, 滚动交互, 剪贴板, 主题控制
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
    
    // 平滑滚动到页面顶部
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // 处理滚动事件，控制回到顶部按钮显示
    handleScroll() {
        this.showBackToTop = window.scrollY > 300;
    },

    // 新增：复制文本到剪贴板
    async copyToClipboard(text) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('✅ 已复制到剪贴板', 'success');
        } catch (err) {
            // 回退兼容方案
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            this.showToast('✅ 已复制到剪贴板', 'success');
        }
    },

    // --- 主题控制逻辑 ---
    initTheme() {
        // 监听系统主题变化
        this.systemThemeMatcher = window.matchMedia('(prefers-color-scheme: dark)');
        this.systemThemeMatcher.addEventListener('change', () => {
            if (this.settings.theme === 'auto') this.applyTheme();
        });
        // 初始化应用
        this.applyTheme();
    },

    applyTheme() {
        let theme = this.settings.theme || 'auto';
        if (theme === 'auto') {
            theme = this.systemThemeMatcher && this.systemThemeMatcher.matches ? 'dark' : 'light';
        }
        // 设置 Bootstrap 5.3 的 data-bs-theme 属性
        document.documentElement.setAttribute('data-bs-theme', theme);
    },

    // 通用 API 请求封装
    async fetchApi(url, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (this.password) headers['Authorization'] = this.password;

        try {
            const res = await fetch(url, { ...options, headers });
            
            // 统一处理 401 未授权
            if (res.status === 401) {
                if (!options.skipAuthToast) {
                    this.showToast('密码错误或会话过期', 'error');
                    localStorage.removeItem('iptv_pwd');
                    this.isAuth = false;
                }
                throw new Error('Unauthorized'); 
            }

            if (!res.ok) {
                throw new Error(res.statusText);
            }
            
            if (options.returnText) return await res.text();
            
            return await res.json();
        } catch (e) {
            throw e; 
        }
    },
`;