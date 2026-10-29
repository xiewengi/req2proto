#!/usr/bin/env node
/**
 * check-all.mjs — 一条命令跑完全部体检，绿灯才 commit
 *
 * 覆盖 7 组检查（validate.mjs 只管其中 1 组）：
 *   1. 构建        4 个构建脚本逐个跑通，且产出文件真的更新了
 *   2. 零外部请求  所有 html 无 CDN / fetch / 阻塞弹窗（复用 validate 的扫描逻辑）
 *   3. 结构校验    examples + out 下的原型跑 validate，必须 0 error
 *   4. 内联体检    组件页这类「不是原型」的页面：重复 id / 死锚点 / svg 缺 viewBox /
 *                  内联 JS 语法 / <style> 大括号平衡 / 占位符残留
 *   5. 设计 token  共享样式不许写死 hex；var(--x) 必须在某处有定义
 *   6. 主题对比度  8 套主题 × 亮/暗，品牌色对比度全部 ≥ 4.5:1
 *   7. 文档链接    README / SKILL / references 里的相对链接和脚本名都真实存在
 *
 * 用法:
 *   node scripts/check-all.mjs              # 全跑
 *   node scripts/check-all.mjs --no-build   # 跳过构建（只想体检现有产物）
 *   node scripts/check-all.mjs --json       # 机读
 *   node scripts/check-all.mjs --quiet      # 只打结论和问题明细
 *
 * 退出码：0 全过 / 1 有问题 / 2 环境错误（不在仓库根、node 版本太低）
 * 零依赖：只用 node 内置模块。
 */
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import os from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => relative(ROOT, p) || '.';

// ═════ 参数 ═════

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const OPTS = {
  json: flag('json'),
  quiet: flag('quiet'),
  noBuild: flag('no-build'),
  help: flag('help') || flag('h'),
};

const USAGE = `用法: node scripts/check-all.mjs [选项]

  --no-build   跳过 4 个构建脚本，只体检现有产物
  --json       输出 JSON（供 CI / 程序消费）
  --quiet      只打结论和问题明细
  --help       显示这份说明

退出码: 0 全过 / 1 有问题 / 2 环境错误`;

// ═════ 结果收集 ═════

/** 一条问题。level: error 阻断提交 / warn 建议修 / ok 正常 */
const items = [];
const add = (section, level, message, target = null) => items.push({ section, level, message, target });
const ok = (section, message) => add(section, 'ok', message);
const warn = (section, message) => add(section, 'warn', message);
const err = (section, message) => add(section, 'error', message);

/** 该 section 的汇总状态：有 error → error，否则有 warn → warn，否则 ok */
const statusOf = (section) => {
  const mine = items.filter((it) => it.section === section);
  if (mine.some((it) => it.level === 'error')) return 'error';
  if (mine.some((it) => it.level === 'warn')) return 'warn';
  return 'ok';
};
/** 该 section 的一句话摘要：有问题时优先说问题，别用 ok 那句糊过去 */
const summaryOf = (section) => {
  const mine = items.filter((it) => it.section === section);
  const first = mine.find((it) => it.level === 'error') ?? mine.find((it) => it.level === 'warn') ?? mine[0];
  if (!first) return '';
  if (first.level === 'ok') return first.message;
  // 问题明细已经在 errors/warnings 里，摘要只取首句，避免 JSON 里重复整段
  return first.message.split('\n')[0];
};

// ═════ 通用工具 ═════

const SECTIONS = ['构建', '零外部请求', '结构校验', '内联体检', '设计 token', '主题对比度', '文档链接'];

// 中日韩字符按 2 字宽算，和 validate.mjs 的输出对齐规则一致
const widthOf = (s) => [...s].reduce((w, ch) => w + (/[\u2e80-\u9fff\u3000-\u303f\uff00-\uff60]/.test(ch) ? 2 : 1), 0);
const padTo = (s, n) => s + ' '.repeat(Math.max(1, n - widthOf(s)));

const readText = (p) => readFileSync(p, 'utf8');
const exists = (p) => existsSync(p) && statSync(p).isFile();

const runNode = (scriptAbs, args = [], cwd = ROOT) =>
  spawnSync(process.execPath, [scriptAbs, ...args], { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

const tail = (s, n = 6) => (s ?? '').trim().split('\n').slice(-n).join('\n');

/** 递归收集某个目录下的 .html（跳过 node_modules / .git） */
const collectHtml = (dir) => {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      if (name === 'node_modules' || name === '.git') continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (extname(name).toLowerCase() === '.html') out.push(p);
    }
  };
  walk(dir);
  return out.sort();
};

/** 剥掉 Markdown 的围栏代码块，避免把示例命令里的路径当链接 */
const stripFences = (md) => md.replace(/^```[\s\S]*?^```/gm, '');

// ═════ 1. 构建 ═════

const BUILDS = [
  ['build-example.mjs', 'examples/ticket-system.html'],
  ['build-components.mjs', 'assets/components.html'],
  ['build-components-antd.mjs', 'assets/components-antd.html'],
  ['build-preview.mjs', 'assets/theme-preview.html'],
];

const checkBuilds = () => {
  if (OPTS.noBuild) return ok('构建', '跳过（--no-build）');
  let passed = 0;
  for (const [script, outRel] of BUILDS) {
    const outAbs = join(ROOT, outRel);
    const before = exists(outAbs) ? statSync(outAbs).mtimeMs : 0;
    const r = runNode(join(ROOT, 'scripts', script));
    if (r.status !== 0) {
      err('构建', `${script} 退出码 ${r.status ?? 'null'}${r.stderr ? `\n${tail(r.stderr, 8)}` : ''}`);
      continue;
    }
    if (!exists(outAbs)) {
      err('构建', `${script} 跑通了但没产出 ${outRel}`);
      continue;
    }
    if (statSync(outAbs).mtimeMs <= before) {
      warn('构建', `${script} 没有更新产物 ${outRel}（可能已是最新，或脚本没写盘）`);
      continue;
    }
    passed += 1;
  }
  ok('构建', `${passed}/${BUILDS.length} 个构建脚本跑通`);

  // 幂等性：重新构建后 git 应当仍然干净，否则说明产物和源码不同步
  // 幂等性：重新构建后产物应当与仓库里的一致，否则说明源码改了没重新提交产物。
  // 只比 4 个构建产物——shared.css 这类源文件本来就会变，不该在这里报。
  const outputs = BUILDS.map(([, out]) => out);
  const git = spawnSync('git', ['status', '--porcelain', '--', ...outputs], { cwd: ROOT, encoding: 'utf8' });
  if (git.status === 0) {
    // porcelain 每行是 "XY path"：前两列固定，第三列起是路径。
    // 不能先 trim 整体输出——那会吃掉首行前导空格，路径整体错位一格。
    const files = git.stdout
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => l.slice(2).trim().replace(/^"|"$/g, ''));
    if (files.length) {
      err('构建', `产物与仓库不一致（源码改了没提交重新构建的产物）：${files.join(', ')}`);
    }
  }
};

// ═════ 2. 零外部请求 + 3. 结构校验（都靠 validate.mjs） ═════

/** 跑 validate --json，失败返回 null */
const runValidate = (fileAbs) => {
  const r = runNode(join(ROOT, 'scripts/validate.mjs'), [fileAbs, '--json']);
  if (r.status === 2) return { fatal: tail(r.stderr, 3) };
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { fatal: `validate 输出不是 JSON：${tail(r.stdout, 3)}` };
  }
};

// 组件/主题参考页不是原型，天然没有 req-map 和 hash 路由。
// 对它们只认「不许联网」这一条，其余结构规则不适用。
const REFERENCE_ONLY_RULES = new Set(['external-request', 'network-call']);
const isReferencePage = (relPath) => relPath.startsWith('assets/');

// 模板源必须保留 {{占位符}} 和 <!-- NAV_ITEMS -->，内联体检对它没意义
const TEMPLATE_SOURCES = new Set(['assets/template.html']);

const checkHtml = () => {
  const files = [...collectHtml(join(ROOT, 'assets')), ...collectHtml(join(ROOT, 'examples')), ...collectHtml(join(ROOT, 'out'))];
  if (!files.length) {
    warn('零外部请求', '没找到任何 html 产物');
    return [];
  }
  let external = 0;
  const reports = [];
  for (const f of files) {
    const rr = rel(f);
    const v = runValidate(f);
    if (v.fatal) {
      err('结构校验', `${rr}：${v.fatal}`);
      continue;
    }
    reports.push({ file: f, rel: rr, result: v });

    const extHits = v.errors.filter((e) => REFERENCE_ONLY_RULES.has(e.rule));
    external += extHits.length;
    for (const e of extHits) err('零外部请求', `${rr} ${e.message}`);

    if (isReferencePage(rr)) continue; // 参考页不跑结构规则

    // 原型类：error 全算，warn 降一级只提示
    for (const e of v.errors) {
      if (REFERENCE_ONLY_RULES.has(e.rule)) continue; // 上面已报
      err('结构校验', `${rr} [${e.rule}]${e.line ? ` L${e.line}` : ''} ${e.message}`);
    }
    for (const w of v.warnings) warn('结构校验', `${rr} [${w.rule}] ${w.message}`);
  }

  ok('零外部请求', `${files.length} 个 html，${external} 处外部引用`);

  const protos = reports.filter((r) => !isReferencePage(r.rel));
  const bad = protos.filter((r) => r.result.errors.length).length;
  ok('结构校验', `${protos.length} 个原型，${bad} 个有 error`);
  return reports;
};

// ═════ 4. 内联体检（DOM / 内联 JS / 内联 CSS） ═════

const EXTERNAL_PATTERNS = [
  /<(link|script|img|a)\b[^>]*\b(?:href|src)\s*=\s*["']?\s*(?:https?:)?\/\//gi,
  /@import\b[^;\n]*?(?:https?:)?\/\//gi,
  /\burl\(\s*["']?\s*(?:https?:)?\/\//gi,
];

/** 取出所有 <style> 内容 */
const styleBlocksOf = (html) => [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((m) => m[1]);
/** 取出所有 <script>（含属性，便于判断 type） */
const scriptBlocksOf = (html) =>
  [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map((m) => ({ attrs: m[1], body: m[2] }));

const checkInline = (reports) => {
  let clean = 0;
  let skipped = 0;
  for (const { file, rel: rr } of reports) {
    if (TEMPLATE_SOURCES.has(rr)) {
      skipped += 1;
      continue;
    }
    const html = readText(file);
    let bad = 0;

    // 4.1 占位符残留：构建漏替换会直接白屏
    const leftovers = [...new Set([...html.matchAll(/\{\{[A-Z_]+\}\}/g)].map((m) => m[0]))];
    if (leftovers.length) {
      err('内联体检', `${rr} 占位符残留：${leftovers.join(' ')}`);
      bad += 1;
    }
    if (html.includes('<!-- NAV_ITEMS -->')) {
      err('内联体检', `${rr} 导航占位注释 <!-- NAV_ITEMS --> 没被替换`);
      bad += 1;
    }

    // 4.2 重复 id + 同页锚点死链
    const ids = [...html.matchAll(/(?<![\w-])id\s*=\s*["']([^"']*)["']/g)].map((m) => m[1]);
    const idSet = new Set(ids);
    const dup = [...idSet].filter((id) => ids.filter((x) => x === id).length > 1);
    if (dup.length) {
      err('内联体检', `${rr} 重复 id：${dup.slice(0, 5).join(', ')}`);
      bad += 1;
    }
    const anchors = [...html.matchAll(/href\s*=\s*["']#([^"']*)["']/g)].map((m) => m[1]);
    // 空锚点(#) 是"回到顶部"惯例；#/xxx 是 hash 路由，不是锚点
    const dead = [...new Set(anchors.filter((a) => a && !a.startsWith('/') && !idSet.has(a)))];
    if (dead.length) {
      err('内联体检', `${rr} 锚点指向不存在的 id：${dead.slice(0, 5).map((a) => `#${a}`).join(', ')}`);
      bad += 1;
    }

    // 4.3 svg 缺 viewBox —— 尺寸没约束，缩到小图标时会被裁掉（组件页真踩过）
    const svgs = [...html.matchAll(/<svg\b[^>]*>/gi)].map((m) => m[0]);
    const noViewBox = svgs.filter((s) => !/viewBox\s*=/i.test(s));
    if (noViewBox.length) {
      err('内联体检', `${rr} ${noViewBox.length} 个 <svg> 缺 viewBox（小尺寸下会裁切）`);
      bad += 1;
    }

    // 4.4 内联 JS 语法：语法错 = 整页交互全死，但浏览器只默默报一条 console
    const modules = [];
    for (const { attrs, body } of scriptBlocksOf(html)) {
      if (!body.trim()) continue;
      if (/application\/json/i.test(attrs)) continue;
      const isModule = /type\s*=\s*["']module["']/i.test(attrs);
      try {
        new vm.Script(body);
      } catch (e) {
        if (isModule && /import|export|await/i.test(e.message)) {
          modules.push(body);
          continue;
        }
        const line = (e.stack ?? '').match(/:(\d+)/)?.[1];
        err('内联体检', `${rr} 内联 JS 语法错${line ? ` 第 ${line} 行` : ''}：${e.message}`);
        bad += 1;
      }
    }
    // module 脚本走 --check，避免为 import/export 引实验 flag
    for (const [i, body] of modules.entries()) {
      const tmp = join(os.tmpdir(), `req2proto-check-${process.pid}-${i}.mjs`);
      try {
        writeFileSync(tmp, body);
        const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
        if (r.status !== 0) {
          err('内联体检', `${rr} 内联 module 脚本语法错：${tail(r.stderr, 3)}`);
          bad += 1;
        }
      } finally {
        try { unlinkSync(tmp); } catch { /* 清理失败不影响结论 */ }
      }
    }

    // 4.5 <style> 大括号平衡 —— 不平衡整页样式从某处开始全线崩
    for (const [i, css] of styleBlocksOf(html).entries()) {
      const open = (css.match(/\{/g) ?? []).length;
      const close = (css.match(/\}/g) ?? []).length;
      if (open !== close) {
        err('内联体检', `${rr} 第 ${i + 1} 个 <style> 大括号不匹配：{ ${open} 个 / } ${close} 个`);
        bad += 1;
      }
    }

    if (!bad) clean += 1;
  }
  ok('内联体检', `${reports.length - skipped} 个文件，${clean} 个干净${skipped ? `（跳过 ${skipped} 个模板源）` : ''}`);
};

// ═════ 5. 设计 token ═════

const checkTokens = (reports) => {
  const themeCss = readText(join(ROOT, 'assets/theme.css'));
  const sharedCss = readText(join(ROOT, 'assets/shared.css'));
  const template = readText(join(ROOT, 'assets/template.html'));

  // 定义：theme.css + 共享样式 + 各页内联 <style> + 元素上的 style="--x:6"。
  // antd 页的 --a-* 自成一套，只在自己页面里定义，所以定义池必须把产物收进来。
  const defined = new Set();
  const collectDefs = (text) => {
    for (const m of text.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
  };
  collectDefs(themeCss);
  collectDefs(sharedCss);
  collectDefs(template);
  for (const { file } of reports) collectDefs(readText(file));

  // 使用：只统计「没有 fallback」的 var()。
  // var(--a-bg-spotlight, rgba(...)) 这种带兜底值的写法是故意的，不算漏定义。
  const used = new Set();
  const collectUses = (text) => {
    for (const m of text.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
      if (m[2] === ',') continue; // 有 fallback，安全
      used.add(m[1]);
    }
  };
  collectUses(sharedCss);
  collectUses(template);
  for (const { file } of reports) collectUses(readText(file));

  const undefinedVars = [...used].filter((v) => !defined.has(v)).sort();
  for (const v of undefinedVars) err('设计 token', `var(${v}) 没有任何地方定义它（拼错或漏定义）`);

  // 硬编码 hex：共享样式和模板必须走 CSS 变量，否则换主题会漏色
  let hexCount = 0;
  for (const [label, text] of [['assets/shared.css', sharedCss], ['assets/template.html', template]]) {
    const hits = [...text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
    if (hits.length) {
      hexCount += hits.length;
      const lineOf = (idx) => text.slice(0, idx).split('\n').length;
      const first = [...text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].slice(0, 3).map((m) => `L${lineOf(m.index)} ${m[0]}`);
      err('设计 token', `${label} 写死了 ${hits.length} 处 hex（应用 var(--c-*)）：${first.join(', ')}`);
    }
  }

  ok('设计 token', `${defined.size} 个变量有定义，${used.size} 个被引用，${hexCount} 处硬编码 hex`);
};

// ═════ 6. 主题对比度 ═════

const hexToRgb = (hex) => {
  const c = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(c)) throw new Error(`非法颜色值：${hex}`);
  return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
};
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const MIN_CONTRAST = 4.5; // WCAG AA 正文
const WHITE = '#ffffff';
const DARK_SURFACE = '#131b2b'; // theme.css 的 --c-surface 暗色值

const checkContrast = () => {
  const css = readText(join(ROOT, 'assets/theme.css'));
  const varOf = (body, name) => body.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`))?.[1];

  const light = [];
  const dark = [];
  for (const m of css.matchAll(/(^|\n)(\[data-dark="1"\])?\[data-theme="([\w-]+)"\]\s*\{([^}]*)\}/g)) {
    const isDark = Boolean(m[2]);
    const name = m[3];
    const body = m[4];
    const brand = varOf(body, '--c-brand');
    const ink = varOf(body, '--c-brand-ink') ?? brand;
    if (!brand) {
      err('主题对比度', `主题 ${name}${isDark ? '（暗色）' : ''} 没定义 --c-brand`);
      continue;
    }
    (isDark ? dark : light).push({ name, brand, ink });
  }

  let checked = 0;
  let failed = 0;
  for (const t of light) {
    // 白字压在品牌色上 + 品牌色当文字压在白底，两个方向都要够
    for (const [label, a, b] of [
      ['白字 / 品牌底', WHITE, t.brand],
      ['品牌字 / 白底', t.ink, WHITE],
    ]) {
      const c = contrast(a, b);
      checked += 1;
      if (c < MIN_CONTRAST) {
        failed += 1;
        err('主题对比度', `${t.name} ${label} 只有 ${c.toFixed(2)}:1（需 ≥${MIN_CONTRAST}）`);
      }
    }
  }
  for (const t of dark) {
    // 暗色下品牌色当文字压在深色卡片上
    const c = contrast(t.ink, DARK_SURFACE);
    checked += 1;
    if (c < MIN_CONTRAST) {
      failed += 1;
      err('主题对比度', `${t.name}（暗色）品牌字 / 深底 只有 ${c.toFixed(2)}:1（需 ≥${MIN_CONTRAST}）`);
    }
  }

  if (!light.length) err('主题对比度', 'theme.css 里没解析到任何 [data-theme] 块');
  ok('主题对比度', `${light.length} 套亮色 + ${dark.length} 套暗色，${checked} 组合格（≥${MIN_CONTRAST}:1）`);
};

// ═════ 7. 文档链接 ═════

const DOCS = ['README.md', 'SKILL.md', 'references/html-contract.md', 'references/theme-guide.md', 'references/review-checklist.md'];

const checkDocs = () => {
  let links = 0;
  let broken = 0;
  let scripts = 0;

  for (const docRel of DOCS) {
    const abs = join(ROOT, docRel);
    if (!exists(abs)) {
      err('文档链接', `${docRel} 不存在`);
      broken += 1;
      continue;
    }
    const md = stripFences(readText(abs));

    // 7.1 相对链接 → 目标必须真实存在（http/https 是外链，不归这里管）
    for (const m of md.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = m[1];
      if (/^(?:https?:|mailto:|tel:)/i.test(target)) continue;
      if (target.startsWith('#')) continue;
      const clean = decodeURIComponent(target.split('#')[0]);
      if (!clean) continue;
      links += 1;
      const resolved = clean.startsWith('/') ? join(ROOT, clean) : resolve(dirname(abs), clean);
      if (!existsSync(resolved)) {
        broken += 1;
        err('文档链接', `${docRel} → ${target} 指向的文件不存在`);
      }
    }

    // 7.2 正文里提到的 scripts/xxx.mjs 必须真在仓库里（改了脚本名忘改文档就会挂）
    for (const m of md.matchAll(/scripts\/([a-z0-9-]+\.mjs)/g)) {
      scripts += 1;
      if (!exists(join(ROOT, 'scripts', m[1]))) {
        broken += 1;
        err('文档链接', `${docRel} 提到 scripts/${m[1]}，但文件不存在`);
      }
    }
  }

  ok('文档链接', `${DOCS.length} 份文档，${links} 条相对链接 + ${scripts} 处脚本引用，${broken} 个失效`);
};

// ═════ 主流程 ═════

const main = () => {
  if (OPTS.help) {
    console.log(USAGE);
    return 0;
  }
  // node:vm / node:os 的 API 在 18 之前不稳，先挡掉
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 18) {
    console.error(`错误：需要 Node.js ≥ 18，当前 ${process.versions.node}`);
    return 2;
  }
  if (!exists(join(ROOT, 'SKILL.md'))) {
    console.error(`错误：${ROOT} 不像 req2proto 仓库根（找不到 SKILL.md）`);
    return 2;
  }

  const started = process.hrtime.bigint();
  const reports = [];

  // 构建必须先跑：后面的体检都基于最新产物
  checkBuilds();
  const htmlReports = checkHtml();
  reports.push(...htmlReports);
  checkInline(reports);
  checkTokens(reports);
  checkContrast();
  checkDocs();

  const errors = items.filter((it) => it.level === 'error');
  const warnings = items.filter((it) => it.level === 'warn');
  const passed = errors.length === 0;
  const durationMs = Number((process.hrtime.bigint() - started) / 1000000n);

  if (OPTS.json) {
    const payload = {
      passed,
      durationMs,
      errors: errors.map(({ section, message }) => ({ section, message })),
      warnings: warnings.map(({ section, message }) => ({ section, message })),
      sections: SECTIONS.map((s) => ({ name: s, status: statusOf(s), summary: summaryOf(s) })),
    };
    console.log(JSON.stringify(payload, null, 2));
    return passed ? 0 : 1;
  }

  const L = [];
  if (!OPTS.quiet) {
    L.push('req2proto 全量检查', '');
    const labelW = 14;
    for (const s of SECTIONS) {
      const st = statusOf(s);
      const icon = st === 'error' ? '✗' : st === 'warn' ? '⚠' : '✓';
      L.push(`${icon} ${padTo(s, labelW)}${summaryOf(s)}`);
    }
  }

  // 问题明细：按 section 分组，error 在前
  const detail = [...errors, ...warnings];
  if (detail.length) {
    L.push('', '问题明细：');
    let lastSection = null;
    for (const it of detail) {
      if (it.section !== lastSection) {
        L.push(`  ${it.section}`);
        lastSection = it.section;
      }
      L.push(`    ${it.level === 'error' ? '✗' : '⚠'} ${it.message}`);
    }
  }

  L.push('', '─'.repeat(40));
  L.push(`结果：${errors.length} error / ${warnings.length} warn  →  ${passed ? '通过' : '未通过'}（${(durationMs / 1000).toFixed(2)}s）`);
  if (passed) L.push(errors.length === 0 && warnings.length === 0 ? '绿灯，可以 commit。' : '只有 warn，可以 commit，但建议顺手清掉。');
  console.log(L.join('\n'));

  return passed ? 0 : 1;
};

process.exit(main());
