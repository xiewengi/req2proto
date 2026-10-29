#!/usr/bin/env node
/**
 * batch.mjs — 批量生成原型（唯一需要 API key 的地方）
 *
 * 单次生成永远不需要它：宿主 Agent 本身就是模型。
 * 这个脚本只服务两种场景：① 一次生成一批 ② 接进 CI。
 *
 * 用法:
 *   export OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
 *   export OPENAI_API_KEY=xxx
 *   node scripts/batch.mjs --input prds/ --out out/
 *   node scripts/batch.mjs --input prds/ --out out/ --model doubao-pro-32k --concurrency 3
 *   node scripts/batch.mjs --input prds/ --out out/ --dry-run     # 只打印将要做什么
 *
 * 零依赖：用 Node 内置 fetch（Node 18+）。
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ═════════════ 参数 ═════════════ */
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const flag = (name) => argv.includes(`--${name}`);

const INPUT   = arg('input');
const OUT     = arg('out', 'out');
const MODEL   = arg('model', process.env.OPENAI_MODEL || 'doubao-seed-1-6-250615');
const CONCURRENCY = Math.max(1, parseInt(arg('concurrency', '2'), 10));
const DRY       = flag('dry-run');
const NO_VALID  = flag('no-validate');
const MAX_TOKENS = parseInt(arg('max-tokens', '16000'), 10);

const BASE_URL = (process.env.OPENAI_BASE_URL || '').replace(/\/$/, '');
const API_KEY  = process.env.OPENAI_API_KEY;

if (!INPUT) {
  console.error(`用法: node scripts/batch.mjs --input <PRD目录> --out <输出目录> [选项]

选项:
  --model <id>         模型 id（默认 $OPENAI_MODEL 或 doubao-seed-1-6-250615）
  --concurrency <n>    并发数（默认 2）
  --max-tokens <n>     单次最大输出 token（默认 16000）
  --dry-run            只列出会生成什么，不调 API
  --no-validate        生成后不跑 validate.mjs

环境变量:
  OPENAI_BASE_URL      必填（火山 / DeepSeek / Ollama / vLLM 都行）
  OPENAI_API_KEY       必填（本地 Ollama 可随便填）`);
  process.exit(2);
}

if (!DRY && (!BASE_URL || !API_KEY)) {
  console.error('错误：需要设置 OPENAI_BASE_URL 和 OPENAI_API_KEY（或用 --dry-run 先看看）');
  process.exit(2);
}

/* ═════════════ 读 skill 上下文 ═════════════ */
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const SKILL_MD   = read('SKILL.md');
const CONTRACT   = read('references/html-contract.md');
const THEME_CSS  = read('assets/theme.css');
const SHARED_CSS = read('assets/shared.css');

/* 把 PRD 之外的所有规则压成一份 system prompt */
const SYSTEM = `你是 req2proto 原型生成器。任务：把一份 PRD 转成**单个 .html 文件**的零依赖多页可交互原型。

## 铁律
1. 只输出一个完整的 HTML 文件内容，从 <!DOCTYPE html> 开始。不要 markdown 代码块包裹，不要任何解释文字。
2. 单文件：CSS/JS 全部内联。禁止 CDN、外部字体、外部图标、外部图片。
3. hash 路由多页：#/orders、#/orders/:id，监听 hashchange，浏览器后退要能用。
4. 每个可交互元素（button / a[href] / input / select / textarea）必须带 data-req="F-xx"。
5. 纯 UI 操作（关闭图标、logo）加 data-no-req 豁免。
6. 每页至少实现正常态 + 一个异常态，用 ?state=empty / ?state=error 切换。
7. 禁止 alert / confirm / prompt，用内联 Toast 或表单错误提示。
8. mock 数据要有真实业务语义（真实感的编号、人名、金额、时间），禁止 lorem ipsum / 张三 / TODO。
9. 必须内嵌 <script type="application/json" id="req-map"> 功能清单。
10. 中文界面。

## 已有设计系统（原样内联进 <style>，不要自己造配色，不要写 hex）

### theme.css
\`\`\`css
${THEME_CSS}
\`\`\`

### shared.css
\`\`\`css
${SHARED_CSS}
\`\`\`

## 结构契约
${CONTRACT}

## skill 说明
${SKILL_MD}

## 输出要求
直接给完整 HTML。第一行必须是 <!DOCTYPE html>。`;

/* ═════════════ 发现 PRD ═════════════ */
const inputPath = resolve(INPUT);
if (!existsSync(inputPath)) {
  console.error(`错误：找不到 ${inputPath}`);
  process.exit(2);
}

const files = statSync(inputPath).isDirectory()
  ? readdirSync(inputPath).filter(f => ['.md', '.txt', '.markdown'].includes(extname(f).toLowerCase()))
      .map(f => join(inputPath, f))
  : [inputPath];

if (!files.length) {
  console.error(`错误：${inputPath} 里没有 .md / .txt 文件`);
  process.exit(2);
}

const slugify = (file) => basename(file, extname(file))
  .toLowerCase()
  .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'prototype';

console.log(`req2proto batch —— 模型 ${MODEL}`);
console.log(`PRD ${files.length} 份 → ${resolve(OUT)}\n`);

if (DRY) {
  files.forEach(f => {
    const slug = slugify(f);
    console.log(`  将生成 ${slug}/${slug}.html   ← ${basename(f)}（${(statSync(f).size / 1024).toFixed(1)}KB）`);
  });
  console.log(`\n--dry-run 结束。去掉该参数才会真的调 API。`);
  process.exit(0);
}

/* ═════════════ 调模型 ═════════════ */
async function generate(prdText) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `把下面这份 PRD 转成原型：\n\n${prdText}` },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${body ? '：' + body.slice(0, 300) : ''}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('响应里没有 content，检查模型名和 base_url');

  return stripFence(raw);
}

/* 模型爱加 ```html 包裹，剥掉 */
function stripFence(text) {
  let s = text.trim();
  const m = s.match(/^```(?:html)?\s*\n([\s\S]*?)\n```\s*$/);
  if (m) s = m[1].trim();
  // 万一前面还有废话，从 DOCTYPE 开始截
  const i = s.indexOf('<!DOCTYPE');
  if (i > 0) s = s.slice(i);
  return s;
}

/* ═════════════ 并发跑 ═════════════ */
const results = [];

async function runOne(file) {
  const slug = slugify(file);
  const dir = join(resolve(OUT), slug);
  const outFile = join(dir, `${slug}.html`);
  const tag = `[${slug}]`;

  const prd = readFileSync(file, 'utf8');
  console.log(`${tag} 开始（PRD ${(prd.length / 1024).toFixed(1)}KB）`);

  try {
    const started = Date.now();
    const html = await generate(prd);
    const secs = ((Date.now() - started) / 1000).toFixed(1);

    if (!html.startsWith('<!DOCTYPE')) {
      throw new Error('返回内容不是以 <!DOCTYPE 开头，可能被截断了（试试调大 --max-tokens）');
    }

    mkdirSync(dir, { recursive: true });
    writeFileSync(outFile, html);
    console.log(`${tag} ✓ ${(html.length / 1024).toFixed(1)}KB / ${secs}s`);

    let validateOk = null;
    let validateOut = '';
    if (!NO_VALID) {
      const r = spawnSync(process.execPath, [join(ROOT, 'scripts/validate.mjs'), outFile], { encoding: 'utf8' });
      validateOk = r.status === 0;
      validateOut = (r.stdout || '').trim();
      const tail = validateOut.split('\n').filter(l => l.includes('结果：') || l.startsWith('  ✗')).join('\n');
      console.log(`${tag} ${validateOk ? '✓ 校验通过' : '✗ 校验未通过'}`);
      if (tail) console.log(tail.replace(/^/gm, '    '));
    }

    results.push({ slug, file: outFile, ok: true, validateOk, bytes: html.length });
  } catch (e) {
    console.error(`${tag} ✗ ${e.message}`);
    results.push({ slug, file: null, ok: false, error: e.message });
  }
}

/* 简单并发池 */
async function pool(items, limit, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

await pool(files, CONCURRENCY, runOne);

/* ═════════════ 汇总 ═════════════ */
const ok = results.filter(r => r.ok);
const failed = results.filter(r => !r.ok);
const validPass = ok.filter(r => r.validateOk === true).length;

console.log('\n────────────────────────────────────────');
console.log(`生成成功 ${ok.length}/${results.length}；校验通过 ${validPass}/${ok.length}`);
if (failed.length) {
  console.log('\n失败项：');
  failed.forEach(r => console.log(`  ✗ ${r.slug}：${r.error}`));
}
process.exit(failed.length ? 1 : 0);
