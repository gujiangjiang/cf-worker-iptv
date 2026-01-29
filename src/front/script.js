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
            const savedPwd = localStorage.getItem('iptv_pwd');
            if(savedPwd) {
                this.password = savedPwd;
                this.login();
            }
        },
        methods: {
            ${uiMethods},
            ${apiMethods},
            ${importMethods}
        }
    }).mount('#app');
`;