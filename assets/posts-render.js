/* ============================================================
   首页文章列表渲染 · 数据来自 content.js（Supabase 或 posts.js）
   ============================================================ */
(function () {
  'use strict';

  var listEl = document.getElementById('post-list');
  if (!listEl) return;

  var cats = window.ZJ_CATS || [];
  var catMap = {};
  cats.forEach(function (c) { catMap[c.key] = c; });

  var posts = [];
  var active = 'all';

  var filterEl = document.getElementById('cat-filter');
  var descEl = document.getElementById('cat-desc');
  var countEl = document.getElementById('post-count');
  var emptyEl = document.getElementById('post-empty');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function fmtDate(d) {
    if (!d) return '';
    var p = String(d).split('-');
    if (p.length !== 3) return d;
    return p[0] + '.' + p[1] + '.' + p[2];
  }

  function renderFilter() {
    if (!filterEl) return;
    var all = [{ key: 'all', name: '全部' }].concat(cats);
    filterEl.innerHTML = all.map(function (c) {
      return '<button type="button" class="filter-chip' + (c.key === active ? ' active' : '') +
        '" data-key="' + esc(c.key) + '">' + esc(c.name) + '</button>';
    }).join('');
  }

  function renderList() {
    var items = posts.filter(function (p) {
      return active === 'all' || p.cat === active;
    });

    listEl.innerHTML = items.map(function (p) {
      var c = catMap[p.cat] || { name: '未分类' };
      return '<article class="post-item reveal in">' +
        '<a class="post-link" href="article.html?slug=' + encodeURIComponent(p.slug) + '">' +
          '<div class="post-top">' +
            '<span class="post-cat">' + esc(c.name) + '</span>' +
            '<time class="post-date">' + esc(fmtDate(p.date)) + '</time>' +
          '</div>' +
          '<h3 class="post-title">' + esc(p.title) +
            (p.sample ? '<span class="badge-sample">示例</span>' : '') +
          '</h3>' +
          '<p class="post-excerpt">' + esc(p.excerpt) + '</p>' +
          '<span class="post-more">阅读全文 →</span>' +
        '</a>' +
      '</article>';
    }).join('');

    if (emptyEl) emptyEl.hidden = items.length > 0;
    if (countEl) countEl.textContent = '共 ' + items.length + ' 篇';

    if (descEl) {
      var c = catMap[active];
      descEl.textContent = active === 'all'
        ? '按时间倒序排列，点开任意一篇即可留言。'
        : (c ? c.desc : '');
    }
  }

  if (filterEl) {
    filterEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-chip');
      if (!btn) return;
      active = btn.dataset.key;
      renderFilter();
      renderList();
    });
  }

  function boot(data) {
    posts = (data && data.posts ? data.posts : []).slice();
    renderFilter();
    renderList();
  }

  if (window.ZJLoadPosts) {
    window.ZJLoadPosts().then(boot);
  } else {
    boot({ posts: window.ZJ_POSTS || [] });
  }
})();
