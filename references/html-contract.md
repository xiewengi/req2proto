# HTML 原型结构契约

输入：`<feature>.prd.md` 的功能清单。输出：**单个 .html 文件**，双击即开。

---

## 一、文件骨架（照抄，不要改结构）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{产品名}} · 原型</title>
<!-- 内联 theme.css + shared.css，不要 <link> 外链 -->
<style>/* ... */</style>
</head>
<body>
<div id="app"></div>
<script>/* ... 路由 + 渲染 + mock 数据 ... */</script>
</body>
</html>
```

**零外部请求**是硬约束：不许 `<link href="https://...">`、不许 `<script src="https://...">`、不许 `@import url(...)`。
图标一律内联 SVG。字体用系统栈：

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
             "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

---

## 二、路由约定

hash 路由，**同级页面平铺，不嵌套超过两层**：

| 形式 | 例子 | 说明 |
|---|---|---|
| 列表 | `#/orders` | 首页，不带参数 |
| 新建 | `#/orders/new` | 用 `new` 而不是 `:id=new` |
| 详情 | `#/orders/:id` | 参数用 `:id` 占位，匹配时取值 |
| 子页 | `#/orders/:id/history` | 最多两层 |

**规则**：

1. 默认路由必须是**核心动作的起点**，不是空白首页
2. 侧边栏导航根据当前路由高亮，`:id` 这类动态段用前缀匹配
3. 详情优先用**抽屉/弹窗**（不改路由），只有内容多到需要独立滚动才用整页
4. 浏览器后退必须能正常工作（`hashchange` 监听，别用手动 onclick 拼路由）

---

## 三、追溯契约（本 skill 的核心差异）

功能清单的 `F-xx` 直接映射到 DOM 属性：

```html
<button data-req="F-02" data-action="open-create">新建工单</button>
<table data-req="F-01">...</table>
```

规则：

1. 每个**可交互元素**（按钮、链接、输入、tab、筛选器）必须带 `data-req`
2. 一个元素只挂一个 req id（挂多个说明功能边界没想清）
3. 纯展示元素（标题、分隔线）不挂 `data-req`

### `#req-map`：功能清单内嵌进原型

功能清单不单独出文件，而是作为 JSON 嵌在原型里，让追溯**自包含**：

```html
<script type="application/json" id="req-map">
[
  {"id":"F-01","name":"工单列表","pri":"P0","route":"#/orders","src":"PRD §3.1"},
  {"id":"F-02","name":"新建工单","pri":"P0","route":"#/orders/new","src":"PRD §3.2"},
  {"id":"F-03","name":"工单详情","pri":"P0","route":"#/orders/:id","src":"PRD §3.3"},
  {"id":"F-04","name":"批量关闭","pri":"P2","route":"#/orders","src":"推断"}
]
</script>
```

- `src` 字段记录出处（`PRD §x.x` / `推断` / `描述`），评审时能反查回原文
- 这份 JSON 是校验器的输入，也是**评审模式的唯一数据源**

### 评审模式

按 `Shift+?` 或点右下角「评审」按钮打开侧栏，用 `#req-map` 逐条比对 DOM：

| 状态 | 含义 |
|---|---|
| ✅ 绿 | 该 `F-xx` 在 DOM 中命中 ≥1 个元素 |
| ⚠️ 黄 | P2 条目 0 命中（允许，但显式标出） |
| ❌ 红 | P0/P1 条目 0 命中（真缺失） |
| 🔍 蓝 | DOM 里存在 `#req-map` 没有的 `data-req`（做了没写） |

这让「需求写了但原型没做」和「原型做了但需求没写」两种情况都能被一眼发现。

---

## 四、交互原语（只用这 6 种，不自己发明）

| 原语 | 触发 | 实现要求 |
|---|---|---|
| 页面跳转 | 点击导航/链接 | 改 `location.hash`，不 reload |
| 抽屉 | 点击行/详情按钮 | 右侧滑入，带遮罩，ESC 和点遮罩关闭 |
| 弹窗 | 新建/确认 | 居中，focus trap，ESC 关闭 |
| Toast | 提交成功/失败 | 右下角，3 秒自动消失，同时最多 1 条 |
| 表单校验 | 提交时 | 错误显示在字段下方，不弹 alert |
| 加载态 | 首次进入有数据的页面 | 骨架屏 300-500ms 后出数据 |

**禁止**：`alert()`、`confirm()`、`prompt()`、新开窗口、外部跳转。

### 只在弹窗/抽屉里出现的功能，必须登记 PROBES

评审模式（`Shift+?`）统计覆盖率的原理是扫 DOM。**弹窗是点击后才挂载的**，路由渲染扫不到，
于是「只存在于弹窗里的需求」会被误判成没做。凡是这类需求，在模块里声明：

```js
// 列出"打开后会渲染出 target 元素"的操作，评审模式会依次执行再统计
const PROBES = [
  () => openCreateModal(),
  () => openAssignModal(),
];
```

模板会逐个调用、扫**全部**弹层容器、然后自动关闭。不登记就会出现「代码里明明写了，
评审面板却标红」——这是最常见的假阴性来源。

---

## 五、状态实现要求

每页至少实现「正常 + 一个异常」，异常优先选空态：

```js
// 用 URL 参数切状态，方便演示时直接跳到异常态
// #/orders?state=empty  → 空态
// #/orders?state=error   → 错误态
```

这样评审时可以直接甩链接：「这是空态」「这是后端挂了的样子」。
默认无参数时走正常态，且正常态的 mock 数据必须 ≥ 5 行，看起来像在用的系统。

---

## 六、校验规则表

`scripts/validate.mjs` 逐条检查，输出 `error` / `warn`：

### error 级（有一条就不许交付）

| 规则名 | 检查内容 |
|---|---|
| `external-request` | `<link href>` / `<script src>` / `<img src>` / `@import` / CSS `url()` 指向 `http(s)://` 或 `//`。`<a href="http...">` 也算 |
| `network-call` | 出现 `fetch(` / `XMLHttpRequest` / `axios` —— 原型不该发真实请求 |
| `no-hash-routing` | 全文既无 `hashchange` 也无 `location.hash` |
| `single-route` | 路由数 < 2，说明还是单页堆 section |
| `missing-req-attr` | `<button>` / `<a href>` / `<input>` / `<select>` / `<textarea>` 缺 `data-req`（`type="hidden"` 除外） |
| `missing-req-map` | 没有 `<script id="req-map">` 或内容是空数组 |
| `invalid-req-map` | `#req-map` JSON 解析失败 / 不是数组 / 元素缺 `id` |
| `orphan-req` | DOM 里的 `data-req` 值在 `#req-map` 里找不到 —— 做了需求没写 |
| `missing-p0` | P0 条目在 DOM 里 0 命中 —— 必需功能没实现 |
| `blocking-dialog` | 用了 `alert(` / `confirm(` / `prompt(` |

### warn 级（要在交付说明里交代）

| 规则名 | 检查内容 |
|---|---|
| `no-abnormal-state` | 未出现 `state=empty` 也没 `state=error` |
| `missing-p1` / `missing-p2` | P1 / P2 条目 0 命中 |
| `placeholder-data` | 出现 `lorem ipsum` / `张三` / `TODO` / `xxx` / `test123` |
| `too-many-pages` | 路由数 > 8，建议拆批 |
| `file-too-large` | 文件 > 400KB |
| `long-inline-data` | 单行 `base64,` 超 5000 字符 —— 别塞大图 |

所有引号内的 URL 判断前**先剥 HTML 注释和 JS/CSS 注释**，避免注释里的 `http://` 误报。

### 豁免：`data-no-req`

纯 UI 操作（关闭图标、logo、面包屑分隔）不对应任何需求，加 `data-no-req` 跳过检查。
**不要为了消 error 硬编一个 req id** —— 那会污染追溯。

### 调用方式

```bash
node scripts/validate.mjs <file.html>            # 人读
node scripts/validate.mjs <file.html> --json     # 机读
node scripts/validate.mjs <file.html> --strict   # warn 也算失败
```

退出码：`0` 通过 / `1` 有 error / `2` 参数或文件错误。

---

## 七、性能与体积

- 目标 < 200KB（纯 HTML+CSS+JS，不塞 base64 大图）
- 需要插图时用**内联 SVG 几何图形**，不要 base64 位图
- 列表超过 50 行时只渲染前 50 条 + "显示更多"，避免原型卡顿
- 不用任何框架（无 React/Vue），原生 DOM 即可——这是**原型**不是产品
