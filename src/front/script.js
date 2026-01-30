/**
 * 前端主逻辑汇编模块
 * 将分离的 data, methods 等模块组装成完整的 Vue App 字符串
 */
import { dataContent } from './js/data.js';
import { uiMethods } from './js/methods_ui.js';
import { apiMethods } from './js/methods_api.js';
import { importMethods } from './js/methods_import.js';

export const jsContent = `
    const { createApp } = Vue;
    createApp({
        data() {
            return {
                ${dataContent}
            }
        },
        computed: {
            toastClass() {
                return this.toast.type === 'error' ? 'bg-danger' : 'bg-success';
            }
        },
        mounted() {
            // 初始化主题 (优先执行)
            this.initTheme();

            // 初始化：检查是否已登录，或是否允许访客查看
            const savedPwd = localStorage.getItem('iptv_pwd');
            if(savedPwd) {
                this.password = savedPwd;
                // 传入 true 表示静默自动登录
                this.login(true);
            } else {
                // 如果没有保存密码，则初始化访客模式 (拉取配置)
                this.initGuest();
            }

            // 新增：注册滚动监听事件
            window.addEventListener('scroll', this.handleScroll);
        },
        // 最佳实践：组件卸载时移除监听器
        unmounted() {
            window.removeEventListener('scroll', this.handleScroll);
            if(this.systemThemeMatcher) {
                this.systemThemeMatcher.removeEventListener('change', this.applyTheme);
            }
        },
        methods: {
            ${uiMethods},
            ${apiMethods},
            ${importMethods}
        }
    }).mount('#app');
`;