/* ============================================================
   首页文章列表 · 只显示 3 篇，可按时间或点赞量排序
   数据：content.js（Supabase 或 posts.js）+ post_likes 表
   ============================================================ */
(function () {
  'use strict';

  var LIMIT = 3;

  var listEl = document.getElementById('post-list');
  if (!listEl) return;

  var cats = window.ZJ_CATS || [];
  var catMap = {};
  cats.forEach(function (c) { catMap[c.key] = c; });

  var cfg = (window.ZJ_CONFIG && window.ZJ_CONFIG.comments) || {};
  var base = (cfg.supabaseUrl || '').replace(/\/+$/, '');
  var key = cfg.supabaseAnonKey || '';

  var posts = [];
  var likes = {};
  var views = {};
  var comments = {};
  var active = 'all';
  var sortMode = 'mixed';   // 综合（默认）
  var expanded = false;

  var filterEl = document.getElementById('cat-filter');
  var sortEl = document.getElementById('sort-bar');
  var descEl = document.getElementById('cat-desc');
  var countEl = document.getElementById('post-count');
  var emptyEl = document.getElementById('post-empty');
  var moreEl = document.getElementById('more-btn');

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

  function likeOf(slug) { return Number(likes[slug] || 0); }
  function viewsOf(slug) { return Number(views[slug] || 0); }
  function commentsOf(slug) { return Number(comments[slug] || 0); }

  function loadLikes() {
    if (!base || !key) return Promise.resolve();
    return fetch(base + '/rest/v1/post_likes?select=slug,likes', {
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        (rows || []).forEach(function (r) { likes[r.slug] = r.likes; });
      })
      .catch(function () {})
      .then(function () {
        return fetch(base + '/rest/v1/posts?select=slug,views', {
          headers: { apikey: key, Authorization: 'Bearer ' + key }
        })
          .then(function (r) { return r.ok ? r.json() : []; })
          .then(function (rows) {
            (rows || []).forEach(function (r) { views[r.slug] = r.views; });
          })
          .catch(function () {});
      })
      .then(function () {
        return fetch(base + '/rest/v1/post_comments?select=slug', {
          headers: { apikey: key, Authorization: 'Bearer ' + key }
        })
          .then(function (r) { return r.ok ? r.json() : []; })
          .then(function (rows) {
            (rows || []).forEach(function (r) { comments[r.slug] = (comments[r.slug] || 0) + 1; });
          })
          .catch(function () {});
      });
  }

  function sortPosts(items) {
    return items.slice().sort(function (a, b) {
      if (sortMode === 'likes') {
        var la = likeOf(a.slug), lb = likeOf(b.slug);
        if (la !== lb) return lb - la;
      }
      if (sortMode === 'mixed') {
        // 综合 = 阅读 + 点赞 × 4 + 评论 × 2
        var ma = viewsOf(a.slug) + likeOf(a.slug) * 4 + commentsOf(a.slug) * 2;
        var mb = viewsOf(b.slug) + likeOf(b.slug) * 4 + commentsOf(b.slug) * 2;
        if (ma !== mb) return mb - ma;
      }
      if (a.date !== b.date) return String(a.date) < String(b.date) ? 1 : -1;
      var ao = Number(a.sort_order == null ? 999 : a.sort_order);
      var bo = Number(b.sort_order == null ? 999 : b.sort_order);
      if (ao !== bo) return ao - bo;
      return String(a.title).localeCompare(String(b.title));
    });
  }

  function renderFilter() {
    if (!filterEl) return;
    var all = [{ key: 'all', name: '全部' }].concat(cats);
    filterEl.innerHTML = all.map(function (c) {
      return '<button type="button" class="filter-chip' + (c.key === active ? ' active' : '') +
        '" data-key="' + esc(c.key) + '">' + esc(c.name) + '</button>';
    }).join('');
  }

  function renderSort() {
    if (!sortEl) return;
    var opts = [
      { key: 'mixed', name: '综合' },
      { key: 'time', name: '按时间' },
      { key: 'likes', name: '按点赞' }
    ];
    sortEl.innerHTML = opts.map(function (o) {
      return '<button type="button" class="sort-chip' + (o.key === sortMode ? ' active' : '') +
        '" data-sort="' + o.key + '">' + o.name + '</button>';
    }).join('');
  }

  function renderList() {
    var filtered = posts.filter(function (p) {
      return active === 'all' || p.cat === active;
    });
    var sorted = sortPosts(filtered);
    var visible = expanded ? sorted : sorted.slice(0, LIMIT);

    listEl.innerHTML = visible.map(function (p) {
      var c = catMap[p.cat] || { name: '未分类' };
      var n = likeOf(p.slug);
      return '<article class="post-item reveal in">' +
        '<a class="post-link" href="article.html?slug=' + encodeURIComponent(p.slug) + '">' +
          '<div class="post-top">' +
            '<span class="post-cat">' + esc(c.name) + '</span>' +
            '<span class="post-meta-right">' +
              (n > 0 ? '<span class="post-likes">👍 ' + n + '</span>' : '') +
              (viewsOf(p.slug) > 0 ? '<span class="post-views">阅读 ' + viewsOf(p.slug) + '</span>' : '') +
              '<time class="post-date">' + esc(fmtDate(p.date)) + '</time>' +
            '</span>' +
          '</div>' +
          '<h3 class="post-title">' + esc(p.title) +
            (p.sample ? '<span class="badge-sample">示例</span>' : '') +
          '</h3>' +
          '<p class="post-excerpt">' + esc(p.excerpt) + '</p>' +
          '<span class="post-more">阅读全文 →</span>' +
        '</a>' +
      '</article>';
    }).join('');

    if (emptyEl) emptyEl.hidden = filtered.length > 0;
    if (countEl) {
      countEl.textContent = (expanded || filtered.length <= LIMIT)
        ? '共 ' + filtered.length + ' 篇'
        : '共 ' + filtered.length + ' 篇 · 显示 ' + LIMIT + ' 篇';
    }

    if (moreEl) {
      if (filtered.length > LIMIT) {
        moreEl.hidden = false;
        moreEl.textContent = expanded
          ? '收起 ↑'
          : '查看全部 ' + filtered.length + ' 篇 ↓';
      } else {
        moreEl.hidden = true;
      }
    }

    if (descEl) {
      var c = catMap[active];
      descEl.textContent = active === 'all'
        ? (sortMode === 'mixed' ? '按点赞与阅读量综合排序，点开任意一篇即可留言。' : (sortMode === 'likes' ? '按点赞量排序，点开任意一篇即可留言。' : '按时间倒序排列，点开任意一篇即可留言。'))
        : (c ? c.desc : '');
    }
  }

  function refresh() { renderFilter(); renderSort(); renderList(); }

  if (filterEl) {
    filterEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-chip');
      if (!btn) return;
      active = btn.dataset.key;
      expanded = false;
      refresh();
    });
  }

  if (sortEl) {
    sortEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.sort-chip');
      if (!btn) return;
      sortMode = btn.dataset.sort;
      expanded = false;
      refresh();
    });
  }

  if (moreEl) {
    moreEl.addEventListener('click', function () {
      expanded = !expanded;
      renderList();
    });
  }

  function boot(data) {
    posts = (data && data.posts ? data.posts : []).slice();
    loadLikes().then(refresh);
  }

  if (window.ZJLoadPosts) {
    window.ZJLoadPosts().then(boot);
  } else {
    boot({ posts: window.ZJ_POSTS || [] });
  }
})();
