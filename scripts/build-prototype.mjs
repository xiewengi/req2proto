#!/usr/bin/env node
/**
 * build-prototype.mjs —— 把「分文件写的原型源码」拼成单文件 HTML
 *
 * 这是 validate.mjs 之前的可选一步。适用场景：
 *   - 原型比较复杂（>5 页 / >20 条需求），分文件写更好维护
 *   - 需要反复迭代同一个原型（改视图不用重写整个 HTML）
 *
 * 不用也行 —— Agent 直接产出完整 HTML 是主路径。
 *
 * 用法：
 *   node scripts/build-prototype.mjs <src-dir> -o <out.html> [选项]
 *
 * 选项：
 *   -o, --out <path>     输出文件（必填）
 *   --no-validate        跳过末尾的 validate.mjs
 *   --quiet              只输出结果，不打印逐个文件的检查
 *
 * <src-dir> 的约定（除 meta.json 外都可缺省）：
 *   meta.json     { "theme":"gov", "product":"标讯助手", "initial":"标", "home":"notices" }
 *   data.js       const DB = {...};         → 填进 {{MOCK_DATA}}
 *   views.js      const viewX = () => ...   → 填进 {{VIEWS}}（原样，可含 PROBES）
 *   routes.js     const ROUTES = [...];     → 填进 {{ROUTES}}
 *   req-map.json  [{ "id","name","pri","route","src" }] → 填进 {{REQ_MAP}}
 *   nav.html      <a class="nav-item" ...>  → 替换 <!-- NAV_ITEMS -->
 *   custom.css    本原型特有样式             → 填进 {{CUSTOM_CSS}}
 *
 * data.js / routes.js 可以带 `const DB =` / `const ROUTES =` 前缀，脚本会自动剥掉，
 * 这样它们在编辑器里是独立合法的 JS，可以单独语法检查。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..');

// ═════ 参数 ═════

const parseArgs = (argv) => {
  const out = { src: null, out: null, validate: true, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o' || a === '--out') out.out = argv[++i];
    else if (a === '--no-validate') out.validate = false;
    else if (a === '--quiet') out.quiet = true;
    else if (a === '-h' || a === '--help') out.help = true;
    else if (!a.startsWith('-')) { if (!out.src) out.src = a; }
    else throw new Error(`未知参数：${a}`);
  }
  return out;
};

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(2);
};

// ═════ 工具 ═════

const read = (dir, name, required = false) => {
  const p = join(dir, name);
  if (!existsSync(p)) {
    if (required) fail(`缺少必需文件：${p}`);
    return null;
  }
  return readFileSync(p, 'utf8');
};

/** 剥掉 `const X =` 前缀和结尾分号，让源文件能独立 `node --check` */
const unwrap = (text, varName) => {
  let s = text.trim();
  const re = new RegExp(`^\\s*(?:const|let|var)\\s+${varName}\\s*=\\s*`);
  s = s.replace(re, '');
  s = s.replace(/;\s*$/, '');
  return s.trim();
};

/** 语法检查：包成函数体跑 new Function，能抓出拼写/括号错误 */
const syntaxCheck = (code, label, context = '') => {
  try {
    new Function(context + code);
    return true;
  } catch (e) {
    const m = e.message;
    fail(`${label} 语法错误：${m}`);
  }
};

// ═════ 占位符替换 ═════

/**
 * 占位符分两类，断言规则不同：
 *
 * - 标量（THEME / PRODUCT / HOME ...）：出现在几处就换几处，天经地义。要求 ≥1。
 * - 代码块（VIEWS / ROUTES / MOCK_DATA ...）：必须恰好 1 处。多于一处的典型原因是
 *   把占位符名写进了模板的 HTML 注释，全局替换会把整段内容注入两遍，生成物出现
 *   `const DB = const DB =`，页面直接白屏 —— 这个坑必须硬挡住。
 */
const BLOCK_TAGS = new Set(['THEME_CSS', 'SHARED_CSS', 'CUSTOM_CSS', 'REQ_MAP', 'MOCK_DATA', 'VIEWS', 'ROUTES']);

const fill = (tpl, name, content) => {
  const tag = `{{${name}}}`;
  const n = tpl.split(tag).length - 1;
  const isBlock = BLOCK_TAGS.has(name);

  if (n === 0) fail(`模板缺少占位符 ${tag}`);
  if (isBlock && n > 1) {
    fail(`代码块占位符 ${tag} 应恰好出现 1 次，实际 ${n} 次。`
      + '检查模板 HTML 注释里是否也写了这个占位符名。');
  }
  // 代码块替换用函数形式，避免内容里的 $& $1 之类被当成替换模式
  return tpl.replaceAll(tag, () => content);
};

// ═════ 主流程 ═════

const main = () => {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    fail(e.message);
  }

  if (args.help || !args.src) {
    console.log(`用法: node scripts/build-prototype.mjs <src-dir> -o <out.html> [--no-validate] [--quiet]

<src-dir> 约定：
  meta.json     { theme, product, initial, home }
  data.js       const DB = {...};
  views.js      视图函数（可含 PROBES）
  routes.js     const ROUTES = [...];
  req-map.json  [{ id, name, pri, route, src }]
  nav.html      侧边栏导航 HTML
  custom.css    本原型特有样式`);
    process.exit(args.help ? 0 : 2);
  }

  if (!args.out) fail('缺少输出路径，用 -o <out.html> 指定');
  const SRC = resolve(args.src);
  if (!existsSync(SRC)) fail(`源码目录不存在：${SRC}`);
  const OUT = resolve(args.out);
  const log = (m) => { if (!args.quiet) console.log(m); };

  // ---- meta ----
  const metaRaw = read(SRC, 'meta.json', true);
  let meta;
  try { meta = JSON.parse(metaRaw); } catch (e) { fail(`meta.json 不是合法 JSON：${e.message}`); }
  if (!meta.theme) fail('meta.json 缺少 theme');
  if (!meta.product) fail('meta.json 缺少 product');
  meta.initial = meta.initial || [...meta.product][0];
  meta.home = meta.home || '';

  // ---- req-map ----
  const reqRaw = read(SRC, 'req-map.json', true);
  let reqMap;
  try { reqMap = JSON.parse(reqRaw); } catch (e) { fail(`req-map.json 不是合法 JSON：${e.message}`); }
  if (!Array.isArray(reqMap) || !reqMap.length) fail('req-map.json 必须是非空数组');
  reqMap.forEach((r, i) => {
    for (const k of ['id', 'name', 'pri']) {
      if (!r[k]) fail(`req-map.json 第 ${i + 1} 条缺 ${k}`);
    }
    if (!['P0', 'P1', 'P2'].includes(String(r.pri).toUpperCase())) {
      fail(`req-map.json 第 ${i + 1} 条 pri 必须是 P0/P1/P2，实际 ${r.pri}`);
    }
  });
  const dupes = reqMap.map(r => r.id).filter((id, i, a) => a.indexOf(id) !== i);
  if (dupes.length) fail(`req-map.json 有重复 id：${[...new Set(dupes)].join(', ')}`);

  // ---- 代码段 ----
  const viewsRaw = read(SRC, 'views.js', true);
  const dataRaw = read(SRC, 'data.js', true);
  const routesRaw = read(SRC, 'routes.js', true);

  // views 原样注入；data/routes 剥掉前缀，保持源文件可独立语法检查
  const VIEWS = viewsRaw.trim();
  const DATA = unwrap(dataRaw, 'DB');
  const ROUTES = unwrap(routesRaw, 'ROUTES');

  syntaxCheck(VIEWS, 'views.js');
  syntaxCheck(`return (${DATA});`, 'data.js');
  syntaxCheck(`return (${ROUTES});`, 'routes.js');
  log(`✓ 源码语法  views.js / data.js / routes.js`);

  // ---- 可选段 ----
  const nav = read(SRC, 'nav.html') || '';
  const customCss = read(SRC, 'custom.css') || '';

  // ---- 模板 ----
  let tpl = readFileSync(join(SKILL, 'assets/template.html'), 'utf8');
  const themeCss = readFileSync(join(SKILL, 'assets/theme.css'), 'utf8');
  const sharedCss = readFileSync(join(SKILL, 'assets/shared.css'), 'utf8');

  tpl = fill(tpl, 'THEME_CSS', themeCss);
  tpl = fill(tpl, 'SHARED_CSS', sharedCss);
  tpl = fill(tpl, 'CUSTOM_CSS', customCss);
  tpl = fill(tpl, 'THEME', meta.theme);
  tpl = fill(tpl, 'PRODUCT', meta.product);
  tpl = fill(tpl, 'PRODUCT_INITIAL', meta.initial);
  tpl = fill(tpl, 'HOME', meta.home);
  tpl = fill(tpl, 'MOCK_DATA', DATA);
  tpl = fill(tpl, 'REQ_MAP', JSON.stringify(reqMap, null, 2));
  tpl = fill(tpl, 'VIEWS', VIEWS);
  tpl = fill(tpl, 'ROUTES', ROUTES);

  if (nav) {
    if (!tpl.includes('<!-- NAV_ITEMS -->')) fail('模板缺少 <!-- NAV_ITEMS --> 占位');
    tpl = tpl.replace('<!-- NAV_ITEMS -->', () => nav);
  }
  log(`✓ 占位符  11 个全部命中`);

  // ---- 残留检查 ----
  const leftovers = [...new Set([...tpl.matchAll(/\{\{[A-Z_]+\}\}/g)].map(m => m[0]))];
  if (leftovers.length) fail(`未替换的占位符：${leftovers.join(', ')}`);

  // ---- 业务脚本自检：抽出来再查一遍，避免生成物报 SyntaxError ----
  const scripts = [...tpl.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!scripts.length) fail('生成物里没有 <script> 块');
  scripts.forEach((code, i) => syntaxCheck(code, `生成物内联脚本 #${i + 1}`));
  log(`✓ 生成物  ${scripts.length} 个内联脚本语法通过`);

  // ---- 写出 ----
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, tpl);
  const kb = (Buffer.byteLength(tpl) / 1024).toFixed(1);
  console.log(`✓ ${OUT}  ${kb}KB`);

  // ---- 顺手校验 ----
  if (args.validate) {
    const v = join(SKILL, 'scripts/validate.mjs');
    if (existsSync(v)) {
      try {
        const r = execFileSync(process.execPath, [v, OUT], { encoding: 'utf8' });
        console.log(r.trim().split('\n').filter(l => /^[✓✗⚠]|^结果/.test(l)).join('\n'));
      } catch (e) {
        console.log((e.stdout || '').trim());
        process.exit(1);
      }
    }
  }
};

main();
