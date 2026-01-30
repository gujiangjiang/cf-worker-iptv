/**
 * 播放器逻辑模块
 */
export const playerMethods = `
    openPlayer(channel) {
        const validSources = channel.sources.filter(s => s.enabled);
        if (validSources.length === 0) return this.showToast('该频道没有启用的直播源', 'warning');
        
        this.playingChannel = channel;
        this.playingName = channel.name;
        this.playerError = null; // 重置错误状态

        const primarySource = validSources.find(s => s.isPrimary) || validSources[0];
        this.playingUrl = primarySource.url;
        
        this.modals.player = true;
        this.$nextTick(() => { this.initHlsPlayer(); });
    },

    switchPlayerSource(url) {
        if (url === this.playingUrl) return;
        this.playingUrl = url;
        this.playerError = null; // 切换源时重置错误
        this.$nextTick(() => { this.initHlsPlayer(); });
    },

    // 新增：尝试强制 HTTPS 播放
    forceHttpsPlay() {
        if (this.playingUrl.startsWith('http:')) {
            const newUrl = this.playingUrl.replace(/^http:/, 'https:');
            this.switchPlayerSource(newUrl);
            this.showToast('正在尝试使用 HTTPS 协议...', 'info');
        }
    },

    initHlsPlayer() {
        const video = document.getElementById('video-player');
        if (!video) return;

        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }

        if (Hls.isSupported()) {
            const hls = new Hls();
            this.hlsInstance = hls;
            hls.loadSource(this.playingUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                video.play().catch(e => console.log('Auto-play prevented:', e));
            });
            
            // 增强的错误处理
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error('HLS Error:', data);
                    
                    // 检测混合内容错误 (HTTPS 页面加载 HTTP 资源)
                    if (data.details === 'manifestLoadError' && 
                        window.location.protocol === 'https:' && 
                        this.playingUrl.startsWith('http:')) {
                        
                        this.playerError = 'mixed_content';
                        this.showToast('播放失败: 浏览器拦截了 HTTP 直播源', 'error');
                    } else {
                        this.showToast('播放出错: ' + data.details, 'error');
                    }
                }
            });
        } 
        else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = this.playingUrl;
            video.addEventListener('loadedmetadata', function() { video.play(); });
        } else {
            this.showToast('您的浏览器不支持 HLS 播放', 'error');
        }
    },

    closePlayer() {
        this.modals.player = false;
        const video = document.getElementById('video-player');
        if (video) video.pause();
        
        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }
        this.playingUrl = '';
        this.playingChannel = null;
        this.playerError = null;
    },
`;