/* ============================================================
   经历（时间线）· 数据来自 Supabase journey 表
   管理员可新增 / 编辑 / 删除 / 上移下移；数据库为空时保留静态版本
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
  var tableReady = false;

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

  /* ---------------- 渲染 ---------------- */
  function render() {
    listEl.innerHTML = items.map(function (it, i) {
      var first = i === 0, last = i === items.length - 1;
      return '<li class="reveal in" data-id="' + it.id + '">' +
        '<span class="tl-time">' + esc(it.time_label) + '</span>' +
        '<div class="tl-body">' +
          '<h3>' + esc(it.title) + '</h3>' +
          '<p>' + esc(it.body) + '</p>' +
          (isAdmin()
            ? '<div class="tl-admin">' +
                '<button type="button" class="admin-btn" data-act="up" data-id="' + it.id + '"' + (first ? ' disabled' : '') + ' title="上移">▲</button>' +
                '<button type="button" class="admin-btn" data-act="down" data-id="' + it.id + '"' + (last ? ' disabled' : '') + ' title="下移">▼</button>' +
                '<button type="button" class="admin-btn" data-act="edit" data-id="' + it.id + '">编辑</button>' +
                '<button type="button" class="admin-btn danger" data-act="del" data-id="' + it.id + '">删除</button>' +
              '</div>'
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
      addRow.querySelector('button').addEventListener('click', function () { openEditor(null); });
      listEl.parentNode.appendChild(addRow);
    }
    if (addRow) addRow.hidden = !isAdmin();
  }

  function showNotice() {
    if (!isAdmin() || tableReady) return;
    if (document.getElementById('journey-notice')) return;
    var box = document.createElement('p');
    box.id = 'journey-notice';
    box.className = 'journey-notice';
    box.innerHTML = '经历的编辑功能还没启用：数据库里还没有 <code>journey</code> 表。<br>' +
      '在 Supabase SQL Editor 里跑一次 <code>supabase/patch-journey-v30.sql</code>（只需一次），' +
      '跑完刷新本页即可编辑。';
    listEl.parentNode.appendChild(box);
  }

  function load() {
    return fetch(base + '/rest/v1/journey?select=id,time_label,title,body,sort_order&order=sort_order.asc,id.asc', { headers: H })
      .then(function (r) {
        if (!r.ok) { tableReady = false; showNotice(); return []; }
        tableReady = true;
        return r.json();
      })
      .then(function (rows) {
        items = rows || [];
        if (items.length) render();
        var n = document.getElementById('journey-notice');
        if (n && tableReady) n.remove();
      })
      .catch(function () { showNotice(); });
  }

  /* ---------------- 编辑弹窗 ---------------- */
  var mask = null;
  var editingId = null;

  function buildDialog() {
    if (mask) return mask;
    mask = document.createElement('div');
    mask.className = 'admin-mask';
    mask.id = 'journey-mask';
    mask.hidden = true;
    mask.innerHTML =
      '<div class="admin-dialog admin-dialog-wide" role="dialog" aria-modal="true">' +
        '<h3 id="j-head">编辑节点</h3>' +
        '<p class="admin-hint">这三项会直接显示在首页「经历」里。</p>' +
        '<div class="admin-grid">' +
          '<label>时间<input class="admin-input" id="j-time" placeholder="例如 2019" maxlength="20"></label>' +
          '<label>标题<input class="admin-input" id="j-title" placeholder="例如 九岁 · 某件事" maxlength="60"></label>' +
          '<label class="admin-span">描述<textarea class="admin-input admin-body" id="j-body" rows="4" placeholder="一句话说明" maxlength="300"></textarea></label>' +
        '</div>' +
        '<p class="admin-error" id="j-error"></p>' +
        '<div class="admin-actions">' +
          '<button type="button" class="btn ghost" id="j-cancel">取消</button>' +
          '<button type="button" class="btn primary" id="j-save">保存</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);

    mask.querySelector('#j-cancel').addEventListener('click', closeEditor);
    mask.addEventListener('click', function (e) { if (e.target === mask) closeEditor(); });
    return mask;
  }

  function openEditor(item) {
    buildDialog();
    editingId = item ? item.id : null;
    mask.querySelector('#j-head').textContent = item ? '编辑节点' : '新增节点';
    mask.querySelector('#j-time').value = item ? item.time_label : '';
    mask.querySelector('#j-title').value = item ? item.title : '';
    mask.querySelector('#j-body').value = item ? item.body : '';
    mask.querySelector('#j-error').textContent = '';
    mask.hidden = false;
    setTimeout(function () { mask.querySelector('#j-time').focus(); }, 30);

    mask.querySelector('#j-save').onclick = function () {
      var time = mask.querySelector('#j-time').value.trim();
      var title = mask.querySelector('#j-title').value.trim();
      var body = mask.querySelector('#j-body').value.trim();
      var errEl = mask.querySelector('#j-error');
      if (!time) { errEl.textContent = '时间不能为空'; return; }
      if (!title) { errEl.textContent = '标题不能为空'; return; }

      var btn = mask.querySelector('#j-save');
      btn.disabled = true;
      var p = editingId
        ? rpc('admin_update_journey', { p_token: token(), p_id: Number(editingId), p_time: time, p_title: title, p_body: body })
        : rpc('admin_add_journey', { p_token: token(), p_time: time, p_title: title, p_body: body });

      p.then(function () { closeEditor(); return load(); })
        .catch(function (e) { errEl.textContent = '保存失败：' + e.message; })
        .then(function () { btn.disabled = false; });
    };
  }

  function closeEditor() { if (mask) mask.hidden = true; editingId = null; }

  function move(id, dir) {
    rpc('admin_move_journey', { p_token: token(), p_id: Number(id), p_dir: dir })
      .then(load)
      .catch(function (e) { alert('移动失败：' + e.message); });
  }

  function del(id) {
    if (!window.confirm('删除这个节点？')) return;
    rpc('admin_delete_journey', { p_token: token(), p_id: Number(id) })
      .then(load)
      .catch(function (e) { alert('删除失败：' + e.message); });
  }

  listEl.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-act]') : null;
    if (!b || !isAdmin() || b.disabled) return;
    e.preventDefault();
    var id = b.getAttribute('data-id');
    var act = b.getAttribute('data-act');
    if (act === 'edit') {
      var it = items.filter(function (x) { return String(x.id) === String(id); })[0];
      openEditor(it);
    } else if (act === 'del') {
      del(id);
    } else if (act === 'up') {
      move(id, -1);
    } else if (act === 'down') {
      move(id, 1);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mask && !mask.hidden) closeEditor();
  });

  window.addEventListener('zj-admin-change', function () { if (items.length) render(); else load(); });

  load();
})();
