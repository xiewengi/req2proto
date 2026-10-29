#!/usr/bin/env node
/**
 * build-components-antd.mjs —— 生成 assets/components-antd.html
 *
 * 定位：Ant Design 5 风格控件参考稿，与 assets/components.html（自有设计语言）并存。
 *
 * 为什么单独一份而不是合并：
 *   - antd 的设计 token（#1677ff / 6px 圆角 / 14px 基准）和现有 8 套主题是两套体系，
 *     硬塞进同一份会互相覆盖。
 *   - 这份的重点是「antd 有、我们缺」的复杂控件：日期区间、树、级联、穿梭框、
 *     时间轴、结果页、气泡确认等，拿来就知道怎么写。
 *
 * 约束同主原型：零外部请求、单文件、双击即开。只支持亮/暗两种（antd 本身没有多主题）。
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, '..');

// ═══════════════════════════════════════════════════════════
// Ant Design 5 设计 token
// 来源：antd v5 的 seed / map token，按需要裁到原型够用的子集
// ═══════════════════════════════════════════════════════════
const TOKENS = `
:root {
  /* 品牌色（seed: colorPrimary = #1677ff） */
  --a-primary: #1677ff;
  --a-primary-hover: #4096ff;
  --a-primary-active: #0958d9;
  --a-primary-bg: #e6f4ff;
  --a-primary-bg-hover: #bae0ff;
  --a-primary-border: #91caff;
  --a-primary-text: #1677ff;

  /* 功能色 */
  --a-success: #52c41a;
  --a-success-bg: #f6ffed;
  --a-success-border: #b7eb8f;
  --a-warning: #faad14;
  --a-warning-bg: #fffbe6;
  --a-warning-border: #ffe58f;
  --a-error: #ff4d4f;
  --a-error-bg: #fff2f0;
  --a-error-border: #ffccc7;
  --a-info: #1677ff;

  /* 中性色（antd 用 rgba 保证叠在任何底上都自然） */
  --a-text: rgba(0, 0, 0, 0.88);
  --a-text-secondary: rgba(0, 0, 0, 0.65);
  --a-text-tertiary: rgba(0, 0, 0, 0.45);
  --a-text-quaternary: rgba(0, 0, 0, 0.25);
  --a-border: #d9d9d9;
  --a-border-secondary: #f0f0f0;
  --a-split: rgba(5, 5, 5, 0.06);
  --a-fill-secondary: rgba(0, 0, 0, 0.02);
  --a-fill-tertiary: rgba(0, 0, 0, 0.04);
  --a-bg-container: #ffffff;
  --a-bg-elevated: #ffffff;
  --a-bg-layout: #f5f5f5;
  --a-bg-mask: rgba(0, 0, 0, 0.45);

  /* 圆角 */
  --a-radius-sm: 4px;
  --a-radius: 6px;
  --a-radius-lg: 8px;

  /* 控件尺寸 */
  --a-h-sm: 24px;
  --a-h: 32px;
  --a-h-lg: 40px;

  /* 字号 */
  --a-fs-sm: 12px;
  --a-fs: 14px;
  --a-fs-lg: 16px;
  --a-fs-xl: 20px;
  --a-fs-xxl: 24px;
  --a-fs-huge: 38px;

  /* 间距（8 的倍数） */
  --a-s1: 4px;
  --a-s2: 8px;
  --a-s3: 12px;
  --a-s4: 16px;
  --a-s5: 24px;
  --a-s6: 32px;
  --a-s7: 48px;

  /* 阴影 */
  --a-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02);
  --a-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
  --a-shadow-lg: 0 9px 28px 8px rgba(0, 0, 0, 0.05), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12);

  --a-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif;
  --a-ease: cubic-bezier(0.645, 0.045, 0.355, 1);
}

/* 暗色：对应 antd 的 darkAlgorithm */
[data-dark="1"] {
  --a-primary: #1668dc;
  --a-primary-hover: #3c89e8;
  --a-primary-active: #1554ad;
  --a-primary-bg: #111a2c;
  --a-primary-bg-hover: #112545;
  --a-primary-border: #15325b;
  --a-primary-text: #3c89e8;

  --a-success: #49aa19;
  --a-success-bg: #162312;
  --a-success-border: #274916;
  --a-warning: #d89614;
  --a-warning-bg: #2b2111;
  --a-warning-border: #594214;
  --a-error: #dc4446;
  --a-error-bg: #2c1618;
  --a-error-border: #5b2526;
  --a-info: #1668dc;

  --a-text: rgba(255, 255, 255, 0.85);
  --a-text-secondary: rgba(255, 255, 255, 0.65);
  --a-text-tertiary: rgba(255, 255, 255, 0.45);
  --a-text-quaternary: rgba(255, 255, 255, 0.25);
  --a-border: #424242;
  --a-border-secondary: #303030;
  --a-split: rgba(253, 253, 253, 0.12);
  --a-fill-secondary: rgba(255, 255, 255, 0.04);
  --a-fill-tertiary: rgba(255, 255, 255, 0.08);
  --a-bg-container: #141414;
  --a-bg-elevated: #1f1f1f;
  --a-bg-layout: #000000;
  --a-bg-mask: rgba(0, 0, 0, 0.65);

  --a-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.16), 0 1px 6px -1px rgba(0, 0, 0, 0.12), 0 2px 4px 0 rgba(0, 0, 0, 0.08);
  --a-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.32), 0 3px 6px -4px rgba(0, 0, 0, 0.48), 0 9px 28px 8px rgba(0, 0, 0, 0.2);
  --a-shadow-lg: 0 9px 28px 8px rgba(0, 0, 0, 0.2), 0 6px 16px 0 rgba(0, 0, 0, 0.32), 0 3px 6px -4px rgba(0, 0, 0, 0.48);
}
`;

// ═══════════════════════════════════════════════════════════
// 组件样式
// ═══════════════════════════════════════════════════════════
const CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  font-family: var(--a-font);
  font-size: var(--a-fs);
  line-height: 1.5715;
  color: var(--a-text);
  background: var(--a-bg-layout);
  -webkit-font-smoothing: antialiased;
}

/* ───────── 页面外壳 ───────── */
.layout { display: flex; min-height: 100vh; }
.sider {
  width: 236px; flex: none; background: var(--a-bg-container);
  border-right: 1px solid var(--a-border-secondary);
  position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: var(--a-s4) 0;
}
.sider__brand {
  display: flex; align-items: center; gap: 10px; padding: 0 var(--a-s5) var(--a-s4);
  border-bottom: 1px solid var(--a-border-secondary); margin-bottom: var(--a-s3);
}
.sider__logo {
  width: 28px; height: 28px; border-radius: var(--a-radius); flex: none;
  background: var(--a-primary); color: #fff; display: grid; place-items: center;
  font-size: 13px; font-weight: 700;
}
.sider__title { font-size: var(--a-fs-lg); font-weight: 600; line-height: 1.2; }
.sider__sub { font-size: var(--a-fs-sm); color: var(--a-text-tertiary); }
.sider__group {
  font-size: var(--a-fs-sm); color: var(--a-text-tertiary);
  padding: var(--a-s3) var(--a-s5) var(--a-s1);
}
.sider__link {
  display: block; padding: 6px var(--a-s5); color: var(--a-text-secondary);
  text-decoration: none; font-size: var(--a-fs); border-right: 2px solid transparent;
  transition: color .2s var(--a-ease), background .2s var(--a-ease);
}
.sider__link:hover { color: var(--a-primary); background: var(--a-fill-secondary); }
.sider__link.is-active { color: var(--a-primary); background: var(--a-primary-bg); border-right-color: var(--a-primary); }
.sider__link code { font-size: 11px; opacity: .55; margin-left: 4px; }

.main { flex: 1; min-width: 0; }
.topbar {
  position: sticky; top: 0; z-index: 20; background: var(--a-bg-container);
  border-bottom: 1px solid var(--a-border-secondary);
  padding: var(--a-s3) var(--a-s6); display: flex; align-items: center; gap: var(--a-s3);
}
.topbar h1 { font-size: var(--a-fs-xl); font-weight: 600; margin: 0; }
.topbar__spacer { flex: 1; }
.wrap { padding: var(--a-s5) var(--a-s6) var(--a-s7); max-width: 1180px; }

/* ───────── 组件展示块 ───────── */
.sec { margin-bottom: var(--a-s6); scroll-margin-top: 68px; }
.sec__head { display: flex; align-items: baseline; gap: var(--a-s2); margin-bottom: var(--a-s3); flex-wrap: wrap; }
.sec__name { font-size: var(--a-fs-lg); font-weight: 600; margin: 0; }
.sec__en { font-size: var(--a-fs-sm); color: var(--a-text-quaternary); font-family: ui-monospace, monospace; }
.sec__desc { font-size: var(--a-fs-sm); color: var(--a-text-tertiary); margin: 0 0 var(--a-s3); }
.panel {
  background: var(--a-bg-container); border: 1px solid var(--a-border-secondary);
  border-radius: var(--a-radius-lg); padding: var(--a-s5);
}
.row { display: flex; flex-wrap: wrap; gap: var(--a-s3); align-items: center; }
.row--start { align-items: flex-start; }
.row + .row { margin-top: var(--a-s4); }
.label {
  font-size: var(--a-fs-sm); color: var(--a-text-tertiary);
  margin-bottom: var(--a-s2); display: block;
}
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--a-s5); }

/* ═════════ Button ═════════ */
.a-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: var(--a-h); padding: 0 15px; font-size: var(--a-fs);
  font-family: inherit; color: var(--a-text); background: var(--a-bg-container);
  border: 1px solid var(--a-border); border-radius: var(--a-radius);
  cursor: pointer; white-space: nowrap; transition: all .2s var(--a-ease);
}
.a-btn:hover { color: var(--a-primary-hover); border-color: var(--a-primary-hover); }
.a-btn:active { color: var(--a-primary-active); border-color: var(--a-primary-active); }
.a-btn--primary { background: var(--a-primary); border-color: var(--a-primary); color: #fff; }
.a-btn--primary:hover { background: var(--a-primary-hover); border-color: var(--a-primary-hover); color: #fff; }
.a-btn--primary:active { background: var(--a-primary-active); border-color: var(--a-primary-active); color: #fff; }
.a-btn--dashed { border-style: dashed; }
.a-btn--text { border-color: transparent; background: transparent; }
.a-btn--text:hover { background: var(--a-fill-tertiary); border-color: transparent; color: var(--a-text); }
.a-btn--link { border-color: transparent; background: transparent; color: var(--a-primary-text); padding: 0 4px; }
.a-btn--link:hover { color: var(--a-primary-hover); background: transparent; }
.a-btn--danger { color: var(--a-error); border-color: var(--a-error); }
.a-btn--danger:hover { color: #ff7875; border-color: #ff7875; }
.a-btn--danger.a-btn--primary { background: var(--a-error); border-color: var(--a-error); color: #fff; }
.a-btn--danger.a-btn--primary:hover { background: #ff7875; border-color: #ff7875; color: #fff; }
.a-btn--lg { height: var(--a-h-lg); padding: 0 15px; font-size: var(--a-fs-lg); border-radius: var(--a-radius-lg); }
.a-btn--sm { height: var(--a-h-sm); padding: 0 7px; font-size: var(--a-fs-sm); border-radius: var(--a-radius-sm); }
.a-btn[disabled], .a-btn.is-disabled {
  color: var(--a-text-quaternary); background: var(--a-fill-tertiary);
  border-color: var(--a-border); cursor: not-allowed;
}
.a-btn--primary[disabled], .a-btn--primary.is-disabled { background: var(--a-fill-tertiary); border-color: var(--a-border); color: var(--a-text-quaternary); }
.a-btn.is-loading { opacity: .65; pointer-events: none; }
.a-btn--block { width: 100%; }
.spin-dot {
  width: 12px; height: 12px; border-radius: 50%; flex: none;
  border: 2px solid currentColor; border-top-color: transparent;
  animation: a-spin .8s linear infinite;
}
@keyframes a-spin { to { transform: rotate(360deg); } }

/* ═════════ Input / Select ═════════ */
.a-input, .a-select, .a-textarea {
  height: var(--a-h); padding: 4px 11px; font-size: var(--a-fs); font-family: inherit;
  color: var(--a-text); background: var(--a-bg-container);
  border: 1px solid var(--a-border); border-radius: var(--a-radius);
  transition: all .2s var(--a-ease); outline: none; width: 100%;
}
.a-input::placeholder, .a-textarea::placeholder { color: var(--a-text-quaternary); }
.a-input:hover, .a-select:hover, .a-textarea:hover { border-color: var(--a-primary-hover); }
.a-input:focus, .a-select:focus, .a-textarea:focus {
  border-color: var(--a-primary); box-shadow: 0 0 0 2px rgba(5, 145, 255, 0.1);
}
.a-textarea { height: auto; min-height: 72px; padding: 4px 11px; resize: vertical; line-height: 1.5715; }
.a-input--lg { height: var(--a-h-lg); font-size: var(--a-fs-lg); }
.a-input--sm { height: var(--a-h-sm); font-size: var(--a-fs-sm); }
.a-input--error, .a-input--error:hover { border-color: var(--a-error); }
.a-input--error:focus { border-color: var(--a-error); box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.1); }
.a-input[disabled] { background: var(--a-fill-tertiary); color: var(--a-text-quaternary); cursor: not-allowed; }
.a-input--group { display: flex; align-items: center; gap: 6px; position: relative; }
.a-input--group .a-input { padding-left: 28px; }
.a-input__icon {
  position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
  color: var(--a-text-quaternary); display: flex; pointer-events: none;
}
.a-input__icon svg { width: 13px; height: 13px; }
.a-input__suffix {
  position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
  color: var(--a-text-quaternary); font-size: var(--a-fs-sm);
}
.a-select {
  appearance: none; cursor: pointer; padding-right: 28px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%23bfbfbf' stroke-width='1.5'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center; background-size: 12px;
}
[data-dark="1"] .a-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%23888888' stroke-width='1.5'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
}
.a-form-item { margin-bottom: var(--a-s5); }
.a-form-item__label {
  display: block; font-size: var(--a-fs); margin-bottom: var(--a-s2); color: var(--a-text);
}
.a-form-item__label .req { color: var(--a-error); margin-right: 4px; }
.a-form-item__help { font-size: var(--a-fs-sm); color: var(--a-text-tertiary); margin-top: var(--a-s1); }
.a-form-item--error .a-form-item__help { color: var(--a-error); }
.a-form-item--error .a-input { border-color: var(--a-error); }

/* ═════════ DatePicker ═════════ */
.a-picker { position: relative; width: 100%; }
.a-picker__input {
  height: var(--a-h); padding: 4px 11px 4px 32px; font-size: var(--a-fs); font-family: inherit;
  color: var(--a-text); background: var(--a-bg-container); width: 100%;
  border: 1px solid var(--a-border); border-radius: var(--a-radius);
  cursor: pointer; text-align: left; transition: all .2s var(--a-ease);
}
.a-picker__input:hover { border-color: var(--a-primary-hover); }
.a-picker__input.is-active { border-color: var(--a-primary); box-shadow: 0 0 0 2px rgba(5, 145, 255, 0.1); }
.a-picker__icon {
  position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
  color: var(--a-text-quaternary); display: flex; pointer-events: none;
}
.a-picker__icon svg { width: 14px; height: 14px; }
.a-picker__clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--a-text-quaternary); cursor: pointer; }
.a-picker__clear:hover { color: var(--a-text-tertiary); }
.a-picker__input--range { display: flex; align-items: center; gap: 0; padding: 0; }
.a-picker__seg { flex: 1; padding: 4px 11px; text-align: center; }
.a-picker__sep { color: var(--a-text-quaternary); }

.a-cal {
  margin-top: var(--a-s2); background: var(--a-bg-elevated);
  border-radius: var(--a-radius-lg); box-shadow: var(--a-shadow);
  padding: var(--a-s3); width: 280px; border: 1px solid var(--a-border-secondary);
}
.a-cal__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--a-s2); }
.a-cal__title { font-size: var(--a-fs); font-weight: 500; }
.a-cal__nav { display: flex; gap: 2px; }
.a-cal__nav button {
  width: 24px; height: 24px; border: 0; background: transparent; border-radius: var(--a-radius-sm);
  color: var(--a-text-tertiary); cursor: pointer; display: grid; place-items: center; font-size: 12px;
}
.a-cal__nav button:hover { background: var(--a-fill-tertiary); color: var(--a-text); }
.a-cal__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.a-cal__dow {
  font-size: var(--a-fs-sm); color: var(--a-text-tertiary);
  text-align: center; padding: 4px 0; font-weight: 400;
}
.a-cal__day {
  height: 28px; display: grid; place-items: center; font-size: var(--a-fs-sm);
  border-radius: var(--a-radius-sm); cursor: pointer; border: 0; background: transparent;
  color: var(--a-text); font-family: inherit;
}
.a-cal__day:hover { background: var(--a-fill-tertiary); }
.a-cal__day.is-out { color: var(--a-text-quaternary); }
.a-cal__day.is-today { color: var(--a-primary); font-weight: 600; }
.a-cal__day.is-selected { background: var(--a-primary); color: #fff; font-weight: 500; }
.a-cal__day.is-selected:hover { background: var(--a-primary-hover); }
.a-cal__day.is-in-range { background: var(--a-primary-bg); border-radius: 0; }
.a-cal__foot {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: var(--a-s2); padding-top: var(--a-s2); border-top: 1px solid var(--a-border-secondary);
  font-size: var(--a-fs-sm);
}
.a-cal__foot a { color: var(--a-primary-text); text-decoration: none; cursor: pointer; }
.a-cal__foot a:hover { color: var(--a-primary-hover); }

/* ═════════ Tree ═════════ */
.a-tree { font-size: var(--a-fs); }
.a-tree__node {
  display: flex; align-items: center; gap: 4px; padding: 2px 4px;
  border-radius: var(--a-radius-sm); cursor: pointer; min-height: 26px;
}
.a-tree__node:hover { background: var(--a-fill-tertiary); }
.a-tree__node.is-selected { background: var(--a-primary-bg); }
.a-tree__switcher {
  width: 16px; height: 16px; display: grid; place-items: center; flex: none;
  color: var(--a-text-tertiary); font-size: 10px; transition: transform .2s var(--a-ease);
}
.a-tree__switcher.is-open { transform: rotate(90deg); }
.a-tree__checkbox {
  width: 16px; height: 16px; border: 1px solid var(--a-border); border-radius: 4px;
  flex: none; display: grid; place-items: center; background: var(--a-bg-container);
}
.a-tree__checkbox.is-checked { background: var(--a-primary); border-color: var(--a-primary); color: #fff; }
.a-tree__checkbox.is-half { background: var(--a-bg-container); border-color: var(--a-primary); }
.a-tree__checkbox.is-half::after { content: ''; width: 8px; height: 8px; background: var(--a-primary); border-radius: 1px; }
.a-tree__checkbox svg { width: 10px; height: 10px; }
.a-tree__label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.a-tree__count { font-size: var(--a-fs-sm); color: var(--a-text-quaternary); }
.a-tree__children { padding-left: 24px; }
.a-tree__children.is-hidden { display: none; }

/* ═════════ Cascader ═════════ */
.a-cascader { display: inline-flex; width: fit-content; max-width: 100%; background: var(--a-bg-elevated); border-radius: var(--a-radius-lg);
  box-shadow: var(--a-shadow); border: 1px solid var(--a-border-secondary); overflow: hidden; }
.a-cascader__col { width: 148px; max-height: 200px; overflow-y: auto; padding: 4px 0; }
.a-cascader__col + .a-cascader__col { border-left: 1px solid var(--a-border-secondary); }
.a-cascader__item {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
  padding: 5px 12px; font-size: var(--a-fs); cursor: pointer; color: var(--a-text);
}
.a-cascader__item:hover { background: var(--a-fill-tertiary); }
.a-cascader__item.is-active { background: var(--a-primary-bg); color: var(--a-primary-text); font-weight: 500; }
.a-cascader__arrow { font-size: 10px; color: var(--a-text-quaternary); }

/* ═════════ Transfer ═════════ */
.a-transfer { display: flex; align-items: center; gap: var(--a-s3); flex-wrap: wrap; }
.a-transfer__box {
  flex: 1 1 0; min-width: 200px; align-self: stretch; display: flex; flex-direction: column; border: 1px solid var(--a-border);
  border-radius: var(--a-radius); background: var(--a-bg-container); overflow: hidden;
}
.a-transfer__head {
  display: flex; align-items: center; gap: 6px; padding: 6px 12px;
  border-bottom: 1px solid var(--a-border-secondary); font-size: var(--a-fs);
}
.a-transfer__head input { margin: 0; accent-color: var(--a-primary); }
.a-transfer__count { margin-left: auto; color: var(--a-text-tertiary); font-size: var(--a-fs-sm); }
.a-transfer__list { height: 168px; overflow-y: auto; padding: 4px 0; }
.a-transfer__item {
  display: flex; align-items: center; gap: 6px; padding: 4px 12px;
  font-size: var(--a-fs); cursor: pointer;
}
.a-transfer__item:hover { background: var(--a-fill-tertiary); }
.a-transfer__item input { margin: 0; accent-color: var(--a-primary); }
.a-transfer__ops { display: flex; flex-direction: column; gap: var(--a-s2); }

/* ═════════ Segmented ═════════ */
.a-segmented {
  display: inline-flex; padding: 2px; background: var(--a-fill-tertiary);
  border-radius: var(--a-radius); gap: 2px;
}
.a-segmented__item {
  border: 0; background: transparent; font-family: inherit; font-size: var(--a-fs);
  color: var(--a-text); padding: 2px 11px; height: 28px; border-radius: var(--a-radius-sm);
  cursor: pointer; transition: all .2s var(--a-ease); white-space: nowrap;
}
.a-segmented__item:hover { color: var(--a-text); }
.a-segmented__item.is-active {
  background: var(--a-bg-container); box-shadow: var(--a-shadow-sm);
  font-weight: 500;
}

/* ═════════ Upload ═════════ */
.a-upload__trigger {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  width: 104px; height: 104px; border: 1px dashed var(--a-border); border-radius: var(--a-radius-lg);
  background: var(--a-fill-secondary); cursor: pointer; color: var(--a-text-secondary);
  font-size: var(--a-fs); transition: all .2s var(--a-ease);
}
.a-upload__trigger:hover { border-color: var(--a-primary); color: var(--a-primary); }
.a-upload__trigger svg { width: 20px; height: 20px; }
.a-upload__list { margin-top: var(--a-s3); display: flex; flex-direction: column; gap: var(--a-s1); }
.a-upload__file {
  display: flex; align-items: center; gap: var(--a-s2); padding: 4px 8px;
  border-radius: var(--a-radius-sm); font-size: var(--a-fs); color: var(--a-text-secondary);
}
.a-upload__file:hover { background: var(--a-fill-tertiary); }
.a-upload__file.is-error { background: var(--a-error-bg); color: var(--a-error); }
.a-upload__name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.a-upload__del { cursor: pointer; color: var(--a-text-quaternary); }
.a-upload__del:hover { color: var(--a-error); }

/* ═════════ Slider ═════════ */
.a-slider { position: relative; height: 32px; display: flex; align-items: center; width: 100%; min-width: 160px; }
.a-slider__rail { height: 4px; width: 100%; background: var(--a-fill-tertiary); border-radius: 2px; position: relative; }
.a-slider__track { position: absolute; left: 0; top: 0; height: 100%; background: var(--a-primary); border-radius: 2px; }
.a-slider__handle {
  position: absolute; top: 50%; width: 14px; height: 14px; border-radius: 50%;
  background: var(--a-bg-container); border: 2px solid var(--a-primary);
  transform: translate(-50%, -50%); cursor: grab; transition: box-shadow .2s var(--a-ease);
}
.a-slider__handle:hover { box-shadow: 0 0 0 6px rgba(22, 119, 255, .12); }
.a-slider__marks { position: absolute; top: 24px; left: 0; right: 0; display: flex; justify-content: space-between; font-size: var(--a-fs-sm); color: var(--a-text-tertiary); }

/* ═════════ Rate ═════════ */
.a-rate { display: inline-flex; gap: 8px; font-size: 20px; color: var(--a-text-quaternary); }
.a-rate svg { width: 20px; height: 20px; cursor: pointer; transition: transform .15s var(--a-ease); }
.a-rate svg:hover { transform: scale(1.15); }
.a-rate .is-on { color: #fadb14; }

/* ═════════ Table ═════════ */
.a-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: var(--a-fs); }
.a-table th {
  background: var(--a-fill-secondary); font-weight: 600; text-align: left;
  padding: 12px 16px; border-bottom: 1px solid var(--a-border-secondary);
  color: var(--a-text); white-space: nowrap;
}
.a-table td { padding: 12px 16px; border-bottom: 1px solid var(--a-border-secondary); }
.a-table tbody tr:hover td { background: var(--a-fill-secondary); }
.a-table tbody tr.is-selected td { background: var(--a-primary-bg); }
.a-table__check { width: 40px; }
.a-table__sort { display: inline-flex; flex-direction: column; gap: 1px; margin-left: 4px; vertical-align: middle; }
.a-table__sort i { font-size: 8px; line-height: 1; font-style: normal; color: var(--a-text-quaternary); }
.a-table__sort i.is-on { color: var(--a-primary); }
.a-table__empty { padding: var(--a-s6); text-align: center; color: var(--a-text-tertiary); }

/* ═════════ Descriptions ═════════ */
.a-desc { border: 1px solid var(--a-border-secondary); border-radius: var(--a-radius-lg); overflow: hidden; }
.a-desc__row { display: flex; border-bottom: 1px solid var(--a-border-secondary); }
.a-desc__row:last-child { border-bottom: 0; }
.a-desc__label {
  width: 132px; flex: none; padding: 12px 16px; background: var(--a-fill-secondary);
  color: var(--a-text-secondary); font-size: var(--a-fs); border-right: 1px solid var(--a-border-secondary);
}
.a-desc__value { flex: 1; padding: 12px 16px; min-width: 0; }
.a-desc__value--pair { display: flex; }
.a-desc__value--pair > div { flex: 1; }

/* ═════════ Statistic ═════════ */
.a-stat__title { font-size: var(--a-fs); color: var(--a-text-secondary); margin-bottom: 4px; }
.a-stat__value {
  font-size: var(--a-fs-xxl); font-weight: 600; line-height: 1.35;
  font-variant-numeric: tabular-nums; display: flex; align-items: baseline; gap: 4px;
}
.a-stat__prefix, .a-stat__suffix { font-size: var(--a-fs); color: var(--a-text-secondary); font-weight: 400; }
.a-stat__trend { font-size: var(--a-fs-sm); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
.a-stat__up { color: var(--a-error); }
.a-stat__down { color: var(--a-success); }
.a-stat--lg .a-stat__value { font-size: var(--a-fs-huge); }

/* ═════════ Timeline ═════════ */
.a-timeline { position: relative; padding-left: 2px; }
.a-timeline__item { position: relative; padding: 0 0 var(--a-s5) 24px; }
.a-timeline__item:last-child { padding-bottom: 0; }
.a-timeline__item::before {
  content: ''; position: absolute; left: 5px; top: 14px; bottom: 0;
  width: 1px; background: var(--a-border-secondary);
}
.a-timeline__item:last-child::before { display: none; }
.a-timeline__dot {
  position: absolute; left: 0; top: 5px; width: 11px; height: 11px;
  border-radius: 50%; border: 2px solid var(--a-primary); background: var(--a-bg-container);
}
.a-timeline__dot--done { background: var(--a-primary); }
.a-timeline__dot--gray { border-color: var(--a-text-quaternary); }
.a-timeline__dot--red { border-color: var(--a-error); }
.a-timeline__dot--green { border-color: var(--a-success); }
.a-timeline__title { font-size: var(--a-fs); margin-bottom: 2px; }
.a-timeline__time { font-size: var(--a-fs-sm); color: var(--a-text-tertiary); }
.a-timeline__body { font-size: var(--a-fs-sm); color: var(--a-text-secondary); margin-top: 4px; }

/* ═════════ Collapse ═════════ */
.a-collapse { border: 1px solid var(--a-border-secondary); border-radius: var(--a-radius-lg); overflow: hidden; background: var(--a-fill-secondary); }
.a-collapse__item + .a-collapse__item { border-top: 1px solid var(--a-border-secondary); }
.a-collapse__head {
  display: flex; align-items: center; gap: var(--a-s2); width: 100%; text-align: left;
  padding: 12px 16px; border: 0; background: transparent; font-family: inherit;
  font-size: var(--a-fs); color: var(--a-text); cursor: pointer;
}
.a-collapse__head:hover { background: var(--a-fill-tertiary); }
.a-collapse__arrow { color: var(--a-text-tertiary); font-size: 11px; transition: transform .2s var(--a-ease); }
.a-collapse__head.is-open .a-collapse__arrow { transform: rotate(90deg); }
.a-collapse__body {
  padding: 0 16px 16px 34px; font-size: var(--a-fs); color: var(--a-text-secondary);
  background: var(--a-bg-container); display: none;
}
.a-collapse__body.is-open { display: block; }
.a-collapse__head.is-open { background: var(--a-bg-container); }

/* ═════════ Tabs ═════════ */
.a-tabs { border-bottom: 1px solid var(--a-border-secondary); display: flex; gap: var(--a-s5); overflow-x: auto; }
.a-tabs__item {
  border: 0; background: transparent; font-family: inherit; font-size: var(--a-fs);
  color: var(--a-text-secondary); padding: 10px 0; cursor: pointer; position: relative;
  white-space: nowrap; transition: color .2s var(--a-ease);
}
.a-tabs__item:hover { color: var(--a-primary-hover); }
.a-tabs__item.is-active { color: var(--a-primary-text); }
.a-tabs__item.is-active::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px;
  background: var(--a-primary); border-radius: 1px;
}
.a-tabs__item[disabled] { color: var(--a-text-quaternary); cursor: not-allowed; }
.a-tabs--card { border-bottom: 0; gap: 0; background: var(--a-fill-secondary); border: 1px solid var(--a-border-secondary); border-radius: var(--a-radius-lg) var(--a-radius-lg) 0 0; padding: 0 var(--a-s2); }
.a-tabs--card .a-tabs__item { padding: 10px 16px; }
.a-tabs--card .a-tabs__item.is-active { background: var(--a-bg-container); }
.a-tabs--card .a-tabs__item.is-active::after { display: none; }

/* ═════════ Steps ═════════ */
.a-steps { display: flex; gap: 0; }
.a-step { flex: 1; position: relative; }
.a-step__head { display: flex; align-items: center; gap: var(--a-s2); }
.a-step__num {
  width: 24px; height: 24px; border-radius: 50%; flex: none;
  display: grid; place-items: center; font-size: var(--a-fs-sm);
  background: var(--a-fill-tertiary); color: var(--a-text-tertiary);
}
.a-step--process .a-step__num { background: var(--a-primary); color: #fff; }
.a-step--finish .a-step__num { background: var(--a-primary-bg); color: var(--a-primary-text); }
.a-step--error .a-step__num { background: var(--a-error); color: #fff; }
.a-step__title { font-size: var(--a-fs); color: var(--a-text-tertiary); }
.a-step--process .a-step__title, .a-step--finish .a-step__title { color: var(--a-text); }
.a-step--process .a-step__title { font-weight: 600; }
.a-step__desc { font-size: var(--a-fs-sm); color: var(--a-text-tertiary); margin-top: 2px; padding-left: 32px; }
.a-step__line { position: absolute; top: 12px; left: 32px; right: 12px; height: 1px; background: var(--a-border-secondary); }
.a-step--finish .a-step__line { background: var(--a-primary-border); }
.a-step:last-child .a-step__line { display: none; }

/* ═════════ Pagination ═════════ */
.a-page { display: flex; align-items: center; gap: var(--a-s2); font-size: var(--a-fs); flex-wrap: wrap; }
.a-page__item {
  min-width: 32px; height: 32px; padding: 0 6px; display: grid; place-items: center;
  border: 1px solid var(--a-border); border-radius: var(--a-radius); background: var(--a-bg-container);
  color: var(--a-text); cursor: pointer; font-family: inherit; font-size: var(--a-fs);
  transition: all .2s var(--a-ease);
}
.a-page__item:hover { border-color: var(--a-primary); color: var(--a-primary); }
.a-page__item.is-active { border-color: var(--a-primary); color: var(--a-primary-text); font-weight: 500; }
.a-page__item[disabled] { color: var(--a-text-quaternary); border-color: var(--a-border); cursor: not-allowed; }
.a-page__jump { display: flex; align-items: center; gap: 6px; color: var(--a-text-secondary); }
.a-page__jump input { width: 44px; height: 32px; text-align: center; border: 1px solid var(--a-border); border-radius: var(--a-radius); font-family: inherit; font-size: var(--a-fs); background: var(--a-bg-container); color: var(--a-text); }
.a-page__total { color: var(--a-text-secondary); }

/* ═════════ Dropdown ═════════ */
.a-dropdown { position: relative; display: inline-block; }
.a-dropdown__menu {
  background: var(--a-bg-elevated); border-radius: var(--a-radius-lg); box-shadow: var(--a-shadow);
  border: 1px solid var(--a-border-secondary); padding: 4px; min-width: 132px;
}
.a-dropdown__item {
  display: flex; align-items: center; gap: var(--a-s2); padding: 5px 12px;
  border-radius: var(--a-radius-sm); font-size: var(--a-fs); cursor: pointer; color: var(--a-text);
}
.a-dropdown__item:hover { background: var(--a-fill-tertiary); }
.a-dropdown__item.is-danger { color: var(--a-error); }
.a-dropdown__item[disabled] { color: var(--a-text-quaternary); cursor: not-allowed; background: transparent; }
.a-dropdown__divider { height: 1px; background: var(--a-split); margin: 4px 0; }
.a-dropdown__group { font-size: var(--a-fs-sm); color: var(--a-text-quaternary); padding: 5px 12px 2px; }

/* ═════════ Tooltip ═════════ */
.a-tip-wrap { position: relative; display: inline-block; }
.a-tooltip {
  background: var(--a-bg-spotlight, rgba(0, 0, 0, 0.85)); color: #fff;
  padding: 6px 8px; border-radius: var(--a-radius); font-size: var(--a-fs-sm);
  max-width: 250px; line-height: 1.5715;
}
.a-tooltip--arrow::after {
  content: ''; position: absolute; left: 50%; bottom: -4px; transform: translateX(-50%) rotate(45deg);
  width: 8px; height: 8px; background: rgba(0, 0, 0, 0.85);
}
[data-dark="1"] .a-tooltip { background: #434343; }
[data-dark="1"] .a-tooltip--arrow::after { background: #434343; }

/* ═════════ Badge ═════════ */
.a-badge-wrap { position: relative; display: inline-flex; }
.a-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px;
  background: var(--a-error); color: #fff; font-size: var(--a-fs-sm);
  font-variant-numeric: tabular-nums; line-height: 1;
}
.a-badge--dot { min-width: 6px; width: 6px; height: 6px; padding: 0; border-radius: 50%; }
.a-badge--success { background: var(--a-success); }
.a-badge--default { background: var(--a-fill-tertiary); color: var(--a-text-secondary); box-shadow: 0 0 0 1px var(--a-border) inset; }
.a-badge__float { position: absolute; top: -6px; right: -8px; }
.a-badge__avatar {
  width: 40px; height: 40px; border-radius: var(--a-radius); background: var(--a-fill-tertiary);
  display: grid; place-items: center; color: var(--a-text-tertiary);
}
.a-badge__status { display: inline-flex; align-items: center; gap: 6px; font-size: var(--a-fs); }
.a-badge__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--a-success); }
.a-badge__dot--processing { box-shadow: 0 0 0 0 rgba(82, 196, 26, .5); animation: a-pulse 1.6s infinite; }
@keyframes a-pulse { 70% { box-shadow: 0 0 0 6px rgba(82, 196, 26, 0); } 100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0); } }
.a-badge__dot--default { background: var(--a-text-quaternary); }
.a-badge__dot--error { background: var(--a-error); }
.a-badge__dot--warning { background: var(--a-warning); }

/* ═════════ Alert ═════════ */
.a-alert {
  display: flex; gap: var(--a-s2); padding: 8px 12px; border-radius: var(--a-radius-lg);
  font-size: var(--a-fs); border: 1px solid; align-items: flex-start;
}
.a-alert__icon { flex: none; margin-top: 2px; }
.a-alert__icon svg { width: 14px; height: 14px; display: block; }
.a-alert__body { flex: 1; min-width: 0; }
.a-alert__title { font-weight: 600; }
.a-alert__desc { font-size: var(--a-fs-sm); margin-top: 2px; }
.a-alert--info { background: var(--a-primary-bg); border-color: var(--a-primary-border); color: var(--a-text); }
.a-alert--info .a-alert__icon { color: var(--a-primary); }
.a-alert--success { background: var(--a-success-bg); border-color: var(--a-success-border); }
.a-alert--success .a-alert__icon { color: var(--a-success); }
.a-alert--warning { background: var(--a-warning-bg); border-color: var(--a-warning-border); }
.a-alert--warning .a-alert__icon { color: var(--a-warning); }
.a-alert--error { background: var(--a-error-bg); border-color: var(--a-error-border); }
.a-alert--error .a-alert__icon { color: var(--a-error); }
.a-alert__close { flex: none; cursor: pointer; color: var(--a-text-tertiary); font-size: 12px; margin-top: 2px; }
.a-alert__close:hover { color: var(--a-text); }

/* ═════════ Result ═════════ */
.a-result { text-align: center; padding: var(--a-s6) var(--a-s4); }
.a-result__icon { margin-bottom: var(--a-s4); }
.a-result__icon svg { width: 64px; height: 64px; }
.a-result__title { font-size: var(--a-fs-xxl); font-weight: 500; margin: 0 0 var(--a-s2); line-height: 1.35; }
.a-result__desc { color: var(--a-text-secondary); font-size: var(--a-fs); margin: 0 0 var(--a-s5); }
.a-result__extra { display: flex; gap: var(--a-s2); justify-content: center; flex-wrap: wrap; }
.a-result__content {
  margin-top: var(--a-s5); padding: var(--a-s4); background: var(--a-fill-secondary);
  border-radius: var(--a-radius-lg); text-align: left; font-size: var(--a-fs);
}

/* ═════════ Popconfirm ═════════ */
.a-popconfirm {
  background: var(--a-bg-elevated); border-radius: var(--a-radius-lg); box-shadow: var(--a-shadow);
  border: 1px solid var(--a-border-secondary); padding: 12px; max-width: 260px;
}
.a-popconfirm__title { display: flex; gap: 6px; font-size: var(--a-fs); margin-bottom: var(--a-s3); }
.a-popconfirm__title svg { width: 14px; height: 14px; color: var(--a-warning); flex: none; margin-top: 3px; }
.a-popconfirm__ops { display: flex; justify-content: flex-end; gap: var(--a-s2); }

/* ═════════ Spin ═════════ */
.a-spin { display: inline-flex; align-items: center; gap: var(--a-s2); color: var(--a-primary); }
.a-spin__dot {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid var(--a-primary-bg-hover); border-top-color: var(--a-primary);
  animation: a-spin .9s linear infinite;
}
.a-spin__tip { font-size: var(--a-fs); color: var(--a-text-secondary); }
.a-spin-nest { position: relative; }
.a-spin-nest__mask {
  position: absolute; inset: 0; background: rgba(255, 255, 255, .6);
  display: grid; place-items: center; border-radius: var(--a-radius-lg);
}
[data-dark="1"] .a-spin-nest__mask { background: rgba(0, 0, 0, .45); }

/* ═════════ Progress ═════════ */
.a-progress-line { display: flex; align-items: center; gap: var(--a-s2); }
.a-progress-line__rail { flex: 1; height: 8px; background: var(--a-fill-tertiary); border-radius: 100px; overflow: hidden; min-width: 100px; }
.a-progress-line__bar { height: 100%; background: var(--a-primary); border-radius: 100px; transition: width .3s var(--a-ease); }
.a-progress-line__bar--success { background: var(--a-success); }
.a-progress-line__bar--error { background: var(--a-error); }
.a-progress-line__text { font-size: var(--a-fs-sm); color: var(--a-text-secondary); min-width: 36px; text-align: right; font-variant-numeric: tabular-nums; }
.a-progress-circle { position: relative; display: inline-grid; place-items: center; }
.a-progress-circle svg { transform: rotate(-90deg); display: block; }
.a-progress-circle__text { position: absolute; font-size: var(--a-fs-sm); font-weight: 500; font-variant-numeric: tabular-nums; }

/* ═════════ Modal / Drawer ═════════ */
.a-modal {
  background: var(--a-bg-elevated); border-radius: var(--a-radius-lg); box-shadow: var(--a-shadow-lg);
  width: 100%; max-width: 440px; overflow: hidden; border: 1px solid var(--a-border-secondary);
}
.a-modal__head { display: flex; align-items: flex-start; gap: var(--a-s2); padding: var(--a-s4) var(--a-s5) var(--a-s2); }
.a-modal__title { font-size: var(--a-fs-lg); font-weight: 600; flex: 1; margin: 0; }
.a-modal__close { border: 0; background: transparent; cursor: pointer; color: var(--a-text-tertiary); font-size: 14px; padding: 2px; }
.a-modal__close:hover { color: var(--a-text); }
.a-modal__body { padding: var(--a-s2) var(--a-s5) var(--a-s5); font-size: var(--a-fs); color: var(--a-text-secondary); }
.a-modal__foot { display: flex; justify-content: flex-end; gap: var(--a-s2); padding: 0 var(--a-s5) var(--a-s4); }
.a-drawer {
  background: var(--a-bg-elevated); box-shadow: var(--a-shadow-lg); width: 100%; max-width: 360px;
  height: 100%; display: flex; flex-direction: column; border-left: 1px solid var(--a-border-secondary);
}
.a-drawer__head { display: flex; align-items: center; padding: var(--a-s4) var(--a-s5); border-bottom: 1px solid var(--a-border-secondary); }
.a-drawer__title { font-size: var(--a-fs-lg); font-weight: 600; flex: 1; margin: 0; }
.a-drawer__body { padding: var(--a-s5); flex: 1; overflow-y: auto; font-size: var(--a-fs); }

/* ═════════ Message / Notification ═════════ */
.a-message {
  display: inline-flex; align-items: center; gap: var(--a-s2); padding: 9px 12px;
  background: var(--a-bg-elevated); border-radius: var(--a-radius-lg); box-shadow: var(--a-shadow);
  border: 1px solid var(--a-border-secondary); font-size: var(--a-fs);
}
.a-message svg { width: 14px; height: 14px; flex: none; }
.a-message--success svg { color: var(--a-success); }
.a-message--error svg { color: var(--a-error); }
.a-message--warning svg { color: var(--a-warning); }
.a-message--info svg { color: var(--a-primary); }
.a-notice {
  background: var(--a-bg-elevated); border-radius: var(--a-radius-lg); box-shadow: var(--a-shadow);
  border: 1px solid var(--a-border-secondary); padding: 12px 16px; max-width: 340px;
}
.a-notice__head { display: flex; align-items: flex-start; gap: var(--a-s2); margin-bottom: 4px; }
.a-notice__title { font-size: var(--a-fs); font-weight: 600; flex: 1; margin: 0; }
.a-notice__desc { font-size: var(--a-fs-sm); color: var(--a-text-secondary); line-height: 1.6; }
.a-notice__time { font-size: var(--a-fs-sm); color: var(--a-text-quaternary); margin-top: 6px; }

/* ═════════ Tag / Avatar ═════════ */
.a-tag {
  display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 7px;
  border-radius: var(--a-radius-sm); font-size: var(--a-fs-sm); line-height: 1;
  border: 1px solid var(--a-border); background: var(--a-fill-secondary); color: var(--a-text);
}
.a-tag--blue { background: var(--a-primary-bg); border-color: var(--a-primary-border); color: #0958d9; }
.a-tag--green { background: var(--a-success-bg); border-color: var(--a-success-border); color: #389e0d; }
.a-tag--orange { background: var(--a-warning-bg); border-color: var(--a-warning-border); color: #d46b08; }
.a-tag--red { background: var(--a-error-bg); border-color: var(--a-error-border); color: #cf1322; }
.a-tag--purple { background: #f9f0ff; border-color: #d3adf7; color: #531dab; }
[data-dark="1"] .a-tag--blue { color: #69b1ff; }
[data-dark="1"] .a-tag--green { color: #73d13d; }
[data-dark="1"] .a-tag--orange { color: #ffc53d; }
[data-dark="1"] .a-tag--red { color: #ff7875; }
[data-dark="1"] .a-tag--purple { background: #1a1325; border-color: #391085; color: #b37feb; }
.a-avatar {
  width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
  background: var(--a-primary); color: #fff; font-size: var(--a-fs); flex: none;
}
.a-avatar--sm { width: 24px; height: 24px; font-size: var(--a-fs-sm); }
.a-avatar--lg { width: 40px; height: 40px; font-size: var(--a-fs-lg); }
.a-avatar--square { border-radius: var(--a-radius); }
.a-avatar--gray { background: var(--a-fill-tertiary); color: var(--a-text-secondary); }
.a-avatar-group { display: inline-flex; }
.a-avatar-group .a-avatar { border: 2px solid var(--a-bg-container); margin-left: -8px; }
.a-avatar-group .a-avatar:first-child { margin-left: 0; }

/* ═════════ Divider ═════════ */
.a-divider { display: flex; align-items: center; gap: var(--a-s3); color: var(--a-text-tertiary); font-size: var(--a-fs); margin: var(--a-s5) 0; }
.a-divider::before, .a-divider::after { content: ''; flex: 1; height: 1px; background: var(--a-border-secondary); }
.a-divider--left::before { flex: 0 0 24px; }

/* ───────── 小工具 ───────── */
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: var(--a-fs-sm); }
.muted { color: var(--a-text-tertiary); }
.stack { display: flex; flex-direction: column; gap: var(--a-s3); }
.hr { height: 1px; background: var(--a-split); margin: var(--a-s4) 0; }

@media (max-width: 900px) {
  .sider { display: none; }
  .wrap { padding: var(--a-s4); }
  .topbar { padding: var(--a-s3) var(--a-s4); }
}
`;

// 图标（全部内联，零外部请求）
const ICON = {
  search: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" stroke-linecap="round"/></svg>',
  calendar: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3.5" width="12" height="10.5" rx="2"/><path d="M2 6.5h12M5.5 2v3M10.5 2v3"/></svg>',
  plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 5"/></svg>',
  close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  info: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.2v4M8 4.8v.6" stroke-linecap="round"/></svg>',
  success: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.5"/><path d="M5.2 8.2l2 2 3.6-4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warning: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 2.2l6 10.6H2z" stroke-linejoin="round"/><path d="M8 6v3M8 11v.5"/></svg>',
  error: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.5"/><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"/></svg>',
  file: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M9 1.5H4.5A1.5 1.5 0 003 3v10a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0013 13V5.5z"/><path d="M9 1.5V5.5h4"/></svg>',
  cloudupload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"/></svg>',
  result404: '<svg viewBox="0 0 64 64" fill="none" stroke="#bfbfbf" stroke-width="2.4"><circle cx="32" cy="32" r="26" stroke-dasharray="4 6"/><path d="M32 20v16M32 43v.5" stroke-linecap="round" stroke-width="3"/></svg>',
  // 结果页专用的大号图标（64 坐标系，线宽按比例调细）
  resultSuccess: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="32" cy="32" r="26" stroke-dasharray="4 6"/><path d="M21 32.5l7.5 7.5L43 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.2"/></svg>',
  resultWarning: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="32" cy="32" r="26" stroke-dasharray="4 6"/><path d="M32 20v16M32 43v.5" stroke-linecap="round" stroke-width="3.2"/></svg>',
};

// ═══════════════════════════════════════════════════════════
// 组件定义
// ═══════════════════════════════════════════════════════════
const COMPONENTS = [
  // ───────── 通用 ─────────
  {
    id: 'button', group: '通用', name: '按钮', en: 'Button',
    desc: '5 种类型 × 3 种尺寸。主按钮一屏最多一个，否则失去视觉焦点。',
    demo: () => `
      <span class="label">类型</span>
      <div class="row">
        <button class="a-btn a-btn--primary">主要按钮</button>
        <button class="a-btn">默认按钮</button>
        <button class="a-btn a-btn--dashed">虚线按钮</button>
        <button class="a-btn a-btn--text">文本按钮</button>
        <button class="a-btn a-btn--link">链接按钮</button>
      </div>
      <div class="row">
        <button class="a-btn a-btn--primary a-btn--danger">危险主按钮</button>
        <button class="a-btn a-btn--danger">危险按钮</button>
      </div>
      <div class="hr"></div>
      <span class="label">尺寸</span>
      <div class="row">
        <button class="a-btn a-btn--primary a-btn--lg">大按钮</button>
        <button class="a-btn a-btn--primary">中按钮</button>
        <button class="a-btn a-btn--primary a-btn--sm">小按钮</button>
      </div>
      <div class="hr"></div>
      <span class="label">状态</span>
      <div class="row">
        <button class="a-btn is-loading"><span class="spin-dot"></span>加载中</button>
        <button class="a-btn" disabled>禁用</button>
        <button class="a-btn a-btn--primary is-loading"><span class="spin-dot"></span>提交中</button>
        <button class="a-btn a-btn--primary" disabled>禁用主按钮</button>
      </div>
      <div class="row" style="margin-top:var(--a-s4)">
        <button class="a-btn a-btn--primary a-btn--block">块级按钮（撑满整行）</button>
      </div>`,
  },
  {
    id: 'input', group: '通用', name: '输入框', en: 'Input',
    desc: '带前后缀、错误态、禁用态。错误态必须同时在下方给出文字说明，只变红框不合格。',
    demo: () => `
      <div class="grid2">
        <div>
          <span class="label">基础</span>
          <input class="a-input" placeholder="请输入项目编码">
          <div style="height:12px"></div>
          <span class="label">带前缀图标</span>
          <div class="a-input--group">
            <span class="a-input__icon">${ICON.search}</span>
            <input class="a-input" placeholder="搜索招标公告">
          </div>
          <div style="height:12px"></div>
          <span class="label">带后缀</span>
          <div class="a-input--group" style="position:relative">
            <input class="a-input" value="2860000" style="padding-right:44px">
            <span class="a-input__suffix">元</span>
          </div>
        </div>
        <div>
          <span class="label">多行文本</span>
          <textarea class="a-textarea" placeholder="请填写跟进说明">已电话联系采购人陈工，确认预算含三年运维。</textarea>
          <div style="height:12px"></div>
          <span class="label">错误态</span>
          <input class="a-input a-input--error" value="YZZB-2026">
          <div class="a-form-item__help" style="color:var(--a-error)">项目编码格式不正确，应为 YZZB-YYYY-MMDD-NNN</div>
          <div style="height:12px"></div>
          <span class="label">禁用态</span>
          <input class="a-input" value="系统自动生成，不可编辑" disabled>
        </div>
      </div>`,
  },
  {
    id: 'select', group: '通用', name: '选择器', en: 'Select',
    desc: '选项少于 10 个用选择器，超过用搜索式下拉；区域这类固定枚举优先选择器。',
    demo: () => `
      <div class="grid2">
        <div>
          <span class="label">单选</span>
          <select class="a-select">
            <option>全部区域</option><option>云溪</option><option>市区</option><option>临江</option><option>市战客</option>
          </select>
          <div style="height:12px"></div>
          <span class="label">错误态</span>
          <select class="a-select" style="border-color:var(--a-error)">
            <option>请选择所属区域</option>
          </select>
          <div class="a-form-item__help" style="color:var(--a-error)">所属区域为必填项</div>
        </div>
        <div>
          <span class="label">尺寸</span>
          <select class="a-select" style="height:40px;font-size:16px"><option>大尺寸</option></select>
          <div style="height:8px"></div>
          <select class="a-select"><option>默认尺寸</option></select>
          <div style="height:8px"></div>
          <select class="a-select" style="height:24px;font-size:12px"><option>小尺寸</option></select>
          <div style="height:12px"></div>
          <span class="label">禁用</span>
          <select class="a-select" disabled><option>禁用状态</option></select>
        </div>
      </div>`,
  },

  // ───────── 数据录入 ─────────
  {
    id: 'datepicker', group: '数据录入', name: '日期选择器', en: 'DatePicker',
    desc: '★ 新增。点开有完整日历面板，含今天/选中/区间三种态。招标类系统的高频控件。',
    demo: () => `
      <div class="grid2">
        <div>
          <span class="label">收起态</span>
          <div class="a-picker">
            <span class="a-picker__icon">${ICON.calendar}</span>
            <button class="a-picker__input">2026-10-29</button>
          </div>
          <div style="height:12px"></div>
          <span class="label">展开态 · 今日高亮</span>
          <div class="a-cal">
            <div class="a-cal__head">
              <span class="a-cal__title">2026 年 10 月</span>
              <div class="a-cal__nav"><button>‹</button><button>›</button></div>
            </div>
            <div class="a-cal__grid">
              <div class="a-cal__dow">一</div><div class="a-cal__dow">二</div><div class="a-cal__dow">三</div>
              <div class="a-cal__dow">四</div><div class="a-cal__dow">五</div><div class="a-cal__dow">六</div><div class="a-cal__dow">日</div>
              <button class="a-cal__day is-out">28</button><button class="a-cal__day is-out">29</button><button class="a-cal__day is-out">30</button>
              <button class="a-cal__day">1</button><button class="a-cal__day">2</button><button class="a-cal__day">3</button><button class="a-cal__day">4</button>
              <button class="a-cal__day">5</button><button class="a-cal__day">6</button><button class="a-cal__day">7</button>
              <button class="a-cal__day">8</button><button class="a-cal__day">9</button><button class="a-cal__day">10</button><button class="a-cal__day">11</button>
              <button class="a-cal__day">12</button><button class="a-cal__day">13</button><button class="a-cal__day">14</button>
              <button class="a-cal__day">15</button><button class="a-cal__day">16</button><button class="a-cal__day">17</button><button class="a-cal__day">18</button>
              <button class="a-cal__day">19</button><button class="a-cal__day">20</button><button class="a-cal__day">21</button>
              <button class="a-cal__day">22</button><button class="a-cal__day">23</button><button class="a-cal__day">24</button><button class="a-cal__day">25</button>
              <button class="a-cal__day">26</button><button class="a-cal__day">27</button><button class="a-cal__day">28</button>
              <button class="a-cal__day is-selected">29</button><button class="a-cal__day">30</button><button class="a-cal__day">31</button><button class="a-cal__day is-out">1</button>
            </div>
            <div class="a-cal__foot"><a>今天</a><span class="muted">2026-10-29</span></div>
          </div>
        </div>
        <div>
          <span class="label">日期区间（投标截止范围，高频）</span>
          <div class="a-picker">
            <span class="a-picker__icon">${ICON.calendar}</span>
            <div class="a-picker__input a-picker__input--range" style="padding-left:32px">
              <span class="a-picker__seg">2026-10-01</span>
              <span class="a-picker__sep">→</span>
              <span class="a-picker__seg">2026-10-31</span>
            </div>
          </div>
          <div style="height:12px"></div>
          <span class="label">区间选中态</span>
          <div class="a-cal">
            <div class="a-cal__head">
              <span class="a-cal__title">2026 年 10 月</span>
              <div class="a-cal__nav"><button>‹</button><button>›</button></div>
            </div>
            <div class="a-cal__grid">
              <div class="a-cal__dow">一</div><div class="a-cal__dow">二</div><div class="a-cal__dow">三</div>
              <div class="a-cal__dow">四</div><div class="a-cal__dow">五</div><div class="a-cal__dow">六</div><div class="a-cal__dow">日</div>
              <button class="a-cal__day is-out">28</button><button class="a-cal__day is-out">29</button><button class="a-cal__day is-out">30</button>
              <button class="a-cal__day is-selected">1</button><button class="a-cal__day is-in-range">2</button><button class="a-cal__day is-in-range">3</button><button class="a-cal__day is-in-range">4</button>
              <button class="a-cal__day is-in-range">5</button><button class="a-cal__day is-in-range">6</button><button class="a-cal__day is-in-range">7</button>
              <button class="a-cal__day is-in-range">8</button><button class="a-cal__day is-in-range">9</button><button class="a-cal__day is-in-range">10</button><button class="a-cal__day is-in-range">11</button>
              <button class="a-cal__day is-in-range">12</button><button class="a-cal__day is-in-range">13</button><button class="a-cal__day is-in-range">14</button>
              <button class="a-cal__day is-in-range">15</button><button class="a-cal__day is-selected">16</button><button class="a-cal__day">17</button><button class="a-cal__day">18</button>
              <button class="a-cal__day">19</button><button class="a-cal__day">20</button><button class="a-cal__day">21</button>
              <button class="a-cal__day">22</button><button class="a-cal__day">23</button><button class="a-cal__day">24</button><button class="a-cal__day">25</button>
              <button class="a-cal__day">26</button><button class="a-cal__day">27</button><button class="a-cal__day">28</button>
              <button class="a-cal__day">29</button><button class="a-cal__day">30</button><button class="a-cal__day">31</button><button class="a-cal__day is-out">1</button>
            </div>
            <div class="a-cal__foot"><a>清除</a><span class="muted">2026-10-01 → 2026-10-16</span></div>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'tree', group: '数据录入', name: '树形控件', en: 'Tree',
    desc: '★ 新增。组织架构、区域层级必用。支持勾选、半选（子节点部分选中）、展开收起。',
    demo: () => `
      <div class="grid2">
        <div>
          <span class="label">可勾选（含半选态）</span>
          <div class="a-tree">
            <div class="a-tree__node">
              <span class="a-tree__switcher is-open">▶</span>
              <span class="a-tree__checkbox is-half"></span>
              <span class="a-tree__label">云州市</span>
              <span class="a-tree__count">5</span>
            </div>
            <div class="a-tree__children">
              <div class="a-tree__node is-selected">
                <span class="a-tree__switcher is-open">▶</span>
                <span class="a-tree__checkbox is-checked">${ICON.check}</span>
                <span class="a-tree__label">云溪一组</span>
                <span class="a-tree__count">2</span>
              </div>
              <div class="a-tree__children">
                <div class="a-tree__node"><span class="a-tree__switcher"></span><span class="a-tree__checkbox is-checked">${ICON.check}</span><span class="a-tree__label">周明轩</span></div>
                <div class="a-tree__node"><span class="a-tree__switcher"></span><span class="a-tree__checkbox is-checked">${ICON.check}</span><span class="a-tree__label">何雨桐</span></div>
              </div>
              <div class="a-tree__node">
                <span class="a-tree__switcher is-open">▶</span>
                <span class="a-tree__checkbox"></span>
                <span class="a-tree__label">云溪二组</span>
                <span class="a-tree__count">1</span>
              </div>
              <div class="a-tree__children">
                <div class="a-tree__node"><span class="a-tree__switcher"></span><span class="a-tree__checkbox"></span><span class="a-tree__label">苏诗涵</span></div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <span class="label">纯展示（区域选择，无勾选）</span>
          <div class="a-tree">
            <div class="a-tree__node"><span class="a-tree__switcher is-open">▶</span><span class="a-tree__label">临江县</span><span class="a-tree__count">3</span></div>
            <div class="a-tree__children">
              <div class="a-tree__node is-selected"><span class="a-tree__switcher"></span><span class="a-tree__label">青坪镇</span></div>
              <div class="a-tree__node"><span class="a-tree__switcher"></span><span class="a-tree__label">沙河镇</span></div>
              <div class="a-tree__node"><span class="a-tree__switcher"></span><span class="a-tree__label">柳溪镇</span></div>
            </div>
            <div class="a-tree__node"><span class="a-tree__switcher">▶</span><span class="a-tree__label">云溪区</span><span class="a-tree__count">2</span></div>
            <div class="a-tree__node"><span class="a-tree__switcher">▶</span><span class="a-tree__label">新丰区</span><span class="a-tree__count">1</span></div>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'cascader', group: '数据录入', name: '级联选择', en: 'Cascader',
    desc: '★ 新增。省-市-区、行业-子行业这种严格层级用级联，别用三个下拉拼。',
    demo: () => `
      <span class="label">展开态（已选：嘉南省 / 云州市）</span>
      <div class="a-cascader">
        <div class="a-cascader__col">
          <div class="a-cascader__item is-active">嘉南省 <span class="a-cascader__arrow">›</span></div>
          <div class="a-cascader__item">福建省 <span class="a-cascader__arrow">›</span></div>
          <div class="a-cascader__item">浙江省 <span class="a-cascader__arrow">›</span></div>
        </div>
        <div class="a-cascader__col">
          <div class="a-cascader__item">广州市 <span class="a-cascader__arrow">›</span></div>
          <div class="a-cascader__item is-active">云州市 <span class="a-cascader__arrow">›</span></div>
          <div class="a-cascader__item">汕头市 <span class="a-cascader__arrow">›</span></div>
          <div class="a-cascader__item">揭阳市 <span class="a-cascader__arrow">›</span></div>
        </div>
        <div class="a-cascader__col">
          <div class="a-cascader__item">新丰区</div>
          <div class="a-cascader__item is-active">云溪区</div>
          <div class="a-cascader__item">临江县</div>
        </div>
      </div>`,
  },
  {
    id: 'transfer', group: '数据录入', name: '穿梭框', en: 'Transfer',
    desc: '★ 新增。分配成员、挑选网站这类「从一堆里选几个」的场景比多选下拉清楚。',
    demo: () => `
      <div class="a-transfer">
        <div class="a-transfer__box">
          <div class="a-transfer__head"><input type="checkbox"> 待分配成员 <span class="a-transfer__count">3 人</span></div>
          <div class="a-transfer__list">
            <label class="a-transfer__item"><input type="checkbox" checked> 周明轩</label>
            <label class="a-transfer__item"><input type="checkbox" checked> 何雨桐</label>
            <label class="a-transfer__item"><input type="checkbox"> 许致远</label>
          </div>
        </div>
        <div class="a-transfer__ops">
          <button class="a-btn a-btn--primary a-btn--sm">›</button>
          <button class="a-btn a-btn--sm">‹</button>
        </div>
        <div class="a-transfer__box">
          <div class="a-transfer__head"><input type="checkbox"> 已分配成员 <span class="a-transfer__count">2 人</span></div>
          <div class="a-transfer__list">
            <label class="a-transfer__item"><input type="checkbox"> 邓浩然</label>
            <label class="a-transfer__item"><input type="checkbox"> 苏诗涵</label>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'segmented', group: '数据录入', name: '分段控制器', en: 'Segmented',
    desc: '★ 新增。2-5 个互斥选项快速切换，比 Tabs 轻、比单选框紧凑。',
    demo: () => `
      <div class="row">
        <div class="a-segmented">
          <button class="a-segmented__item is-active">全部</button>
          <button class="a-segmented__item">待分配</button>
          <button class="a-segmented__item">跟进中</button>
          <button class="a-segmented__item">已完成</button>
        </div>
        <div class="a-segmented">
          <button class="a-segmented__item is-active">列表</button>
          <button class="a-segmented__item">卡片</button>
        </div>
        <div class="a-segmented">
          <button class="a-segmented__item">日</button>
          <button class="a-segmented__item is-active">周</button>
          <button class="a-segmented__item">月</button>
        </div>
      </div>`,
  },
  {
    id: 'upload', group: '数据录入', name: '上传', en: 'Upload',
    desc: '★ 新增。报名材料、资质文件上传。必须显示单个文件的上传中和失败态。',
    demo: () => `
      <div class="grid2">
        <div>
          <span class="label">拖拽区</span>
          <div class="a-upload__trigger">
            ${ICON.cloudupload}
            <span>点击上传</span>
          </div>
          <div class="a-upload__list">
            <div class="a-upload__file">
              ${ICON.file}
              <span class="a-upload__name">营业执照.pdf</span>
              <span class="muted">2.4 MB</span>
              <span class="a-upload__del">${ICON.close}</span>
            </div>
            <div class="a-upload__file">
              <span class="spin-dot" style="color:var(--a-primary);width:12px;height:12px"></span>
              <span class="a-upload__name">资质证书.pdf</span>
              <span class="muted">上传中 62%</span>
            </div>
            <div class="a-upload__file is-error">
              ${ICON.error}
              <span class="a-upload__name">报价单.xlsx</span>
              <span>超出 10MB 限制</span>
            </div>
          </div>
        </div>
        <div>
          <span class="label">按钮式（适合塞进表单）</span>
          <div class="row">
            <button class="a-btn">${ICON.plus}选择文件</button>
            <span class="muted" style="font-size:12px">支持 pdf / docx / xlsx，单个不超过 10MB</span>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'slider', group: '数据录入', name: '滑动输入条', en: 'Slider',
    desc: '★ 新增。预算区间、百分比这类连续数值。拖不准的要配输入框。',
    demo: () => `
      <div style="max-width:420px">
        <span class="label">单值（预算 286 万）</span>
        <div class="a-slider" style="margin-bottom:28px">
          <div class="a-slider__rail">
            <div class="a-slider__track" style="width:57%"></div>
            <div class="a-slider__handle" style="left:57%"></div>
          </div>
          <div class="a-slider__marks"><span>0</span><span>250万</span><span>500万</span></div>
        </div>
        <span class="label">区间（预算范围）</span>
        <div class="a-slider" style="margin-bottom:28px">
          <div class="a-slider__rail">
            <div class="a-slider__track" style="left:20%;width:50%"></div>
            <div class="a-slider__handle" style="left:20%"></div>
            <div class="a-slider__handle" style="left:70%"></div>
          </div>
          <div class="a-slider__marks"><span>0</span><span>100万</span><span>200万</span></div>
        </div>
      </div>`,
  },
  {
    id: 'rate', group: '数据录入', name: '评分', en: 'Rate',
    desc: '★ 新增。客户意向度、代理商评级。别用在需要精确数值的地方。',
    demo: () => `
      <div class="row">
        <span class="muted" style="font-size:12px">意向度</span>
        <span class="a-rate">
          <svg class="is-on" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"/></svg>
          <svg class="is-on" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"/></svg>
          <svg class="is-on" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"/></svg>
          <svg class="is-on" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"/></svg>
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"/></svg>
        </span>
        <span class="muted" style="font-size:12px">4.0 分 · 高意向</span>
      </div>`,
  },
  {
    id: 'form', group: '数据录入', name: '表单校验', en: 'Form',
    desc: '★ 新增。必填星号、字段级错误、帮助文字三件套。错误只变边框不合格。',
    demo: () => `
      <div style="max-width:420px">
        <div class="a-form-item">
          <label class="a-form-item__label"><span class="req">*</span>小组名称</label>
          <input class="a-input" value="云溪三组">
          <div class="a-form-item__help">同区域内小组名称不可重复</div>
        </div>
        <div class="a-form-item a-form-item--error">
          <label class="a-form-item__label"><span class="req">*</span>管理员名称拼音</label>
          <input class="a-input" value="xuzhiyuan">
          <div class="a-form-item__help">该拼音已被「云溪一组」占用</div>
        </div>
        <div class="a-form-item" style="margin-bottom:0">
          <label class="a-form-item__label">备注</label>
          <textarea class="a-textarea" placeholder="选填"></textarea>
        </div>
      </div>`,
  },

  // ───────── 数据展示 ─────────
  {
    id: 'table', group: '数据展示', name: '表格', en: 'Table',
    desc: '带勾选、排序指示、选中行高亮。列超 7 个考虑折叠次要列。',
    demo: () => `
      <div style="overflow-x:auto">
        <table class="a-table">
          <thead><tr>
            <th class="a-table__check"><input type="checkbox"></th>
            <th>公告标题 <span class="a-table__sort"><i class="is-on">▲</i><i>▼</i></span></th>
            <th>采购人</th>
            <th style="text-align:right">预算金额</th>
            <th>所属区域</th>
            <th>进度</th>
            <th>报名截止</th>
          </tr></thead>
          <tbody>
            <tr class="is-selected">
              <td><input type="checkbox" checked></td>
              <td>临江县医共体总院服务能力提升工程</td>
              <td>临江县中医院</td>
              <td style="text-align:right" class="mono">286 万</td>
              <td>临江</td>
              <td><span class="a-tag a-tag--orange">跟进中</span></td>
              <td class="mono">2026-11-18</td>
            </tr>
            <tr>
              <td><input type="checkbox"></td>
              <td>云溪区智慧城管综合管理平台建设项目</td>
              <td>云溪区城管局</td>
              <td style="text-align:right" class="mono">512 万</td>
              <td>云溪</td>
              <td><span class="a-tag a-tag--blue">待分配</span></td>
              <td class="mono">2026-11-15</td>
            </tr>
            <tr>
              <td><input type="checkbox"></td>
              <td>云州农商银行数据中心机房改造及动环监控</td>
              <td>云州农商银行</td>
              <td style="text-align:right" class="mono">398 万</td>
              <td>市区</td>
              <td><span class="a-tag a-tag--green">已完成</span></td>
              <td class="mono">2026-11-12</td>
            </tr>
          </tbody>
        </table>
      </div>`,
  },
  {
    id: 'descriptions', group: '数据展示', name: '描述列表', en: 'Descriptions',
    desc: '★ 新增。详情页展示 10+ 字段的最佳载体，比卡片堆省空间。',
    demo: () => `
      <div class="a-desc">
        <div class="a-desc__row">
          <div class="a-desc__label">项目编码</div><div class="a-desc__value mono">YZZB-2026-1029-001</div>
          <div class="a-desc__label">采购人</div><div class="a-desc__value">临江县中医院</div>
        </div>
        <div class="a-desc__row">
          <div class="a-desc__label">预算金额</div><div class="a-desc__value">286 万元</div>
          <div class="a-desc__label">资金来源</div><div class="a-desc__value">财政资金</div>
        </div>
        <div class="a-desc__row">
          <div class="a-desc__label">所属区域</div><div class="a-desc__value">临江</div>
          <div class="a-desc__label">当前处理人</div><div class="a-desc__value">周明轩</div>
        </div>
        <div class="a-desc__row">
          <div class="a-desc__label">报名截止</div><div class="a-desc__value mono">2026-11-18</div>
          <div class="a-desc__label">开标时间</div><div class="a-desc__value mono">2026-11-21 09:30</div>
        </div>
      </div>`,
  },
  {
    id: 'statistic', group: '数据展示', name: '统计数值', en: 'Statistic',
    desc: '★ 新增。仪表盘数字卡。趋势用色要跟上箭头方向一致，别红涨绿跌。',
    demo: () => `
      <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        <div>
          <div class="a-stat__title">本月新增公告</div>
          <div class="a-stat__value">216 <span class="a-stat__suffix">条</span></div>
          <div class="a-stat__trend"><span class="a-stat__up">↑ 12.4%</span><span class="muted">较上月</span></div>
        </div>
        <div>
          <div class="a-stat__title">待分配</div>
          <div class="a-stat__value">9 <span class="a-stat__suffix">条</span></div>
          <div class="a-stat__trend"><span class="a-stat__down">↓ 3 条</span><span class="muted">较昨日</span></div>
        </div>
        <div>
          <div class="a-stat__title">中标金额</div>
          <div class="a-stat__value"><span class="a-stat__prefix">¥</span>1,286<span class="a-stat__suffix">万</span></div>
          <div class="a-stat__trend"><span class="a-stat__up">↑ 8.1%</span><span class="muted">较上月</span></div>
        </div>
        <div>
          <div class="a-stat__title">解析成功率</div>
          <div class="a-stat__value">98.4<span class="a-stat__suffix">%</span></div>
          <div class="a-stat__trend muted">今日解析 216 条</div>
        </div>
      </div>`,
  },
  {
    id: 'timeline', group: '数据展示', name: '时间轴', en: 'Timeline',
    desc: '★ 新增。进度记录、操作审计的标准展示，比流水账表格好读。',
    demo: () => `
      <div class="a-timeline">
        <div class="a-timeline__item">
          <span class="a-timeline__dot a-timeline__dot--done"></span>
          <div class="a-timeline__title"><b>已报名</b> · 周明轩</div>
          <div class="a-timeline__time">2026-10-30 10:30</div>
          <div class="a-timeline__body">完成报名材料提交，等待资格审查</div>
        </div>
        <div class="a-timeline__item">
          <span class="a-timeline__dot a-timeline__dot--done"></span>
          <div class="a-timeline__title"><b>已联系</b> · 周明轩</div>
          <div class="a-timeline__time">2026-10-29 14:05</div>
          <div class="a-timeline__body">已电话联系采购人陈工，确认预算含三年运维</div>
        </div>
        <div class="a-timeline__item">
          <span class="a-timeline__dot a-timeline__dot--done"></span>
          <div class="a-timeline__title"><b>分配任务</b> · 许致远</div>
          <div class="a-timeline__time">2026-10-29 09:20</div>
          <div class="a-timeline__body">分配给 临江一组 · 周明轩</div>
        </div>
        <div class="a-timeline__item">
          <span class="a-timeline__dot a-timeline__dot--green"></span>
          <div class="a-timeline__title"><b>抓取入库</b> · 系统</div>
          <div class="a-timeline__time">2026-10-29 08:15</div>
          <div class="a-timeline__body">定时任务 1 命中关键词：智慧、平台、监控</div>
        </div>
        <div class="a-timeline__item">
          <span class="a-timeline__dot a-timeline__dot--gray"></span>
          <div class="a-timeline__title muted">待开标</div>
          <div class="a-timeline__time">预计 2026-11-21 09:30</div>
        </div>
      </div>`,
  },
  {
    id: 'collapse', group: '数据展示', name: '折叠面板', en: 'Collapse',
    desc: '★ 新增。表单分组、FAQ、长说明。默认全收起会让用户多点一次，重要内容要展开。',
    demo: () => `
      <div class="a-collapse">
        <div class="a-collapse__item">
          <button class="a-collapse__head is-open">
            <span class="a-collapse__arrow">›</span>定时任务 1 · 抓取配置
          </button>
          <div class="a-collapse__body is-open">
            每隔 08:00 抓取 5 个站点，命中 44 个关键词之一即入库。超时 30 秒，失败重试 3 次。
          </div>
        </div>
        <div class="a-collapse__item">
          <button class="a-collapse__head">
            <span class="a-collapse__arrow">›</span>定时任务 2 · 解析落库
          </button>
          <div class="a-collapse__body">
            从公告正文提取 21 个字段，解析失败自动重试。
          </div>
        </div>
        <div class="a-collapse__item">
          <button class="a-collapse__head">
            <span class="a-collapse__arrow">›</span>任务提醒
          </button>
          <div class="a-collapse__body">
            管理员超时未分配、业务员任务未跟进时触发提醒。进度为「已完成」不再提醒。
          </div>
        </div>
      </div>`,
  },

  // ───────── 导航 ─────────
  {
    id: 'tabs', group: '导航', name: '标签页', en: 'Tabs',
    desc: '两种形态：下划线（默认）和卡片式。同层内容切换，不要超过 6 个。',
    demo: () => `
      <span class="label">下划线</span>
      <div class="a-tabs">
        <button class="a-tabs__item is-active">抓取配置</button>
        <button class="a-tabs__item">网站清单</button>
        <button class="a-tabs__item">抓取日志</button>
        <button class="a-tabs__item">提醒设置</button>
      </div>
      <div style="padding:14px 0;color:var(--a-text-secondary);font-size:13px">当前展示「抓取配置」的内容…</div>
      <div class="hr"></div>
      <span class="label">卡片式</span>
      <div class="a-tabs a-tabs--card">
        <button class="a-tabs__item is-active">全部</button>
        <button class="a-tabs__item">待分配</button>
        <button class="a-tabs__item">跟进中</button>
        <button class="a-tabs__item" disabled>已归档</button>
      </div>`,
  },
  {
    id: 'steps', group: '导航', name: '步骤条', en: 'Steps',
    desc: '多步表单、流程进度。超过 5 步考虑改成概览式。',
    demo: () => `
      <div class="a-steps">
        <div class="a-step a-step--finish">
          <div class="a-step__head"><span class="a-step__num">${ICON.check}</span><span class="a-step__title">填写信息</span></div>
          <div class="a-step__desc">2026-10-29</div>
          <div class="a-step__line"></div>
        </div>
        <div class="a-step a-step--process">
          <div class="a-step__head"><span class="a-step__num">2</span><span class="a-step__title">资格审核</span></div>
          <div class="a-step__desc">进行中</div>
          <div class="a-step__line"></div>
        </div>
        <div class="a-step">
          <div class="a-step__head"><span class="a-step__num">3</span><span class="a-step__title">提交报价</span></div>
          <div class="a-step__desc">待开始</div>
          <div class="a-step__line"></div>
        </div>
        <div class="a-step">
          <div class="a-step__head"><span class="a-step__num">4</span><span class="a-step__title">开标</span></div>
          <div class="a-step__desc">2026-11-21</div>
        </div>
      </div>`,
  },
  {
    id: 'pagination', group: '导航', name: '分页', en: 'Pagination',
    desc: '带总数和快速跳转。列表页必备。',
    demo: () => `
      <div class="a-page">
        <span class="a-page__total">共 216 条</span>
        <button class="a-page__item" disabled>‹</button>
        <button class="a-page__item is-active">1</button>
        <button class="a-page__item">2</button>
        <button class="a-page__item">3</button>
        <button class="a-page__item">4</button>
        <button class="a-page__item">…</button>
        <button class="a-page__item">22</button>
        <button class="a-page__item">›</button>
        <span class="a-page__jump">跳至 <input value="1"> 页</span>
      </div>`,
  },
  {
    id: 'dropdown', group: '导航', name: '下拉菜单', en: 'Dropdown',
    desc: '★ 新增。行内操作收纳，「更多」里放低频动作。危险项放最后一个并标红。',
    demo: () => `
      <div class="row row--start" style="gap:40px">
        <div>
          <span class="label">展开态</span>
          <div class="a-dropdown__menu" style="display:inline-block">
            <div class="a-dropdown__group">公告操作</div>
            <div class="a-dropdown__item">查看详情</div>
            <div class="a-dropdown__item">更新进度</div>
            <div class="a-dropdown__item">分配任务</div>
            <div class="a-dropdown__divider"></div>
            <div class="a-dropdown__item">导出 Excel</div>
            <div class="a-dropdown__item" disabled>归档（无权限）</div>
            <div class="a-dropdown__divider"></div>
            <div class="a-dropdown__item is-danger">删除公告</div>
          </div>
        </div>
        <div>
          <span class="label">触发按钮</span>
          <button class="a-btn">更多操作 ▾</button>
          <div style="height:12px"></div>
          <button class="a-btn a-btn--link">批量操作 ▾</button>
        </div>
      </div>`,
  },
  {
    id: 'breadcrumb', group: '导航', name: '面包屑', en: 'Breadcrumb',
    desc: '超过两层的页面必须有，否则用户不知道自己在哪。',
    demo: () => `
      <div class="row" style="gap:8px;font-size:13px">
        <a href="#" style="color:var(--a-text-tertiary);text-decoration:none">工作台</a>
        <span style="color:var(--a-text-quaternary)">/</span>
        <a href="#" style="color:var(--a-text-tertiary);text-decoration:none">招标公告</a>
        <span style="color:var(--a-text-quaternary)">/</span>
        <span>YZZB-2026-1029-001</span>
      </div>`,
  },

  // ───────── 反馈 ─────────
  {
    id: 'alert', group: '反馈', name: '警告提示', en: 'Alert',
    desc: '4 种语义 × 可关闭。页面级提示用横幅，字段级用下方的 help 文字。',
    demo: () => `
      <div class="stack">
        <div class="a-alert a-alert--info">
          <span class="a-alert__icon">${ICON.info}</span>
          <div class="a-alert__body">命中任一关键词即抓取入库。关键词过宽会引入大量无关公告。</div>
          <span class="a-alert__close">${ICON.close}</span>
        </div>
        <div class="a-alert a-alert--success">
          <span class="a-alert__icon">${ICON.success}</span>
          <div class="a-alert__body">
            <div class="a-alert__title">抓取成功</div>
            <div class="a-alert__desc">上次运行 2026-10-29 08:12，抓取 128 条，新增 2 条，耗时 16.7s</div>
          </div>
        </div>
        <div class="a-alert a-alert--warning">
          <span class="a-alert__icon">${ICON.warning}</span>
          <div class="a-alert__body">
            <div class="a-alert__title">2 条公告待分配超过 24 小时</div>
            <div class="a-alert__desc">云溪区智慧城管平台建设项目、临江县工业园区 5G 专网项目</div>
          </div>
          <span class="a-alert__close">${ICON.close}</span>
        </div>
        <div class="a-alert a-alert--error">
          <span class="a-alert__icon">${ICON.error}</span>
          <div class="a-alert__body">
            <div class="a-alert__title">「中云数科采购平台」连续 1 次超时</div>
            <div class="a-alert__desc">可能是站点改版或反爬策略调整，建议检查解析规则</div>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'result', group: '反馈', name: '结果页', en: 'Result',
    desc: '★ 新增。提交完成、无权限、404 的标准页。比 Toast 重、比纯空白页好。',
    demo: () => `
      <div class="grid2">
        <div class="a-result" style="padding:var(--a-s5)">
          <div class="a-result__icon" style="color:var(--a-success)">${ICON.resultSuccess}</div>
          <h3 class="a-result__title" style="font-size:20px">提交成功</h3>
          <p class="a-result__desc">报名材料已提交，预计 1 个工作日内完成资格审查。</p>
          <div class="a-result__extra">
            <button class="a-btn a-btn--primary">查看进度</button>
            <button class="a-btn">返回列表</button>
          </div>
        </div>
        <div class="a-result" style="padding:var(--a-s5)">
          <div class="a-result__icon" style="color:var(--a-text-quaternary)">${ICON.resultWarning}</div>
          <h3 class="a-result__title" style="font-size:20px">公告不存在</h3>
          <p class="a-result__desc">项目编码 YZZB-2026-1029-001 未找到，可能已过期下线。</p>
          <div class="a-result__extra">
            <button class="a-btn a-btn--primary">返回公告列表</button>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'popconfirm', group: '反馈', name: '气泡确认', en: 'Popconfirm',
    desc: '★ 新增。破坏性小操作二次确认，比整页 Modal 轻。删除类必须用。',
    demo: () => `
      <div class="row row--start" style="gap:32px">
        <div>
          <span class="label">气泡确认框</span>
          <div class="a-popconfirm">
            <div class="a-popconfirm__title">
              ${ICON.warning}
              <span>确定要删除这条公告吗？删除后不可恢复。</span>
            </div>
            <div class="a-popconfirm__ops">
              <button class="a-btn a-btn--sm">取消</button>
              <button class="a-btn a-btn--primary a-btn--danger a-btn--sm">删除</button>
            </div>
          </div>
        </div>
        <div>
          <span class="label">触发元素</span>
          <button class="a-btn a-btn--danger">删除公告</button>
          <div style="height:12px"></div>
          <button class="a-btn a-btn--link" style="color:var(--a-error)">清空选择</button>
        </div>
      </div>`,
  },
  {
    id: 'spin', group: '反馈', name: '加载中', en: 'Spin',
    desc: '★ 新增。局部加载用内联，整块加载用遮罩。别让用户面对白屏干等。',
    demo: () => `
      <div class="grid2">
        <div>
          <span class="label">内联</span>
          <div class="row">
            <span class="a-spin"><span class="a-spin__dot"></span><span class="a-spin__tip">加载中…</span></span>
            <span class="a-spin" style="color:var(--a-text-tertiary)"><span class="a-spin__dot" style="border-color:var(--a-fill-tertiary);border-top-color:var(--a-text-tertiary)"></span><span class="a-spin__tip">同步中…</span></span>
          </div>
          <div style="height:16px"></div>
          <span class="label">按钮内</span>
          <button class="a-btn a-btn--primary is-loading"><span class="spin-dot"></span>提交中</button>
        </div>
        <div>
          <span class="label">区块遮罩</span>
          <div class="a-spin-nest">
            <div class="a-desc" style="opacity:.5">
              <div class="a-desc__row"><div class="a-desc__label">项目编码</div><div class="a-desc__value mono">YZZB-2026-1029-001</div></div>
              <div class="a-desc__row"><div class="a-desc__label">采购人</div><div class="a-desc__value">临江县中医院</div></div>
            </div>
            <div class="a-spin-nest__mask"><span class="a-spin"><span class="a-spin__dot"></span></span></div>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'progress', group: '反馈', name: '进度条', en: 'Progress',
    desc: '线性用于流程，环形用于配额。超过 100% 要变成「超出」而不是继续画满。',
    demo: () => `
      <div style="max-width:460px">
        <span class="label">线性</span>
        <div class="a-progress-line"><div class="a-progress-line__rail"><div class="a-progress-line__bar" style="width:62%"></div></div><span class="a-progress-line__text">62%</span></div>
        <div style="height:12px"></div>
        <div class="a-progress-line"><div class="a-progress-line__rail"><div class="a-progress-line__bar a-progress-line__bar--success" style="width:100%"></div></div><span class="a-progress-line__text" style="color:var(--a-success)">✓</span></div>
        <div style="height:12px"></div>
        <div class="a-progress-line"><div class="a-progress-line__rail"><div class="a-progress-line__bar a-progress-line__bar--error" style="width:30%"></div></div><span class="a-progress-line__text" style="color:var(--a-error)">30%</span></div>
        <div class="hr"></div>
        <span class="label">环形</span>
        <div class="row" style="gap:24px">
          ${[['75', '78%', '#1677ff'], ['100', '100%', '#52c41a'], ['30', '30%', '#ff4d4f']].map(([p, t, c]) => `
            <div class="a-progress-circle">
              <svg width="88" height="88" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r="38" fill="none" stroke="var(--a-fill-tertiary)" stroke-width="8"/>
                <circle cx="44" cy="44" r="38" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"
                  stroke-dasharray="${(2 * Math.PI * 38).toFixed(1)}" stroke-dashoffset="${(2 * Math.PI * 38 * (1 - p / 100)).toFixed(1)}"/>
              </svg>
              <span class="a-progress-circle__text">${t}</span>
            </div>`).join('')}
        </div>
      </div>`,
  },
  {
    id: 'message', group: '反馈', name: '全局提示', en: 'Message / Notification',
    desc: '★ 新增。Message 走后自动消失，Notification 带标题可停留。',
    demo: () => `
      <div class="grid2">
        <div>
          <span class="label">Message（顶部居中，3 秒自动消失）</span>
          <div class="stack" style="align-items:flex-start">
            <div class="a-message a-message--success">${ICON.success}已分配 3 条公告</div>
            <div class="a-message a-message--error">${ICON.error}拼音重复，请更换</div>
            <div class="a-message a-message--warning">${ICON.warning}该站点连续超时</div>
            <div class="a-message a-message--info">${ICON.info}链接已复制</div>
          </div>
        </div>
        <div>
          <span class="label">Notification（右上角，需手动关闭）</span>
          <div class="a-notice">
            <div class="a-notice__head">
              <span class="a-notice__title">定时任务 1 执行完成</span>
              <span style="color:var(--a-text-quaternary)">${ICON.close}</span>
            </div>
            <div class="a-notice__desc">抓取 5 个站点共 128 条，新增 2 条，1 个站点超时。</div>
            <div class="a-notice__time">2026-10-29 08:12</div>
          </div>
        </div>
      </div>`,
  },

  // ───────── 其他 ─────────
  {
    id: 'tag', group: '其他', name: '标签 / 徽标', en: 'Tag / Badge',
    desc: '标签做分类，徽标做计数。计数超过 99 显示 99+。',
    demo: () => `
      <span class="label">标签</span>
      <div class="row">
        <span class="a-tag">默认</span>
        <span class="a-tag a-tag--blue">监控</span>
        <span class="a-tag a-tag--green">已完成</span>
        <span class="a-tag a-tag--orange">跟进中</span>
        <span class="a-tag a-tag--red">已放弃</span>
        <span class="a-tag a-tag--purple">战略客户</span>
      </div>
      <div class="hr"></div>
      <span class="label">徽标</span>
      <div class="row" style="gap:24px">
        <span class="a-badge">9</span>
        <span class="a-badge">99+</span>
        <span class="a-badge a-badge--success">3</span>
        <span class="a-badge a-badge--dot"></span>
        <span class="a-badge a-badge--default">0</span>
        <span class="a-badge-wrap">
          <span class="a-badge__avatar">${ICON.file}</span>
          <span class="a-badge a-badge__float">12</span>
        </span>
      </div>
      <div class="hr"></div>
      <span class="label">状态点</span>
      <div class="row" style="gap:20px">
        <span class="a-badge__status"><span class="a-badge__dot a-badge__dot--processing"></span>处理中</span>
        <span class="a-badge__status"><span class="a-badge__dot"></span>成功</span>
        <span class="a-badge__status"><span class="a-badge__dot a-badge__dot--warning"></span>告警</span>
        <span class="a-badge__status"><span class="a-badge__dot a-badge__dot--error"></span>失败</span>
        <span class="a-badge__status"><span class="a-badge__dot a-badge__dot--default"></span>停用</span>
      </div>`,
  },
  {
    id: 'avatar', group: '其他', name: '头像', en: 'Avatar',
    desc: '单人用单个，多人用头像组。没有头像时用姓名首字，不要用占位图。',
    demo: () => `
      <div class="row" style="gap:28px">
        <div>
          <span class="label">尺寸</span>
          <div class="row">
            <span class="a-avatar a-avatar--sm">陈</span>
            <span class="a-avatar">陈</span>
            <span class="a-avatar a-avatar--lg">陈</span>
            <span class="a-avatar a-avatar--lg a-avatar--square">陈</span>
            <span class="a-avatar a-avatar--lg a-avatar--gray">郑</span>
          </div>
        </div>
        <div>
          <span class="label">头像组</span>
          <div class="a-avatar-group">
            <span class="a-avatar">陈</span>
            <span class="a-avatar" style="background:#52c41a">郑</span>
            <span class="a-avatar" style="background:#faad14">林</span>
            <span class="a-avatar a-avatar--gray">+3</span>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'tooltip', group: '其他', name: '文字提示', en: 'Tooltip',
    desc: '★ 新增。解释图标含义、显示被截断的全文。别把关键信息只放在 tooltip 里。',
    demo: () => `
      <div class="row row--start" style="gap:32px">
        <div>
          <span class="label">提示气泡</span>
          <div class="a-tip-wrap" style="margin-bottom:12px">
            <div class="a-tooltip a-tooltip--arrow">命中 3 个关键词：智慧、平台、监控</div>
          </div>
          <div style="height:16px"></div>
          <div class="a-tooltip">这是一段较长的说明文字，用于解释某个字段的计算口径。</div>
        </div>
        <div>
          <span class="label">触发元素</span>
          <div class="row">
            <button class="a-btn">悬停查看</button>
            <span style="color:var(--a-text-tertiary);border-bottom:1px dashed var(--a-border);cursor:help">业务标签 ⓘ</span>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'divider', group: '其他', name: '分割线', en: 'Divider',
    desc: '纯视觉分隔，不承载语义。分组用标题，别堆一堆分割线。',
    demo: () => `
      <div>上方内容</div>
      <div class="a-divider">分割文字</div>
      <div>下方内容</div>
      <div class="a-divider a-divider--left">左对齐标题</div>
      <div class="muted" style="font-size:12px">用于组内分段</div>`,
  },
  {
    id: 'modal', group: '其他', name: '弹窗 / 抽屉', en: 'Modal / Drawer',
    desc: '少量确认用 Modal，查看详情用 Drawer（不打断上下文）。都不用 alert()。',
    demo: () => `
      <div class="row row--start" style="gap:24px;align-items:stretch">
        <div style="flex:1;min-width:300px">
          <span class="label">Modal（居中，确认类）</span>
          <div class="a-modal">
            <div class="a-modal__head">
              <h3 class="a-modal__title">批量分配任务</h3>
              <button class="a-modal__close">${ICON.close}</button>
            </div>
            <div class="a-modal__body">
              已选 <b>3</b> 条招标公告，将统一分配给同一处理人。
              <div style="height:12px"></div>
              <select class="a-select"><option>云溪一组（云溪）</option><option>市区一组（市区）</option></select>
            </div>
            <div class="a-modal__foot">
              <button class="a-btn">取消</button>
              <button class="a-btn a-btn--primary">确认分配</button>
            </div>
          </div>
        </div>
        <div style="flex:0 0 300px">
          <span class="label">Drawer（右侧，详情类）</span>
          <div class="a-drawer" style="height:auto">
            <div class="a-drawer__head">
              <h3 class="a-drawer__title">公告详情</h3>
              <button class="a-modal__close">${ICON.close}</button>
            </div>
            <div class="a-drawer__body">
              <div class="muted" style="font-size:12px;margin-bottom:8px">YZZB-2026-1029-001</div>
              <div style="margin-bottom:12px">临江县医共体总院服务能力提升工程设备采购项目</div>
              <div class="row" style="gap:6px"><span class="a-tag a-tag--blue">监控</span><span class="a-tag a-tag--blue">平台</span></div>
            </div>
          </div>
        </div>
      </div>`,
  },
];

// ═══════════════════════════════════════════════════════════
// 渲染
// ═══════════════════════════════════════════════════════════

const GROUPS = ['通用', '数据录入', '数据展示', '导航', '反馈', '其他'];

const renderSections = () => GROUPS.map(g => {
  const items = COMPONENTS.filter(c => c.group === g);
  if (!items.length) return '';
  return `
  <h2 style="font-size:16px;font-weight:600;margin:var(--a-s6) 0 var(--a-s3);color:var(--a-text-tertiary)">${g}</h2>
  ${items.map(c => `
  <section class="sec" id="${c.id}">
    <div class="sec__head">
      <h3 class="sec__name">${c.name}</h3>
      <span class="sec__en">${c.en}</span>
    </div>
    <p class="sec__desc">${c.desc}</p>
    <div class="panel">${c.demo()}</div>
  </section>`).join('')}`;
}).join('');

const renderNav = () => GROUPS.map(g => {
  const items = COMPONENTS.filter(c => c.group === g);
  if (!items.length) return '';
  return `<div class="sider__group">${g}</div>`
    + items.map(c => `<a class="sider__link" href="#${c.id}" data-id="${c.id}">${c.name}</a>`).join('');
}).join('');

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ant Design 风格控件参考 · req2proto</title>
<style>${TOKENS}${CSS}</style>
</head>
<body>
<div class="layout">
  <aside class="sider">
    <div class="sider__brand">
      <div class="sider__logo">A</div>
      <div>
        <div class="sider__title">Ant Design</div>
        <div class="sider__sub">风格控件参考 · ${COMPONENTS.length} 个</div>
      </div>
    </div>
    ${renderNav()}
    <div class="sider__group">说明</div>
    <div style="padding:0 var(--a-s5) 24px;font-size:12px;color:var(--a-text-tertiary);line-height:1.7">
      零外部请求，全部内联。<br>
      与 <span class="mono">components.html</span>（自有设计语言）并存。<br>
      标 ★ 的是自有组件页没有的。
    </div>
  </aside>

  <div class="main">
    <div class="topbar">
      <h1>Ant Design 风格控件参考</h1>
      <span class="a-tag a-tag--blue">${COMPONENTS.length} 个组件</span>
      <span class="topbar__spacer"></span>
      <button class="a-btn a-btn--sm" id="toggle-dark">暗色</button>
    </div>
    <div class="wrap">
      <div class="a-alert a-alert--info" style="margin-bottom:var(--a-s5)">
        <span class="a-alert__icon">${ICON.info}</span>
        <div class="a-alert__body">
          这份是 <b>Ant Design 5 风格</b>的控件参考，用的 token 是 antd 的（主色 #1677ff、圆角 6px、14px 基准字号）。
          它和 <span class="mono">assets/components.html</span> 那套自有设计语言是两套体系，按项目气质选一套用，不要混。
        </div>
      </div>
      ${renderSections()}
    </div>
  </div>
</div>

<script>
// 暗色切换（对应 antd 的 darkAlgorithm）
(function () {
  var root = document.documentElement;
  var btn = document.getElementById('toggle-dark');
  var saved = localStorage.getItem('antd-demo-dark');
  if (saved === '1') { root.setAttribute('data-dark', '1'); btn.textContent = '亮色'; }
  btn.addEventListener('click', function () {
    var on = root.getAttribute('data-dark') === '1';
    if (on) { root.removeAttribute('data-dark'); btn.textContent = '暗色'; localStorage.setItem('antd-demo-dark', '0'); }
    else { root.setAttribute('data-dark', '1'); btn.textContent = '亮色'; localStorage.setItem('antd-demo-dark', '1'); }
  });
})();

// 侧边栏当前项高亮
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.sider__link'));
  var secs = links.map(function (a) { return document.getElementById(a.dataset.id); }).filter(Boolean);
  function sync() {
    // 用 getBoundingClientRect 相对视口判断，避免嵌套容器里 offsetTop 参照物不一致
    var probe = 120; // 顶部吸附栏高度 + 余量
    var cur = secs[0];
    secs.forEach(function (s) {
      if (s.getBoundingClientRect().top <= probe) cur = s;
    });
    links.forEach(function (a) { a.classList.toggle('is-active', cur && a.dataset.id === cur.id); });
  }
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync, { passive: true });
  sync();
})();

// 让演示元素能点：折叠面板 / 标签页 / 分段控制器 / 树节点
document.addEventListener('click', function (e) {
  var t = e.target.closest('.a-collapse__head');
  if (t) {
    t.classList.toggle('is-open');
    var body = t.nextElementSibling;
    if (body) body.classList.toggle('is-open');
    return;
  }
  var tab = e.target.closest('.a-tabs__item');
  if (tab && !tab.disabled) {
    tab.parentElement.querySelectorAll('.a-tabs__item').forEach(function (x) { x.classList.remove('is-active'); });
    tab.classList.add('is-active');
    return;
  }
  var seg = e.target.closest('.a-segmented__item');
  if (seg) {
    seg.parentElement.querySelectorAll('.a-segmented__item').forEach(function (x) { x.classList.remove('is-active'); });
    seg.classList.add('is-active');
    return;
  }
  var day = e.target.closest('.a-cal__day');
  if (day && !day.classList.contains('is-out')) {
    var grid = day.closest('.a-cal__grid');
    if (grid) grid.querySelectorAll('.a-cal__day').forEach(function (x) { x.classList.remove('is-selected'); });
    day.classList.add('is-selected');
    return;
  }
  var node = e.target.closest('.a-tree__node');
  if (node) {
    node.parentElement.querySelectorAll(':scope > .a-tree__node').forEach(function (x) { x.classList.remove('is-selected'); });
    node.classList.add('is-selected');
    var cb = node.querySelector('.a-tree__checkbox');
    if (cb) cb.classList.toggle('is-checked');
    return;
  }
  var rate = e.target.closest('.a-rate svg');
  if (rate) {
    var all = Array.prototype.slice.call(rate.parentElement.children);
    var idx = all.indexOf(rate);
    all.forEach(function (s, i) { s.classList.toggle('is-on', i <= idx); });
    return;
  }
});
</script>
</body>
</html>
`;

const OUT = join(SKILL, 'assets', 'components-antd.html');
writeFileSync(OUT, HTML);

const kb = (Buffer.byteLength(HTML) / 1024).toFixed(1);
const star = COMPONENTS.filter(c => c.desc.includes('★')).length;
console.log(`✓ ${OUT}  ${kb}KB`);
console.log(`  组件 ${COMPONENTS.length} 个（标 ★ 新增 ${star} 个）`);
console.log(`  分组：${GROUPS.map(g => g + '(' + COMPONENTS.filter(c => c.group === g).length + ')').join(' · ')}`);

// 自检：不能有外部请求
const ext = [...HTML.matchAll(/<(?:link|script|img)\b[^>]*(?:href|src)\s*=\s*["']?(?:https?:)?\/\//gi)];
if (ext.length) { console.error(`✗ 发现 ${ext.length} 处外部请求`); process.exit(1); }
console.log('  ✓ 外部请求 0 处');
