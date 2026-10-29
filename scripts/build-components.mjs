#!/usr/bin/env node
/**
 * build-components.mjs — 生成组件库速查页
 * 用法: node scripts/build-components.mjs
 * 输出: assets/components.html —— 单文件，16 组件 × 状态 + 8 主题实时切换
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const themeCss = readFileSync(join(ROOT, 'assets/theme.css'), 'utf8');
const sharedCss = readFileSync(join(ROOT, 'assets/shared.css'), 'utf8');

const THEMES = [
  ['saas', 'SaaS 靛蓝'], ['medical', '医疗青绿'], ['gov', '政企正蓝'], ['finance', '金融藏青'],
  ['education', '教育墨橙'], ['ecommerce', '电商玫红'], ['data', '数据深青'], ['life', '生活陶土'],
];

const ICON = {
  plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
  search: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14l2 7v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>',
};

/* 一个组件区块：标题 + 说明 + 类名 + 状态矩阵 */
const block = ({ id, name, desc, api, states, note }) => `
<section class="cmp" id="cmp-${id}">
  <header class="cmp__head">
    <div class="cmp__title-wrap">
      <h2 class="cmp__title">${name}</h2>
      <code class="cmp__api">${api}</code>
    </div>
    <p class="cmp__desc">${desc}${note ? ` <span class="cmp__note">${note}</span>` : ''}</p>
  </header>
  <div class="cmp__grid" style="--cols:${states.length}">
    ${states.map(s => `
    <div class="cmp__cell">
      <span class="cmp__label">${s.label}</span>
      <div class="cmp__demo">${s.html}</div>
    </div>`).join('')}
  </div>
</section>`;

const COMPONENTS = [
  {
    id: 'button', name: '按钮', api: '.btn + .btn--primary / --secondary / --ghost / --danger',
    desc: '主操作一屏最多 1 个主按钮。',
    note: '规格：高 36px（sm 28 / lg 44），圆角 10px',
    states: [
      { label: '主要', html: `<button class="btn btn--primary">新建工单</button>` },
      { label: '次要', html: `<button class="btn btn--secondary">导出</button>` },
      { label: '幽灵', html: `<button class="btn btn--ghost">取消</button>` },
      { label: '危险', html: `<button class="btn btn--danger">删除</button>` },
      { label: '禁用', html: `<button class="btn btn--primary" disabled>不可用</button>` },
      { label: '加载', html: `<button class="btn btn--primary btn--loading">提交中</button>` },
    ],
  },
  {
    id: 'size', name: '按钮尺寸', api: '.btn--sm / 默认 / .btn--lg',
    desc: '按场景选尺寸，不要在同一条操作栏里混用三种。',
    states: [
      { label: 'sm · 28px', html: `<button class="btn btn--primary btn--sm">小按钮</button>` },
      { label: 'default · 36px', html: `<button class="btn btn--primary">默认按钮</button>` },
      { label: 'lg · 44px', html: `<button class="btn btn--primary btn--lg">大按钮</button>` },
    ],
  },
  {
    id: 'input', name: '输入框', api: '.field > .field__label + .input + .field__error',
    desc: '错误提示显示在字段下方，禁止 alert。',
    note: '必填项在 label 后加 <span class="req">*</span>',
    states: [
      { label: '常态', html: `<div class="field"><label class="field__label">工单标题<span class="req">*</span></label><input class="input" placeholder="请输入标题"></div>` },
      { label: '已填', html: `<div class="field"><label class="field__label">工单标题</label><input class="input" value="系统升级申请"></div>` },
      { label: '错误', html: `<div class="field has-error"><label class="field__label">工单标题</label><input class="input" aria-invalid="true" value=""><p class="field__error">标题不能为空</p></div>` },
      { label: '禁用', html: `<div class="field"><label class="field__label">工单编号</label><input class="input" value="TK-20261029-001" disabled></div>` },
    ],
  },
  {
    id: 'select', name: '选择器', api: '.select / .textarea',
    desc: '选项 ≤ 5 个用单选按钮组，≥ 6 个用下拉。',
    states: [
      { label: '下拉', html: `<div class="field"><label class="field__label">状态</label><select class="select"><option>待处理</option><option>处理中</option><option>已关闭</option></select></div>` },
      { label: '多行文本', html: `<div class="field"><label class="field__label">问题描述</label><textarea class="textarea" placeholder="请描述具体问题"></textarea></div>` },
    ],
  },
  {
    id: 'badge', name: '标签 / 徽章', api: '.badge + --success / --warning / --danger / --info / --brand',
    desc: '语义色固定，不随主题变化。',
    states: [
      { label: '成功', html: `<span class="badge badge--success"><i class="dot"></i>已完成</span>` },
      { label: '警告', html: `<span class="badge badge--warning"><i class="dot"></i>处理中</span>` },
      { label: '危险', html: `<span class="badge badge--danger"><i class="dot"></i>已驳回</span>` },
      { label: '信息', html: `<span class="badge badge--info"><i class="dot"></i>草稿</span>` },
      { label: '品牌', html: `<span class="badge badge--brand">P0</span>` },
      { label: '默认', html: `<span class="badge">P2</span>` },
    ],
  },
  {
    id: 'table', name: '表格', api: '.table / .table__num',
    desc: '数字列右对齐并用等宽数字；空态不显示空表格，用 .state 替代。',
    states: [
      {
        label: '正常',
        html: `<table class="table"><thead><tr><th>编号</th><th>名称</th><th>状态</th><th class="table__num">金额</th></tr></thead><tbody>
<tr><td class="mono">TK-20261029-001</td><td>系统升级申请</td><td><span class="badge badge--success"><i class="dot"></i>已完成</span></td><td class="table__num">1,280.00</td></tr>
<tr><td class="mono">TK-20261029-002</td><td>权限变更</td><td><span class="badge badge--warning"><i class="dot"></i>处理中</span></td><td class="table__num">860.00</td></tr>
</tbody></table>`,
      },
    ],
  },
  {
    id: 'state', name: '空态 / 错误态', api: '.state / .state--error',
    desc: '空态必须有引导文案 + 一个动作按钮。错误态要说明原因 + 给重试路径。',
    note: '每页至少实现「正常 + 一个异常」',
    states: [
      { label: '空态', html: `<div class="state"><div class="state__icon">${ICON.inbox}</div><h3 class="state__title">还没有工单</h3><p class="state__desc">创建第一张工单，开始跟踪处理进度</p><button class="btn btn--primary btn--sm">新建工单</button></div>` },
      { label: '错误态', html: `<div class="state state--error"><div class="state__icon">${ICON.alert}</div><h3 class="state__title">加载失败</h3><p class="state__desc">网络连接异常，请稍后重试</p><button class="btn btn--secondary btn--sm">重新加载</button></div>` },
    ],
  },
  {
    id: 'skeleton', name: '骨架屏', api: '.skeleton',
    desc: '首次进入有数据的页面时显示，300-500ms 后出数据。',
    states: [
      { label: '列表骨架', html: `<div style="display:grid;gap:10px;width:100%"><div class="skeleton" style="width:60%"></div><div class="skeleton" style="width:85%"></div><div class="skeleton" style="width:45%"></div><div class="skeleton" style="width:70%"></div></div>` },
    ],
  },
  {
    id: 'card', name: '卡片', api: '.card / .card--flush / .card__header / .card__body',
    desc: '卡片是内容容器，不是装饰。不要嵌套超过两层。',
    states: [
      { label: '标准卡片', html: `<div class="card" style="width:100%"><h3 class="card__title" style="margin-bottom:8px">本月统计</h3><p class="muted" style="margin:0;font-size:13px">共处理 1,284 张工单，平均响应 2.4 小时</p></div>` },
      { label: '带头部', html: `<div class="card card--flush" style="width:100%"><div class="card__header"><h3 class="card__title">最近活动</h3></div><div class="card__body" style="padding:12px 16px"><p class="muted" style="margin:0;font-size:13px">2 分钟前 · 张明 提交了 TK-20261029-003</p></div></div>` },
    ],
  },
  {
    id: 'tabs', name: '标签页', api: '.tabs / .tab[aria-selected]',
    desc: '切换不改路由时用 Tabs；改路由用导航。',
    states: [
      { label: '三个 Tab', html: `<div class="tabs" style="width:100%"><button class="tab" aria-selected="true">全部</button><button class="tab" aria-selected="false">待处理</button><button class="tab" aria-selected="false">已关闭</button></div>` },
    ],
  },
  {
    id: 'pagination', name: '分页', api: '.pagination / .page-btn',
    desc: '少于 20 条不用分页。',
    states: [
      { label: '分页条', html: `<div class="pagination"><button class="page-btn" disabled>‹</button><button class="page-btn" aria-current="page">1</button><button class="page-btn">2</button><button class="page-btn">3</button><button class="page-btn">›</button></div>` },
    ],
  },
  {
    id: 'breadcrumb', name: '面包屑', api: '.breadcrumb',
    desc: '层级超过 2 层才需要。',
    states: [
      { label: '面包屑', html: `<nav class="breadcrumb"><a href="#">工单</a><span class="breadcrumb__sep">/</span><a href="#">TK-20261029-001</a><span class="breadcrumb__sep">/</span><span aria-current="page">处理记录</span></nav>` },
    ],
  },
  {
    id: 'avatar', name: '头像', api: '.avatar / .avatar--sm / .avatar--lg',
    desc: '无头像图时用姓名首字，不引外部图片。',
    states: [
      { label: 'sm', html: `<div class="avatar avatar--sm">张</div>` },
      { label: '默认', html: `<div class="avatar">李</div>` },
      { label: 'lg', html: `<div class="avatar avatar--lg">王</div>` },
    ],
  },
  {
    id: 'form-controls', name: '开关 / 勾选', api: '.switch / .checkbox / .radio',
    desc: '开关用于立即生效的设置；勾选用于表单提交。',
    states: [
      { label: '开关-关', html: `<button class="switch" role="switch" aria-checked="false" aria-label="启用通知"></button>` },
      { label: '开关-开', html: `<button class="switch" role="switch" aria-checked="true" aria-label="启用通知"></button>` },
      { label: '勾选', html: `<label class="row" style="font-size:13px"><input type="checkbox" class="checkbox" checked>记住我的选择</label>` },
      { label: '单选', html: `<label class="row" style="font-size:13px"><input type="radio" class="radio" name="r1" checked>按天汇总</label>` },
    ],
  },
  {
    id: 'alert', name: '提示条', api: '.alert + --info / --success / --warning / --danger',
    desc: '页内常驻提示。一次性反馈用 Toast。',
    states: [
      { label: '信息', html: `<div class="alert alert--info" style="width:100%">系统将于今晚 22:00 维护</div>` },
      { label: '警告', html: `<div class="alert alert--warning" style="width:100%">有 3 条工单已超时未处理</div>` },
      { label: '危险', html: `<div class="alert alert--danger" style="width:100%">删除后不可恢复，请谨慎操作</div>` },
    ],
  },
  {
    id: 'toast', name: 'Toast', api: '.toast-stack / .toast--success / .toast--danger',
    desc: '右下角，3 秒消失，同时最多 1 条。',
    states: [
      { label: '成功', html: `<div class="toast toast--success" style="position:static;animation:none">工单创建成功</div>` },
      { label: '失败', html: `<div class="toast toast--danger" style="position:static;animation:none">提交失败，请重试</div>` },
    ],
  },
  {
    id: 'steps', name: '步骤条', api: '.steps / .step.is-active / .is-done',
    desc: '流程 ≥ 3 步才需要。',
    states: [
      { label: '三步流程', html: `<div class="steps"><span class="step is-done"><i class="step__num">✓</i>填信息</span><span class="step__line"></span><span class="step is-active"><i class="step__num">2</i>确认</span><span class="step__line"></span><span class="step"><i class="step__num">3</i>完成</span></div>` },
    ],
  },
  {
    id: 'progress', name: '进度条', api: '.progress / .progress__bar',
    desc: '有明确总量的进度用进度条，无总量用骨架屏或 loading。',
    states: [
      { label: '45%', html: `<div class="progress" style="width:100%"><div class="progress__bar" style="width:45%"></div></div>` },
    ],
  },
  {
    id: 'list', name: '列表项', api: '.list / .list-item',
    desc: '比表格更松散的展示，适合活动流。',
    states: [
      {
        label: '活动流', html: `<div class="list" style="width:100%"><div class="list-item"><div class="avatar avatar--sm">张</div><div class="grow"><div style="font-size:13px">张明 提交了工单</div><div class="help-text">2 分钟前</div></div><span class="badge badge--warning">待处理</span></div><div class="list-item"><div class="avatar avatar--sm">李</div><div class="grow"><div style="font-size:13px">李华 关闭了工单</div><div class="help-text">18 分钟前</div></div><span class="badge badge--success">已完成</span></div></div>`,
      },
    ],
  },
  {
    id: 'toolbar', name: '工具栏 / 搜索', api: '.toolbar / .search',
    desc: '筛选器和操作按钮统一放工具栏，不要散落。',
    states: [
      {
        label: '组合', html: `<div class="toolbar" style="width:100%"><div class="search"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" stroke-linecap="round"/></svg><input class="input" placeholder="搜索工单编号或标题" style="width:220px"></div><select class="select" style="width:120px"><option>全部状态</option><option>待处理</option></select><span class="toolbar__spacer"></span><button class="btn btn--secondary btn--sm">导出</button><button class="btn btn--primary btn--sm">新建</button></div>`,
      },
    ],
  },
  {
    id: 'drawer', name: '抽屉', api: '.drawer / .drawer-mask / .drawer--open',
    desc: '详情优先用抽屉（不改路由）。ESC 和点遮罩都要能关。',
    note: '右下滑入 320ms，宽 520px',
    states: [
      {
        label: '打开态预览', html: `<div style="position:relative;width:100%;height:180px;background:var(--c-surface-2);border-radius:10px;overflow:hidden"><div class="drawer" style="position:absolute;width:200px;transform:none;box-shadow:none;border-left:1px solid var(--c-border)"><div class="drawer__header" style="padding:10px 12px"><h3 class="drawer__title" style="font-size:13px">工单详情</h3><button class="icon-btn">${ICON.close}</button></div><div class="drawer__body" style="padding:12px"><div class="skeleton" style="width:70%;margin-bottom:8px"></div><div class="skeleton" style="width:50%"></div></div></div></div>`,
      },
    ],
  },
  {
    id: 'modal', name: '弹窗', api: '.modal-mask / .modal / .is-open',
    desc: '新建 / 确认用弹窗。必须有 focus trap，ESC 关闭。',
    note: '居中 480px，圆角 18px',
    states: [
      {
        label: '打开态预览', html: `<div style="width:100%;height:200px;background:var(--c-surface-2);border-radius:10px;display:grid;place-items:center"><div class="modal" style="position:static;max-width:260px;transform:none;box-shadow:var(--shadow-md)"><div class="modal__header" style="padding:14px 14px 8px"><h3 class="modal__title" style="font-size:13px">新建工单</h3><button class="icon-btn">${ICON.close}</button></div><div class="modal__body" style="padding:0 14px 12px;gap:8px"><div class="field"><label class="field__label">标题</label><input class="input" placeholder="请输入"></div></div><div class="modal__footer" style="padding:10px 14px"><button class="btn btn--ghost btn--sm">取消</button><button class="btn btn--primary btn--sm">确定</button></div></div></div>`,
      },
    ],
  },
];

const nav = COMPONENTS.map(c => `<a class="side-link" href="#cmp-${c.id}">${c.name}</a>`).join('');
const themeOpts = THEMES.map(([id, name]) => `<option value="${id}">${name}</option>`).join('');

const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="saas">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>req2proto · 组件库速查</title>
<style>
${themeCss}
</style>
<style>
${sharedCss}
</style>
<style>
/* ===== 速查页自身布局（不进入原型） ===== */
body { padding: 0; }
.doc { display: flex; min-height: 100vh; }

.doc__side {
  position: sticky; top: 0;
  width: 210px; flex: 0 0 210px;
  height: 100vh; overflow-y: auto;
  padding: var(--s-5) var(--s-3);
  border-right: 1px solid var(--c-border);
  background: var(--c-surface);
}
.doc__side h1 { font-size: var(--f-lg); margin: 0 0 var(--s-1); padding: 0 var(--s-3); }
.doc__side p { font-size: var(--f-xs); color: var(--c-text-3); margin: 0 0 var(--s-5); padding: 0 var(--s-3); }

.side-link {
  display: block;
  padding: var(--s-2) var(--s-3);
  font-size: var(--f-sm);
  color: var(--c-text-2);
  text-decoration: none;
  border-radius: var(--r-sm);
  transition: background var(--dur-fast) var(--ease);
}
.side-link:hover { background: var(--c-surface-2); color: var(--c-text); }

.doc__main { flex: 1 1 auto; padding: var(--s-6); min-width: 0; }
.doc__top {
  display: flex; align-items: center; gap: var(--s-3); flex-wrap: wrap;
  padding-bottom: var(--s-5); margin-bottom: var(--s-6);
  border-bottom: 1px solid var(--c-border);
}
.doc__top h2 { margin: 0; font-size: var(--f-xl); }
.doc__top .grow { flex: 1 1 auto; }

.cmp {
  margin-bottom: var(--s-7);
  padding-bottom: var(--s-6);
  border-bottom: 1px solid var(--c-border);
}
.cmp:last-child { border-bottom: none; }
.cmp__head { margin-bottom: var(--s-4); }
.cmp__title-wrap { display: flex; align-items: baseline; gap: var(--s-3); flex-wrap: wrap; }
.cmp__title { font-size: var(--f-xl); margin: 0; }
.cmp__api {
  font-size: var(--f-xs);
  color: var(--c-brand-ink);
  background: var(--c-brand-soft);
  padding: 2px var(--s-2);
  border-radius: var(--r-sm);
  font-family: var(--font-mono);
}
.cmp__desc { margin: var(--s-2) 0 0; font-size: var(--f-sm); color: var(--c-text-2); }
.cmp__note { color: var(--c-text-3); }
.cmp__grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr));
  gap: var(--s-4);
  align-items: start;
}
@media (max-width: 900px) { .cmp__grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); } }
.cmp__cell {
  border: 1px dashed var(--c-border-strong);
  border-radius: var(--r-md);
  padding: var(--s-3);
  background: var(--c-surface);
  min-width: 0;
  overflow: hidden;
}
.cmp__label {
  display: block;
  font-size: var(--f-xs);
  color: var(--c-text-3);
  margin-bottom: var(--s-3);
  font-family: var(--font-mono);
}
.cmp__demo { display: flex; align-items: center; justify-content: center; min-height: 60px; flex-wrap: wrap; gap: var(--s-2); }
.cmp__demo > table { width: 100%; }
.cmp__demo > .field,
.cmp__demo > .search,
.cmp__demo > .toolbar { width: 100%; }
.cmp__demo > .state { width: 100%; padding: var(--s-5) var(--s-3); }
</style>
</head>
<body>
<div class="doc">
  <aside class="doc__side">
    <h1>组件库</h1>
    <p>req2proto · 22 组件</p>
    ${nav}
  </aside>

  <main class="doc__main">
    <div class="doc__top">
      <h2>组件速查</h2>
      <span class="badge badge--brand" id="cur-theme">saas</span>
      <span class="grow"></span>
      <label class="row" style="font-size:13px;color:var(--c-text-2)">
        主题
        <select class="select" id="theme-pick" style="width:150px">${themeOpts}</select>
      </label>
      <label class="row" style="font-size:13px;color:var(--c-text-2)">
        <input type="checkbox" class="checkbox" id="dark-pick"> 暗色
      </label>
      <label class="row" style="font-size:13px;color:var(--c-text-2)">
        <input type="checkbox" class="checkbox" id="rel-pick" checked> 真实路由
      </label>
    </div>

    ${COMPONENTS.map(block).join('\n')}

    <section class="cmp">
      <header class="cmp__head">
        <div class="cmp__title-wrap"><h2 class="cmp__title">设计 token</h2><code class="cmp__api">theme.css</code></div>
        <p class="cmp__desc">颜色全部来自这些变量，禁止在原型里临场写 hex。</p>
      </header>
      <div class="cmp__grid" style="--cols:4">
        ${['--c-brand', '--c-brand-ink', '--c-brand-soft', '--c-text', '--c-text-2', '--c-text-3', '--c-border', '--c-surface-2', '--c-success', '--c-warning', '--c-danger', '--c-info'].map(v => `
        <div class="cmp__cell">
          <span class="cmp__label">${v}</span>
          <div class="token"><span class="token__swatch" style="background:var(${v})"></span><code class="token__val" data-token="${v}"></code></div>
        </div>`).join('')}
      </div>
    </section>
  </main>
</div>

<script>
/* ---- 主题切换 ---- */
const root = document.documentElement;
const pick = document.getElementById('theme-pick');
const dark = document.getElementById('dark-pick');
const rel = document.getElementById('rel-pick');
const cur = document.getElementById('cur-theme');

const sync = () => {
  root.dataset.theme = pick.value;
  if (dark.checked) root.dataset.dark = '1'; else delete root.dataset.dark;
  if (rel.checked) root.style.setProperty('--x-link', '1');
  cur.textContent = pick.value + (dark.checked ? ' · 暗' : '');
  renderTokens();
  saveState();
};
pick.addEventListener('change', sync);
dark.addEventListener('change', sync);

/* ---- token 实时显示 hex ---- */
const renderTokens = () => {
  document.querySelectorAll('[data-token]').forEach(el => {
    el.textContent = getComputedStyle(root).getPropertyValue(el.dataset.token).trim();
  });
};

/* ---- 链接行为：真实模式下不跳转（避免 demo 里的 # 到处跑） ---- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (a && !rel.checked) { e.preventDefault(); }
});

/* ---- 状态记忆 ---- */
const saveState = () => {
  try { localStorage.setItem('req2proto-cmp', JSON.stringify({ t: pick.value, d: dark.checked, r: rel.checked })); } catch {}
};
const loadState = () => {
  try {
    const s = JSON.parse(localStorage.getItem('req2proto-cmp') || 'null');
    if (s) { pick.value = s.t || 'saas'; dark.checked = !!s.d; rel.checked = s.r !== false; }
  } catch {}
};

loadState();
sync();
</script>
</body>
</html>`;

writeFileSync(join(ROOT, 'assets/components.html'), html);
console.log('✓ assets/components.html', (html.length / 1024).toFixed(1) + 'KB');
