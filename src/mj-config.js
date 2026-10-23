window.MathJax = {
  svg: { fontCache: 'local' },
  options: { enableMenu: false, menuOptions: { settings: { assistiveMml: false } } },
  startup: {
    typeset: false,
    ready() {
      MathJax.startup.defaultReady();
      document.head.appendChild(MathJax.svgStylesheet());
      MathJax.startup.promise.then(() => window.dispatchEvent(new Event('mathjax-ready')));
    },
  },
};
