---
name: req2proto
description: 把一份 PRD 或一句话需求描述，变成「能点、能走流程的单文件 HTML 多页原型」。输入是 PRD/描述，输出只有原型——不写 PRD。当用户说"把这个需求做成原型 / 按这份 PRD 出原型 / 出个能点的页面 / 画个可交互 demo / 一句话做个原型"时使用。
---

# PRD / 需求描述 → 可交互原型

**输入**：一份 PRD（Markdown/文档/粘贴文本）**或**一句话需求描述
**输出**：一个 `<feature>.html` —— 单文件零依赖多页原型，双击就开，页间真跳转

不产出 PRD。PRD 是你的输入，本 skill 只做「需求 → 原型」这一段。
不依赖任何模型 API：生成由宿主 Agent 完成，本 skill 只提供**结构契约 + 设计系统 + 校验器**。
**装上来就能用，不需要配 key。**

---

## 0. 宿主能力映射（开工前先读，决定怎么干）

本文件**不写死任何工具名**。先把手上的能力映射成下表左列，再按右列决定执行方式：

| 能力 | 具备时 | 不具备时（降级路径） |
|---|---|---|
| 读取本 skill 目录下的文件 | 按需读 `references/` `assets/` | 只用本文件内的约定，信息量少但可用 |
| 写入文件到磁盘 | 按 `out/<feature>/<feature>.html` 落盘 | 把完整内容输出到对话，末尾提示"复制另存为 xxx.html" |
| 执行 shell 命令 | 跑 `node scripts/validate.mjs` 硬校验并自动修 | 按 `references/review-checklist.md` 人工逐条核对 |
| 渲染/截图查看页面 | 生成后自动截图自检 | 跳过视觉自检，在交付说明里标注"未做视觉验证" |
| 向用户提问 | 只问 Step 2 里的 3 个关键问题 | 按行业惯例给默认值，在交付说明的「假设」里列出来 |

**任何一项缺失都不是阻塞项**——降级执行，并在交付说明里一句话写清降级了什么。

---

## 1. 输入分流（Step 1，先判断手里是什么）

| 输入类型 | 特征 | 处理方式 |
|---|---|---|
| **A. 结构化 PRD** | 有功能清单/表格/验收标准/章节编号 | 直接抽取功能条目，**保留原编号**；原有 `F-xx` 就沿用，没有就按出现顺序编号 |
| **B. 散装需求文档** | 一段段文字，有功能描述但没清单 | 先归纳成功能条目再动手，**归纳结果回读给用户确认**（一句话列出，不写文档） |
| **C. 一句话描述** | 一行到一段 | 走 Step 2 澄清 → 产出功能清单快照 → 直接生成 |
| **D. 图/截图/线框** | 图片输入 | 先描述你看到的结构给用户确认，再抽功能条目 |

**PRD 里有但明显做不了的**（要真实后端、要第三方服务、要 100 页），不要静默跳过——列进交付说明的「未实现」。

---

## 2. 需求澄清（最多 3 个问题）

**能从 PRD / 上下文推断就绝对不要问。** 只有类型 C/D 或 PRD 关键信息缺失时才问，且只问这 3 个：

1. **谁用**：主角色是谁（决定首屏放什么）
2. **核心动作**：用户进来要完成的那一件最主要的事（决定默认路由）
3. **边界**：这次明确「不做什么」（防发散）

推断不出来的项按行业惯例补默认值，**记进交付说明的「假设」**，不要为了问而问，也不要静默替用户拍板。

---

## 3. 功能清单快照（内部产物，不交付成文件）

动手前先在**对话里**列一张紧凑的表，作为原型的追溯基线：

```
F-01 工单列表       P0  #/orders        ← PRD §3.1
F-02 新建工单       P0  #/orders/new    ← PRD §3.2
F-03 工单详情       P0  #/orders/:id    ← PRD §3.3
F-04 批量关闭       P2  #/orders        ← 推断，PRD 未提
```

- `F-xx` 是**原型的锚点**，会被 HTML 里的 `data-req` 直接引用
- 最后一列标来源：`PRD §x.x` / `推断` / `描述`
- **P0 必做，P1 尽量做，P2 可只做禁用态**——但都要在表里出现
- 这张表最终会**内嵌进 HTML**（见 `html-contract.md` 的 `#req-map`），所以追溯是自包含的，不需要额外文件

用户给了 PRD 但没编号时，你编的号要能反查回原文位置，别让评审时找不到出处。

---

## 4. 生成原型（Step 4）

**硬约束（违反任何一条 = 不合格）**：

| # | 约束 | 原因 |
|---|---|---|
| 1 | **单个 .html 文件**，CSS/JS 内联 | 发给非技术同事能直接双击打开 |
| 2 | **零外部请求**：禁止 CDN 字体/图标/JS/图片 | 客户会议室断网不能变白板 |
| 3 | **hash 路由多页**：`#/orders` `#/orders/:id` | 真的能走流程，不是一屏堆 section |
| 4 | **每个可交互元素带 `data-req`** | 和功能清单双向追溯 |
| 5 | **状态齐全**：每页至少实现正常态 + 一个异常态 | 只画 happy path 的原型没法评审 |
| 6 | **中文界面**，除非用户明确要英文 | —— |

结构契约、路由规则、6 种交互原语、`data-req` / `#req-map` 细节见 [references/html-contract.md](references/html-contract.md)。

**现成的三块料，直接用，别从零写**：

| 文件 | 怎么用 |
|---|---|
| `assets/theme.css` | 原样内联进 `<style>`。8 套主题靠 `<html data-theme="...">` 切，选主题见 [references/theme-guide.md](references/theme-guide.md) |
| `assets/shared.css` | 原样内联。22 个组件的样式全在这，**不要临场造样式、不要写 hex** |
| `assets/template.html` | 原型骨架（外壳 + 路由 + 抽屉/弹窗/Toast + 评审模式）。`{{VIEWS}}` `{{REQ_MAP}}` `{{ROUTES}}` 等占位符替换成你的内容 |

`assets/components.html` 是组件速查页——不确定某个组件长什么样、有哪些状态，浏览器打开看，可实时切 8 主题和暗色。

**两套视觉语言，选一套用，不要混：**

| 参考页 | 风格 | 什么时候用 |
|---|---|---|
| `assets/components.html` | 自有设计语言，22 个组件，配 `assets/theme.css` 的 8 套主题 | 默认。产品要品牌感、C 端、或 PRD 没指定设计体系 |
| `assets/components-antd.html` | Ant Design 5 风格，33 个组件（多出日期选择器/树形/级联/穿梭框/描述列表/时间轴/结果页/气泡确认/统计数值等 19 个），含暗色 | PRD 提到 antd、团队本来就用 antd、或后台系统以密集表格和表单为主 |

antd 那份用的是自己的 token（`--a-*`，主色 #1677ff / 圆角 6px / 14px 基准），**不复用 `theme.css`**——两套体系硬混会互相覆盖。用它的时候，组件样式从 `components-antd.html` 的 CSS 里挑对应片段，不要另造。

**缺组件时**：两份参考页合起来覆盖 40+ 种控件。真遇到都没有的（如甘特图、看板拖拽），先判断是不是能用已有的组合出来（表格 + 进度条 ≈ 甘特），不行才手写，且必须用 CSS 变量而非硬编码 hex。

**完整可跑的参考实现**：`examples/ticket-system.html`（工单系统，3 页 + 空/错/骨架态，11 条需求全覆盖，validate 0 error）。拿不准结构就照着它的骨架改。

### 复杂原型：分文件写，用脚本拼

单文件 HTML 手写超过 5 页就会失控（几百行字符串拼接，改一处要重写全篇）。
页数多或要反复迭代时，拆成源码目录，用 `scripts/build-prototype.mjs` 拼：

```bash
node scripts/build-prototype.mjs out/<feature>/src -o out/<feature>/<feature>.html
```

`src/` 下放这些（除前两个外都可省）：

| 文件 | 内容 |
|---|---|
| `meta.json` | `{ "theme":"gov", "product":"标讯助手", "initial":"标", "home":"notices" }` |
| `req-map.json` | 功能清单，`[{ id, name, pri, route, src }]`，每条 pri 必须 P0/P1/P2 |
| `data.js` / `views.js` / `routes.js` | 模拟数据、视图函数、路由表 |
| `nav.html` / `custom.css` | 侧边栏导航、本原型特有样式 |

脚本会做 4 件事：剥掉 `const DB =` 之类的冗余前缀并**语法检查**、断言 11 个占位符全部命中、
把生成物里的内联脚本再查一遍、最后自动跑 `validate.mjs`。任何一步失败直接退出，不会产出坏文件。

可以直接抄的样例：[examples/ticket-system.html](examples/ticket-system.html) 是完整可跑的单页参考实现
（工单系统，3 页 + 空/错/骨架态，11 条需求全覆盖，validate 0 error）。拿不准结构照着它的骨架改。

页数多到需要拆文件时，再按上面 `src/` 的约定组织源码目录。

### 用模板拼装时的两个坑

> 用上面的脚本就自动规避了；手写拼接时才会遇到。

| 坑 | 现象 | 正确做法 |
|---|---|---|
| 占位符被注入了两次 | 页面卡在「加载中」，控制台 `Unexpected token 'const'` | 模板头部注释里不要写带花括号的占位符名；替换后断言代码块占位符恰好命中 1 次 |
| 弹窗里的功能评审模式标红 | 代码写了，`Shift+?` 面板却显示未实现 | 声明 `PROBES = [() => openXxxModal()]`，模板会执行后扫全部弹层再统计。详见 [references/html-contract.md](references/html-contract.md) §四 |

`{{REQ_MAP}}` 是 `<script type="application/json">` 的内容，**不是** JS 变量，别写成 `const REQ_MAP = ...`。

---

## 5. 硬校验（Step 5，这一步是分水岭）

```bash
node <SKILL>/scripts/validate.mjs out/<feature>/<feature>.html            # 人读
node <SKILL>/scripts/validate.mjs out/<feature>/<feature>.html --json     # 机读
node <SKILL>/scripts/validate.mjs out/<feature>/<feature>.html --strict   # warn 也算失败
```

零依赖（无需 npm install），退出码：`0` 通过 / `1` 有 error / `2` 参数或文件错误。

**只要有一条 error 就必须修完再交付**，不许"大致符合"。它会查的 9 类 error：
外部请求、无 hash 路由、单路由、缺 `data-req`、缺/坏 `#req-map`、孤儿 req、P0 零命中、阻塞式弹窗。

纯 UI 操作（关闭图标、logo 这类不对应需求的）加 `data-no-req` 豁免，不要为凑数硬编 req。

warn 可以选择性忽略，但要在交付说明里写出来。

规则表见 [references/html-contract.md](references/html-contract.md) 第六节。

---

## 6. 交付（Step 6）

交付说明固定四段，一段不超过三行：

```
## 产出
- 原型：<路径>（<k> 个页面，双击打开）
- 入口：默认落在 <路由>，建议按 <A → B → C> 走一遍

## 覆盖
已实现 <x> 条功能（P0 全做 / P1 做了 m 条）；未实现：<列表 + 原因>
状态：正常态 x 页 / 空态 x / 错误态 x —— 按 Shift+? 可开评审模式，看需求逐条命中情况

## 校验
validate.mjs：0 error / <n> warn（warn 说明：…）

## 假设
<没问就替用户决定的，1-3 条；没有就写"无">
```

---

## 7. 输出目录约定

```
out/<feature>/
└── <feature>.html        # 单文件多页原型（唯一交付物）
```

- `<feature>` 小写 kebab-case，如 `ticket-system`、`asset-inventory`
- 用户已有目录约定时**优先服从用户的**，不要另起一套
- 覆盖前先确认文件是否存在；存在就问「覆盖 / 另存 v2」

---

## 8. 渐进披露（别一次性全读进来）

| 什么时候读 | 读哪个 |
|---|---|
| 写 HTML 前 | [references/html-contract.md](references/html-contract.md) + `assets/template.html` |
| 不确定主题怎么选 | [references/theme-guide.md](references/theme-guide.md)（8 行业主题 + 反例） |
| 选组件/不确定长什么样 | `assets/components.html`（自有语言，22 组件，8 主题/暗色）；PRD 提 antd 或后台密集表单 → `assets/components-antd.html`（antd 5 风格，33 组件，含暗色） |
| 想抄一个完整可跑的 | `examples/ticket-system.html`（validate 0 error 的参考实现） |
| 校验失败看不懂 | `html-contract.md` 第六节校验规则表 |
| 交付前自查（无 shell 时必读） | [references/review-checklist.md](references/review-checklist.md) |

**首屏只读本文件就够了。** 上面这些按需取，不占上下文。

---

## 9. 可选增强：批量生成（唯一需要 BYOK 的地方）

单次生成**永远不需要 key**——宿主 Agent 本身就是模型。

只有一种场景需要配 key：**脱离对话批量跑**（一次生成 20 个页面，或接进 CI）。
走 OpenAI 兼容协议，火山 Agent-Plan / DeepSeek / Ollama / vLLM 都通吃：

```bash
export OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
export OPENAI_API_KEY=<你的 key>
node scripts/batch.mjs --input prds/ --out out/
```

**明确写死这条判断**：宿主能直接生成时**不要**用脚本，脚本只服务批量和 CI。
这样 Claude Code 的用户装完零配置，想批量跑的人才去配 key。

---

## 10. 反面清单（这些是踩过的坑）

| ❌ 别这么做 | ✅ 应该这样 |
|---|---|
| 顺手把 PRD 也写出来 | PRD 是输入，产物只有 HTML |
| 一屏堆 6 个 section 当多页 | hash 路由切页，导航高亮跟着走 |
| 引 Google Fonts / Font Awesome | 系统字体栈 + 内联 SVG 图标 |
| 只画 happy path | 每页至少一个空态或错误态 |
| 元素不带 `data-req` | 每个可交互元素挂 req id |
| 写"点击这里跳转详情"这种文字说明 | 直接做成能点的 |
| `lorem ipsum` 占位 | 真实业务语义假数据（订单号、人名、金额） |
| 交付时不跑校验 | validate 0 error 才算完成 |
| 自己造一套配色 | 用 `assets/theme.css` 的 token |
| PRD 里做不了的静默跳过 | 列进「未实现 + 原因」 |

---

## 11. 安装（给其他 Agent 用）

**纯文件型**，无构建、无依赖、无 key：

| 宿主 | 放哪 |
|---|---|
| DSH | `~/.dsh/skills/req2proto/` 或项目内 `.dsh/skills/` |
| Claude Code | `.claude/skills/req2proto/` 或 `~/.claude/skills/` |
| Codex | `.codex/skills/req2proto/` 或 `~/.codex/skills/` |
| Cursor | `.cursor/skills/req2proto/` 或用户级 skills 目录 |

放进去就生效。项目级优先于用户级。
