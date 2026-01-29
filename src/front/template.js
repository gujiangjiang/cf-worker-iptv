/**
 * 前端 HTML 模板文件
 * 导出包含 Vue 3 应用和 Bootstrap 样式的 HTML 字符串
 */
export const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IPTV 源管理平台</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/vue@3.2.47/dist/vue.global.prod.js"></script>
    <style>
        body { background-color: #f8f9fa; }
        .container { max-width: 1200px; margin-top: 30px; }
        .channel-row input { font-size: 0.9rem; }
        .loading-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); z-index:9999; display:flex; justify-content:center; align-items:center; }
    </style>
</head>
<body>
    <div id="app" class="container pb-5">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>📺 IPTV 直播源管理</h3>
            <div>
                <a :href="baseUrl + '/m3u'" target="_blank" class="btn btn-outline-primary btn-sm me-2">获取 M3U</a>
                <a :href="baseUrl + '/txt'" target="_blank" class="btn btn-outline-success btn-sm">获取 TXT</a>
            </div>
        </div>

        <div v-if="!isAuth" class="card p-4 shadow-sm" style="max-width: 400px; margin: 0 auto;">
            <div class="mb-3">
                <label class="form-label">访问密码</label>
                <input type="password" class="form-control" v-model="password" @keyup.enter="login">
            </div>
            <button class="btn btn-primary w-100" @click="login">进入管理</button>
        </div>

        <div v-else>
            <div class="card p-3 mb-4 shadow-sm">
                <div class="row g-3">
                    <div class="col-12 d-flex justify-content-between align-items-center">
                         <h5 class="mb-0">数据导入 & 设置</h5>
                         <button class="btn btn-sm btn-outline-secondary" @click="showSettings = !showSettings">
                            {{ showSettings ? '收起设置' : '⚙️ 全局设置' }}
                         </button>
                    </div>
                    
                    <div v-if="showSettings" class="col-12 border-bottom pb-3">
                        <div class="row g-2">
                            <div class="col-md-4">
                                <label class="form-label small text-muted">EPG XML 地址 (x-tvg-url)</label>
                                <input type="text" class="form-control form-control-sm" v-model="settings.epgUrl" placeholder="https://...">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small text-muted">回看模式 (catchup)</label>
                                <input type="text" class="form-control form-control-sm" v-model="settings.catchup" placeholder="例如: append">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small text-muted">回看源规则 (catchup-source)</label>
                                <input type="text" class="form-control form-control-sm" v-model="settings.catchupSource" placeholder="?playseek=\${(b)yyyy...}">
                            </div>
                        </div>
                    </div>

                    <div class="col-md-5">
                        <label class="form-label">本地导入 (.m3u)</label>
                        <input type="file" class="form-control" @change="handleFileUpload" accept=".m3u,.m3u8">
                    </div>
                    <div class="col-md-7">
                        <label class="form-label">网络导入 (URL)</label>
                        <div class="input-group">
                            <input type="text" class="form-control" v-model="importUrl" placeholder="粘贴 M3U 链接...">
                            <button class="btn btn-primary" @click="handleUrlImport">导入</button>
                        </div>
                    </div>
                    <div class="col-12 d-flex justify-content-end border-top pt-3 mt-3">
                         <button class="btn btn-danger me-2" @click="clearAll">清空列表</button>
                         <button class="btn btn-success" @click="saveData">💾 保存所有更改 (列表+配置)</button>
                    </div>
                </div>
            </div>

            <div class="card shadow-sm">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>频道列表 ({{ channels.length }})</span>
                    <button class="btn btn-sm btn-primary" @click="addChannel">+ 新增频道</button>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0 align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 15%">分组</th>
                                    <th style="width: 20%">频道名</th>
                                    <th style="width: 15%">Logo URL</th>
                                    <th style="width: 40%">直播源 URL</th>
                                    <th style="width: 10%">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in channels" :key="index" class="channel-row">
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.group"></td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.name"></td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.logo" placeholder="http://..."></td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="item.url"></td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-danger border-0" @click="removeChannel(index)">✖</button>
                                        <button class="btn btn-sm btn-outline-secondary border-0" @click="moveUp(index)" :disabled="index===0">↑</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <div v-if="loading" class="loading-overlay">
            <div class="spinner-border text-primary" role="status"></div>
        </div>
    </div>

    <script>
        const { createApp } = Vue;
        createApp({
            data() {
                return {
                    isAuth: false,
                    password: '',
                    channels: [],
                    settings: {
                        epgUrl: '',
                        catchup: '',
                        catchupSource: ''
                    },
                    showSettings: false,
                    loading: false,
                    importUrl: '',
                    baseUrl: window.location.origin
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
                async login() {
                    this.loading = true;
                    try {
                        // 并行获取频道列表和配置
                        const [listRes, settingsRes] = await Promise.all([
                            fetch('/api/list', { headers: { 'Authorization': this.password } }),
                            fetch('/api/settings', { headers: { 'Authorization': this.password } })
                        ]);

                        if(listRes.status === 401) {
                            alert('密码错误');
                            localStorage.removeItem('iptv_pwd');
                        } else {
                            this.channels = await listRes.json();
                            // 加载设置，如果没有则保持默认空值
                            const remoteSettings = await settingsRes.json();
                            this.settings = { ...this.settings, ...remoteSettings };
                            
                            this.isAuth = true;
                            localStorage.setItem('iptv_pwd', this.password);
                        }
                    } catch(e) {
                        alert('连接失败');
                    }
                    this.loading = false;
                },
                handleFileUpload(event) {
                    const file = event.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.parseM3U(e.target.result);
                        event.target.value = '';
                    };
                    reader.readAsText(file);
                },
                async handleUrlImport() {
                    if (!this.importUrl) return alert('请输入有效的 URL');
                    this.loading = true;
                    try {
                        const res = await fetch('/api/fetch-m3u', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': this.password
                            },
                            body: JSON.stringify({ url: this.importUrl })
                        });
                        
                        if (res.ok) {
                            const text = await res.text();
                            this.parseM3U(text);
                            this.importUrl = '';
                        } else {
                            alert('导入失败，服务器返回错误: ' + res.statusText);
                        }
                    } catch (e) {
                        alert('网络请求出错，请检查链接或稍后重试');
                    }
                    this.loading = false;
                },
                parseM3U(content) {
                    if (!content) return;
                    const lines = content.split('\\n');
                    
                    // 1. 解析头部全局信息 (#EXTM3U)
                    const headerLine = lines.find(l => l.startsWith('#EXTM3U'));
                    let settingsFound = false;
                    if(headerLine) {
                        const epgMatch = headerLine.match(/x-tvg-url="([^"]*)"/);
                        const catchupMatch = headerLine.match(/catchup="([^"]*)"/);
                        const sourceMatch = headerLine.match(/catchup-source="([^"]*)"/);
                        
                        if(epgMatch || catchupMatch || sourceMatch) {
                            if(epgMatch) this.settings.epgUrl = epgMatch[1];
                            if(catchupMatch) this.settings.catchup = catchupMatch[1];
                            if(sourceMatch) this.settings.catchupSource = sourceMatch[1];
                            settingsFound = true;
                            this.showSettings = true; // 自动展开设置面板
                        }
                    }

                    // 2. 解析频道列表
                    const newChannels = [];
                    let currentInfo = {};
                    
                    lines.forEach(line => {
                        line = line.trim();
                        if (line.startsWith('#EXTINF:')) {
                            const infoMatch = line.match(/group-title="(.*?)".*tvg-logo="(.*?)",(.*)/) || 
                                              line.match(/,(.*)/);
                            
                            if (infoMatch) {
                                currentInfo = {
                                    group: infoMatch[1] || '未分组',
                                    logo: infoMatch[2] || '',
                                    name: (infoMatch[3] || infoMatch[1] || '未知频道').trim()
                                };
                            }
                        } else if (line && !line.startsWith('#')) {
                            if (currentInfo.name) {
                                newChannels.push({
                                    ...currentInfo,
                                    url: line
                                });
                                currentInfo = {};
                            }
                        }
                    });
                    
                    if (newChannels.length === 0) {
                        alert('未解析到有效频道，请检查文件格式。');
                        return;
                    }

                    let msg = \`解析到 \${newChannels.length} 个频道。\`;
                    if(settingsFound) msg += '\\n已自动提取并更新了全局设置 (EPG/回看)。';
                    msg += '\\n选择"确定"追加到现有列表，选择"取消"覆盖现有列表。';

                    if(confirm(msg)) {
                         this.channels = [...this.channels, ...newChannels];
                    } else {
                         this.channels = newChannels;
                    }
                },
                addChannel() {
                    this.channels.unshift({ name: '新频道', group: '默认', logo: '', url: '' });
                },
                removeChannel(index) {
                    this.channels.splice(index, 1);
                },
                moveUp(index) {
                    if (index > 0) {
                        const item = this.channels[index];
                        this.channels.splice(index, 1);
                        this.channels.splice(index - 1, 0, item);
                    }
                },
                clearAll() {
                    if(confirm('确定要清空所有频道吗？')) {
                        this.channels = [];
                    }
                },
                async saveData() {
                    this.loading = true;
                    try {
                        // 并行保存频道列表和配置
                        const [resList, resSettings] = await Promise.all([
                            fetch('/api/save', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': this.password },
                                body: JSON.stringify(this.channels)
                            }),
                            fetch('/api/settings', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': this.password },
                                body: JSON.stringify(this.settings)
                            })
                        ]);

                        if(resList.ok && resSettings.ok) alert('保存成功！');
                        else alert('保存失败');
                    } catch(e) {
                        alert('保存出错');
                    }
                    this.loading = false;
                }
            }
        }).mount('#app');
    </script>
</body>
</html>
`;