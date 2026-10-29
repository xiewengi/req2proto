# req2proto

把一个 PRD 或一句话需求描述，变成**能点、能走流程的单文件 HTML 多页原型**。

给 AI Agent 用的 skill。装上就能用，不需要配任何 API key。

```
输入：一份 PRD / 一段需求描述 / 一张线框图
输出：一个 .html 文件 —— 双击就开，页间真跳转，不联网
```

> 它不写 PRD。PRD 是输入，这个 skill 只做「需求 → 原型」这一段。

---

## 为什么值得用

| 常见做法 | req2proto |
|---|---|
| 让 AI 吐一大段 HTML，打开发现按钮点不动 | 哈希路由 + `hashchange`，每个按钮都能点，浏览器后退键可用 |
| 组件样式每次都不一样，像半成品 | 内置设计系统（8 行业主题 + 40 多种控件），不临场造样式 |
| 做出来的东西跟需求对不上，说不清哪条没做 | 每个可交互元素挂 `data-req`，页面内 `Shift+?` 看覆盖报告：哪条需求没落地一目了然 |
| 要装依赖、起服务、连 CDN | 零依赖零请求，`file://` 直接打开，发微信/投屏都能用 |
| 生成的页面配色对比度不够，看不清 | 内置 WCAG AA 校验，8 套主题全部 ≥4.5:1 |

## 快速开始

把整个目录放到你的 Agent 能读到的地方（见下方「安装」），然后：

```
按这份 PRD 出个原型
```

或一句话：

```
做一个工单系统原型，客服能看列表、改状态、加备注
```

Agent 会读 `SKILL.md`，走完「分流 → 澄清 → 功能清单 → 生成 → 校验 → 交付」，最后给你一个 `.html`。

## 亮点：需求追溯

每个可交互元素带着需求编号：

```html
<button data-req="F-03" onclick="openAssignModal()">分配任务</button>
```

页面里按 <kbd>Shift</kbd>+<kbd>?</kbd> 打开评审模式：

- 🟢 绿色 = 这条需求有对应实现
- 🟡 琥珀 = P2 未实现
- 🔴 红色 = P0/P1 未实现
- 🔵 蓝色 = 有元素但需求表里没这条（孤儿元素）

再加一层脚本校验：

```bash
node scripts/validate.mjs out/feature/feature.html
```

会硬性检查外部请求、路由缺失、需求覆盖、对话框阻塞等 10 类问题，并给出**可自动修的明细**。

## 两份组件参考

| 文件 | 风格 | 什么时候看 |
|---|---|---|
| `assets/components.html` | 自有设计语言，22 个组件，配 8 套主题 | 默认；要品牌感、C 端 |
| `assets/components-antd.html` | Ant Design 5 风格，33 个组件，含暗色 | PRD 提到 antd，或后台系统密集表格表单 |

两个都是**单文件、零外部请求**，浏览器直接打开，可切主题/暗色。里面的每个组件都带各状态（正常/悬停/禁用/错误/加载/空态），照着抄就行。

## 包含什么

```
SKILL.md                    主指令（Agent 首屏只读这个）
references/
  html-contract.md          HTML 结构契约 + 校验规则表
  theme-guide.md            8 套行业主题怎么选 + 反例
  review-checklist.md       无 shell 时的人工自查清单
assets/
  theme.css                 8 套主题 token
  shared.css                组件样式（全部走 CSS 变量）
  template.html             原型骨架（路由/抽屉/弹窗/Toast/评审模式）
  components.html           组件速查（自有语言）
  components-antd.html      组件速查（antd 风格）
  theme-preview.html        8 套主题并排预览
examples/
  ticket-system.html        完整可跑参考实现（validate 0 error）
scripts/
  validate.mjs              硬校验器（零依赖）
  build-prototype.mjs       多页原型：源码目录 → 单文件
  build-example.mjs         examples/ 构建
  build-components.mjs      组件速查页构建
  build-components-antd.mjs antd 组件页构建
  build-preview.mjs         主题预览构建
  check-contrast.mjs        配色对比度检查 + 建议值
  batch.mjs                 BYOK 批量生成（CI 用，可选）
```

## 安装

<details>
<summary>Claude Code / 兼容 Agent</summary>

```bash
git clone https://github.com/xiewengi/req2proto.git ~/.claude/skills/req2proto
```
</details>

<details>
<summary>DeepSeek Harness</summary>

```bash
git clone https://github.com/xiewengi/req2proto.git ~/.dsh/skills/req2proto
```
</details>

<details>
<summary>Cursor / 其他</summary>

克隆到项目里，在规则文件（`.cursorrules` 等）中加一行：

```
需要做原型时，读 req2proto/SKILL.md 并按其流程执行。
```
</details>

## 环境要求

| 用途 | 需要 |
|---|---|
| 基本使用 | 无。Agent 读 `SKILL.md` 就能干活 |
| 跑校验器 | Node.js ≥ 18（只用 `node:*` 内置模块，不装任何包） |
| 批量生成 | 可选。一个 OpenAI 兼容的 API key（`scripts/batch.mjs`） |

## 适用与不适用

**适合**

- 需求评审前先做个能点的东西对齐理解
- 给客户/领导演示交互流程
- 投标、方案里的原型附件
- 把 PRD 快速具象化，发现描述里的坑

**不适合**

- 要接真实后端的生产系统（这是原型，数据全在前端）
- 高保真视觉稿（要像素级还原请用 Figma）
- 复杂图表/地图/富文本编辑（这些要真库，单文件约束下做不好）

## 设计取向

单文件、零外部请求是**硬约束**，不是偏好。理由是原型要能在没有网络的会议室、微信里、别人的电脑上打开。

代价是：不能用 CDN 上的图表库、图标库、UI 框架。所有东西内联，图标用内联 SVG，样式用 CSS 变量。这份约束换来的是一句话——**发给谁都能马上打开**。

## License

MIT
