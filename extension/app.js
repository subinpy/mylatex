/* 수식 클립 — 앱 로직 (웹/크롬 확장 공용) */
(function () {
  const $ = (id) => document.getElementById(id);
  const isExt = !!(window.chrome && chrome.runtime && chrome.runtime.id);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (isExt) document.body.classList.add('ext');

  const els = {
    src: $('src'), preview: $('preview'), err: $('err'), code: $('code'), wrap: $('wrap'), scale: $('scale'),
    hist: $('hist'), toast: $('toast'), snips: $('snips'), nlHelp: $('nlHelp'), srcHint: $('srcHint'),
  };

  const SAMPLE = String.raw`y = r + \gamma\, Q'\!\left(s', \mu'(s' \mid \theta^{\mu'}) \mid \theta^{Q'}\right)`;
  const SNIPS = [
    ['a/b', String.raw`\frac{□}{}`], ['√', String.raw`\sqrt{□}`], ['xⁿ', '^{□}'], ['xₙ', '_{□}'],
    ['∑', String.raw`\sum_{i=1}^{N} □`], ['∫', String.raw`\int_{a}^{b} □ \, dx`], ['∂', String.raw`\frac{\partial □}{\partial x}`],
    ['lim', String.raw`\lim_{x \to 0} □`], ['‖x‖', String.raw`\lVert □ \rVert`], ['x̂', String.raw`\hat{□}`], ['𝐱', String.raw`\mathbf{□}`],
    ['행렬', String.raw`\begin{bmatrix} □ & 0 \\ 0 & 1 \end{bmatrix}`],
    ['cases', String.raw`\begin{cases} □ & \text{if } x>0 \\ 0 & \text{otherwise} \end{cases}`],
    ['μ', String.raw`\mu`], ['θ', String.raw`\theta`], ['γ', String.raw`\gamma`], ['τ', String.raw`\tau`], ['≤', String.raw`\le `], ['≈', String.raw`\approx `],
    ['E[·]', String.raw`\mathbb{E}_{□}\left[ \right]`],
  ];

  const state = { mode: 'tex', display: true, tex: '', ready: false };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('eqclip:' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('eqclip:' + k, JSON.stringify(v)); } catch (_) {} },
  };

  /* ---------- UI 세팅 ---------- */
  document.querySelectorAll('.kb').forEach((k) => {
    const mod = isMac ? '⌘' : 'Ctrl';
    k.textContent = k.dataset.k === 'shift' ? `${mod}⇧↵` : `${mod}↵`;
  });

  for (const [label, ins] of SNIPS) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.title = ins.replace('□', '');
    b.addEventListener('click', () => insert(ins));
    els.snips.appendChild(b);
  }

  function insert(snippet) {
    const ta = els.src, s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e);
    const idx = snippet.indexOf('□');
    const text = snippet.replace('□', sel);
    ta.setRangeText(text, s, e, 'end');
    if (idx >= 0) { const p = s + idx + sel.length; ta.setSelectionRange(p, p); }
    ta.focus(); schedule();
  }

  function setSeg(onBtn, offBtn) { onBtn.classList.add('on'); onBtn.setAttribute('aria-pressed', 'true'); offBtn.classList.remove('on'); offBtn.setAttribute('aria-pressed', 'false'); }
  function setMode(m) {
    state.mode = m; store.set('mode', m);
    m === 'tex' ? setSeg($('modeTex'), $('modeNl')) : setSeg($('modeNl'), $('modeTex'));
    els.nlHelp.hidden = m !== 'nl';
    els.srcHint.textContent = m === 'tex' ? 'LaTeX 그대로 입력 ($ 기호는 자동 제거)' : '말로 쓰면 LaTeX로 바꿔 줍니다 (실험 기능)';
    render();
  }
  function setDisplay(d) {
    state.display = d; store.set('display', d);
    d ? setSeg($('dispBlock'), $('dispInline')) : setSeg($('dispInline'), $('dispBlock'));
    render();
  }
  $('modeTex').onclick = () => setMode('tex');
  $('modeNl').onclick = () => setMode('nl');
  $('dispBlock').onclick = () => setDisplay(true);
  $('dispInline').onclick = () => setDisplay(false);

  /* ---------- 렌더링 ---------- */
  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(render, 80); store.set('draft', els.src.value); }
  els.src.addEventListener('input', schedule);
  els.wrap.addEventListener('change', () => { store.set('wrap', els.wrap.value); showCode(); });
  els.scale.addEventListener('change', () => store.set('scale', els.scale.value));

  function toTex(raw) { return state.mode === 'nl' ? EqNL.nl2tex(raw) : EqNL.clean(raw); }

  function wrapped(tex) {
    switch (els.wrap.value) {
      case 'inline': return `$${tex}$`;
      case 'display': return `$$${tex}$$`;
      case 'equation': return `\\begin{equation}\n  ${tex}\n\\end{equation}`;
      default: return tex;
    }
  }
  function showCode() { els.code.textContent = state.tex ? wrapped(state.tex) : ''; }

  function render() {
    state.tex = toTex(els.src.value);
    showCode();
    if (!state.ready) return;
    els.err.hidden = true;
    if (!state.tex) { els.preview.innerHTML = '<span class="wait">수식을 입력하세요</span>'; return; }
    try {
      const node = MathJax.tex2svg(state.tex, { display: state.display });
      const errNode = node.querySelector('[data-mml-node="merror"]');
      els.preview.replaceChildren(node);
      if (errNode) {
        els.err.textContent = '문법 오류: ' + (errNode.getAttribute('data-mjx-error') || errNode.textContent || '확인 필요');
        els.err.hidden = false;
      }
    } catch (e) {
      els.err.textContent = '렌더링 실패: ' + e.message; els.err.hidden = false;
    }
  }

  /* ---------- 내보내기 ---------- */
  const EX_PX = 9; // 1ex ≈ 9px (약 20px 글자 크기 기준)
  function exportSvg() {
    const node = MathJax.tex2svg(state.tex, { display: state.display });
    const svg = node.querySelector('svg');
    if (!svg) throw new Error('SVG 생성 실패');
    const w = parseFloat(svg.getAttribute('width')) * EX_PX;
    const h = parseFloat(svg.getAttribute('height')) * EX_PX;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', w.toFixed(2) + 'px');
    svg.setAttribute('height', h.toFixed(2) + 'px');
    svg.removeAttribute('style'); svg.removeAttribute('role'); svg.removeAttribute('focusable');
    const str = new XMLSerializer().serializeToString(svg).replace(/currentColor/g, '#000000');
    return { str, w, h };
  }

  function makePng() {
    const { str, w, h } = exportSvg();
    const scale = Number(els.scale.value) || 4;
    const pad = 12;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.ceil((w + pad * 2) * scale); c.height = Math.ceil((h + pad * 2) * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, pad * scale, pad * scale, w * scale, h * scale);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 변환 실패'))), 'image/png');
      };
      img.onerror = () => reject(new Error('SVG 이미지 로드 실패'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
    });
  }

  async function copyText(text, label) {
    try { await navigator.clipboard.writeText(text); toast(`${label} 복사됨`); return true; }
    catch (_) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand && document.execCommand('copy'); ta.remove();
      toast(ok ? `${label} 복사됨` : '복사 실패: 코드 영역을 직접 선택해 복사하세요'); return ok;
    }
  }

  function guard() {
    if (!state.ready) { toast('렌더러가 아직 로딩 중입니다'); return false; }
    if (!state.tex) { toast('먼저 수식을 입력하세요'); return false; }
    return true;
  }

  async function copyTex() { if (!guard()) return; if (await copyText(wrapped(state.tex), 'LaTeX')) addHist(state.tex); }

  async function copyPng() {
    if (!guard()) return;
    const blobP = makePng();
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobP })]);
      toast('PNG 이미지 복사됨 (흰 배경)'); addHist(state.tex);
    } catch (e) {
      try {
        const blob = await blobP;
        $('fallbackImg').src = URL.createObjectURL(blob);
        $('fallback').hidden = false;
      } catch (e2) { toast('이미지 생성 실패: ' + e2.message); }
    }
  }

  async function copySvg() {
    if (!guard()) return;
    const { str } = exportSvg();
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'image/svg+xml': new Blob([str], { type: 'image/svg+xml' }),
        'text/plain': new Blob([str], { type: 'text/plain' }),
      })]);
      toast('SVG 복사됨'); addHist(state.tex);
    } catch (_) { if (await copyText(str, 'SVG 코드')) addHist(state.tex); }
  }

  async function copyMml() {
    if (!guard()) return;
    const mml = MathJax.tex2mml(state.tex, { display: state.display });
    if (await copyText(mml, 'MathML')) addHist(state.tex);
  }

  $('cpTex').onclick = copyTex; $('cpPng').onclick = copyPng; $('cpSvg').onclick = copySvg; $('cpMml').onclick = copyMml;
  $('closeFallback').onclick = () => { $('fallback').hidden = true; };

  document.addEventListener('keydown', (e) => {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (mod && e.key === 'Enter') { e.preventDefault(); e.shiftKey ? copyPng() : copyTex(); }
    if (e.key === 'Escape' && !$('fallback').hidden) $('fallback').hidden = true;
  });

  /* ---------- 기록 ---------- */
  function addHist(tex) {
    let h = store.get('hist', []).filter((x) => x !== tex);
    h.unshift(tex); h = h.slice(0, 12); store.set('hist', h); drawHist();
  }
  function drawHist() {
    const h = store.get('hist', []);
    els.hist.replaceChildren();
    if (!h.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = '복사한 수식이 여기에 쌓입니다'; els.hist.appendChild(li); return; }
    for (const tex of h) {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.textContent = tex; b.title = '입력창으로 불러오기';
      b.onclick = () => { setMode('tex'); els.src.value = tex; schedule(); els.src.focus(); };
      li.appendChild(b); els.hist.appendChild(li);
    }
  }
  $('clearHist').onclick = () => { store.set('hist', []); drawHist(); };

  let tt = 0;
  function toast(msg) { els.toast.textContent = msg; els.toast.hidden = false; clearTimeout(tt); tt = setTimeout(() => { els.toast.hidden = true; }, 1600); }

  /* ---------- 시작 ---------- */
  els.src.value = store.get('draft', SAMPLE) || SAMPLE;
  els.wrap.value = store.get('wrap', 'none');
  els.scale.value = store.get('scale', '4');
  drawHist();
  setDisplay(store.get('display', true));
  setMode(store.get('mode', 'tex'));
  els.src.focus();

  function onReady() { state.ready = true; render(); }
  if (window.MathJax && MathJax.tex2svg && MathJax.startup && MathJax.startup.promise) MathJax.startup.promise.then(onReady);
  else window.addEventListener('mathjax-ready', onReady, { once: true });

  window.EqClip = { render, makePng, exportSvg, state }; // 테스트용
})();
