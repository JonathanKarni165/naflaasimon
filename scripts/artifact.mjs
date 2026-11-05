// Turns dist/ into one self-contained page (for the preview link): inlines CSS and JS.
import fs from 'node:fs';
const html = fs.readFileSync('dist/index.html', 'utf8');
const css = [...html.matchAll(/href="\.\/(assets\/[^"]+\.css)"/g)].map((m) => fs.readFileSync('dist/' + m[1], 'utf8')).join('\n');
const js = [...html.matchAll(/src="\.\/(assets\/[^"]+\.js)"/g)].map((m) => fs.readFileSync('dist/' + m[1], 'utf8')).join('\n');
if (/<\/script/i.test(js)) throw new Error('script tag inside bundle');
const out = `<title>נפל האסימון</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#F4E29C">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Secular+One&family=Assistant:wght@400;600;700;800&display=swap">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
fs.mkdirSync('artifact/img', { recursive: true });
fs.writeFileSync('artifact/index.html', out);
for (const f of fs.readdirSync('dist/img')) fs.copyFileSync('dist/img/' + f, 'artifact/img/' + f);
console.log('artifact', (out.length / 1024).toFixed(0) + 'KB');
