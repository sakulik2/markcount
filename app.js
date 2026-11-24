/* app.js: the editor view, the view keys and the scope options. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'mdwc:draft';
  var SAMPLE = [
    '# 示例笔记',
    '',
    '这是一段**中英文混排**的文字，用来看看 word count 是怎么算的。',
    '',
    '> 引用的文字会计入，`>` 符号不会。',
    '',
    '* * *',
    '',
    '- 汉字逐个计数',
    '- English words are counted by word',
    '- [链接文字会算](https://example.com/path)，地址不算',
    '',
    '```js',
    'const note = 1;',
    '```'
  ].join('\n');

  var src = $('src'), preview = $('preview'), empty = $('preview-empty'), stat = $('stat-editor');
  var listeners = [];

  function opts() {
    return { includeCode: $('opt-code').checked, includeFrontmatter: $('opt-fm').checked, includeComments: $('opt-comment').checked };
  }

  function update() {
    var text = src.value;
    var has = text.trim().length > 0;
    empty.hidden = has;
    preview.hidden = !has;
    if (has) {
      try { MdRender.render(preview, text); }
      catch (e) { preview.textContent = '渲染出错：' + e.message; }
    } else {
      preview.textContent = '';
    }
    MdRender.tally(stat, MdCount.count(text, opts()), '标记符号、链接地址和属性块不计。');
    try { localStorage.setItem(KEY, text); } catch (e) { /* 存不了就不存 */ }
  }

  var timer;
  src.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(update, 120); });
  $('sample').addEventListener('click', function () { src.value = SAMPLE; update(); src.focus(); });
  try { src.value = localStorage.getItem(KEY) || ''; } catch (e) { /* 没有存档 */ }

  // 统计范围
  ['opt-code', 'opt-fm', 'opt-comment'].forEach(function (id) {
    $(id).addEventListener('change', function () { update(); listeners.forEach(function (fn) { fn(); }); });
  });
  var details = $('opts');
  details.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && details.open) { details.open = false; details.querySelector('summary').focus(); }
  });
  document.addEventListener('click', function (e) {
    if (details.open && !details.contains(e.target)) details.open = false;
    // 笔记里的双链和页内锚点不跳转，免得把视图切走
    var a = e.target.closest ? e.target.closest('.md a') : null;
    if (a && (a.classList.contains('wikilink') || (a.getAttribute('href') || '').charAt(0) === '#')) e.preventDefault();
  });

  // 视图切换，当前视图记在地址栏的 #editor 或 #vault
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.key'));
  function show(name) {
    tabs.forEach(function (t) {
      var on = t.dataset.view === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      $('view-' + t.dataset.view).hidden = !on;
    });
    if (location.hash.slice(1) !== name) {
      try { history.replaceState(null, '', '#' + name); } catch (e) { /* file: 下可能不允许 */ }
    }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(t.dataset.view); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length];
      show(n.dataset.view);
      n.focus();
      e.preventDefault();
    });
  });
  window.addEventListener('hashchange', function () {
    var h = location.hash.slice(1);
    if (h === 'editor' || h === 'vault') show(h);
  });

  window.App = { opts: opts, onOpts: function (fn) { listeners.push(fn); } };
  show(location.hash === '#vault' ? 'vault' : 'editor');
  update();
  if (window.VaultView) window.VaultView.init(window.App);
})();
