// node build.js  →  web/index.html (Vercel 배포용), extension/ (크롬 확장)
const fs = require('fs');
const path = require('path');

const r = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const w = (p, s) => { fs.mkdirSync(path.dirname(path.join(__dirname, p)), { recursive: true }); fs.writeFileSync(path.join(__dirname, p), s); };

const MATHJAX_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg-full.js';
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap">';
const TITLE = '수식 클립';

const css = r('src/app.css'), body = r('src/body.html');
const cfg = r('src/mj-config.js'), nl = r('src/nl.js'), app = r('src/app.js');

// 1) 웹앱: 단일 파일 (본문은 아티팩트 게시에도 재사용)
const fragment = `<title>${TITLE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${FONTS}
<style>
${css}</style>
${body}
<script>
${cfg}</script>
<script src="${MATHJAX_CDN}"></script>
<script>
${nl}</script>
<script>
${app}</script>
`;
w('web/index.html', `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${fragment.replace('</style>\n', '</style>\n</head>\n<body>\n')}</body>
</html>
`);
w('dist/artifact.html', fragment);

// 2) 크롬 확장 (MV3는 인라인 스크립트 금지 → 파일로 분리, MathJax는 로컬 번들)
for (const f of ['app.css', 'app.js', 'nl.js', 'mj-config.js']) w(`extension/${f}`, r(`src/${f}`));
w('extension/popup.html', `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${TITLE}</title>
${FONTS}
<link rel="stylesheet" href="app.css">
</head>
<body>
${body}
<script src="mj-config.js"></script>
<script src="mathjax/tex-svg-full.js"></script>
<script src="nl.js"></script>
<script src="app.js"></script>
</body>
</html>
`);
w('extension/manifest.json', JSON.stringify({
  manifest_version: 3,
  name: TITLE,
  version: require('./package.json').version,
  description: 'LaTeX/자연어 수식을 실시간 렌더링하고 LaTeX·PNG(흰 배경)·SVG·MathML로 바로 복사',
  action: { default_popup: 'popup.html', default_title: '수식 클립 (Alt+S)', default_icon: { 16: 'icons/16.png', 48: 'icons/48.png', 128: 'icons/128.png' } },
  icons: { 16: 'icons/16.png', 48: 'icons/48.png', 128: 'icons/128.png' },
  commands: { _execute_action: { suggested_key: { default: 'Alt+S', mac: 'Alt+S', linux: 'Alt+S' }, description: '수식 클립 열기' } },
  permissions: ['clipboardWrite'],
}, null, 2) + '\n');

if (!fs.existsSync(path.join(__dirname, 'extension/mathjax/tex-svg-full.js'))) {
  console.warn('⚠ extension/mathjax/tex-svg-full.js 없음 → npm run vendor 실행 필요');
}
console.log('built: web/index.html, extension/, dist/artifact.html');
