/* ============================================================
   管理员模式
   · 菜单里的「管理员」→ 输入密钥 → 服务端校验 → 拿到 24h token
   · 解锁后：发布文章 / 编辑文章 / 删除文章 / 删除评论
   ============================================================ */
(function () {
  'use strict';

  var cfg = (window.ZJ_CONFIG && window.ZJ_CONFIG.comments) || {};
  var base = (cfg.supabaseUrl || '').replace(/\/+$/, '');
  var key = cfg.supabaseAnonKey || '';
  if (!base || !key) return;   // 没配 Supabase 就完全不出现管理员入口

  var TOKEN_KEY = 'zj_admin_token';
  var CATS = window.ZJ_CATS || [];

  var token = null;
  try { token = localStorage.getItem(TOKEN_KEY) || null; } catch (e) {}

  var headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };

  /* ---------------- 工具 ---------------- */
  function rpc(name, payload) {
    return fetch(base + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload || {})
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
      }
      return r.text().then(function (t) { return t ? JSON.parse(t) : true; });
    });
  }

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------------- 状态 ---------------- */
  window.ZJ_ADMIN = { active: false, token: token };

  function setActive(on) {
    window.ZJ_ADMIN.active = !!on;
    document.body.classList.toggle('admin-mode', !!on);
    var link = document.getElementById('admin-link');
    if (link) link.textContent = on ? '退出管理' : '管理员';
    var bar = document.getElementById('admin-bar');
    if (on && !bar) {
      bar = el('div', { class: 'admin-bar', id: 'admin-bar' },
        '<span>管理员模式</span><button type="button" class="admin-exit" id="admin-exit">退出</button>');
      document.body.insertBefore(bar, document.body.firstChild);
      bar.querySelector('#admin-exit').addEventListener('click', logout);
    } else if (!on && bar) {
      bar.remove();
    }
    if (on) mountAdminActions(); else unmountAdminActions();
  }

  function logout() {
    if (token) { rpc('admin_logout', { p_token: token }).catch(function () {}); }
    token = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    setActive(false);
    location.reload();
  }

  /* ---------------- 登录弹窗 ---------------- */
  function openLogin() {
    var mask = el('div', { class: 'admin-mask', id: 'admin-mask' });
    mask.innerHTML =
      '<div class="admin-dialog" role="dialog" aria-modal="true" aria-label="管理员登录">' +
        '<h3>管理员登录</h3>' +
        '<p class="admin-hint">输入密钥，校验通过后进入管理模式（24 小时内有效）。</p>' +
        '<input class="admin-input" id="admin-key-input" type="text" autocomplete="off" spellcheck="false" placeholder="ZJ-XXXX-XXXX-XXXX">' +
        '<p class="admin-error" id="admin-error"></p>' +
        '<div class="admin-actions">' +
          '<button type="button" class="btn ghost" id="admin-cancel">取消</button>' +
          '<button type="button" class="btn primary" id="admin-ok">进入</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);

    var input = mask.querySelector('#admin-key-input');
    var errEl = mask.querySelector('#admin-error');
    var okBtn = mask.querySelector('#admin-ok');
    input.focus();

    function close() { mask.remove(); }
    function submit() {
      var v = (input.value || '').trim().toUpperCase();
      if (!v) { errEl.textContent = '请输入密钥'; return; }
      okBtn.disabled = true;
      errEl.textContent = '校验中…';
      rpc('admin_login', { p_key: v })
        .then(function (res) {
          if (!res) {
            errEl.textContent = '密钥无效';
            okBtn.disabled = false;
            return;
          }
          token = String(res).replace(/^"|"$/g, '');
          try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
          close();
          setActive(true);
          location.reload();
        })
        .catch(function () {
          errEl.textContent = '校验失败，请检查网络';
          okBtn.disabled = false;
        });
    }

    okBtn.addEventListener('click', submit);
    mask.querySelector('#admin-cancel').addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }

  /* ---------------- 编辑器 ---------------- */
  function openEditor(post) {
    var isEdit = !!post;
    var p = post || { slug: '', title: '', cat: 'other', date: new Date().toISOString().slice(0, 10), byline: '', excerpt: '', body: '' };

    var mask = el('div', { class: 'admin-mask', id: 'admin-mask' });
    mask.innerHTML =
      '<div class="admin-dialog admin-dialog-wide" role="dialog" aria-modal="true">' +
        '<h3>' + (isEdit ? '编辑文章' : '发布新文章') + '</h3>' +
        '<div class="admin-grid">' +
          '<label>标题<input class="admin-input" id="f-title" value="' + esc(p.title) + '"></label>' +
          '<label>链接标识<input class="admin-input" id="f-slug" value="' + esc(p.slug) + '"' + (isEdit ? ' readonly' : '') + ' placeholder="zhuang-lie-3"></label>' +
          '<label>栏目<select class="admin-input" id="f-cat">' +
            CATS.map(function (c) {
              return '<option value="' + esc(c.key) + '"' + (c.key === p.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>';
            }).join('') +
          '</select></label>' +
          '<label>日期<input class="admin-input" id="f-date" type="date" value="' + esc(p.date) + '"></label>' +
          '<label class="admin-span">落款（可选）<input class="admin-input" id="f-byline" value="' + esc(p.byline || '') + '" placeholder="北京*中 · 高二 8 班 · 赵子涵"></label>' +
          '<label class="admin-span">摘要<input class="admin-input" id="f-excerpt" value="' + esc(p.excerpt || '') + '"></label>' +
          '<label class="admin-span">正文（可写 HTML）<textarea class="admin-input admin-body" id="f-body" rows="10">' + esc(p.body || '') + '</textarea></label>' +
        '</div>' +
        '<p class="admin-error" id="admin-error"></p>' +
        '<div class="admin-actions">' +
          '<button type="button" class="btn ghost" id="admin-cancel">取消</button>' +
          '<button type="button" class="btn primary" id="admin-ok">保存</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);

    var errEl = mask.querySelector('#admin-error');
    var okBtn = mask.querySelector('#admin-ok');
    mask.querySelector('#admin-cancel').addEventListener('click', function () { mask.remove(); });
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });

    okBtn.addEventListener('click', function () {
      var v = function (id) { return (mask.querySelector(id).value || '').trim(); };
      var slug = v('#f-slug').toLowerCase();
      var title = v('#f-title');
      var body = mask.querySelector('#f-body').value;

      if (!title) { errEl.textContent = '标题不能为空'; return; }
      if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug)) { errEl.textContent = '链接标识只能用小写字母、数字和短横线'; return; }
      if (!body.trim()) { errEl.textContent = '正文不能为空'; return; }

      okBtn.disabled = true;
      errEl.textContent = '保存中…';
      rpc('admin_save_post', {
        p_token: token, p_slug: slug, p_title: title, p_cat: v('#f-cat'),
        p_date: v('#f-date') || null, p_excerpt: v('#f-excerpt'),
        p_byline: v('#f-byline') || null, p_body: body, p_order: 999
      }).then(function () {
        location.href = 'article.html?slug=' + encodeURIComponent(slug);
      }).catch(function (e) {
        okBtn.disabled = false;
        errEl.textContent = '保存失败：' + (e.message || '未知错误');
      });
    });
  }

  /* ---------------- 页面按钮 ---------------- */
  var mounted = [];

  function addBtn(container, label, cls, onClick) {
    if (!container) return;
    var b = el('button', { type: 'button', class: 'admin-btn ' + (cls || '') }, label);
    b.addEventListener('click', onClick);
    container.appendChild(b);
    mounted.push(b);
  }

  function mountAdminActions() {
    // 先清掉旧的按钮，避免重复挂载
    var olds = document.querySelectorAll('.admin-row');
    for (var i = 0; i < olds.length; i++) olds[i].remove();

    // 文章页：编辑 / 删除
    var head = document.querySelector('.article-head');
    if (head && window.ZJ_CURRENT_POST) {
      var wrap = el('div', { class: 'admin-row' });
      head.appendChild(wrap);
      addBtn(wrap, '编辑这篇', 'admin-btn-edit', function () { openEditor(window.ZJ_CURRENT_POST); });
      addBtn(wrap, '删除', 'admin-btn-del', function () {
        if (!confirm('确定删除《' + window.ZJ_CURRENT_POST.title + '》？')) return;
        rpc('admin_delete_post', { p_token: token, p_slug: window.ZJ_CURRENT_POST.slug })
          .then(function () { location.href = 'index.html#posts'; })
          .catch(function (e) { alert('删除失败：' + e.message); });
      });
    }

    // 列表页：发布新文章
    var postsHead = document.querySelector('#posts .section-head');
    if (postsHead) {
      var bar = el('div', { class: 'admin-row admin-row-list' });
      postsHead.appendChild(bar);
      addBtn(bar, '＋ 发布新文章', 'admin-btn-new', function () { openEditor(null); });
    }

    // 评论区的删除按钮由 comments.js 负责
    window.dispatchEvent(new CustomEvent('zj-admin-change'));
  }

  function unmountAdminActions() {
    mounted.forEach(function (b) { b.remove(); });
    mounted = [];
    var rows = document.querySelectorAll('.admin-row');
    for (var i = 0; i < rows.length; i++) rows[i].remove();
    window.dispatchEvent(new CustomEvent('zj-admin-change'));
  }

  /* ---------------- 启动 ---------------- */
  function injectNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var a = el('a', { href: '#', id: 'admin-link', title: '管理员入口' }, token ? '退出管理' : '管理员');
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.ZJ_ADMIN.active) { logout(); } else { openLogin(); }
    });
    // 菜单移到左上角后，管理员入口放到右侧工具区，避免挤在一起
    var tools = document.querySelector('.header-tools');
    if (tools) {
      a.classList.add('admin-link');
      tools.insertBefore(a, tools.firstChild);
    } else {
      nav.appendChild(a);
    }
  }

  function verify() {
    if (!token) return;
    rpc('admin_check', { p_token: token })
      .then(function (ok) {
        if (ok === true) { setActive(true); }
        else { token = null; try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
      })
      .catch(function () { /* 网络问题就先不启用 */ });
  }

  injectNav();
  verify();

  // 文章渲染完成后（异步），如果已是管理员，补挂编辑/删除按钮
  window.addEventListener('zj-post-ready', function () {
    if (window.ZJ_ADMIN.active) mountAdminActions();
  });
})();
