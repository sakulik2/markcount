/* vault-view.js: the local vault view. Picks a folder, counts each note, lists them, previews one. */
(function (root) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var R = root.MdRender, V = root.Vault;
  var st = { name: '', rows: [], failed: [], sort: { key: 'total', dir: -1 }, filter: '', selected: '' };
  var app, busyNow = false;

  function panel(which) {
    $('vault-empty').hidden = which !== 'empty';
    $('vault-error').hidden = which !== 'error';
    $('vault-body').hidden = which !== 'body';
  }
  function busy(on, text) {
    busyNow = on;
    $('vault-status').hidden = !on;
    $('vault-status-text').textContent = text || '';
    ['pick'].forEach(function (id) {
      var b = $(id);
      b.disabled = on;
      b.setAttribute('aria-busy', on ? 'true' : 'false');
    });
    $('pick-fallback').disabled = on;
    $('pick-fallback-label').setAttribute('aria-disabled', on ? 'true' : 'false');
  }
  function progress(done, total) {
    $('vault-progress').value = total ? (done / total) * 100 : 0;
    $('vault-status-text').textContent = '正在统计 ' + R.fmt(done) + ' / ' + R.fmt(total) + ' 篇';
  }
  function fail(msg) {
    $('vault-error-msg').textContent = msg;
    panel('error');
  }

  function visible() {
    var q = st.filter.trim().toLowerCase();
    var rows = q ? st.rows.filter(function (r) { return r.path.toLowerCase().indexOf(q) >= 0; }) : st.rows.slice();
    var k = st.sort.key, d = st.sort.dir;
    return rows.sort(function (a, b) {
      if (k === 'path') return d * a.path.localeCompare(b.path, 'zh');
      return d * (a[k] - b[k]) || a.path.localeCompare(b.path, 'zh');
    });
  }

  function refresh() {
    var rows = visible();
    var sum = { cjk: 0, words: 0, total: 0, chars: 0 };
    var tb = $('vault-rows');
    var frag = document.createDocumentFragment();
    rows.forEach(function (r) {
      sum.cjk += r.cjk; sum.words += r.words; sum.total += r.total; sum.chars += r.chars;
      var tr = R.make('tr');
      tr.tabIndex = 0;
      tr.dataset.path = r.path;
      tr.setAttribute('aria-selected', r.path === st.selected ? 'true' : 'false');
      var td = R.make('td', 'path');
      var i = r.path.lastIndexOf('/');
      td.appendChild(R.make('span', null, i < 0 ? r.path : r.path.slice(i + 1)));
      if (i >= 0) td.appendChild(R.make('span', 'path__dir', r.path.slice(0, i)));
      tr.appendChild(td);
      [r.total, r.cjk, r.words].forEach(function (n) { tr.appendChild(R.make('td', 'num', R.fmt(n))); });
      frag.appendChild(tr);
    });
    tb.textContent = '';
    tb.appendChild(frag);
    if (!rows.length) {
      var tr0 = R.make('tr'), td0 = R.make('td', null, '没有路径包含「' + st.filter.trim() + '」的笔记。');
      td0.colSpan = 4;
      tr0.appendChild(td0);
      tb.appendChild(tr0);
    }
    var note = st.name + '，' + R.fmt(rows.length) + (rows.length === st.rows.length ? '' : ' / ' + R.fmt(st.rows.length)) + ' 篇笔记';
    if (st.failed.length) note += '，' + R.fmt(st.failed.length) + ' 篇没能读取';
    R.tally($('vault-summary'), sum, note);
    document.querySelectorAll('#vault-table th[data-sort]').forEach(function (th) {
      th.setAttribute('aria-sort', th.dataset.sort === st.sort.key ? (st.sort.dir > 0 ? 'ascending' : 'descending') : 'none');
    });
  }

  function select(path) {
    var r = st.rows.filter(function (x) { return x.path === path; })[0];
    if (!r) return;
    st.selected = path;
    $('vault-title').textContent = path;
    try { R.render($('vault-md'), r.text); } catch (e) { $('vault-md').textContent = '渲染出错：' + e.message; }
    document.querySelectorAll('#vault-rows tr').forEach(function (tr) {
      tr.setAttribute('aria-selected', tr.dataset.path === path ? 'true' : 'false');
    });
  }

  async function start(get) {
    if (busyNow) return;
    busy(true, '正在读取文件夹');
    $('vault-progress').value = 0;
    try {
      var res = await get();
      if (!res.items.length) {
        fail('这个文件夹里没有 .md 笔记。换一个文件夹试试，或者确认选的是仓库的最外层。');
        return;
      }
      var out = await V.load(res.items, app.opts(), progress);
      st.name = res.name || '仓库'; st.rows = out.rows; st.failed = out.failed; st.selected = '';
      $('vault-title').textContent = '从左边选一篇笔记';
      $('vault-md').textContent = '';
      panel('body');
      refresh();
    } catch (e) {
      if (e && e.name === 'AbortError') { panel(st.rows.length ? 'body' : 'empty'); return; }
      fail('浏览器没有给出权限，或者文件夹太大读不完。可以再试一次，或改用备用的文件夹选择。（' + (e && e.message ? e.message : '未知错误') + '）');
    } finally {
      busy(false);
    }
  }

  function init(a) {
    app = a;
    if (!V.canPick) {
      $('pick').hidden = true;
      var lab = $('pick-fallback-label');
      lab.classList.add('btn--primary');
      lab.firstChild.nodeValue = '选择仓库文件夹\n';
      $('vault-note').textContent = '这个浏览器不能直接打开文件夹，改用文件夹选择。文件仍然只在这台设备上读取，不会上传。';
    }
    $('pick').addEventListener('click', function () { start(V.pick); });
    $('pick-fallback').addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files);
      e.target.value = '';
      if (files.length) start(function () { return Promise.resolve(V.fromFiles(files)); });
    });
    var timer;
    $('vault-search').addEventListener('input', function (e) {
      st.filter = e.target.value;
      clearTimeout(timer);
      timer = setTimeout(refresh, 120);
    });
    $('vault-table').addEventListener('click', function (e) {
      var b = e.target.closest('.sortbtn');
      if (b) {
        var k = b.closest('th').dataset.sort;
        st.sort = st.sort.key === k ? { key: k, dir: -st.sort.dir } : { key: k, dir: k === 'path' ? 1 : -1 };
        refresh();
        var again = document.querySelector('#vault-table th[data-sort="' + k + '"] .sortbtn');
        if (again) again.focus();
        return;
      }
      var tr = e.target.closest('#vault-rows tr[data-path]');
      if (tr) select(tr.dataset.path);
    });
    $('vault-rows').addEventListener('keydown', function (e) {
      var tr = e.target.closest('tr[data-path]');
      if (!tr) return;
      if (e.key === 'Enter' || e.key === ' ') { select(tr.dataset.path); e.preventDefault(); }
      var to = e.key === 'ArrowDown' ? tr.nextElementSibling : e.key === 'ArrowUp' ? tr.previousElementSibling : null;
      if (to) { to.focus(); e.preventDefault(); }
    });
    // 统计范围改了：用内存里的原文重算，不重新读盘
    app.onOpts(async function () {
      if (!st.rows.length || busyNow) return;
      busy(true, '正在重新统计');
      await V.recount(st.rows, app.opts(), progress);
      busy(false);
      refresh();
    });
    panel('empty');
  }

  root.VaultView = { init: init };
})(window);
