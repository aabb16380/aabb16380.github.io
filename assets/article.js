/* ============================================================
   文章详情页 · 按 ?slug= 渲染正文，并挂载 giscus 评论
   ============================================================ */
(function () {
  'use strict';

  var posts = window.ZJ_POSTS || [];
  var cats = window.ZJ_CATS || [];
  var catMap = {};
  cats.forEach(function (c) { catMap[c.key] = c; });

  var slug = new URLSearchParams(location.search).get('slug') || '';
  var idx = -1;
  for (var i = 0; i < posts.length; i++) {
    if (posts[i].slug === slug) { idx = i; break; }
  }

  var root = document.getElementById('article-root');
  var crumbCat = document.getElementById('crumb-cat');
  var bodyEl = document.getElementById('post-body');
  var titleEl = document.getElementById('post-title');
  var metaEl = document.getElementById('post-meta');
  var tagEl = document.getElementById('cat-tag');
  var navEl = document.getElementById('post-nav');
  var commentsEl = document.getElementById('comments');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function fmtDate(d) {
    if (!d) return '';
    var p = String(d).split('-');
    return p.length === 3
      ? p[0] + ' 年 ' + Number(p[1]) + ' 月 ' + Number(p[2]) + ' 日'
      : d;
  }

  /* ---------- 文章不存在 ---------- */
  if (idx === -1) {
    if (root) {
      root.innerHTML =
        '<nav class="crumbs"><a href="index.html">首页</a><span>/</span><span>未找到</span></nav>' +
        '<div class="article-missing">' +
          '<p class="missing-code">404</p>' +
          '<h1>没有这篇文章</h1>' +
          '<p class="muted">链接可能已失效，或者它从未存在过。</p>' +
          '<p><a class="btn primary" href="index.html#posts">回到文章列表</a></p>' +
        '</div>';
    }
    if (commentsEl) commentsEl.hidden = true;
    document.title = '没有这篇文章 | zhoujin.site';
    return;
  }

  var post = posts[idx];
  var cat = catMap[post.cat] || { name: '未分类' };

  /* ---------- 填充内容 ---------- */
  document.title = post.title + ' | ' + (cat.name) + ' | zhoujin.site';

  var desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', post.excerpt || post.title);

  var canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', 'https://zhoujin.site/article.html?slug=' + encodeURIComponent(post.slug));

  if (crumbCat) crumbCat.textContent = cat.name;
  if (tagEl) {
    tagEl.textContent = cat.name;
    tagEl.href = 'index.html#posts';
  }
  if (titleEl) titleEl.textContent = post.title;
  if (metaEl) {
    var plain = String(post.body || '').replace(/<[^>]+>/g, '');
    var mins = Math.max(1, Math.round(plain.replace(/\s/g, '').length / 350));
    metaEl.innerHTML = '<time datetime="' + (post.date || '') + '">' + fmtDate(post.date) +
      '</time>' +
      (post.byline ? '<span class="dot-sep">·</span><span class="byline">' + esc(post.byline) + '</span>' : '') +
      '<span class="dot-sep">·</span><span>约 ' + mins + ' 分钟</span>' +
      (post.sample ? '<span class="dot-sep">·</span><span class="badge-sample">示例内容</span>' : '');
  }
  if (bodyEl) bodyEl.innerHTML = post.body || '<p class="muted">（正文待补）</p>';

  /* ---------- 上一篇 / 下一篇 ---------- */
  if (navEl) {
    var prev = posts[idx - 1];
    var next = posts[idx + 1];
    var html = '';
    if (prev) {
      html += '<a class="post-nav-item prev" href="article.html?slug=' + encodeURIComponent(prev.slug) + '">' +
        '<span class="pn-label">← 上一篇</span><span class="pn-title">' + prev.title + '</span></a>';
    } else {
      html += '<span></span>';
    }
    if (next) {
      html += '<a class="post-nav-item next" href="article.html?slug=' + encodeURIComponent(next.slug) + '">' +
        '<span class="pn-label">下一篇 →</span><span class="pn-title">' + next.title + '</span></a>';
    }
    navEl.innerHTML = html;
  }

  /* ---------- giscus 评论 ---------- */
  var cfg = (window.ZJ_CONFIG && window.ZJ_CONFIG.giscus) || {};

  function mountGiscus() {
    if (!cfg.repo || !cfg.repoId || !cfg.categoryId) {
      // 未配置：整块隐藏，避免线上出现空白框
      if (commentsEl) commentsEl.hidden = true;
      return;
    }
    var holder = document.getElementById('giscus-holder');
    if (!holder) return;

    var s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-repo', cfg.repo);
    s.setAttribute('data-repo-id', cfg.repoId);
    s.setAttribute('data-category', cfg.category || 'Announcements');
    s.setAttribute('data-category-id', cfg.categoryId);
    s.setAttribute('data-mapping', cfg.mapping || 'specific');
    s.setAttribute('data-term', 'article:' + post.slug);
    s.setAttribute('data-strict', '1');
    s.setAttribute('data-reactions-enabled', cfg.reactionsEnabled || '1');
    s.setAttribute('data-emit-metadata', '0');
    s.setAttribute('data-input-position', cfg.inputPosition || 'top');
    s.setAttribute('data-theme', 'dark');
    s.setAttribute('data-lang', cfg.lang || 'zh-CN');
    s.setAttribute('data-loading', 'lazy');
    holder.appendChild(s);
  }

  mountGiscus();
})();
