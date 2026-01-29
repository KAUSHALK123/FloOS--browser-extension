// floOS universal launcher content script (Phase 0.3)
// Mounts a floating "kk" dot and lightweight popcard on all pages.
// No storage, no network, UI-only scaffold.

(function() {
  // Prevent duplicate mounting
  if (window.__floOSLauncherMounted) return;
  window.__floOSLauncherMounted = true;
  console.log('floOS: launcher content script injected');

  // Inject minimal styles scoped to floOS elements
  const style = document.createElement('style');
  style.textContent = `
    .floos-dot { position: fixed; right: 20px; bottom: 20px; width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; cursor: pointer; z-index: 2147483646; }
    .floos-popcard { position: fixed; right: 20px; bottom: 60px; width: 300px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; backdrop-filter: blur(12px); padding: 10px; z-index: 2147483646; }
    .floos-popcard input { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 10px 12px; color: #fff; outline: none; }
    .floos-context-menu { position: fixed; background: rgba(0,0,0,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px; padding: 4px; z-index: 2147483646; min-width: 160px; }
    .floos-context-menu button { background: none; border: none; color: #fff; cursor: pointer; width: 100%; text-align: left; padding: 6px 8px; border-radius: 6px; }
    .floos-context-menu button:hover { background: rgba(255,255,255,0.1); }
  `;
  document.documentElement.appendChild(style);

  function openPopcard() {
    if (document.getElementById('floosPopcard')) return;
    const card = document.createElement('div');
    card.id = 'floosPopcard';
    card.className = 'floos-popcard';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ask floOS...';
    card.appendChild(input);
    document.documentElement.appendChild(card);
    input.focus();
    // outside click closes
    setTimeout(() => {
      const outsideHandler = (ev) => {
        const dot = document.getElementById('floosLauncher');
        if (!card.contains(ev.target) && (!dot || !dot.contains(ev.target))) {
          closePopcard();
          console.log('floOS: command popcard closed');
          document.removeEventListener('mousedown', outsideHandler);
        }
      };
      document.addEventListener('mousedown', outsideHandler);
    }, 0);
  }

  function closePopcard() {
    const card = document.getElementById('floosPopcard');
    if (card) card.remove();
  }

  function mountLauncher() {
    if (document.getElementById('floosLauncher')) return;
    const dot = document.createElement('div');
    dot.id = 'floosLauncher';
    dot.className = 'floos-dot';
    dot.textContent = 'kk';
    dot.addEventListener('click', () => {
      console.log('floOS: floating launcher toggled');
      const existing = document.getElementById('floosPopcard');
      if (existing) closePopcard(); else openPopcard();
    });
    document.documentElement.appendChild(dot);
  }

  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      const isCmdK = (e.ctrlKey && e.key.toLowerCase() === 'k') || (e.metaKey && e.key.toLowerCase() === 'k');
      if (isCmdK) {
        e.preventDefault();
        console.log('floOS: command popcard opened');
        openPopcard();
        return;
      }
      if (e.key === 'Escape') {
        const exists = document.getElementById('floosPopcard');
        if (exists) {
          closePopcard();
          console.log('floOS: command popcard closed');
        }
      }
    });
  }

  function setupContextMenu() {
    let menuEl = null;
    const hideMenu = () => { if (menuEl) { menuEl.remove(); menuEl = null; } };
    document.addEventListener('contextmenu', (e) => {
      // Don't override native menu if user holds shift
      if (e.shiftKey) return;
      e.preventDefault();
      hideMenu();
      menuEl = document.createElement('div');
      menuEl.className = 'floos-context-menu';
      menuEl.style.left = e.clientX + 'px';
      menuEl.style.top = e.clientY + 'px';
      const btn = document.createElement('button');
      btn.textContent = 'Save to floOS';
      btn.addEventListener('click', () => {
        console.log('floOS: context save triggered');
        hideMenu();
      });
      menuEl.appendChild(btn);
      document.documentElement.appendChild(menuEl);
    });
    document.addEventListener('mousedown', (e) => { if (menuEl && !menuEl.contains(e.target)) hideMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideMenu(); });
  }

  // Initialize
  mountLauncher();
  setupKeyboard();
  setupContextMenu();
})();
