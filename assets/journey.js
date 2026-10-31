/* ============================================================
   经历（时间线）· 数据来自 Supabase journey 表
   管理员可新增 / 编辑 / 删除；数据库为空时保留页面里的静态版本
   ============================================================ */
(function () {
  'use strict';

  var listEl = document.getElementById('timeline');
  if (!listEl) return;

  var cfg = (window.ZJ_CONFIG && window.ZJ_CONFIG.comments) || {};
  var base = (cfg.supabaseUrl || '').replace(/\/+$/, '');
  var key = cfg.supabaseAnonKey || '';
  if (!base || !key) return;

  var H = { apikey: key, Authorization: 'Bearer ' + key };
  var HJ = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  var items = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isAdmin() { return !!(window.ZJ_ADMIN && window.ZJ_ADMIN.active); }
  function token() { return (window.ZJ_ADMIN && window.ZJ_ADMIN.token) || null; }

  function rpc(name, payload) {
    return fetch(base + '/rest/v1/rpc/' + name, {
      method: 'POST', headers: HJ, body: JSON.stringify(payload || {})
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
      return r.text().then(function (t) { return t ? JSON.parse(t) : true; });
    });
  }

  function render() {
    listEl.innerHTML = items.map(function (it) {
      return '<li class="reveal in" data-id="' + it.id + '">' +
        '<span class="tl-time">' + esc(it.time_label) + '</span>' +
        '<div class="tl-body">' +
          '<h3>' + esc(it.title) + '</h3>' +
          '<p>' + esc(it.body) + '</p>' +
          (isAdmin()
            ? '<div class="tl-admin"><button type="button" class="admin-btn" data-act="edit" data-id="' + it.id + '">编辑</button>' +
              '<button type="button" class="admin-btn danger" data-act="del" data-id="' + it.id + '">删除</button></div>'
            : '') +
        '</div>' +
      '</li>';
    }).join('');

    var addRow = document.getElementById('journey-admin');
    if (!addRow && isAdmin()) {
      addRow = document.createElement('div');
      addRow.id = 'journey-admin';
      addRow.className = 'admin-row';
      addRow.innerHTML = '<button type="button" class="admin-btn">＋ 新增节点</button>';
      addRow.querySelector('button').addEventListener('click', addItem);
      listEl.parentNode.appendChild(addRow);
    }
    if (addRow) addRow.hidden = !isAdmin();
  }

  function load() {
    return fetch(base + '/rest/v1/journey?select=id,time_label,title,body,sort_order&order=sort_order.asc,id.asc', { headers: H })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        items = rows || [];
        if (items.length) render();
      })
      .catch(function () { /* 表还没建就保留静态版本 */ });
  }

  function addItem() {
    var time = window.prompt('年份／时间（例如 2019）');
    if (time === null) return;
    var title = window.prompt('标题（例如 九岁 · 某件事）');
    if (title === null) return;
    var body = window.prompt('一句话描述');
    if (body === null) return;
    rpc('admin_add_journey', { p_token: token(), p_time: time.trim(), p_title: title.trim(), p_body: body.trim() })
      .then(load)
      .catch(function (e) { alert('新增失败：' + e.message); });
  }

  function editItem(id) {
    var it = items.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!it) return;
    var time = window.prompt('年份／时间', it.time_label);
    if (time === null) return;
    var title = window.prompt('标题', it.title);
    if (title === null) return;
    var body = window.prompt('描述', it.body);
    if (body === null) return;
    rpc('admin_update_journey', {
      p_token: token(), p_id: Number(id),
      p_time: time.trim(), p_title: title.trim(), p_body: body.trim()
    })
      .then(load)
      .catch(function (e) { alert('保存失败：' + e.message); });
  }

  function delItem(id) {
    if (!window.confirm('删除这个节点？')) return;
    rpc('admin_delete_journey', { p_token: token(), p_id: Number(id) })
      .then(load)
      .catch(function (e) { alert('删除失败：' + e.message); });
  }

  listEl.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-act]') : null;
    if (!b || !isAdmin()) return;
    e.preventDefault();
    var id = b.getAttribute('data-id');
    if (b.getAttribute('data-act') === 'edit') editItem(id);
    else delItem(id);
  });

  window.addEventListener('zj-admin-change', function () { if (items.length) render(); });

  load();
})();
