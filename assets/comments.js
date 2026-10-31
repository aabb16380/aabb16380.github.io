/* ============================================================
   评论 + 点赞（Supabase 后端，读者无需登录）
   ------------------------------------------------------------
   未在 site-config.js 里填 supabaseUrl / supabaseAnonKey 时，
   整块区域自动隐藏，站点不受任何影响。
   ============================================================ */
(function () {
  'use strict';

  var cfg = (window.ZJ_CONFIG && window.ZJ_CONFIG.comments) || {};
  var URL_BASE = (cfg.supabaseUrl || '').replace(/\/+$/, '');
  var KEY = cfg.supabaseAnonKey || '';
  var root = document.getElementById('engage');
  if (!root || !URL_BASE || !KEY) return;

  var slug = new URLSearchParams(location.search).get('slug') || '';
  if (!slug) return;

  root.hidden = false;

  var likeBtn = document.getElementById('like-btn');
  var likeCount = document.getElementById('like-count');
  var listEl = document.getElementById('comment-list');
  var form = document.getElementById('comment-form');
  var statusEl = document.getElementById('comment-status');
  var likedKey = 'zj_liked_' + slug;

  var headers = {
    apikey: KEY,
    Authorization: 'Bearer ' + KEY,
    'Content-Type': 'application/json'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------------- 点赞 ---------------- */
  function isLiked() {
    try { return localStorage.getItem(likedKey) === '1'; } catch (e) { return false; }
  }

  function setLiked(v) {
    try {
      if (v) localStorage.setItem(likedKey, '1');
      else localStorage.removeItem(likedKey);
    } catch (e) {}
    likeBtn.classList.toggle('is-liked', v);
    likeBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
    likeBtn.setAttribute('aria-label', v ? '取消点赞' : '为这篇文章点赞');
  }

  function setCount(n) {
    likeCount.textContent = String(Math.max(0, Number(n) || 0));
  }

  // 从服务器取最新数字，但不动用户本地的「已赞」状态
  function loadLikes() {
    fetch(URL_BASE + '/rest/v1/post_likes?slug=eq.' + encodeURIComponent(slug) + '&select=likes', {
      headers: headers
    })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { setCount(rows && rows[0] ? rows[0].likes : 0); })
      .catch(function () {});
  }

  if (likeBtn) {
    setLiked(isLiked());          // 先按本地状态点亮
    loadLikes();

    likeBtn.addEventListener('click', function () {
      var liked = isLiked();
      var current = parseInt(likeCount.textContent, 10) || 0;

      // 1) 先给反馈：立刻变红 / 变灰，数字立刻 ±1
      setLiked(!liked);
      setCount(liked ? current - 1 : current + 1);

      // 2) 再后台同步；失败也保留界面状态（用户要求先不管同步）
      likeBtn.disabled = true;
      fetch(URL_BASE + '/rest/v1/rpc/' + (liked ? 'decrement_like' : 'increment_like'), {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ p_slug: slug })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
        .then(function (n) { setCount(n); })
        .catch(function () { /* 同步失败不回滚 */ })
        .then(function () { likeBtn.disabled = false; });
    });
  }

  /* ---------------- 评论 ---------------- */
  function renderComments(rows) {
    if (!rows || !rows.length) {
      listEl.innerHTML = '<p class="comment-empty">还没有人留言，来说第一句吧。</p>';
      return;
    }
    var admin = !!(window.ZJ_ADMIN && window.ZJ_ADMIN.active);
    listEl.innerHTML = rows.map(function (c) {
      return '<article class="comment" data-id="' + esc(c.id) + '">' +
        '<header class="comment-head">' +
          '<span class="comment-name">' + esc(c.name || '匿名') + '</span>' +
          '<span class="comment-side">' +
            '<time class="comment-time">' + esc(fmtTime(c.created_at)) + '</time>' +
            (admin ? '<button type="button" class="comment-del" data-id="' + esc(c.id) + '">删除</button>' : '') +
          '</span>' +
        '</header>' +
        '<p class="comment-body">' + esc(c.body).replace(/\n/g, '<br>') + '</p>' +
      '</article>';
    }).join('');
  }

  function loadComments() {
    var q = '/rest/v1/post_comments?slug=eq.' + encodeURIComponent(slug) +
      '&approved=eq.true&select=id,name,body,created_at&order=created_at.desc&limit=200';
    fetch(URL_BASE + q, { headers: headers })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(renderComments)
      .catch(function () { listEl.innerHTML = '<p class="comment-empty">评论加载失败，稍后再试。</p>'; });
  }

  if (form) {
    var openedAt = Date.now();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (form.elements.name.value || '').trim();
      var body = (form.elements.body.value || '').trim();
      var hp = (form.elements.hp.value || '').trim();

      if (hp) return;                                   // 蜜罐：机器人填了就不发
      if (body.length < 1) { statusEl.textContent = '写点什么再发吧。'; return; }
      if (Date.now() - openedAt < 2000) { statusEl.textContent = '慢一点，再试一次。'; return; }

      statusEl.textContent = '发送中…';
      fetch(URL_BASE + '/rest/v1/post_comments', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ slug: slug, name: name || '匿名', body: body })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          form.reset();
          statusEl.textContent = cfg.requireApproval === false
            ? '已发表，刷新即可看到。'
            : '已提交，作者审核后显示。';
          if (cfg.requireApproval === false) loadComments();
        })
        .catch(function () {
          statusEl.textContent = '发送失败，稍后再试。';
        });
    });
  }

  /* ---------------- 管理员删评论 ---------------- */
  if (listEl) {
    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.comment-del');
      if (!btn) return;
      var adm = window.ZJ_ADMIN || {};
      if (!adm.active || !adm.token) return;
      if (!confirm('删除这条评论？')) return;

      btn.disabled = true;
      fetch(URL_BASE + '/rest/v1/rpc/admin_delete_comment', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ p_token: adm.token, p_id: Number(btn.dataset.id) })
      })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); loadComments(); })
        .catch(function () { btn.disabled = false; alert('删除失败，请重新登录管理员'); });
    });
  }

  // 管理员登录 / 退出后，评论列表要重画（删除按钮随之出现或消失）
  window.addEventListener('zj-admin-change', loadComments);

  loadLikes();
  loadComments();
})();
