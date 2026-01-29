/**
 * 前端主模板文件
 * 功能：组装 CSS、JS、Modals 和 Layout
 */
import { cssContent } from './styles.js';
import { jsContent } from './script.js';
import { modalTemplate } from './components/modals.js';
import { layoutTemplate } from './components/layout.js';

export const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IPTV 源管理平台</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/vue@3.2.47/dist/vue.global.prod.js"></script>
    <style>
        ${cssContent}
    </style>
</head>
<body>
    <div id="app" class="container pb-5">
        ${modalTemplate}
        
        ${layoutTemplate}
    </div>

    <script>
        ${jsContent}
    </script>
</body>
</html>
`;