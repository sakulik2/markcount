/* count.js: 统计 Markdown 里真正的字。汉字和假名逐字计，其他文字按词计，Markdown 符号、链接地址等不计。 */
(function (root) {
  'use strict';

  var DEFAULTS = { includeFrontmatter: false, includeComments: false, includeCode: true };
  var CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
  var WORD = /[\p{L}\p{N}\p{M}]+(?:['’-][\p{L}\p{N}\p{M}]+)*/gu;
  var LETTER = /[\p{L}\p{N}]/gu;

  // 把 Markdown 还原成只剩可读文字的纯文本（去掉不属于“正文”的部分）
  function toPlain(src, opt) {
    var s = String(src).replace(/\r\n?/g, '\n');

    if (!opt.includeFrontmatter) {
      s = s.replace(/^﻿?---[ \t]*\n[\s\S]*?\n(?:---|\.\.\.)[ \t]*(?=\n|(?![\s\S]))/, ' ');
    }
    if (!opt.includeComments) {
      s = s.replace(/%%[\s\S]*?%%/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
    }
    s = s.replace(/\$\$[\s\S]*?\$\$/g, ' ');

    // 围栏代码块：只保留或丢弃内容，围栏本身永远不计
    s = s.replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)(?:^[ \t]*\1[`~]*[ \t]*$|(?![\s\S]))/gm, function (m, fence, body) {
      return opt.includeCode ? '\n' + body + '\n' : '\n';
    });
    s = s.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, function (m, ticks, body) {
      return opt.includeCode ? ' ' + body + ' ' : ' ';
    });

    // 图片、嵌入、脚注、链接：地址不计，链接文字保留
    s = s.replace(/!\[\[[^\]]*\]\]/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
    s = s.replace(/^[ \t]*\[(?!\^)[^\]]+\]:[ \t]+\S+.*$/gm, ' ');
    s = s.replace(/\[\^[^\]]*\]:?/g, ' ');
    s = s.replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, function (m, target, alias) {
      return ' ' + (alias || target).replace(/[#^]/g, ' ') + ' ';
    });
    s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, ' $1 ');
    s = s.replace(/\[![A-Za-z-]+\][+-]?/g, ' ');

    // 裸链接、HTML 标签、块 ID
    s = s.replace(/<(?:https?|ftp|mailto):[^>\s]*>/gi, ' ');
    s = s.replace(/\b(?:https?|ftp):\/\/[^\s<>)\]]+/gi, ' ').replace(/\bwww\.[^\s<>)\]]+/gi, ' ');
    s = s.replace(/<\/?[A-Za-z][^>]*>/g, ' ');
    s = s.replace(/(^|\s)\^[A-Za-z0-9-]+[ \t]*$/gm, ' ');
    return s;
  }

  function count(src, options) {
    var opt = {};
    var k;
    for (k in DEFAULTS) opt[k] = DEFAULTS[k];
    for (k in (options || {})) opt[k] = options[k];

    var plain = toPlain(src, opt);
    var cjk = (plain.match(CJK) || []).length;
    var words = (plain.replace(CJK, ' ').match(WORD) || []).length;
    var chars = (plain.match(LETTER) || []).length;
    return { cjk: cjk, words: words, total: cjk + words, chars: chars };
  }

  var api = { count: count, toPlain: toPlain, DEFAULTS: DEFAULTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MdCount = api;
})(typeof window !== 'undefined' ? window : globalThis);
