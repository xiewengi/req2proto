#!/usr/bin/env node
/**
 * build-preview.mjs — 生成主题预览页（开发期工具，不参与原型生成）
 * 用法: node scripts/build-preview.mjs
 * 输出: assets/theme-preview.html —— 单文件，8 套行业主题并排对比
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const themeCss = readFileSync(join(ROOT, 'assets/theme.css'), 'utf8');
const sharedCss = readFileSync(join(ROOT, 'assets/shared.css'), 'utf8');

const THEMES = [
  { id: 'saas',      name: 'SaaS / 工具', cls: '靛蓝', desc: '科技感、默认主题', for: '效率工具、协作平台、开发者产品' },
  { id: 'medical',   name: '医疗健康',    cls: '青绿', desc: '专业不刺眼',     for: 'HIS、电子病历、健康管理、检验报告' },
  { id: 'gov',       name: '政企 / 政务', cls: '正蓝', desc: '权威可信',       for: '政务大厅、监管平台、党建、公共服务' },
  { id: 'finance',   name: '金融 / 银行', cls: '藏青', desc: '稳健降低饱和',   for: '银行后台、风控、保险、审计' },
  { id: 'education', name: '教育',        cls: '墨橙', desc: '活力但不喧闹',   for: 'K12、培训、题库、教务' },
  { id: 'ecommerce', name: '电商 / 零售', cls: '玫红', desc: '促销紧迫感',     for: '商城、订单、营销、直播带货' },
  { id: 'data',      name: '数据 / 分析', cls: '深青', desc: '理性不易疲劳',   for: 'BI 看板、数据治理、报表、监控' },
  { id: 'life',      name: '生活服务',    cls: '陶土橙', desc: '亲和温暖',     for: '到家服务、社区、预约、配送' },
];

/* 每个主题卡片里画同一套迷你界面，保证横向可比较 */
const card = (t) => `
<section class="th-card" data-theme="${t.id}">
  <header class="th-card__head">
    <div>
      <h2 class="th-card__name">${t.name}</h2>
      <p class="th-card__meta"><span class="mono">${t.id}</span> · ${t.cls} · ${t.desc}</p>
    </div>
    <span class="badge badge--brand">${t.id}</span>
  </header>

  <div class="th-demo">
    <div class="th-demo__side">
      <div class="th-demo__brand"><span class="sidebar__brand-mark">${t.name[0]}</span></div>
      <div class="nav-item is-active"><svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>概览</div>
      <div class="nav-item"><svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/><rect x="1" y="12" width="14" height="2" rx="1"/></svg>列表</div>
      <div class="nav-item"><svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.5v4l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>记录</div>
    </div>

    <div class="th-demo__main">
      <div class="th-demo__top">
        <strong style="font-size:var(--f-md)">数据概览</strong>
        <span class="grow"></span>
        <button class="btn btn--primary btn--sm">新建</button>
      </div>

      <div class="th-demo__grid">
        <div class="th-stat">
          <span class="th-stat__label">今日处理</span>
          <span class="th-stat__num" style="color:var(--c-brand-ink)">1,284</span>
          <span class="badge badge--success"><i class="dot"></i>+12.5%</span>
        </div>
        <div class="th-stat">
          <span class="th-stat__label">待办</span>
          <span class="th-stat__num">37</span>
          <span class="badge badge--warning"><i class="dot"></i>需关注</span>
        </div>
      </div>

      <table class="table th-table">
        <thead><tr><th>编号</th><th>名称</th><th>状态</th><th class="table__num">金额</th></tr></thead>
        <tbody>
          <tr><td class="mono">TK-20261029-001</td><td>系统升级申请</td><td><span class="badge badge--success"><i class="dot"></i>已完成</span></td><td class="table__num">1,280.00</td></tr>
          <tr><td class="mono">TK-20261029-002</td><td>权限变更</td><td><span class="badge badge--warning"><i class="dot"></i>处理中</span></td><td class="table__num">860.00</td></tr>
          <tr><td class="mono">TK-20261029-003</td><td>数据导出</td><td><span class="badge badge--danger"><i class="dot"></i>已驳回</span></td><td class="table__num">--</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <footer class="th-card__foot">
    <span class="th-card__for">适用：${t.for}</span>
    <code class="th-card__code">&lt;html data-theme="${t.id}"&gt;</code>
  </footer>
</section>`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>req2proto · 行业主题预览</title>
<style>
${themeCss}
</style>
<style>
${sharedCss}
</style>
<style>
/* 预览页自身布局（不进入原型） */
body { padding: var(--s-6); }
.gallery { max-width: 1560px; margin: 0 auto; display: grid; gap: var(--s-6); }
.gallery__head { display: flex; align-items: baseline; gap: var(--s-3); flex-wrap: wrap; }
.gallery__head h1 { font-size: var(--f-2xl); margin: 0; }
.gallery__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(600px, 1fr)); gap: var(--s-6); }

.th-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  display: flex; flex-direction: column;
}
.th-card__head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s-3);
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--c-border);
}
.th-card__name { font-size: var(--f-lg); margin: 0 0 var(--s-1); }
.th-card__meta { margin: 0; font-size: var(--f-sm); color: var(--c-text-2); }
.th-demo { display: flex; height: 348px; background: var(--c-bg); }
.th-demo__side {
  width: 132px; flex: 0 0 132px;
  background: var(--c-surface);
  border-right: 1px solid var(--c-border);
  padding: var(--s-3) var(--s-2);
  display: flex; flex-direction: column; gap: var(--s-1);
}
.th-demo__brand { padding: var(--s-2) var(--s-2) var(--s-3); }
.th-demo__side .nav-item { padding: var(--s-2); font-size: var(--f-xs); gap: var(--s-2); }
.th-demo__side .nav-item svg { width: 12px; height: 12px; }
.th-demo__main { flex: 1 1 auto; padding: var(--s-3); display: flex; flex-direction: column; gap: var(--s-3); overflow: hidden; }
.th-demo__top { display: flex; align-items: center; gap: var(--s-2); }
.th-demo__grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-3); }
.th-stat {
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: var(--r-md); padding: var(--s-3);
  display: flex; flex-direction: column; gap: var(--s-1); align-items: flex-start;
}
.th-stat__label { font-size: var(--f-xs); color: var(--c-text-3); }
.th-stat__num { font-size: var(--f-xl); font-weight: var(--fw-bold); line-height: 1.2; }
.th-table { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r-md); overflow: hidden; font-size: var(--f-xs); }
.th-table th, .th-table td { padding: var(--s-2) var(--s-3); }
.th-card__foot {
  display: flex; align-items: center; justify-content: space-between; gap: var(--s-3);
  padding: var(--s-3) var(--s-5);
  border-top: 1px solid var(--c-border);
  background: var(--c-surface-2);
  font-size: var(--f-xs); color: var(--c-text-2);
}
.th-card__code { background: var(--c-surface); padding: 2px 6px; border-radius: var(--r-sm); color: var(--c-text); }
@media (max-width: 700px) { .gallery__grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="gallery">
  <header class="gallery__head">
    <h1>行业主题预览</h1>
    <p class="muted" style="margin:0">8 套主题 · 同一套组件 · 切换 <code class="th-card__code">data-theme</code> 即换肤</p>
  </header>
  <div class="gallery__grid">
${THEMES.map(card).join('\n')}
  </div>
</div>
</body>
</html>`;

writeFileSync(join(ROOT, 'assets/theme-preview.html'), html);
console.log('✓ assets/theme-preview.html', (html.length / 1024).toFixed(1) + 'KB');
