/* ============================================================
   内容加载器：优先读 Supabase 里的文章，失败时回退到 posts.js
   —— 配了 Supabase 时，管理员在网页上改的文章会立刻生效；
   —— 打开本地文件（file://）时 fetch 会失败，自动用 posts.js。
   ============================================================ */
(function () {
  'use strict';

  var cfg = (window.ZJ_CONFIG && window.ZJ_CONFIG.comments) || {};
  var base = (cfg.supabaseUrl || '').replace(/\/+$/, '');
  var key = cfg.supabaseAnonKey || '';
  var cached = null;

  function fromStatic() {
    return { posts: (window.ZJ_POSTS || []).slice(), remote: false };
  }

  function sortPosts(list) {
    return list.sort(function (a, b) {
      if (a.date !== b.date) return String(a.date) < String(b.date) ? 1 : -1;
      var ao = Number(a.sort_order == null ? 999 : a.sort_order);
      var bo = Number(b.sort_order == null ? 999 : b.sort_order);
      if (ao !== bo) return ao - bo;
      return String(a.title).localeCompare(String(b.title));
    });
  }

  window.ZJLoadPosts = function () {
    if (cached) return Promise.resolve(cached);
    if (!base || !key) {
      cached = fromStatic();
      return Promise.resolve(cached);
    }

    var q = '/rest/v1/posts?published=eq.true' +
      '&select=slug,cat,title,date,byline,excerpt,body,sort_order' +
      '&order=date.desc,sort_order.asc';

    return fetch(base + q, { headers: { apikey: key, Authorization: 'Bearer ' + key } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (rows) {
        // 合并：静态文章打底，数据库里的同 slug 文章覆盖
        var map = {};
        (window.ZJ_POSTS || []).forEach(function (p) { map[p.slug] = p; });
        (rows || []).forEach(function (r) { map[r.slug] = r; });
        cached = { posts: sortPosts(Object.keys(map).map(function (k) { return map[k]; })), remote: true };
        return cached;
      })
      .catch(function () {
        cached = fromStatic();
        return cached;
      });
  };
})();
