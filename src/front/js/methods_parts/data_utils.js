/**
 * 数据处理与清洗工具
 * 包含: 频道名称美化, 去重Key生成, 数据标准化
 */
export const dataUtils = `
    normalizeName(name) {
        if (!name) return '';
        let s = name.replace(/[\\uFF01-\\uFF5E]/g, function(c) { 
            return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); 
        }).replace(/\\u3000/g, ' ');
        s = s.toUpperCase();
        return s.replace(/[-_\\s\\.]/g, '');
    },

    /**
     * 频道名称美化 (用于显示名和 EPG 名)
     */
    prettifyName(name) {
        if (!name) return '';
        let s = name.toString().trim(); // 保留原始大小写
        s = s.replace(/^默认/, '');
        s = s.replace(/[\\［\\［\\(\\[\\（].*?[\\］\\］\\)\\]\\）]/g, ''); 
        s = s.replace(/(?:[\\s-_]|^)(?:MAX)?\\d+(?:\\.\\d+)?M(?:\\d+)?(?:HDR|HEVC|H\\.26[45])?/gi, '');
        s = s.replace(/\\s+\\d{3,4}[\\*x]\\d{3,4}/g, '');
        s = s.replace(/(?:[\\s-_]|^)(?:576|720|1080|1440|2160|4320|8192)[IP]?/gi, '');
        // 移除: s = s.replace(/\\s+(4K|8K)(?:\\b|$)/gi, ''); // 已移除，以保留 4K 频道作为独立频道
        s = s.replace(/(?:[\\s-_]|^)(F?HD|SD|HEVC|HDR|H\\.26[45]|FPS\\d+)/gi, ''); 
        return s.trim();
    },

    /**
     * 频道去重 Key 生成 (严格模式)
     */
    cleanChannelName(name) {
        if (!name) return '';
        let s = this.prettifyName(name);
        return s.toUpperCase().replace(/[-_\\s]/g, '');
    },

    /**
     * 统一频道数据结构
     */
    standardizeChannel(ch) {
        let sources = [];
        if (Array.isArray(ch.sources) && ch.sources.length > 0 && typeof ch.sources[0] === 'object') {
            sources = ch.sources.map(s => ({ ...s, _id: s._id || this.generateId() }));
        } else if (Array.isArray(ch.urls)) {
            sources = ch.urls.filter(u => u && u.trim()).map((u, idx) => ({
                url: u, enabled: true, isPrimary: idx === 0, _id: this.generateId()
            }));
        } else if (ch.url) {
            sources = [{ url: ch.url, enabled: true, isPrimary: true, _id: this.generateId() }];
        }

        if (sources.length > 0 && !sources.some(s => s.isPrimary && s.enabled)) {
            if(sources[0].enabled) sources[0].isPrimary = true;
        }

        const displayName = ch.name || '未知频道';
        const tvgName = (ch.tvgName !== undefined && ch.tvgName !== null) ? ch.tvgName : displayName;
        const groupName = ch.group || '默认';
        
        return {
            ...ch,
            id: ch.id || this.generateId(),
            name: displayName,
            tvgName: tvgName,
            group: groupName,
            logo: ch.logo || '',
            useLogo: !!ch.logo, 
            sources: sources
        };
    },
`;