// 由 content/posts/*.md 生成 assets/posts.js（站点数据）
// 用法：node scripts/build-posts.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const postsDir = path.join(root, 'content', 'posts');
const catsFile = path.join(root, 'content', 'categories.json');
const outFile = path.join(root, 'assets', 'posts.js');

function parseFrontMatter(raw) {
  const text = String(raw).replace(/^\uFEFF/, '');   // 去掉可能存在的 BOM
  const m = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { data: {}, body: text.trim() };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (val.length >= 2 && val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    data[key] = val;
  }
  return { data, body: text.slice(m[0].length).trim() };
}

// 正文块处理：原生 HTML 块原样保留，纯文本块自动包 <p>
function toHtml(body) {
  const blocks = body.split(/\r?\n[ \t]*\r?\n/).map((b) => b.trim()).filter(Boolean);
  return blocks
    .map((block) => {
      if (/^</.test(block)) return block;
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      return '<p>' + lines.join('') + '</p>';
    })
    .join('\n      ');
}

const cats = JSON.parse(fs.readFileSync(catsFile, 'utf8'));

const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'));
const posts = files
  .map((file) => {
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const { data, body } = parseFrontMatter(raw);
    const post = {
      slug: data.slug || file.replace(/\.md$/, ''),
      cat: data.cat || 'other',
      title: data.title || '(无标题)',
      date: data.date || ''
    };
    if (data.byline) post.byline = data.byline;
    post.excerpt = data.excerpt || '';
    if (String(data.sample) === 'true') post.sample = true;
    post.body = toHtml(body);
    post._order = Number(data.order) || 999;
    return post;
  })
  .sort((a, b) => {
    if (a.date !== b.date) return String(b.date).localeCompare(String(a.date));
    if (a._order !== b._order) return a._order - b._order;
    return String(a.title).localeCompare(String(b.title));
  })
  .map(({ _order, ...rest }) => rest);

const js =
  '/* 本文件由 scripts/build-posts.mjs 自动生成，请勿直接修改。\n' +
  '   改文章：编辑 content/posts/ 下的 .md 文件（推荐用 Pages CMS 后台）。 */\n\n' +
  'window.ZJ_CATS = ' + JSON.stringify(cats, null, 2) + ';\n\n' +
  'window.ZJ_POSTS = ' + JSON.stringify(posts, null, 2) + ';\n';

fs.writeFileSync(outFile, js, 'utf8');
console.log(`built ${posts.length} posts -> assets/posts.js`);
for (const p of posts) console.log('  ', p.date, p.cat, p.title);
