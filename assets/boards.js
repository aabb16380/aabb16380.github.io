/* ============================================================
   名言 / 事迹 / 图集
   · 名言：管理员可增删，任何人可点赞
   · 事迹：管理员可增删，任何人 1–5 星评分
   · 图集：任何人可上传、可评分，按评分取前三
   ============================================================ */
(function () {
  'use strict';

  var cfg = (window.ZJ_CONFIG && window.ZJ_CONFIG.comments) || {};
  var base = (cfg.supabaseUrl || '').replace(/\/+$/, '');
  var key = cfg.supabaseAnonKey || '';
  if (!base || !key) return;

  var H = { apikey: key, Authorization: 'Bearer ' + key };
  var HJ = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };

  var state = { quotes: [], deeds: [], photos: [], quoteLikes: {}, quoteExpanded: false, galleryExpanded: false, photoOrder: [], deedSort: 'mixed', gallerySort: 'mixed' };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isAdmin() { return !!(window.ZJ_ADMIN && window.ZJ_ADMIN.active); }
  function adminToken() { return (window.ZJ_ADMIN && window.ZJ_ADMIN.token) || null; }

  function rpc(name, payload) {
    return fetch(base + '/rest/v1/rpc/' + name, {
      method: 'POST', headers: HJ, body: JSON.stringify(payload || {})
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
      return r.text().then(function (t) { return t ? JSON.parse(t) : true; });
    });
  }

  function get(table, query) {
    return fetch(base + '/rest/v1/' + table + '?' + query, { headers: H })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  /* ---------------- 名言 ---------------- */
  function likedKey(id) { return 'zj_q_like_' + id; }
  function isLiked(id) { try { return localStorage.getItem(likedKey(id)) === '1'; } catch (e) { return false; } }
  function setLiked(id, v) {
    try { v ? localStorage.setItem(likedKey(id), '1') : localStorage.removeItem(likedKey(id)); } catch (e) {}
  }

  function renderQuotes() {
    var list = $('quote-list');
    if (!list) return;
    // 按点赞量从高到低；点赞相同再按原本的序号
    var rows = state.quotes.slice().sort(function (a, b) {
      var la = Number(state.quoteLikes['quote:' + a.id] || 0);
      var lb = Number(state.quoteLikes['quote:' + b.id] || 0);
      if (la !== lb) return lb - la;
      var sa = Number(a.sort_order == null ? 999 : a.sort_order);
      var sb = Number(b.sort_order == null ? 999 : b.sort_order);
      if (sa !== sb) return sa - sb;
      return Number(a.id) - Number(b.id);
    });
    var visible = state.quoteExpanded ? rows : rows.slice(0, 3);

    list.innerHTML = visible.map(function (q, i) {
      var n = Number(state.quoteLikes['quote:' + q.id] || 0);
      var on = isLiked(q.id);
      return '<li class="quote">' +
        '<span class="quote-num">' + (i + 1) + '.</span>' +
        '<span class="quote-body">宙金曰：「' + esc(q.body) + '」</span>' +
        '<button class="quote-like' + (on ? ' is-liked' : '') + '" data-id="' + q.id + '" type="button" aria-pressed="' + on + '">' +
          '<span class="ql-icon">👍</span><span class="ql-num">' + n + '</span>' +
        '</button>' +
        (isAdmin() ? '<button class="quote-del" data-id="' + q.id + '" type="button" title="删除">×</button>' : '') +
      '</li>';
    }).join('');

    var empty = $('quote-empty');
    if (empty) empty.hidden = rows.length > 0;

    var more = $('quote-more');
    if (more) {
      if (rows.length > 3) {
        more.hidden = false;
        more.textContent = state.quoteExpanded ? '收起 ↑' : '查看全部 ' + rows.length + ' 条 ↓';
      } else {
        more.hidden = true;
      }
    }

    var adminRow = $('quote-admin');
    if (!adminRow && isAdmin()) {
      adminRow = document.createElement('div');
      adminRow.id = 'quote-admin';
      adminRow.className = 'admin-row';
      adminRow.innerHTML = '<button type="button" class="admin-btn">＋ 新增名言</button>';
      adminRow.querySelector('button').addEventListener('click', addQuote);
      $('quotes').querySelector('.wrap').appendChild(adminRow);
    }
    if (adminRow) adminRow.hidden = !isAdmin();
  }

  function addQuote() {
    var txt = window.prompt('新增一句名言（不用加引号和「宙金曰：」）');
    if (!txt || !txt.trim()) return;
    rpc('admin_add_quote', { p_token: adminToken(), p_body: txt.trim() })
      .then(loadQuotes)
      .catch(function (e) { alert('添加失败：' + e.message); });
  }

  function loadQuotes() {
    return get('quotes', 'select=id,body,sort_order&order=sort_order.asc,id.asc')
      .then(function (rows) {
        state.quotes = rows || [];
        return get('post_likes', 'select=slug,likes&slug=like.quote:*');
      })
      .then(function (rows) {
        state.quoteLikes = {};
        (rows || []).forEach(function (r) { state.quoteLikes[r.slug] = r.likes; });
        renderQuotes();
      });
  }

  /* ---------------- 事迹 ---------------- */
  function avg(scoreSum, scoreCount) {
    if (!scoreCount) return null;
    return Math.round((scoreSum / scoreCount) * 10) / 10;
  }

  function starsHtml(id, stars, kind) {
    var out = '<div class="stars" data-kind="' + kind + '" data-id="' + id + '">';
    for (var i = 1; i <= 5; i++) {
      out += '<button type="button" class="star' + (i <= stars ? ' on' : '') + '" data-star="' + i + '" aria-label="' + i + ' 星">★</button>';
    }
    return out + '</div>';
  }

  function renderDeeds() {
    var list = $('deed-list');
    if (!list) return;

    // 综合分 = 平均分 × 2 + 评分人数；分数相同看人数，人数多的在前
    function composite(d) {
      var avgScore = d.score_count ? d.score_sum / d.score_count : 0;
      return avgScore * 2 + (d.score_count || 0);
    }
    var rows = state.deeds.slice().sort(function (a, b) {
      if (state.deedSort === 'score') {
        var aa = a.score_count ? a.score_sum / a.score_count : 0;
        var bb = b.score_count ? b.score_sum / b.score_count : 0;
        if (aa !== bb) return bb - aa;
        if ((a.score_count || 0) !== (b.score_count || 0)) return (b.score_count || 0) - (a.score_count || 0);
      }
      if (state.deedSort === 'mixed') {
        var ca = composite(a), cb = composite(b);
        if (ca !== cb) return cb - ca;
        if ((a.score_count || 0) !== (b.score_count || 0)) return (b.score_count || 0) - (a.score_count || 0);
      }
      return String(b.created_at).localeCompare(String(a.created_at));
    }).slice(0, 3);

    list.innerHTML = rows.map(function (d) {
      var a = avg(d.score_sum, d.score_count);
      var mine = 0;
      try { mine = Number(localStorage.getItem('zj_deed_' + d.id) || 0); } catch (e) {}
      return '<article class="deed" data-id="' + d.id + '" tabindex="0" role="button" aria-label="给「' + esc(d.body) + '」评分">' +
        '<div class="deed-main">' +
          '<p class="deed-body">' + esc(d.body) + '</p>' +
          '<p class="deed-sub">' + (mine ? '你打了 ' + mine + ' 星' : '点卡片打分') + '</p>' +
        '</div>' +
        '<div class="deed-side">' +
          '<span class="deed-score-big">' + (a === null ? '5.0' : a.toFixed(1)) + '</span>' +
          '<span class="deed-score-unit">分</span>' +
          '<span class="deed-score-who">' + (d.score_count || 0) + ' 人评分</span>' +
        '</div>' +
        (isAdmin() ? '<button class="deed-del admin-btn" data-id="' + d.id + '" type="button">删除</button>' : '') +
      '</article>';
    }).join('');

    var empty = $('deed-empty');
    if (empty) empty.hidden = state.deeds.length > 0;

    var sortEl = $('deed-sort');
    if (sortEl) {
      sortEl.innerHTML = [
        { k: 'mixed', n: '综合' },
        { k: 'time', n: '按时间' },
        { k: 'score', n: '按评分' }
      ].map(function (o) {
        return '<button type="button" class="sort-chip' + (o.k === state.deedSort ? ' active' : '') + '" data-sort="' + o.k + '">' + o.n + '</button>';
      }).join('');
    }

    var adminRow = $('deed-admin');
    if (!adminRow && isAdmin()) {
      adminRow = document.createElement('div');
      adminRow.id = 'deed-admin';
      adminRow.className = 'admin-row';
      adminRow.innerHTML = '<button type="button" class="admin-btn">＋ 新增事迹</button>';
      adminRow.querySelector('button').addEventListener('click', addDeed);
      $('deeds').querySelector('.wrap').appendChild(adminRow);
    }
    if (adminRow) adminRow.hidden = !isAdmin();
  }

  function addDeed() {
    var txt = window.prompt('新增一条事迹');
    if (!txt || !txt.trim()) return;
    rpc('admin_add_deed', { p_token: adminToken(), p_body: txt.trim() })
      .then(loadDeeds)
      .catch(function (e) { alert('添加失败：' + e.message); });
  }

  function loadDeeds() {
    return get('deeds', 'select=id,body,created_at,score_sum,score_count&order=created_at.desc')
      .then(function (rows) { state.deeds = rows || []; renderDeeds(); });
  }

  /* ---------------- 图集 ---------------- */
  function publicUrl(path) { return base + '/storage/v1/object/public/' + path; }

  function renderGallery() {
    var grid = $('gallery-grid');
    if (!grid) return;

    var sorted = state.photos.slice().sort(function (a, b) {
      var aa = a.score_count ? a.score_sum / a.score_count : 0;
      var bb = b.score_count ? b.score_sum / b.score_count : 0;
      if (state.gallerySort === 'time') {
        return String(b.created_at).localeCompare(String(a.created_at));
      }
      if (state.gallerySort === 'score') {
        if (aa !== bb) return bb - aa;
        if ((a.score_count || 0) !== (b.score_count || 0)) return (b.score_count || 0) - (a.score_count || 0);
        return String(b.created_at).localeCompare(String(a.created_at));
      }
      // 综合 = 平均分 × 2 + 评分人数
      var ca = aa * 2 + (a.score_count || 0);
      var cb = bb * 2 + (b.score_count || 0);
      if (ca !== cb) return cb - ca;
      if ((a.score_count || 0) !== (b.score_count || 0)) return (b.score_count || 0) - (a.score_count || 0);
      return String(b.created_at).localeCompare(String(a.created_at));
    });
    state.photoOrder = sorted.map(function (p) { return String(p.id); });

    var LIMIT = 3;
    // 多探几张做候补：坏图被剔除后，后面的自动补上，不占空位
    var pool = state.galleryExpanded ? sorted : sorted.slice(0, LIMIT + 6);

    var emptyEl = $('gallery-empty');
    if (emptyEl) emptyEl.hidden = pool.length > 0;

    if (!pool.length) {
      grid.innerHTML = '';
      var more0 = $('gallery-more');
      if (more0) more0.hidden = true;
      return;
    }

    // 关键：用离屏 Image 预检能否解码。
    // 之前把卡片设成 display:none 又加 loading="lazy"，浏览器根本不会去加载，
    // 于是 load 永远不触发 → 一张都显示不出来。
    var results = new Array(pool.length);
    var pending = pool.length;

    function finish() {
      var valid = pool.filter(function (p, i) { return results[i] === true; });
      var show = state.galleryExpanded ? valid : valid.slice(0, LIMIT);

      grid.innerHTML = show.map(function (p) {
        var a = avg(p.score_sum, p.score_count);
        return '<button type="button" class="shot" data-id="' + p.id + '">' +
          '<img src="' + esc(p.url) + '" alt="' + esc(p.caption || '图片') + '" data-id="' + p.id + '">' +
          '<span class="shot-meta">' + (a === null ? '5.0 分 · 0 人' : a.toFixed(1) + ' 分 · ' + p.score_count + ' 人') + '</span>' +
          (isAdmin() ? '<span class="shot-del" role="button" data-id="' + p.id + '" title="删除这张">×</span>' : '') +
        '</button>';
      }).join('');

      var sortEl = $('gallery-sort');
      if (sortEl) {
        sortEl.innerHTML = [
          { k: 'mixed', n: '综合' },
          { k: 'score', n: '按评分' },
          { k: 'time', n: '按时间' }
        ].map(function (o) {
          return '<button type="button" class="sort-chip' + (o.k === state.gallerySort ? ' active' : '') + '" data-sort="' + o.k + '">' + o.n + '</button>';
        }).join('');
      }
      var more = $('gallery-more');
      if (more) {
        if (valid.length > LIMIT) {
          more.hidden = false;
          more.textContent = state.galleryExpanded ? '收起 ↑' : '查看全部 ' + valid.length + ' 张 ↓';
        } else {
          more.hidden = true;
        }
      }
      if (emptyEl) emptyEl.hidden = valid.length > 0;
    }

    pool.forEach(function (p, i) {
      var probe = new Image();
      probe.onload = function () {
        results[i] = true;
        if (--pending === 0) finish();
      };
      probe.onerror = function () {
        results[i] = false;
        if (isAdmin()) deletePhoto(p.id);
        if (--pending === 0) finish();
      };
      probe.src = p.url;
    });
  }

  function loadGallery() {
    return get('photos', 'select=id,url,caption,created_at,score_sum,score_count&order=created_at.desc')
      .then(function (rows) { state.photos = rows || []; renderGallery(); });
  }

  var lightbox = $('lightbox');
  // iOS：fixed 元素若处在有 transform 的祖先里会失效，直接挂到 body
  if (lightbox && lightbox.parentNode !== document.body) {
    document.body.appendChild(lightbox);
  }
  var lbImg = $('lightbox-img');
  var lbCap = $('lightbox-caption');
  var lbStars = $('lightbox-stars');
  var lbMeta = $('lightbox-meta');
  var currentPhoto = null;

  function openPhoto(id) {
    var p = state.photos.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!p) return;
    currentPhoto = p;
    lbImg.src = p.url;
    lbCap.textContent = p.caption || '';
    var a = avg(p.score_sum, p.score_count);
    lbMeta.textContent = (a === null ? '默认 5.0 分' : a.toFixed(1) + ' 分') +
      ' · ' + p.score_count + ' 人评分（满分 10，默认 5）';
    var mine = 0;
    try { mine = Number(localStorage.getItem('zj_photo_' + p.id) || 0); } catch (e) {}
    // 保留带 data-kind / data-id 的外层，否则点击时读不到图片 id
    lbStars.innerHTML = starsHtml(p.id, mine, 'photo');
    var fb = document.getElementById('lightbox-open');
    if (fb) { fb.href = p.url; }
    lbImg.onerror = function () {
      lbCap.textContent = '这张图浏览器显示不了（可能是 HEIC 格式），管理员可以删掉它。';
      lbStars.innerHTML = '';
      lbMeta.textContent = '';
    };
    var delBtn = document.getElementById('lightbox-del');
    if (delBtn) {
      delBtn.hidden = !isAdmin();
      delBtn.onclick = function () {
        if (!window.confirm('删除这张图片？')) return;
        deletePhoto(p.id);
        closePhoto();
      };
    }
    lightbox.hidden = false;
  }

  function closePhoto() { lightbox.hidden = true; currentPhoto = null; }

  /* ---------------- 事迹评分弹窗 ---------------- */
  var rateMask = null;
  var rateDeedId = null;

  function starButtons(n, cls) {
    var out = '';
    for (var i = 1; i <= 5; i++) {
      out += '<button type="button" class="star' + (i <= n ? ' on' : '') + '" data-star="' + i + '" aria-label="' + i + ' 星">★</button>';
    }
    return '<div class="' + (cls || 'stars') + '" data-kind="deed">' + out + '</div>';
  }

  function ensureRateMask() {
    if (rateMask) return rateMask;
    rateMask = document.createElement('div');
    rateMask.className = 'rate-mask';
    rateMask.id = 'rate-mask';
    rateMask.hidden = true;
    rateMask.innerHTML =
      '<div class="rate-dialog" role="dialog" aria-modal="true" aria-label="评分">' +
        '<h3 id="rate-title"></h3>' +
        '<p class="rate-hint">打几星？1 星 = 2 分，满分 10 分（只能打一次）</p>' +
        '<div id="rate-stars" class="rate-stars"></div>' +
        '<button type="button" class="btn ghost rate-close" id="rate-close">关闭</button>' +
      '</div>';
    document.body.appendChild(rateMask);
    rateMask.addEventListener('click', function (e) {
      if (e.target === rateMask || e.target.id === 'rate-close') {
        rateMask.hidden = true;
        rateDeedId = null;
      }
    });
    return rateMask;
  }

  function openRateBox(d) {
    ensureRateMask();
    rateDeedId = d.id;
    var mine = 0;
    try { mine = Number(localStorage.getItem('zj_deed_' + d.id) || 0); } catch (e) {}
    $('rate-title').textContent = d.body;
    $('rate-stars').innerHTML = starButtons(mine, 'stars stars-lg');
    rateMask.hidden = false;
  }

  /* ---------------- 事件 ---------------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button') : null;

    // 事迹：点卡片打开评分
    var card = e.target.closest ? e.target.closest('.deed') : null;
    if (card && !(t && t.classList.contains('deed-del'))) {
      var did = card.getAttribute('data-id');
      var d0 = state.deeds.filter(function (x) { return String(x.id) === String(did); })[0];
      if (d0) { openRateBox(d0); return; }
    }

    // 名言点赞
    if (t && t.classList.contains('quote-like')) {
      var id = t.getAttribute('data-id');
      var on = isLiked(id);
      var cur = Number(state.quoteLikes['quote:' + id] || 0);
      var next = on ? cur - 1 : cur + 1;
      state.quoteLikes['quote:' + id] = Math.max(0, next);
      setLiked(id, !on);
      renderQuotes();
      rpc(on ? 'decrement_like' : 'increment_like', { p_slug: 'quote:' + id }).catch(function () {});
      return;
    }

    // 名言 / 事迹删除
    if (t && t.classList.contains('quote-del')) {
      if (window.confirm('删除这句？')) {
        rpc('admin_delete_quote', { p_token: adminToken(), p_id: Number(t.getAttribute('data-id')) })
          .then(loadQuotes).catch(function (e) { alert('删除失败：' + e.message); });
      }
      return;
    }
    if (t && t.classList.contains('deed-del')) {
      if (window.confirm('删除这条事迹？')) {
        rpc('admin_delete_deed', { p_token: adminToken(), p_id: Number(t.getAttribute('data-id')) })
          .then(loadDeeds).catch(function (e) { alert('删除失败：' + e.message); });
      }
      return;
    }

    // 事迹 / 图集排序
    if (t && t.classList.contains('sort-chip') && t.parentElement) {
      var sid = t.parentElement.id;
      if (sid === 'deed-sort') {
        state.deedSort = t.getAttribute('data-sort');
        renderDeeds();
        return;
      }
      if (sid === 'gallery-sort') {
        state.gallerySort = t.getAttribute('data-sort');
        renderGallery();
        return;
      }
    }

    // 星级评分（事迹弹窗 / 图片大图）
    if (t && t.classList.contains('star')) {
      var box = t.closest('.stars') || t.closest('#rate-stars');
      var inRateBox = !!(t.closest('#rate-stars'));
      var kind = inRateBox ? 'deed' : (box ? box.getAttribute('data-kind') : '');
      var pid = inRateBox ? rateDeedId : (box ? box.getAttribute('data-id') : null);
      var n = Number(t.getAttribute('data-star'));
      if (!pid) return;
      var storeKey = (kind === 'deed' ? 'zj_deed_' : 'zj_photo_') + pid;
      var done = false;
      try { done = !!localStorage.getItem(storeKey); } catch (e) {}
      if (done) { if (inRateBox) { alert('你已经给这件事打过分了'); } return; }

      if (inRateBox) {
        $('rate-stars').innerHTML = starButtons(n, 'stars stars-lg');
      }

      rpc(kind === 'deed' ? 'rate_deed' : 'rate_photo', { p_id: Number(pid), p_stars: n })
        .then(function (res) {
          try { localStorage.setItem(storeKey, String(n)); } catch (e) {}
          var obj = typeof res === 'string' ? JSON.parse(res) : res;
          if (kind === 'deed') {
            state.deeds.forEach(function (d) {
              if (String(d.id) === String(pid)) { d.score_sum = Math.round(obj.avg * obj.count); d.score_count = obj.count; }
            });
            renderDeeds();
            if (inRateBox) setTimeout(function () { if (rateMask) rateMask.hidden = true; rateDeedId = null; }, 350);
          } else {
            state.photos.forEach(function (p) {
              if (String(p.id) === String(pid)) { p.score_sum = Math.round(obj.avg * obj.count); p.score_count = obj.count; }
            });
            renderGallery();
            if (currentPhoto && String(currentPhoto.id) === String(pid)) openPhoto(pid);
          }
        })
        .catch(function (e) { alert('评分失败：' + e.message); });
      return;
    }

    // 打开大图
    if (t && t.classList.contains('shot')) { openPhoto(t.getAttribute('data-id')); return; }

    if (t && (t.id === 'lightbox-close' || t.classList.contains('lightbox'))) closePhoto();
  });

  document.addEventListener('keydown', function (e) {
    if (!lightbox || lightbox.hidden) return;
    if (e.key === 'Escape') closePhoto();
    if (e.key === 'ArrowLeft') stepPhoto(-1);
    if (e.key === 'ArrowRight') stepPhoto(1);
  });

  function stepPhoto(dir) {
    if (!currentPhoto || !state.photoOrder.length) return;
    var i = state.photoOrder.indexOf(String(currentPhoto.id));
    if (i < 0) return;
    var n = (i + dir + state.photoOrder.length) % state.photoOrder.length;
    openPhoto(state.photoOrder[n]);
  }

  var lbPrev = document.getElementById('lightbox-prev');
  var lbNext = document.getElementById('lightbox-next');
  if (lbPrev) lbPrev.addEventListener('click', function () { stepPhoto(-1); });
  if (lbNext) lbNext.addEventListener('click', function () { stepPhoto(1); });

  var deletingPhoto = {};
  function deletePhoto(id) {
    if (!id || !isAdmin() || deletingPhoto[id]) return;
    deletingPhoto[id] = true;
    rpc('admin_delete_photo', { p_token: adminToken(), p_id: Number(id) })
      .then(function () { state.photos = state.photos.filter(function (x) { return String(x.id) !== String(id); }); renderGallery(); })
      .catch(function () { delete deletingPhoto[id]; });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.shot-del') : null;
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('删除这张图片？')) deletePhoto(b.getAttribute('data-id'));
  }, true);
  var gMore = document.getElementById('gallery-more');
  if (gMore) {
    gMore.addEventListener('click', function () {
      state.galleryExpanded = !state.galleryExpanded;
      renderGallery();
    });
  }

  // 上传
  var fileInput = $('gallery-file');
  if (fileInput) {
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      var ext0 = (f.name.split('.').pop() || '').toLowerCase();
      var okExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].indexOf(ext0) > -1;
      if (allowed.indexOf(f.type) === -1 && !okExt) {
        alert('这个格式浏览器显示不了（iPhone 的 HEIC 常见）。\n请先在手机上转成 JPG/PNG 再传：\n设置 → 相机 → 格式 → 选「兼容性最佳」，或者用微信发给自己再保存。');
        return;
      }
      if (f.size > 8 * 1024 * 1024) { alert('图片不能超过 8 MB'); return; }

      var statusEl = $('gallery-status');
      if (statusEl) statusEl.textContent = '上传中…';
      var ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      var path = 'gallery/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

      fetch(base + '/storage/v1/object/' + path, {
        method: 'POST',
        headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': f.type, 'x-upsert': 'false' },
        body: f
      })
        .then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error(t); }); return 1; })
        .then(function () { return rpc('add_photo', { p_url: publicUrl(path), p_caption: '' }); })
        .then(function () {
          if (statusEl) statusEl.textContent = '上传成功';
          fileInput.value = '';
          return loadGallery();
        })
        .catch(function (e) {
          if (statusEl) statusEl.textContent = '上传失败：' + (e.message || '').slice(0, 60);
        });
    });
  }

  window.addEventListener('zj-admin-change', function () { renderQuotes(); renderDeeds(); renderGallery(); });

  // 名言的「查看全部 / 收起」
  var qMore = $('quote-more');
  if (qMore) {
    qMore.addEventListener('click', function () {
      state.quoteExpanded = !state.quoteExpanded;
      renderQuotes();
    });
  }

  loadQuotes();
  loadDeeds();
  loadGallery();
})();
