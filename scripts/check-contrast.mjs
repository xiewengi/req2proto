#!/usr/bin/env node
/**
 * check-contrast.mjs — 校验一个品牌色的对比度是否达标
 * 用法: node scripts/check-contrast.mjs "#00875A"
 *       node scripts/check-contrast.mjs "#00875A" --json
 */
const hexToRgb = (hex) => {
  const c = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(c)) throw new Error(`非法颜色值：${hex}（需要 6 位 hex）`);
  return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16));
};

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex)
    .map(v => v / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/** 按 WCAG 相对亮度把颜色往深/往浅调整，直到满足目标对比度 */
const adjust = (hex, bg, target, direction) => {
  let [r, g, b] = hexToRgb(hex);
  for (let i = 0; i < 100; i++) {
    const cur = `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
    if (contrast(cur, bg) >= target) return cur;
    if (direction === 'dark') { r *= 0.96; g *= 0.96; b *= 0.96; }
    else { r += (255 - r) * 0.06; g += (255 - g) * 0.06; b += (255 - b) * 0.06; }
  }
  return hex;
};

/** hover 必须比 brand 深一档，与对比度无关 */
const darken = (hex, factor = 0.82) => {
  const [r, g, b] = hexToRgb(hex).map(v => Math.round(v * factor));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

/** 与白色混合，ratio = 白色的占比（0.92 → 很浅的底） */
const mixWhite = (hex, ratio) => {
  const [r, g, b] = hexToRgb(hex).map(v => Math.round(v + (255 - v) * ratio));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

const WHITE = '#ffffff';
const INK = '#0f172a';

const main = () => {
  const args = process.argv.slice(2);
  const hex = args.find(a => a.startsWith('#'));
  const asJson = args.includes('--json');

  if (!hex) {
    console.error('用法: node scripts/check-contrast.mjs "#00875A" [--json]');
    process.exit(1);
  }

  const onWhiteText = contrast(hex, WHITE);   // 这个色当文字压在白底
  const whiteOnFill = contrast(WHITE, hex);   // 白字压在这个色上
  const onInk = contrast(hex, INK);

  const issues = [];
  if (whiteOnFill < 4.5) {
    const fixed = adjust(hex, WHITE, 4.5, 'dark');
    issues.push({
      role: '--c-brand（填充）',
      need: '白字压在上面 ≥4.5',
      actual: +whiteOnFill.toFixed(2),
      suggest: fixed,
      note: `压深到 ${fixed} 即可（白字对比 ${contrast(WHITE, fixed).toFixed(2)}）`,
    });
  }
  if (onWhiteText < 4.5) {
    const fixed = adjust(hex, WHITE, 4.5, 'dark');
    issues.push({
      role: '--c-brand-ink（文字）',
      need: '白底上当文字 ≥4.5',
      actual: +onWhiteText.toFixed(2),
      suggest: fixed,
      note: `压深到 ${fixed} 即可（白底对比 ${contrast(fixed, WHITE).toFixed(2)}）`,
    });
  }

  const brand = whiteOnFill >= 4.5 ? hex : adjust(hex, WHITE, 4.5, 'dark');
  const ink = onWhiteText >= 4.5 ? hex : adjust(hex, WHITE, 4.5, 'dark');

  const result = {
    input: hex,
    whiteOnFill: +whiteOnFill.toFixed(2),
    onWhiteText: +onWhiteText.toFixed(2),
    onDarkText: +onInk.toFixed(2),
    pass: { fill: whiteOnFill >= 4.5, ink: onWhiteText >= 4.5, onDark: onInk >= 4.5 },
    suggested: {
      '--c-brand': brand,
      '--c-brand-hover': darken(brand),
      '--c-brand-ink': ink,
      '--c-brand-soft': mixWhite(hex, 0.9),
      '--c-brand-line': mixWhite(hex, 0.6),
    },
    issues,
  };

  if (asJson) { console.log(JSON.stringify(result, null, 2)); return; }

  const mark = (ok) => (ok ? '✓' : '✗');
  console.log(`\n颜色 ${hex}\n${'─'.repeat(52)}`);
  console.log(`① 白字压在这个色上      ${String(result.whiteOnFill).padStart(6)}  ${mark(result.pass.fill)}  ${result.pass.fill ? '可用于按钮底色' : '（<4.5，不能做按钮底色）'}`);
  console.log(`② 这个色压在白底当文字  ${String(result.onWhiteText).padStart(6)}  ${mark(result.pass.ink)}  ${result.pass.ink ? '可用于链接/强调' : '（<4.5，不能做链接/强调文字）'}`);
  console.log(`   这个色压在深底上      ${String(result.onDarkText).padStart(6)}  ${mark(result.pass.onDark)}  （仅供参考，暗色模式另有提亮规则）`);

  if (issues.length) {
    console.log(`\n修正建议：`);
    for (const it of issues) console.log(`  ${it.role}：${it.note}`);
  }

  const ok = result.pass.fill && result.pass.ink;
  console.log(`\n${ok ? '✓ 合格，可直接用作品牌色' : '⚠ 需要调整，用下面的值'}`);
  console.log(`\n推荐 CSS 变量：`);
  console.log(`  --c-brand:       ${result.suggested['--c-brand']};`);
  console.log(`  --c-brand-hover: ${result.suggested['--c-brand-hover']};`);
  console.log(`  --c-brand-ink:   ${result.suggested['--c-brand-ink']};`);
  console.log(`  --c-brand-soft:  ${result.suggested['--c-brand-soft']};`);
  console.log(`  --c-brand-line:  ${result.suggested['--c-brand-line']};`);
  console.log('');
};

main();
