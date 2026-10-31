// 生成 supabase/seed.sql：把 content/posts/*.md 和 5 个管理员密钥哈希写进 SQL
// 用法：node scripts/gen-seed.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const postsDir = path.join(root, 'content', 'posts');
const outFile = path.join(root, 'supabase', 'seed.sql');

// 5 个管理员密钥的 sha256（密钥明文在本地 admin-keys.txt，不进仓库）
const KEY_HASHES = [
  '855c04b69e9805bd5633c231acdacb6fa168a1157d8016ecb5e0dd5633065bcd',
  '01cecf4c97f60505dd374567c424ed3f44411e10bd17ad7418fc2bc4ed1d633e',
  '81d7476bb21c5aa185c023f16a993dd5ce27dae29126aab5dac342c18266a7e1',
  'cb43afe7975fa37ef8090fa509ae50262455f32f26657cd80ce0faf97c017b6f',
  '83af17d49ea4b96a06745d3bfbcd8611a331e0f8c6fb2e6b1d2c87f00847966f'
];

const q = (s) => (s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'");

function parseFrontMatter(raw) {
  const text = String(raw).replace(/^\uFEFF/, '');
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

const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md')).sort();
const rows = files.map((file) => {
  const { data, body } = parseFrontMatter(fs.readFileSync(path.join(postsDir, file), 'utf8'));
  return {
    slug: data.slug || file.replace(/\.md$/, ''),
    cat: data.cat || 'other',
    title: data.title || '(无标题)',
    date: data.date || '2026-01-01',
    byline: data.byline || null,
    excerpt: data.excerpt || '',
    body,
    order: Number(data.order) || 999
  };
});

const lines = [];
lines.push('-- 由 scripts/gen-seed.mjs 生成，可重复执行（ON CONFLICT DO NOTHING）');
lines.push('-- 包含：5 个管理员密钥的哈希 + 现有文章');
lines.push('');

lines.push('-- 管理员密钥（只有 sha256，反推不出明文）');
for (let i = 0; i < KEY_HASHES.length; i++) {
  lines.push(
    `insert into public.admin_keys (key_hash, label) values ('${KEY_HASHES[i]}', 'key-${i + 1}') ` +
    'on conflict (key_hash) do nothing;'
  );
}
lines.push('');

lines.push('-- 现有文章');
for (const p of rows) {
  lines.push(
    'insert into public.posts (slug, cat, title, date, excerpt, byline, body, sort_order) values (' +
    [q(p.slug), q(p.cat), q(p.title), q(p.date), q(p.excerpt), q(p.byline), q(p.body), p.order].join(', ') +
    ') on conflict (slug) do nothing;'
  );
}
lines.push('');

fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log(`seed.sql 已生成：${rows.length} 篇文章 + ${KEY_HASHES.length} 个密钥`);
