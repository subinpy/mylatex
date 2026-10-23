const assert = require('assert');
const { nl2tex, clean } = require('../src/nl.js');

const cases = [
  ['a over b', '\\frac{a}{b}'],
  ['x squared + y squared', 'x^{2} + y^{2}'],
  ['sqrt(x+1)', '\\sqrt{x+1}'],
  ['sum from i=1 to n of x_i', '\\sum_{i=1}^{n} x_i'],
  ['integral from 0 to infinity of e^(-x) dx', '\\int_{0}^{\\infty} e^{-x} \\, dx'],
  ['mu times F_n', '\\mu \\times F_n'],
  ['b 분의 a', '\\frac{a}{b}'],
  ['x 제곱', 'x^{2}'],
  ['루트 2', '\\sqrt{2}'],
  ['alpha + beta <= gamma', '\\alpha + \\beta \\le \\gamma'],
  ['(a+b)/(c+d)', '\\frac{a+b}{c+d}'],
  ['norm of (f_t) <= mu f_n', '\\lVert f_t \\rVert \\le \\mu f_n'],
];
let ok = 0;
for (const [i, want] of cases) {
  const got = nl2tex(i);
  try { assert.strictEqual(got, want); ok++; } catch { console.error(`✗ ${i}\n  got:  ${got}\n  want: ${want}`); }
}
assert.strictEqual(clean('$$\\frac{a}{b}$$'), '\\frac{a}{b}');
assert.strictEqual(clean('\\[ x \\]'), 'x');
assert.strictEqual(clean('\\begin{equation} E=mc^2 \\end{equation}'), 'E=mc^2');
console.log(`nl2tex ${ok}/${cases.length} 통과, clean 3/3 통과`);
process.exit(ok === cases.length ? 0 : 1);
