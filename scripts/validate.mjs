#!/usr/bin/env node
/**
 * validate.mjs — req2proto 单文件 HTML 原型的结构契约校验器
 * 用法：node scripts/validate.mjs <file.html> [--json] [--strict]
 * 退出码：0 通过 / 1 有 error（--strict 下 warn 也算） / 2 参数错误或文件不存在
 * 零依赖：只用 node 内置模块，纯正则检查，不引 HTML 解析库。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SIZE_LIMIT = 400 * 1024; // 单文件体积上限
const PAGE_LIMIT = 8; // 路由超过这个数就建议拆批
const LONG_LINE = 5000; // base64 单行长度阈值
const MAX_PER_RULE = 6; // 同类问题最多逐条列几条
const LABEL_WIDTH = 16; // 人类可读输出的标签列宽
const USAGE = `用法: node scripts/validate.mjs <file.html> [--json] [--strict]

  <file.html>  要校验的原型文件（单文件 HTML）
  --json       输出 JSON（供程序消费）
  --strict     把 warn 也当 error（退出码按 error 算）`;

// ═════ 文本工具 ═════

const blank = (s) => s.replace(/[^\n]/g, ' '); // 非换行字符换成空格，保持偏移
const countOf = (text, re) => (text.match(re) ?? []).length;

// 剥注释：HTML → 块注释 → <script> 里的 // 行注释。行注释只在「行首/空白/标点」后才认，
// 所以 https://、href="//cdn"、url(//cdn)、正则 \/\/ 都不会误伤；等长替换，偏移可复用。
// #req-map 的 JSON 块跳过（JSON 里不该有注释）。
const stripComments = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)/gi, (m, open, body, close) => {
      if (/application\/json/i.test(open)) return m;
      const stripped = body.replace(/(^|[\s;{},\[\]])\/\/[^\n]*/gm, (x, p) => p + blank(x.slice(p.length)));
      return open + stripped + close;
    });

// 字符偏移 → 行号（1 起）
const makeLineOf = (text) => (idx) => text.slice(0, idx).split('\n').length;

// 抹掉多余空白并截断——用于报错里的元素片段
const snippet = (s, max = 80) => {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
};

// 读标签属性：没有该属性返回 undefined，有但值为空返回 ''；兼容裸属性与三种引号
const attrOf = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : undefined;
};
const hasAttr = (tag, name) => attrOf(tag, name) !== undefined || new RegExp(`\\s${name}(?=[\\s=/>])`, 'i').test(tag);

// 该标签是否算「缺 data-req」：带逃生舱 data-no-req 或已有非空 data-req 都不算
const lacksReq = (tag) => !hasAttr(tag, 'data-no-req') && !(attrOf(tag, 'data-req') ?? '').trim();

// 中日韩字符按 2 字宽算，保证人类可读输出列对齐
const widthOf = (s) => [...s].reduce((w, ch) => w + (/[\u2e80-\u9fff\u3000-\u303f\uff00-\uff60]/.test(ch) ? 2 : 1), 0);
const padLabel = (label) => label + ' '.repeat(Math.max(1, LABEL_WIDTH - widthOf(label)));

// ═════ 匹配模式表：每项 [正则, 命中名 or (match) => 名] ═════

// 外部资源：link/script/img/a 的 href|src 走协议、@import、CSS url()，全算外链
const EXTERNAL = [
  [/<(link|script|img|a)\b[^>]*\b(?:href|src)\s*=\s*["']?\s*(?:https?:)?\/\/[^>]*>/gi, (m) => `外部 <${m[1]}>`],
  [/@import\b[^;\n]*?(?:https?:)?\/\//gi, () => '@import 外部样式'],
  [/\burl\(\s*["']?\s*(?:https?:)?\/\/[^\s)"']*/gi, () => 'CSS url() 外部资源'],
];
// 真实网络请求：原型不该联网
const NETWORK = [
  [/\bfetch\s*\(/g, () => 'fetch()'],
  [/XMLHttpRequest/g, () => 'XMLHttpRequest'],
  [/\baxios\b/g, () => 'axios'],
];
// 阻塞式弹窗必须是函数调用，alert-danger 这类类名不含 ( 不会命中
const BLOCKING = [[/\b(alert|confirm|prompt)\s*\(/g, (m) => `${m[1]}()`]];

const DATA_REQ_RE = /\bdata-req\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const PLACEHOLDERS = [[/lorem ipsum/gi, 'lorem ipsum'], [/张三/g, '张三'], [/TODO/g, 'TODO'], [/x{3,}/i, 'xxx'], [/test123/gi, 'test123']];

// ═════ #req-map ═════

// 找 <script ... id="req-map"> 并解析；状态：missing / empty / invalid / ok
const parseReqMap = (html) => {
  let block = null;
  for (const m of html.matchAll(/<script\b[^>]*>/gi)) {
    // 负向后顾：避免 <script data-id="req-map"> 这类误命中
    if (!/(?<![\w-])id\s*=\s*["']?req-map["']?/i.test(m[0])) continue;
    const start = m.index + m[0].length;
    const end = html.toLowerCase().indexOf('</script', start);
    block = { index: m.index, body: end === -1 ? html.slice(start) : html.slice(start, end) };
    break;
  }
  if (!block) return { status: 'missing', entries: [], block: null };
  const body = block.body.trim();
  if (!body || /^\[\s*\]$/.test(body)) return { status: 'empty', entries: [], block };
  try {
    const data = JSON.parse(body);
    if (!Array.isArray(data)) return { status: 'invalid', entries: [], block, reason: '内容不是数组' };
    const bad = data.findIndex((it) => !it || typeof it !== 'object' || !String(it.id ?? '').trim());
    if (bad !== -1) return { status: 'invalid', entries: [], block, reason: `第 ${bad + 1} 条缺 id 字段` };
    return { status: 'ok', entries: data, block };
  } catch (err) {
    return { status: 'invalid', entries: [], block, reason: `JSON 解析失败（${err.message}）` };
  }
};

// ═════ 问题收集 ═════

// 上报一批同类问题：只列前几条，剩下的兜一句汇总；item.index 用来换算行号
const report = (ctx, level, rule, items, toMessage) => {
  const bucket = level === 'error' ? ctx.errors : ctx.warnings;
  for (const it of items.slice(0, MAX_PER_RULE)) {
    bucket.push({ rule, message: toMessage(it), line: it.index == null ? null : ctx.lineOf(it.index) });
  }
  if (items.length > MAX_PER_RULE) bucket.push({ rule, message: `另有 ${items.length - MAX_PER_RULE} 处同类问题未逐条列出`, line: null });
};

// 只报一条的规则用这个，省掉 items 包装
const reportOne = (ctx, level, rule, msg, index = null) => report(ctx, level, rule, [{ index }], () => msg);

// 通用扫描：跑一组模式收集命中，按规则上报，返回命中数
const scanPatterns = (ctx, level, rule, patterns, toMessage) => {
  const hits = patterns
    .flatMap(([re, nameOf]) => [...ctx.code.matchAll(re)].map((m) => ({ index: m.index, name: nameOf(m), text: snippet(ctx.raw.slice(m.index, m.index + 60)) })))
    .sort((a, b) => a.index - b.index);
  report(ctx, level, rule, hits, toMessage);
  return hits.length;
};

// ═════ 各条规则 ═════

// 路由集合：req-map 的 route 字段 ∪ 代码里引号包裹的 '#/...'
const collectRoutes = (ctx) => {
  const routes = new Set();
  for (const e of ctx.reqMap.entries) {
    const route = typeof e.route === 'string' ? e.route.trim() : '';
    if (route.startsWith('#/')) routes.add(route);
  }
  for (const m of ctx.code.matchAll(/['"`]#\/[\w\-/:]*['"`]/g)) routes.add(m[0].slice(1, -1));
  return [...routes];
};

// error：hash 路由落地 + 路由数
const checkRouting = (ctx) => {
  const n = ctx.routes.length;
  if (!/hashchange|location\.hash/.test(ctx.code)) reportOne(ctx, 'error', 'no-hash-routing', '全文没有 hashchange 也没有 location.hash，hash 路由没落地');
  if (n < 2) reportOne(ctx, 'error', 'single-route', `只识别到 ${n} 个路由（<2），还是单页堆 section`);
  if (n > PAGE_LIMIT) reportOne(ctx, 'warn', 'too-many-pages', `${n} 个页面，建议拆批（>${PAGE_LIMIT}）`);
};

// error：可交互元素缺 data-req；顺带统计 data-req / data-no-req
const checkReqAttrs = (ctx) => {
  const bad = [];
  const isHidden = (t) => /^<input\b/i.test(t) && (attrOf(t, 'type') ?? '').toLowerCase() === 'hidden';
  const scan = (re, accept = () => true) => {
    for (const m of ctx.code.matchAll(re)) if (accept(m[0]) && lacksReq(m[0])) bad.push({ index: m.index, tag: snippet(m[0]) });
  };
  scan(/<button\b[^>]*>/gi);
  scan(/<a\b[^>]*>/gi, (t) => hasAttr(t, 'href')); // 无 href 的 <a> 不算可交互
  scan(/<(?:input|select|textarea)\b[^>]*>/gi, (t) => !isHidden(t));
  report(ctx, 'error', 'missing-req-attr', bad, (it) => `可交互元素缺 data-req：${it.tag}`);

  // DOM 侧 data-req 全量收集（一个元素挂多个 id 时按空白/逗号拆）
  for (const m of ctx.code.matchAll(DATA_REQ_RE)) {
    const value = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (!value) continue;
    // 源码里用字符串拼出来的动态属性，例如 data-req="' + req + '" 或 ${id}，
    // 抓到的只是拼接片段而不是真实 id —— 计入"动态"后跳过，否则会误报成孤儿需求。
    if (/['"`$+{}]/.test(value)) {
      ctx.dynamicReqCount += 1;
      continue;
    }
    ctx.reqCount += 1;
    for (const id of value.split(/[\s,]+/).filter(Boolean)) {
      // 非 id 形态的残留片段（如 <span class="req"> 里的 req）一律不计
      if (!/^[A-Za-z0-9_.:-]+$/.test(id)) continue;
      if (!ctx.domReqs.has(id)) ctx.domReqs.set(id, m.index);
    }
  }
  ctx.noReqCount = countOf(ctx.code, /\bdata-no-req\b/gi);
};

// error/warn：追溯闭环（orphan / P0 / P1 / P2）
const checkTraceability = (ctx) => {
  if (ctx.reqMap.status !== 'ok') return; // req-map 本身有问题时不再重复刷屏
  const ids = new Set(ctx.reqMap.entries.map((e) => String(e.id)));
  const orphans = [...ctx.domReqs].filter(([id]) => !ids.has(id)).map(([id, index]) => ({ id, index }));
  report(ctx, 'error', 'orphan-req', orphans, (it) => `data-req="${it.id}" 在 #req-map 里找不到（做了但没写需求）`);
  for (const [pri, level, rule] of [['P0', 'error', 'missing-p0'], ['P1', 'warn', 'missing-p1'], ['P2', 'warn', 'missing-p2']]) {
    const missing = ctx.reqMap.entries
      .filter((e) => String(e.pri ?? '').toUpperCase() === pri && !ctx.domReqs.has(String(e.id)))
      .map((e) => ({ id: e.id, name: e.name }));
    report(ctx, level, rule, missing, (it) => `需求 ${it.id}（${it.name ?? '未命名'}）标了 ${pri}，但 DOM 里 0 命中`);
  }
};

// warn：空态/错误态
const checkStates = (ctx) => {
  const empty = countOf(ctx.code, /state=empty/g);
  const error = countOf(ctx.code, /state=error/g);
  ctx.states = { normal: ctx.routes.length, empty, error };
  if (!empty && !error) reportOne(ctx, 'warn', 'no-abnormal-state', '既没有 state=empty 也没有 state=error，缺空态和错误态');
};

// warn：占位数据（先抹掉 base64 数据块，免得把 base64 里的 xxx 当占位）
const checkPlaceholders = (ctx) => {
  const prose = ctx.code.replace(/data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+/gi, blank);
  for (const [re, label] of PLACEHOLDERS) {
    const n = countOf(prose, re);
    if (!n) continue;
    ctx.placeholders.push({ label, count: n });
    reportOne(ctx, 'warn', 'placeholder-data', `${n} 处「${label}」`, prose.search(re));
  }
};

// warn：体积 + 超长 base64 内联数据
const checkSize = (ctx) => {
  if (ctx.size > SIZE_LIMIT) reportOne(ctx, 'warn', 'file-too-large', `${(ctx.size / 1024).toFixed(1)}KB，超过 ${SIZE_LIMIT / 1024}KB，建议压缩内联资源`);
  const hits = [];
  let offset = 0;
  for (const line of ctx.raw.split('\n')) {
    if (/base64,/i.test(line) && line.length > LONG_LINE) hits.push({ index: offset, len: line.length });
    offset += line.length + 1;
  }
  report(ctx, 'warn', 'long-inline-data', hits, (it) => `单行 ${it.len} 字符的 base64 内联数据（>${LONG_LINE}），建议改用内联 SVG`);
};

// ═════ 主流程 ═════

const validate = (raw, size) => {
  // 所有检查共享的上下文
  const ctx = {
    raw, code: stripComments(raw), size, lineOf: makeLineOf(raw),
    errors: [], warnings: [], routes: [], reqCount: 0, noReqCount: 0, dynamicReqCount: 0,
    reqMap: { status: 'missing', entries: [], block: null },
    domReqs: new Map(), placeholders: [], states: { normal: 0, empty: 0, error: 0 },
  };

  // #req-map 先解析：路由和追溯都依赖它
  const rm = (ctx.reqMap = parseReqMap(raw));
  if (rm.status === 'missing') reportOne(ctx, 'error', 'missing-req-map', '没有 <script id="req-map">，追溯断链');
  else if (rm.status === 'empty') reportOne(ctx, 'error', 'missing-req-map', '#req-map 是空数组，没有可追溯的功能条目', rm.block.index);
  else if (rm.status === 'invalid') reportOne(ctx, 'error', 'invalid-req-map', `#req-map ${rm.reason}`, rm.block.index);

  ctx.routes = collectRoutes(ctx);
  checkRouting(ctx);
  const meta = {
    externalCount: scanPatterns(ctx, 'error', 'external-request', EXTERNAL, (it) => `发现外部资源引用（${it.name}）：${it.text}`),
    networkCount: scanPatterns(ctx, 'error', 'network-call', NETWORK, (it) => `出现真实网络请求 ${it.name}：${it.text}`),
    blockingCount: scanPatterns(ctx, 'error', 'blocking-dialog', BLOCKING, (it) => `用了阻塞式弹窗 ${it.name}（改成内联 Toast / 表单错误提示）：${it.text}`),
  };
  checkReqAttrs(ctx);
  checkTraceability(ctx);
  checkStates(ctx);
  checkPlaceholders(ctx);
  checkSize(ctx);

  return {
    errors: ctx.errors, warnings: ctx.warnings,
    meta: { ...meta, placeholders: ctx.placeholders },
    stats: {
      routes: ctx.routes.length, reqCount: ctx.reqCount, reqMapCount: ctx.reqMap.entries.length,
      coveredReqs: ctx.reqMap.entries.filter((e) => ctx.domReqs.has(String(e.id))).length,
      noReqCount: ctx.noReqCount, dynamicReqCount: ctx.dynamicReqCount, states: ctx.states,
    },
  };
};

// ═════ 输出 ═════

// 人类可读输出：六条固定体检项 + 额外 warn + error 明细 + 结论
const renderHuman = (result, { file, size, strict }) => {
  const { errors, warnings, stats, meta } = result;
  const errs = (...r) => errors.filter((e) => r.includes(e.rule));
  const warns = (...r) => warnings.filter((w) => r.includes(w.rule));
  const tErrs = errs('missing-req-map', 'invalid-req-map', 'orphan-req', 'missing-p0');
  const tWarns = warns('missing-p1', 'missing-p2');
  const note = [tErrs.length ? '有 error，见明细' : '', tWarns.length ? `P1/P2 缺 ${tWarns.length} 条` : ''].filter(Boolean);

  // 每行 [标签, error 列表, warn 列表, 说明]；✓ 干净 / ⚠ 只有 warn / ✗ 有 error
  const rows = [
    ['文件体积', [], warns('file-too-large'), `${(size / 1024).toFixed(1)}KB（${size > SIZE_LIMIT ? '>400KB' : '<400KB'}）`],
    ['外部请求', errs('external-request', 'network-call'), [], `${meta.externalCount + meta.networkCount} 处`],
    ['hash 路由', errs('no-hash-routing', 'single-route'), [], stats.routes ? `${stats.routes} 个路由` : '未检测到路由'],
    ['追溯', tErrs, tWarns, `${stats.reqCount} 个 data-req，覆盖 ${stats.coveredReqs}/${stats.reqMapCount} 条需求${note.length ? `（${note.join('，')}）` : ''}`],
    ['交互', errs('blocking-dialog'), [], meta.blockingCount ? `${meta.blockingCount} 处阻塞式弹窗` : '无阻塞式弹窗'],
    ['状态', [], warns('no-abnormal-state'), `正常态 ${stats.states.normal} 页 / 空态 ${stats.states.empty} / 错误态 ${stats.states.error}`],
  ];
  const out = [`校验 req2proto 原型：${file}`, ''];
  for (const [label, e, w, text] of rows) out.push(`${e.length ? '✗' : w.length ? '⚠' : '✓'} ${padLabel(label)}${text}`);

  // 其余 warn 单独起一段（页面数 / 占位数据 / 内联数据）
  const labels = { 'too-many-pages': '页面数', 'placeholder-data': '占位数据', 'long-inline-data': '内联数据' };
  const extra = warns(...Object.keys(labels));
  if (extra.length) {
    out.push('');
    for (const w of extra) out.push(`⚠ ${padLabel(labels[w.rule] ?? w.rule)}${w.message}`);
  }

  // error 明细：带行号，方便直接跳过去改
  if (errors.length) {
    out.push('', '错误明细：');
    for (const e of errors.slice(0, 40)) out.push(`  ✗ ${e.rule.padEnd(18)}${(e.line ? `L${e.line}` : '—').padEnd(7)}${e.message}`);
    if (errors.length > 40) out.push(`  … 还有 ${errors.length - 40} 条 error`);
  }

  // --strict 下 warn 计入判定，文案必须和退出码一致
  const failed = errors.length > 0 || (strict && warnings.length > 0);
  const strictNote = strict && !errors.length && warnings.length ? '（--strict：warn 视为 error）' : '';
  out.push('', '─'.repeat(40), `结果：${errors.length} error / ${warnings.length} warn  →  ${failed ? '未通过' : '通过'}${strictNote}`);
  return out.join('\n');
};

const buildJson = (result, { file, size, strict }) => {
  const failed = result.errors.length > 0 || (strict && result.warnings.length > 0);
  const out = { file, size, passed: !failed, errors: result.errors, warnings: result.warnings, stats: result.stats };
  if (strict) out.strict = true; // 只在严格模式下多这个字段，默认输出与契约示例一致
  return out;
};

// ═════ CLI ═════

const fail = (msg, withUsage = false) => {
  console.error(`错误：${msg}${withUsage ? `\n\n${USAGE}` : ''}`);
  process.exit(2);
};

const parseArgs = (argv) => {
  const files = [];
  const opts = { json: false, strict: false, help: false };
  for (const arg of argv) {
    if (arg === '--json') opts.json = true;
    else if (arg === '--strict') opts.strict = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('-')) fail(`未知参数 ${arg}`, true);
    else files.push(arg);
  }
  return { ...opts, files };
};

const main = () => {
  const { files, json, strict, help } = parseArgs(process.argv.slice(2));
  if (help) return void console.log(USAGE);
  if (!files.length) fail('缺少必填参数 <file.html>', true);
  if (files.length > 1) fail(`一次只能校验一个文件，收到了 ${files.length} 个：${files.join(' ')}`, true);

  const file = path.resolve(files[0]);
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    fail(`找不到文件 ${file}`);
  }
  if (stat.isDirectory()) fail(`${file} 是目录，需要指向具体的 .html 文件`);
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    fail(`读不了文件 ${file}（${err.code ?? err.message}）`);
  }

  const result = validate(raw, stat.size);
  const payload = { file, size: stat.size, strict };
  const out = buildJson(result, payload);
  console.log(json ? JSON.stringify(out, null, 2) : renderHuman(result, payload));
  process.exit(out.passed ? 0 : 1);
};

main();
