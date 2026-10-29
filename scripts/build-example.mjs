#!/usr/bin/env node
/**
 * build-example.mjs — 把 template.html 的占位符替换成一个完整原型
 * 用于：① 生成 examples/ 里的演示件 ② 验证 template 契约可执行
 *
 * 用法: node scripts/build-example.mjs
 * 输出: examples/ticket-system.html
 *
 * 注意：这是「手工示范」，不是 Agent 生成路径。
 * Agent 生成时应直接写完整 HTML，不需要跑这个脚本。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => readFileSync(join(ROOT, p), 'utf8');

const themeCss = R('assets/theme.css');
const sharedCss = R('assets/shared.css');
let tpl = R('assets/template.html');

/* ---------- 功能清单 ---------- */
const REQ_MAP = [
  { id: 'F-01', name: '工单列表', pri: 'P0', route: '#/orders', src: 'PRD §3.1' },
  { id: 'F-02', name: '状态筛选', pri: 'P0', route: '#/orders', src: 'PRD §3.1' },
  { id: 'F-03', name: '新建工单', pri: 'P0', route: '#/orders/new', src: 'PRD §3.2' },
  { id: 'F-04', name: '表单校验', pri: 'P0', route: '#/orders/new', src: 'PRD §3.2' },
  { id: 'F-05', name: '工单详情', pri: 'P0', route: '#/orders/:id', src: 'PRD §3.3' },
  { id: 'F-06', name: '处理记录', pri: 'P1', route: '#/orders/:id', src: 'PRD §3.4' },
  { id: 'F-07', name: '空态引导', pri: 'P0', route: '#/orders', src: 'PRD §4.1' },
  { id: 'F-08', name: '加载失败重试', pri: 'P0', route: '#/orders', src: 'PRD §4.2' },
  { id: 'F-09', name: '骨架屏', pri: 'P1', route: '#/orders', src: '推断' },
  { id: 'F-10', name: '批量关闭', pri: 'P2', route: '#/orders', src: 'PRD §3.5' },
  { id: 'F-11', name: '导出', pri: 'P2', route: '#/orders', src: 'PRD §3.6' },
];

/* ---------- mock 数据 ---------- */
const MOCK_DATA = {
  orders: [
    { id: 'TK-20261029-001', title: '系统升级申请', status: 'done', owner: '张明', amount: 1280, dept: '技术部', created: '2026-10-29 09:12', desc: '需在周末完成生产环境升级，涉及 3 个服务。' },
    { id: 'TK-20261029-002', title: '权限变更申请', status: 'doing', owner: '李华', amount: 860, dept: '运维部', created: '2026-10-29 10:35', desc: '为财务组 5 名成员开通报销审批权限。' },
    { id: 'TK-20261029-003', title: '数据导出申请', status: 'rejected', owner: '王强', amount: 0, dept: '市场部', created: '2026-10-29 11:08', desc: '导出去年全年客户名单，用于年度复盘。' },
    { id: 'TK-20261028-014', title: '会议室设备报修', status: 'done', owner: '陈静', amount: 320, dept: '行政部', created: '2026-10-28 15:41', desc: '3 号会议室投屏无法连接，需更换 HDMI 线。' },
    { id: 'TK-20261028-009', title: '新增供应商入库', status: 'doing', owner: '赵磊', amount: 15600, dept: '采购部', created: '2026-10-28 14:02', desc: '引入本地办公用品供应商，需完成资质审核。' },
    { id: 'TK-20261027-021', title: '员工入职账号开通', status: 'done', owner: '孙丽', amount: 0, dept: '人事部', created: '2026-10-27 16:30', desc: '为新入职 2 名工程师开通邮箱与代码仓库权限。' },
  ],
  statusMap: {
    doing:    { text: '处理中', cls: 'warning' },
    done:     { text: '已完成', cls: 'success' },
    rejected: { text: '已驳回', cls: 'danger' },
  },
};

/* ---------- 视图 ---------- */
const VIEWS = /* js */ `
const fmtMoney = (n) => n ? n.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '--';
const badge = (st) => {
  const m = DB.statusMap[st] || { text: st, cls: '' };
  return '<span class="badge badge--' + m.cls + '"><i class="dot"></i>' + m.text + '</span>';
};

/* --- 列表页 --- */
const viewOrders = ({ params }) => {
  const st = params.state === 'loading' ? 'loading' : readState(params);

  if (st === 'loading') {
    const skRow = '<div class="row" style="gap:24px">'
      + '<div class="skeleton" style="width:140px"></div>'
      + '<div class="skeleton" style="width:180px"></div>'
      + '<div class="skeleton" style="width:70px"></div>'
      + '<div class="skeleton" style="width:60px"></div>'
      + '<div class="skeleton" style="width:80px"></div>'
      + '</div>';
    return h('<div class="card card--flush">'
      + '<div class="card__header"><div class="skeleton" style="width:180px;height:32px"></div>'
      + '<span class="toolbar__spacer"></span>'
      + '<div class="skeleton" style="width:96px;height:28px"></div></div>'
      + '<div style="padding:16px;display:grid;gap:14px" data-req="F-09">'
      + skRow.repeat(6)
      + '</div></div>');
  }

  if (st === 'error') {
    return h(\`<div class="card">
      <div class="state state--error">
        <div class="state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg></div>
        <h3 class="state__title">工单列表加载失败</h3>
        <p class="state__desc">服务暂时不可用（503），请稍后重试或联系运维</p>
        <button class="btn btn--secondary btn--sm" data-req="F-08" onclick="render()">重新加载</button>
      </div>
    </div>\`);
  }

  if (st === 'empty') {
    return h(\`<div class="card">
      <div class="state">
        <div class="state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14l2 7v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5z"/></svg></div>
        <h3 class="state__title">还没有工单</h3>
        <p class="state__desc">创建第一张工单，开始跟踪处理进度</p>
        <button class="btn btn--primary btn--sm" data-req="F-07" onclick="location.hash='#/orders/new'">新建工单</button>
      </div>
    </div>\`);
  }

  const rows = DB.orders.map(o => \`
    <tr data-req="F-05" style="cursor:pointer" onclick="location.hash='#/orders/\${o.id}'">
      <td class="mono">\${o.id}</td>
      <td>\${o.title}</td>
      <td><span class="badge badge--info">\${o.dept}</span></td>
      <td>\${o.owner}</td>
      <td>\${badge(o.status)}</td>
      <td class="table__num">\${fmtMoney(o.amount)}</td>
      <td class="dim mono">\${o.created}</td>
    </tr>\`).join('');

  return h(\`<div class="card card--flush">
    <div class="card__header">
      <div class="search"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" stroke-linecap="round"/></svg><input class="input" data-req="F-02" placeholder="搜索工单编号或标题" style="width:220px" aria-label="搜索"></div>
      <select class="select" data-req="F-02" style="width:130px" aria-label="按状态筛选" onchange="toast('已筛选：' + this.options[this.selectedIndex].text)">
        <option>全部状态</option><option>处理中</option><option>已完成</option><option>已驳回</option>
      </select>
      <span class="toolbar__spacer"></span>
      <button class="btn btn--secondary btn--sm" data-req="F-11" disabled>导出</button>
      <button class="btn btn--secondary btn--sm" data-req="F-10" disabled>批量关闭</button>
      <button class="btn btn--primary btn--sm" data-req="F-03" onclick="location.hash='#/orders/new'">新建工单</button>
    </div>
    <table class="table">
      <thead><tr><th>工单编号</th><th>标题</th><th>部门</th><th>负责人</th><th>状态</th><th class="table__num">金额</th><th>创建时间</th></tr></thead>
      <tbody>\${rows}</tbody>
    </table>
  </div>\`);
};

/* --- 新建页 --- */
const viewCreate = () => {
  const form = h(\`<div class="card" style="max-width:640px">
    <div class="card__header"><h2 class="card__title">新建工单</h2></div>
    <div class="card__body" style="display:grid;gap:16px">
      <div class="field" id="f-title">
        <label class="field__label">工单标题<span class="req">*</span></label>
        <input class="input" data-req="F-04" id="in-title" placeholder="简要描述问题" aria-describedby="e-title">
        <p class="field__error" id="e-title">标题不能为空</p>
      </div>
      <div class="field" id="f-dept">
        <label class="field__label">所属部门<span class="req">*</span></label>
        <select class="select" data-req="F-04" id="in-dept">
          <option value="">请选择</option><option>技术部</option><option>运维部</option><option>市场部</option><option>行政部</option><option>采购部</option><option>人事部</option>
        </select>
        <p class="field__error" id="e-dept">请选择所属部门</p>
      </div>
      <div class="field">
        <label class="field__label">问题描述</label>
        <textarea class="textarea" data-req="F-04" id="in-desc" placeholder="补充背景、影响范围、期望完成时间"></textarea>
      </div>
      <div class="row" style="justify-content:flex-end;gap:8px">
        <button class="btn btn--ghost" data-req="F-03" onclick="location.hash='#/orders'">取消</button>
        <button class="btn btn--primary" data-req="F-03" id="btn-submit">提交</button>
      </div>
    </div>
  </div>\`);

  form.querySelector('#btn-submit').addEventListener('click', () => {
    const t = form.querySelector('#in-title');
    const d = form.querySelector('#in-dept');
    form.querySelector('#f-title').classList.remove('has-error');
    form.querySelector('#f-dept').classList.remove('has-error');
    t.removeAttribute('aria-invalid');
    let bad = false;
    if (!t.value.trim()) { form.querySelector('#f-title').classList.add('has-error'); t.setAttribute('aria-invalid', 'true'); bad = true; }
    if (!d.value) { form.querySelector('#f-dept').classList.add('has-error'); bad = true; }
    if (bad) return;
    toast('工单创建成功', 'success');
    location.hash = '#/orders';
  });

  return form;
};

/* --- 详情页 --- */
const viewDetail = ({ args }) => {
  const o = DB.orders.find(x => x.id === args.id);
  if (!o) {
    return h(\`<div class="state state--error">
      <div class="state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg></div>
      <h3 class="state__title">工单不存在</h3>
      <p class="state__desc">编号 \${args.id} 未找到，可能已被删除</p>
      <a class="btn btn--secondary btn--sm" href="#/orders" data-req="F-01">返回列表</a>
    </div>\`);
  }

  return h(\`<div style="display:grid;gap:16px;max-width:860px">
    <nav class="breadcrumb">
      <a href="#/orders" data-req="F-01">工单</a><span class="breadcrumb__sep">/</span><span aria-current="page">\${o.id}</span>
    </nav>
    <div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:16px">
        <div>
          <h2 style="margin:0 0 4px;font-size:var(--f-xl)">\${o.title}</h2>
          <span class="dim mono">\${o.id}</span>
        </div>
        \${badge(o.status)}
      </div>
      <dl class="desc-list">
        <dt>负责人</dt><dd>\${o.owner}</dd>
        <dt>所属部门</dt><dd>\${o.dept}</dd>
        <dt>金额</dt><dd>\${fmtMoney(o.amount)} 元</dd>
        <dt>创建时间</dt><dd>\${o.created}</dd>
        <dt>问题描述</dt><dd>\${o.desc}</dd>
      </dl>
    </div>
    <div class="card">
      <div class="card__header"><h3 class="card__title">处理记录</h3></div>
      <div class="card__body" style="padding:0">
        <div class="list" data-req="F-06">
          <div class="list-item"><div class="avatar avatar--sm">张</div><div class="grow"><div style="font-size:13px">张明 提交了工单</div><div class="help-text">\${o.created}</div></div></div>
          <div class="list-item"><div class="avatar avatar--sm">李</div><div class="grow"><div style="font-size:13px">李华 认领并开始处理</div><div class="help-text">2026-10-29 10:02</div></div></div>
          <div class="list-item"><div class="avatar avatar--sm">系</div><div class="grow"><div style="font-size:13px">系统 更新状态为\${DB.statusMap[o.status].text}</div><div class="help-text">2026-10-29 11:20</div></div></div>
        </div>
      </div>
    </div>
    <div class="row">
      <button class="btn btn--secondary" data-req="F-03" onclick="location.hash='#/orders/new'">新建工单</button>
      <button class="btn btn--ghost" data-req="F-01" onclick="location.hash='#/orders'">返回列表</button>
    </div>
  </div>\`);
};
`;

const ROUTES = /* js */ `
[
  { path: '/orders',       title: '工单列表', nav: '/orders', actions: () => '<span class="dim" style="font-size:13px">共 ' + DB.orders.length + ' 条</span>', render: viewOrders },
  { path: '/orders/new',   title: '新建工单', nav: '/orders', actions: () => '', render: viewCreate },
  { path: '/orders/:id',   title: '工单详情', nav: '/orders', actions: () => '', render: viewDetail, sampleArgs: { id: DB.orders[0].id } },
  { path: '/',             title: '工单列表', nav: '/orders', actions: () => '', render: viewOrders },
]
`;

const NAV_ITEMS = /* html */ `
<a class="nav-item" data-nav="/orders" href="#/orders" data-req="F-01">
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M2 6h12M6 6v8"/></svg>
  工单管理
</a>
<a class="nav-item" data-nav="/orders/new" href="#/orders/new" data-req="F-03">
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>
  新建工单
</a>
<div class="nav-group">异常态演示</div>
<a class="nav-item" href="#/orders?state=empty" data-req="F-07">
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 9.5h5"/></svg>
  空态
</a>
<a class="nav-item" href="#/orders?state=error" data-req="F-08">
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v4M8 11v.5"/></svg>
  加载失败
</a>
`;

const CUSTOM_CSS = `
/* 本原型特有（尽量为空，复用 shared.css） */
.desc-list { grid-template-columns: 88px 1fr; }
`;

tpl = tpl
  .replace(/\{\{THEME_CSS\}\}/g, () => themeCss)
  .replace(/\{\{SHARED_CSS\}\}/g, () => sharedCss)
  .replace(/\{\{CUSTOM_CSS\}\}/g, () => CUSTOM_CSS)
  .replace(/\{\{THEME\}\}/g, 'saas')
  .replace(/\{\{PRODUCT\}\}/g, '工单管理系统')
  .replace(/\{\{PRODUCT_INITIAL\}\}/g, '工')
  .replace(/\{\{HOME\}\}/g, 'orders')
  .replace(/\{\{REQ_MAP\}\}/g, () => JSON.stringify(REQ_MAP, null, 2))
  .replace(/\{\{MOCK_DATA\}\}/g, () => JSON.stringify(MOCK_DATA, null, 2))
  .replace(/\{\{ROUTES\}\}/g, () => ROUTES)
  .replace(/\{\{VIEWS\}\}/g, () => VIEWS)
  .replace('<!-- NAV_ITEMS -->', () => NAV_ITEMS);

mkdirSync(join(ROOT, 'examples'), { recursive: true });
writeFileSync(join(ROOT, 'examples/ticket-system.html'), tpl);

const leftovers = [...tpl.matchAll(/\{\{[A-Z_]+\}\}/g)].map(m => m[0]);
console.log('✓ examples/ticket-system.html', (tpl.length / 1024).toFixed(1) + 'KB');
if (leftovers.length) console.log('⚠ 未替换的占位符:', [...new Set(leftovers)].join(', '));
