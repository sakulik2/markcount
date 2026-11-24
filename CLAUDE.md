# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 这是什么

markcount 是纯静态页面：粘贴或打开 Markdown，实时渲染，并只统计真正的字（汉字逐字计，其他文字按词计，Markdown 符号不计）。部署目标是 GitHub Pages。没有构建、lint 和测试命令，也没有 `package.json`。用户说明见 `README.md`，本地运行、部署和文件清单见 `DEVELOPMENT.md`，这里不重复。

## 运行与验证

- 在仓库根目录起静态服务器：`python -m http.server 8000`。不能双击打开 `index.html`：页面的 CSP 和文件夹选择器都要求 http(s)。
- 统计核心不需要浏览器，可以直接在 Node 里试：`node -e "console.log(require('./count.js').count('# 你好 world'))"`。改统计规则后，用这几类文本核对：标题和粗体、分隔线、属性块、链接和图片、双链、代码块、注释、英文缩写和连字符、空文本。
- UI 没有自动化测试。之前的检查方式是临时静态服务器加无头 Edge 截图（含 390px 宽度，要放在 iframe 里才能真的触发窄屏媒体查询）。`showDirectoryPicker` 没有在真实浏览器里点过，只测过 `<input webkitdirectory>` 备用路径。

## 架构

没有打包器。`index.html` 按固定顺序加载普通脚本，每个脚本往 `window` 上挂一个全局对象，后面的依赖前面的，顺序不能乱：

`vendor/marked.umd.js`、`vendor/purify.min.js`、`count.js`（`MdCount`）、`render.js`（`MdRender`）、`vault.js`（`Vault`）、`vault-view.js`（`VaultView`）、`app.js`（`App`）。

- **`count.js`** 是唯一的统计规则，不碰 DOM，同时支持浏览器全局和 `module.exports`。`toPlain` 先把 Markdown 还原成纯文本，再数；它的替换顺序是有意的（属性块、注释、公式，再围栏代码，再行内代码，再图片、双链、链接，最后裸链接和 HTML 标签），调整顺序会让一些情况重复计数或漏计。选项 `includeCode`、`includeFrontmatter`、`includeComments` 默认是 `true`、`false`、`false`。
- **`render.js`** 负责渲染（`marked` 加 `DOMPurify`）和字数标签 `tally`。渲染前不论统计选项如何，一律去掉属性块和 `%%注释%%`：渲染只管显示，统计范围只管 `count.js`，两者故意分开。`[[双链]]` 用自定义 `marked` 扩展渲染成不跳转的链接。
- **`app.js`** 是编辑器视图，也是入口：它最后调用 `VaultView.init(App)`。统计范围的三个复选框变化时，先重算编辑器，再通知 `App.onOpts` 注册的监听器，仓库视图就是这样跟着重算的。视图切换用地址栏 `#editor` 或 `#vault`，草稿存在 `localStorage` 的 `mdwc:draft`，两者都包了 try/catch。
- **`vault.js` 和 `vault-view.js`**：前者读文件夹并逐篇统计（目录选择器或 `webkitdirectory` 备用入口，跳过以 `.` 开头的文件和文件夹，只读 `.md` 和 `.markdown`）；后者负责列表、排序、筛选和预览，以及加载、空、出错三种状态。每篇笔记的原文留在内存里，所以统计范围改变时用 `Vault.recount` 直接重算，不重新读盘。表格里的路径一律用 `textContent` 写入，不要改成 `innerHTML`。

## 样式和约束

- 主题是 Hallmark 的 Dose，按工具型界面（app screen）使用。`style.css` 开头的几行是 Hallmark 的 stamp 和注释，必须保持在文件最前面（只有这些注释和 `@import` 在它之前）。`tokens.css` 和 `base.css` 是脚手架生成的，颜色和字体只在 `tokens.css` 里定义，`style.css` 里一律用变量，不写颜色或 `font-family` 字面量。
- `index.html` 的 CSP 是 `default-src 'self'`：不能有内联脚本、内联样式和外链字体。主题字体（Schibsted Grotesk、Instrument Sans、DM Mono）没有随项目提供，字体栈会回退到系统字体，中文字体已经手动加进 `tokens.css` 的字体栈。
- 所有资源路径都是相对路径，以便放在 GitHub Pages 的仓库子路径下。`marked` 和 `DOMPurify` 放在 `vendor/`（含许可证），不要换成 CDN。
- 不要用等宽后备字体显示数字：它的 0 带斜杠，「词」列会满屏 `Ø`。数字用正文字体加 `tabular-nums`。
