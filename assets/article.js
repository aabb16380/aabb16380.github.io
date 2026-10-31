/* ============================================================
   文章详情页 · 按 ?slug= 渲染正文（数据来自 content.js）
   ============================================================ */
(function () {
  'use strict';

  var cats = window.ZJ_CATS || [];
  var catMap = {};
  cats.forEach(function (c) { catMap[c.key] = c; });

  var slug = new URLSearchParams(location.search).get('slug') || '';

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

  function renderMissing() {
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
    if (commentsEl) commentsEl.closest('.engage') && (commentsEl.closest('.engage').hidden = true);
    document.title = '没有这篇文章 | zhoujin.site';
  }

  var VCFG = (window.ZJ_CONFIG && window.ZJ_CONFIG.comments) || {};
  var VURL = (VCFG.supabaseUrl || '').replace(/\/+$/, '');
  var VKEY = VCFG.supabaseAnonKey || '';

  function paintViews(n) {
    var el = document.getElementById('view-count');
    if (el) el.textContent = '阅读 ' + (Number(n) || 0);
  }

  function countView(post) {
    if (!VURL || !VKEY) return;
    var key = 'zj_viewed_' + post.slug;
    var seen = false;
    try { seen = sessionStorage.getItem(key) === '1'; } catch (e) {}

    var H = { apikey: VKEY, Authorization: 'Bearer ' + VKEY, 'Content-Type': 'application/json' };

    if (seen) {
      // 本会话已经记过数：只读当前值，避免重复 +1，也避免一直显示 0
      fetch(VURL + '/rest/v1/posts?slug=eq.' + encodeURIComponent(post.slug) + '&select=views', { headers: H })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
          var v = rows && rows[0] ? rows[0].views : 0;
          paintViews(v);
          post.views = v;
        })
        .catch(function () {});
      return;
    }

    try { sessionStorage.setItem(key, '1'); } catch (e) {}

    fetch(VURL + '/rest/v1/rpc/bump_views', {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ p_slug: post.slug })
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(function (n) { paintViews(n); post.views = n; })
      .catch(function () {
        // 计数失败也要把真实数字显示出来
        fetch(VURL + '/rest/v1/posts?slug=eq.' + encodeURIComponent(post.slug) + '&select=views', { headers: H })
          .then(function (r) { return r.ok ? r.json() : []; })
          .then(function (rows) { if (rows && rows[0]) paintViews(rows[0].views); })
          .catch(function () {});
      });
  }

  // 管理员点「阅读 N」改数字
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('#view-count') : null;
    if (!el) return;
    if (!(window.ZJ_ADMIN && window.ZJ_ADMIN.active)) return;
    var cur = (el.textContent || '').replace(/[^\d]/g, '');
    var input = window.prompt('把阅读数改成多少？', cur);
    if (input === null) return;
    var n = parseInt(input, 10);
    if (isNaN(n) || n < 0) { alert('请输入 0 或正整数'); return; }
    fetch(VURL + '/rest/v1/rpc/admin_set_views', {
      method: 'POST',
      headers: { apikey: VKEY, Authorization: 'Bearer ' + VKEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: (window.ZJ_ADMIN && window.ZJ_ADMIN.token) || null, p_slug: slug, p_views: n })
    })
      .then(function (r) { return r.ok ? r.json() : r.text().then(function (x) { throw new Error(x); }); })
      .then(function (v) { paintViews(v); })
      .catch(function (err) { alert('修改失败：' + err.message); });
  });

  function boot(data) {
    var posts = (data && data.posts ? data.posts : []).slice();
    var idx = -1;
    for (var i = 0; i < posts.length; i++) {
      if (posts[i].slug === slug) { idx = i; break; }
    }
    if (idx === -1) { renderMissing(); return; }

    var post = posts[idx];
    var cat = catMap[post.cat] || { name: '未分类' };

    document.title = post.title + ' | ' + cat.name + ' | zhoujin.site';

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
      metaEl.innerHTML = '<time datetime="' + (post.date || '') + '">' + fmtDate(post.date) + '</time>' +
        (post.byline ? '<span class="dot-sep">·</span><span class="byline">' + esc(post.byline) + '</span>' : '') +
        '<span class="dot-sep">·</span><span>约 ' + mins + ' 分钟</span>' +
        '<span class="dot-sep">·</span><span class="view-count" id="view-count" title="阅读人数">阅读 ' + (post.views || 0) + '</span>' +
        (post.sample ? '<span class="dot-sep">·</span><span class="badge-sample">示例内容</span>' : '');
    }

    countView(post);

    if (bodyEl) bodyEl.innerHTML = post.body || '<p class="muted">（正文待补）</p>';

    if (navEl) {
      var prev = posts[idx - 1];
      var next = posts[idx + 1];
      var html = '';
      if (prev) {
        html += '<a class="post-nav-item prev" href="article.html?slug=' + encodeURIComponent(prev.slug) + '">' +
          '<span class="pn-label">← 上一篇</span><span class="pn-title">' + esc(prev.title) + '</span></a>';
      } else {
        html += '<span></span>';
      }
      if (next) {
        html += '<a class="post-nav-item next" href="article.html?slug=' + encodeURIComponent(next.slug) + '">' +
          '<span class="pn-label">下一篇 →</span><span class="pn-title">' + esc(next.title) + '</span></a>';
      }
      navEl.innerHTML = html;
    }

    // 提供给管理员模式使用
    window.ZJ_CURRENT_POST = post;
    window.dispatchEvent(new CustomEvent('zj-post-ready'));
  }

  if (window.ZJLoadPosts) {
    window.ZJLoadPosts().then(boot);
  } else {
    boot({ posts: window.ZJ_POSTS || [] });
  }
})();
