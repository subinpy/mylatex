/* 입력 정제 + 자연어 → LaTeX 규칙 변환 (브라우저/Node 공용) */
(function (root) {
  const GREEK = ['alpha','beta','gamma','delta','epsilon','varepsilon','zeta','eta','theta','vartheta','iota','kappa',
    'lambda','mu','nu','xi','pi','rho','sigma','tau','upsilon','phi','varphi','chi','psi','omega',
    'Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma','Upsilon','Phi','Psi','Omega'];
  const FUNCS = ['arcsin','arccos','arctan','sinh','cosh','tanh','sin','cos','tan','cot','sec','csc',
    'log','ln','exp','max','min','argmax','argmin','det','lim','sup','inf'];
  const UNI = { 'α':'\\alpha','β':'\\beta','γ':'\\gamma','δ':'\\delta','ε':'\\epsilon','θ':'\\theta','λ':'\\lambda',
    'μ':'\\mu','π':'\\pi','ρ':'\\rho','σ':'\\sigma','τ':'\\tau','φ':'\\phi','ω':'\\omega','Δ':'\\Delta','Σ':'\\Sigma',
    'Ω':'\\Omega','×':'\\times','·':'\\cdot','÷':'\\div','±':'\\pm','≤':'\\le','≥':'\\ge','≠':'\\neq','≈':'\\approx',
    '∞':'\\infty','→':'\\to','⇒':'\\Rightarrow','∂':'\\partial','∇':'\\nabla','∑':'\\sum','∫':'\\int','√':'\\sqrt',
    '∈':'\\in','∀':'\\forall','∃':'\\exists','°':'^{\\circ}' };

  // 피연산자: (괄호묶음) | {중괄호묶음} | \명령어/식별자/숫자 (+ 첨자, 프라임)
  const OPD = String.raw`(\([^()]*\)|\{[^{}]*\}|\\?[A-Za-z0-9.]+(?:[_^](?:\{[^{}]*\}|\([^()]*\)|[A-Za-z0-9]))*'*)`;
  const unwrap = (x) => {
    x = x.trim();
    if ((x.startsWith('(') && x.endsWith(')')) || (x.startsWith('{') && x.endsWith('}'))) return x.slice(1, -1).trim();
    return x;
  };
  // ^( ... ) / _( ... ) → ^{ ... }
  const braceScripts = (t) => t.replace(/([_^])\(([^()]*)\)/g, '$1{$2}');

  function clean(s) {
    let t = (s || '').trim();
    const pairs = [['$$', '$$'], ['\\[', '\\]'], ['\\(', '\\)'], ['$', '$']];
    for (const [a, b] of pairs) {
      if (t.startsWith(a) && t.endsWith(b) && t.length >= a.length + b.length) { t = t.slice(a.length, t.length - b.length).trim(); break; }
    }
    t = t.replace(/^\\begin\{(equation|align)\*?\}([\s\S]*)\\end\{\1\*?\}$/, '$2').trim();
    return t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  }

  function nl2tex(s) {
    let t = clean(s);
    // 유니코드 기호
    t = t.replace(/[α-ωΑ-Ω×·÷±≤≥≠≈∞→⇒∂∇∑∫√∈∀∃°]/g, (c) => (UNI[c] ? UNI[c] + ' ' : c));

    // 비교·화살표 기호
    const sym = [
      [/\bless than or equal to\b|<=/gi, ' \\le '],
      [/\bgreater than or equal to\b|>=/gi, ' \\ge '],
      [/\bnot equal to\b|!=/gi, ' \\neq '],
      [/\bapproximately( equal to)?\b|~=/gi, ' \\approx '],
      [/=>/g, ' \\Rightarrow '],
      [/->|\bgoes to\b|\bapproaches\b/gi, ' \\to '],
      [/\bplus[- ]minus\b|\+-/gi, ' \\pm '],
      [/\btimes\b/gi, ' \\times '],
      [/\bcdot\b/gi, ' \\cdot '],
      [/\binfinity\b|무한대/gi, '\\infty'],
      [/\bpartial\b/gi, '\\partial '],
      [/\b(nabla|gradient)\b/gi, '\\nabla '],
      [/\bfor all\b/gi, '\\forall '],
      [/\bin\b(?=\s+\\?[A-Z])/g, '\\in'],
    ];
    for (const [re, rep] of sym) t = t.replace(re, rep);

    // 그리스 문자, 함수 (앞에 \ 나 글자가 없을 때만)
    t = t.replace(new RegExp(String.raw`(?<![\\A-Za-z])(${GREEK.join('|')})(?![A-Za-z])`, 'g'), '\\$1');
    t = t.replace(new RegExp(String.raw`(?<![\\A-Za-z])(${FUNCS.join('|')})(?![A-Za-z])`, 'g'), '\\$1');

    // 구조: 극한, 합, 적분, 미분
    t = t.replace(/\\?lim(?:it)?\s+as\s+(.+?)\s*\\to\s*(.+?)\s+of\s+/gi, '\\lim_{$1 \\to $2} ');
    t = t.replace(/\b(?:sum|시그마)\s+(?:from\s+)?(.+?)\s+to\s+(.+?)\s+of\s+/gi, '\\sum_{$1}^{$2} ');
    t = t.replace(/\bsum\s+over\s+(.+?)\s+of\s+/gi, '\\sum_{$1} ');
    t = t.replace(/\b(?:integral|적분)\s+from\s+(.+?)\s+to\s+(.+?)\s+of\s+/gi, '\\int_{$1}^{$2} ');
    t = t.replace(/\bintegral\s+of\s+/gi, '\\int ');
    t = t.replace(/\b(?:derivative|d)\s+of\s+(.+?)\s+with respect to\s+(\S+)/gi, '\\frac{d $1}{d $2}');
    t = t.replace(/\bpartial\s+derivative\s+of\s+(.+?)\s+with respect to\s+(\S+)/gi, '\\frac{\\partial $1}{\\partial $2}');
    t = t.replace(/\s+d([a-z])\b(?=\s*$|\s*[=,;])/g, ' \\, d$1');

    // 장식: hat, bar, vec, dot, norm, abs
    t = t.replace(new RegExp(String.raw`\b(hat|bar|vec|tilde|dot|ddot)\s+` + OPD, 'gi'), (_, f, x) => `\\${f.toLowerCase()}{${unwrap(x)}}`);
    t = t.replace(new RegExp(String.raw`\bnorm\s+of\s+` + OPD, 'gi'), (_, x) => `\\lVert ${unwrap(x)} \\rVert`);
    t = t.replace(new RegExp(String.raw`\b(?:abs|absolute value of)\s+` + OPD, 'gi'), (_, x) => `\\lvert ${unwrap(x)} \\rvert`);

    // 루트
    t = t.replace(new RegExp(String.raw`(?:\bsquare root of|\bsqrt|\broot|루트|\\sqrt)\s*` + OPD, 'gi'), (_, x) => `\\sqrt{${unwrap(x)}}`);
    t = t.replace(new RegExp(String.raw`\bcube root of\s*` + OPD, 'gi'), (_, x) => `\\sqrt[3]{${unwrap(x)}}`);

    // 거듭제곱·첨자
    t = t.replace(new RegExp(OPD + String.raw`\s+(?:squared|제곱)(?![가-힣])`, 'gi'), (_, x) => `${x}^{2}`);
    t = t.replace(new RegExp(OPD + String.raw`\s+(?:cubed|세제곱)`, 'gi'), (_, x) => `${x}^{3}`);
    t = t.replace(new RegExp(OPD + String.raw`\s+to the(?: power of)?\s+` + OPD, 'gi'), (_, x, y) => `${x}^{${unwrap(y)}}`);
    t = t.replace(new RegExp(OPD + String.raw`\s+sub\s+` + OPD, 'gi'), (_, x, y) => `${x}_{${unwrap(y)}}`);
    t = braceScripts(t);

    // 분수: "B 분의 A", "A over B", 간단한 a/b
    t = t.replace(new RegExp(OPD + String.raw`\s*분의\s*` + OPD, 'g'), (_, b, a) => `\\frac{${unwrap(a)}}{${unwrap(b)}}`);
    t = t.replace(new RegExp(OPD + String.raw`\s+over\s+` + OPD, 'gi'), (_, a, b) => `\\frac{${unwrap(a)}}{${unwrap(b)}}`);
    t = t.replace(new RegExp(OPD + String.raw`\s*/\s*` + OPD, 'g'), (_, a, b) => `\\frac{${unwrap(a)}}{${unwrap(b)}}`);

    return t.replace(/\s{2,}/g, ' ').replace(/\s+([_^}])/g, '$1').trim();
  }

  const api = { clean, nl2tex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.EqNL = api;
})(typeof window !== 'undefined' ? window : globalThis);
