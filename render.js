/* render.js: Markdown to safe HTML, and the count label. Needs marked and DOMPurify. */
(function (root) {
  'use strict';
  var nf = new Intl.NumberFormat('zh-CN');
  var ready = false;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  // 属性块和 %%注释%% 不渲染
  function prepare(src) {
    return String(src)
      .replace(/^﻿?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/, '')
      .replace(/%%[\s\S]*?%%/g, '');
  }

  function setup() {
    if (ready) return;
    ready = true;
    // [[双链]] 和 ![[嵌入]] 只显示名字，不跳转
    root.marked.use({
      extensions: [{
        name: 'wikilink',
        level: 'inline',
        start: function (s) { return s.search(/!?\[\[/); },
        tokenizer: function (s) {
          var m = /^!?\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/.exec(s);
          if (m) return { type: 'wikilink', raw: m[0], text: (m[2] || m[1]).replace(/[#^]/g, ' ').trim() };
        },
        renderer: function (t) { return '<a class="wikilink" href="#">' + esc(t.text) + '</a>'; }
      }]
    });
    root.DOMPurify.addHook('afterSanitizeAttributes', function (n) {
      if (n.tagName === 'A' && /^https?:/i.test(n.getAttribute('href') || '')) {
        n.setAttribute('target', '_blank');
        n.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  function render(el, src) {
    setup();
    var html = root.marked.parse(prepare(src), { async: false });
    el.innerHTML = root.DOMPurify.sanitize(html);
  }

  function make(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // 字数标签：总数、汉字、词、字符，右边一条撕条写说明
  function tally(el, c, note, unit) {
    el.textContent = '';
    var main = make('div', 'tally__main');
    main.appendChild(make('span', 'tally__n num', nf.format(c.total)));
    main.appendChild(make('span', 'tally__u', unit || '字'));
    var dl = make('dl', 'tally__parts');
    [['汉字', c.cjk], ['词', c.words], ['字符', c.chars]].forEach(function (p) {
      var d = make('div');
      d.appendChild(make('dt', null, p[0]));
      d.appendChild(make('dd', null, nf.format(p[1])));
      dl.appendChild(d);
    });
    el.appendChild(main);
    el.appendChild(dl);
    el.appendChild(make('p', 'tally__stub', note));
  }

  root.MdRender = { render: render, tally: tally, make: make, fmt: function (n) { return nf.format(n); } };
})(window);
