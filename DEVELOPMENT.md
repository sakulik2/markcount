# 开发说明

这份文档面向要修改或部署 markcount 的人。使用说明见 [README.md](README.md)。

## 本地运行

纯静态页面，没有构建步骤，也没有依赖要安装。页面带严格的内容安全策略，文件夹选择器也要求 http 或 https，所以不要直接双击打开 `index.html`。在本目录起任意静态服务器即可，例如：

```
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。

## 部署到 GitHub Pages

1. 把本目录的内容作为仓库根目录推到 GitHub，`index.html` 要在仓库根。
2. 仓库的 Settings，Pages，Source 选 Deploy from a branch，分支选 `main`，目录选 `/ (root)`。
3. 等一两分钟，访问 `https://<用户名>.github.io/markcount/`。

所有资源都用相对路径，放在仓库子路径下也能正常加载。`marked` 和 `DOMPurify` 已放在 `vendor/`（含许可证），页面不依赖任何外部地址。

## 文件

- `index.html`、`style.css`、`tokens.css`、`base.css`：页面和样式。主题是 Hallmark 的 Dose，按工具型界面使用。
- `count.js`：统计规则，不碰 DOM 的纯函数。
- `render.js`：Markdown 渲染（`marked` 加 `DOMPurify`）和字数标签。
- `vault.js`：读取本地文件夹，逐篇统计。
- `vault-view.js`：本地仓库视图的列表、排序、筛选和预览。
- `app.js`：编辑器、视图切换和统计范围。
- `vendor/`：`marked`、`DOMPurify` 及许可证。

脚本按 `marked`、`purify`、`count`、`render`、`vault`、`vault-view`、`app` 的顺序加载，`app.js` 最后加载并启动其他模块。

## 统计规则的实现

`count.js` 先把 Markdown 还原成只剩可读文字的纯文本（`toPlain`），再数：

- 汉字、平假名、片假名逐字计；把它们去掉之后，剩下的字母和数字按词计，`don't`、`well-known` 各算一个词。
- `count(src, options)` 返回 `{ cjk, words, total, chars }`，`total` 是汉字数加词数。
- 选项：`includeFrontmatter`、`includeComments`、`includeCode`，默认分别是 `false`、`false`、`true`。

不用浏览器也能试：

```
node -e "console.log(require('./count.js').count('# 你好 world'))"
```

改规则后，至少拿这几类文本对一遍：标题和粗体、分隔线、属性块、链接和图片、双链、代码块、注释、英文缩写和连字符、空文本。

## 约束和注意事项

- `index.html` 的内容安全策略是 `default-src 'self'`，所以不能引用外链字体、脚本和样式。主题字体（Schibsted Grotesk、Instrument Sans、DM Mono）没有随项目提供，字体栈会回退到系统字体和中文系统字体。想用主题字体，需要把字体文件放进项目并加 `@font-face`。
- 颜色和字体只在 `tokens.css` 里定义，`style.css` 里一律用变量。
- 仓库视图用 `showDirectoryPicker`（桌面版 Chrome 和 Edge），不支持时自动改用 `<input webkitdirectory>`。目前只测过备用入口，`showDirectoryPicker` 没有在真实浏览器里点过。
- 笔记里的双链只显示名字，不跳转。
- 手机上还没有实机测试。
