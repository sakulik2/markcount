/* vault.js: read a local folder of notes and count each one. Files are read in the browser and never uploaded. */
(function (root) {
  'use strict';
  var MD = /\.(?:md|markdown)$/i;
  var canPick = typeof root.showDirectoryPicker === 'function';

  // 跳过以 . 开头的文件夹和文件，例如 .obsidian、.git、.trash
  async function walk(dir, prefix, out) {
    for await (const entry of dir.values()) {
      if (entry.name.charAt(0) === '.') continue;
      if (entry.kind === 'directory') await walk(entry, prefix + entry.name + '/', out);
      else if (MD.test(entry.name)) out.push({ path: prefix + entry.name, read: () => entry.getFile().then((f) => f.text()) });
    }
  }

  async function pick() {
    const dir = await root.showDirectoryPicker({ mode: 'read' });
    const items = [];
    await walk(dir, '', items);
    return { name: dir.name, items: items };
  }

  // 备用：<input webkitdirectory> 给出的文件列表（手机和不支持目录选择器的浏览器）
  function fromFiles(list) {
    const items = [];
    let name = '';
    for (const f of Array.from(list)) {
      const parts = (f.webkitRelativePath || f.name).split('/');
      if (!name && parts.length > 1) name = parts[0];
      const rel = parts.length > 1 ? parts.slice(1) : parts;
      if (rel.some((p) => p.charAt(0) === '.')) continue;
      if (MD.test(f.name)) items.push({ path: rel.join('/'), read: () => f.text() });
    }
    return { name: name, items: items };
  }

  // 并发读取，逐篇统计；读不出来的文件记进 failed
  async function load(items, opts, onProgress) {
    const rows = [];
    const failed = [];
    let next = 0;
    let done = 0;
    async function worker() {
      while (next < items.length) {
        const it = items[next++];
        try {
          const text = await it.read();
          rows.push(Object.assign({ path: it.path, text: text }, root.MdCount.count(text, opts)));
        } catch (e) {
          failed.push(it.path);
        }
        done++;
        if (done % 20 === 0 || done === items.length) onProgress(done, items.length);
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()]);
    return { rows: rows, failed: failed };
  }

  // 统计范围的选项改了：用内存里的原文重算，不重新读盘
  async function recount(rows, opts, onProgress) {
    for (let i = 0; i < rows.length; i++) {
      Object.assign(rows[i], root.MdCount.count(rows[i].text, opts));
      if (i % 200 === 199) {
        onProgress(i + 1, rows.length);
        await new Promise((r) => setTimeout(r));
      }
    }
  }

  root.Vault = { canPick: canPick, pick: pick, fromFiles: fromFiles, load: load, recount: recount };
})(window);
