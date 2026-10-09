(() => {
    if (window.__leptonDevOverlay) return;
    window.__leptonDevOverlay = true;

    var invoke = window.__lepton?.invoke;
    if (typeof invoke !== 'function') return;

    var STORAGE_KEY = 'lepton.devOverlay.pos';
    var SIZE = 44;

    var LOGO =
        '<svg class="label logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210.49 197.33" aria-hidden="true">' +
        '<path fill="#416bb3" d="M.26,98.72C.26,85,.41,71.24.17,57.5c-.07-4.49,2.12-7.17,5.55-9Q19.85,40.7,33.48,32.09c5.23-3.29,10.73-6.05,16-9.28,9.65-5.94,19.61-11.37,29.2-17.42,2-1.25,4.14-2.36,6.23-3.51C89.29-.55,94.59,2,94.73,7c.24,8.68.2,17.38,0,26.07-.06,2.76-1.71,4.87-4.21,6.33Q73.09,49.6,55.71,59.86c-4.78,2.8-9.55,5.63-14.34,8.43A8.16,8.16,0,0,0,37,75.64Q37,99,37.07,122.32a7.59,7.59,0,0,0,4,7c12.16,7.08,24.27,14.24,36.42,21.35,4.55,2.66,9.14,5.24,13.67,7.94a6.43,6.43,0,0,1,3.25,5.79c0,8.69.14,17.39,0,26.08a7,7,0,0,1-10.54,5.92c-5.84-3.62-11.8-7-17.76-10.45-7.59-4.34-15.43-8.28-22.8-12.95s-14.86-9.37-22.44-13.81c-5.14-3-10.2-6.19-15.44-9C1.54,148,0,145,0,140.69c.1-14,0-28,0-42Z"/>' +
        '<path fill="#f36f22" d="M210.46,98c0,14.08,0,28.15,0,42.23a10,10,0,0,1-5.48,9.49c-11.87,6.91-23.64,14-35.43,21q-20.24,12.1-40.45,24.27c-1.56.93-3.09,1.9-5,1.85a6.44,6.44,0,0,1-6.4-6.56q-.14-12.79,0-25.59c0-3.71,2.38-6.14,5.82-7.68a100.34,100.34,0,0,0,9.71-5.51q18.48-11,36.94-21.93a8,8,0,0,0,4.28-7.09q.1-24,0-47.93a7.56,7.56,0,0,0-3.7-6.67Q154,57.52,137.12,47.24c-5.06-3.1-10.15-6.15-15.21-9.25-2.39-1.46-3.24-3.7-3.23-6.42,0-7.78,0-15.56,0-23.34,0-3,.5-6,3.44-7.42a8.51,8.51,0,0,1,8.43.7q23.64,14.4,47.34,28.71C187,35.72,196,41.29,205.12,46.7a9.94,9.94,0,0,1,5.32,9.35c-.07,14,0,28,0,42Z"/>' +
        '<path fill="#f36f22" d="M103.51,134.26c-18.84.46-35.39-19-33.54-38,1.79-18.33,17.09-33.69,37.11-32.8A35.27,35.27,0,0,1,141,101.76C139.52,120.31,122.68,135.17,103.51,134.26Z"/>' +
        '</svg>';

    var host = document.createElement('div');
    host.id = 'lepton-dev-overlay';
    host.style.cssText =
        'all:initial;position:fixed;z-index:2147483647;right:16px;bottom:16px;left:auto;top:auto;';

    var shadow = host.attachShadow({ mode: 'open' });
    // --- Cleaner HTML with Template Literals ---

    // Define menu items for easy extension and readability
    const devOverlayMenuItems = [
        {
            d: 1,
            cmd: 'reloadUi',
            icon: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/>
                    <path d="M21 3v5h-5"/>
                </svg>
            `,
            label: 'Reload UI',
            desc: 'Refresh the page',
            kbd: 'Ctrl+R',
        },
        {
            d: 2,
            cmd: 'openInspect',
            icon: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 8l-4 4 4 4"/>
                    <path d="M16 8l4 4-4 4"/>
                    <path d="M13.5 5l-3 14"/>
                </svg>
            `,
            label: 'Open inspect',
            desc: 'Open dev tools',
            kbd: 'F12',
        },
        {
            d: 3,
            cmd: 'restartApp',
            icon: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3v8"/>
                    <path d="M6.3 6.6a8 8 0 1 0 11.4 0"/>
                </svg>
            `,
            label: 'Restart app',
            desc: 'Relaunch the app',
            kbd: 'Ctrl+Shift+R',
            danger: true,
        },
    ];

    // Build the menu items HTML
    const devOverlayListItems = devOverlayMenuItems
        .map(
            (item) => `
        <li class="s" style="--d:${item.d}">
          <button type="button"
                  class="item"
                  role="menuitem"
                  data-cmd="${item.cmd}">
            <span class="icon${item.danger ? ' danger' : ''}">${item.icon}</span>
            <span>
              <b>${item.label}</b>
              <small>${item.desc}</small>
            </span>
            <kbd>${item.kbd}</kbd>
          </button>
        </li>
    `,
        )
        .join('\n');

    shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      #root {
        position: relative;
        width: 44px; height: 44px;
        font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        --accent: #f36f22;
        --spring: cubic-bezier(.34,1.56,.64,1);
        --ease-out: cubic-bezier(.22,1,.36,1);
        --ease-in: cubic-bezier(.5,0,.75,0);
      }
      #root.up.right {
        --origin: bottom right; --shift: 14px;
        --clip: inset(calc(100% - 40px) 0 0 calc(100% - 40px) round 20px);
      }
      #root.up.left {
        --origin: bottom left; --shift:14px;
        --clip: inset(calc(100% - 40px) calc(100% - 40px) 0 0 round 20px);
      }
      #root.down.right {
        --origin: top right; --shift:-14px;
        --clip: inset(0 0 calc(100% - 40px) calc(100% - 40px) round 20px);
      }
      #root.down.left {
        --origin: top left; --shift:-14px;
        --clip: inset(0 calc(100% - 40px) calc(100% - 40px) 0 round 20px);
      }
      #fab {
        position: relative; z-index: 2; display: grid; place-items: center;
        width: 44px; height: 44px; border: 0; border-radius: 50%; padding: 0;
        background: #1e1e1e; color: #fff; cursor: grab;
        box-shadow: 0 0 0 1px rgba(255,255,255,.1),0 6px 16px rgba(0,0,0,.4),0 2px 6px rgba(0,0,0,.3);
        transition: transform .35s var(--spring);
        -webkit-tap-highlight-color: transparent;
      }
      #fab:hover { transform: scale(1.06); }
      #fab:active { cursor: grabbing; transform: scale(.94); }
      #fab:focus-visible { outline:3px solid var(--accent); outline-offset:3px; }
      #fab .label, #fab .x {
        grid-area: 1/1;
        transition: transform .45s var(--spring), opacity .2s ease;
      }
      #fab .logo { width: 24px; height: 22.5px; display: block; }
      #fab .x { width: 20px; height: 20px; opacity: 0; transform: rotate(-90deg) scale(.5);}
      #root.open #fab .label { opacity: 0; transform: rotate(90deg) scale(.5); }
      #root.open #fab .x { opacity: 1; transform: none; }
      #wrap {
        position: absolute; width: 280px; visibility: hidden; pointer-events: none;
        transform-origin: var(--origin);
        transform: translateY(var(--shift)) scale(.9);
        filter: drop-shadow(0 16px 32px rgba(0,0,0,.45))
                drop-shadow(0 2px 6px rgba(0,0,0,.25));
        transition: transform .3s var(--ease-in), visibility 0s linear .3s;
      }
      #root.up #wrap { bottom: 54px; }
      #root.down #wrap { top: 54px; }
      #root.right #wrap { right: 0; }
      #root.left #wrap { left: 0; }
      #root.open #wrap {
        visibility: visible; pointer-events: auto; transform: none;
        transition: transform .6s var(--spring), visibility 0s;
      }
      #panel {
        background: #1e1e1e; color: #eee; border-radius: 20px; padding: 6px;
        clip-path: var(--clip); opacity: 0;
        transition: clip-path .3s var(--ease-in), opacity .22s ease .08s;
      }
      #root.open #panel {
        clip-path: inset(0 round 20px); opacity: 1;
        transition: clip-path .55s var(--ease-out), opacity .15s ease;
      }
      .s {
        opacity: 0; transform: translateY(10px);
        transition: opacity .15s ease, transform .15s ease;
      }
      #root.open .s {
        opacity: 1; transform: none;
        transition: opacity .35s ease calc(var(--d,0)*45ms + 120ms),
                    transform .5s var(--ease-out) calc(var(--d,0)*45ms + 120ms);
      }
      #panel h4 { margin: 0; padding: 6px 8px 4px; font: 600 11px/1.2 inherit; color: var(--accent); }
      #panel ul { list-style: none; margin: 0; padding: 0; }
      .item {
        display: flex; align-items: center; gap: 10px; width: 100%; margin: 0; padding: 6px 8px;
        border: 0; border-radius: 12px; background: transparent; color: #eee; cursor: pointer;
        font: inherit; text-align: left; transition: background .2s ease;
      }
      .item:hover,
      .item:focus-visible { background: #2b2b30; }
      .item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
      .icon {
        display: grid; place-items: center; flex: none; width: 30px; height: 30px; border-radius: 9px;
        background: rgba(243,111,34,.16); color: var(--accent);
        transition: transform .3s var(--spring);
      }
      .icon.danger { background: rgba(255,95,95,.16); color: #ff7a7a; }
      .icon svg { width: 16px; height: 16px; }
      .item:hover .icon { transform: scale(1.08) rotate(-4deg); }
      .item:active .icon { transform: scale(.92); }
      .item b { display: block; font-weight: 600; font-size: 12px; }
      .item small { display: block; font-size: 11px; opacity: .55; }
      .item kbd {
        margin-left: auto; padding: 1px 5px; border: 1px solid #3a3a40; border-radius: 5px; white-space: nowrap;
        background: #26262b; color: #aaa; font: 10px/1.3 inherit;
      }
      .foot {
        margin: 4px 4px 2px; padding: 6px 4px 3px; border-top: 1px solid #333; font-size: 11px; opacity: .5;
      }
      @media (prefers-reduced-motion:reduce) {
        #fab,#fab .label,#fab .x,#wrap,#panel,.s,.item,.icon {
          transition-duration: .01ms !important;
          transition-delay: 0s !important;
        }
      }
    </style>
    <div id="root" class="up right">
      <div id="wrap">
        <div id="panel" role="menu" aria-label="Developer menu" inert>
          <h4 class="s" style="--d:0">Developer</h4>
          <ul>
            ${devOverlayListItems}
          </ul>
          <div class="foot s" style="--d:4">Drag the button to move it</div>
        </div>
      </div>
      <button type="button" id="fab"
              title="Developer menu"
              aria-haspopup="menu"
              aria-expanded="false"
              aria-controls="panel">
        ${LOGO}
        <svg class="x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
             stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18"/>
        </svg>
      </button>
    </div>
    `;

    var root = shadow.getElementById('root');
    var fab = shadow.getElementById('fab');
    var panel = shadow.getElementById('panel');
    if (!root || !fab || !panel) return;

    var items = Array.prototype.slice.call(panel.querySelectorAll('.item'));

    var call = (name) => {
        invoke(`lepton.dev.${name}`, null).catch((err) => {
            console.error('[lepton.dev]', err);
        });
    };

    var isOpen = () => root.classList.contains('open');

    var setOpen = (open, returnFocus) => {
        root.classList.toggle('open', open);
        fab.setAttribute('aria-expanded', String(open));
        if (open) {
            panel.removeAttribute('inert');
        } else {
            panel.setAttribute('inert', '');
            if (returnFocus) fab.focus();
        }
    };

    // Open the panel toward the side of the screen that has room.
    var updateSide = () => {
        var r = host.getBoundingClientRect();
        var up = r.top + r.height / 2 > window.innerHeight / 2;
        var right = r.left + r.width / 2 > window.innerWidth / 2;
        root.classList.toggle('up', up);
        root.classList.toggle('down', !up);
        root.classList.toggle('right', right);
        root.classList.toggle('left', !right);
    };

    var clampIntoView = () => {
        if (host.style.right !== 'auto') return;
        var r = host.getBoundingClientRect();
        host.style.left = `${Math.max(0, Math.min(window.innerWidth - SIZE, r.left))}px`;
        host.style.top = `${Math.max(0, Math.min(window.innerHeight - SIZE, r.top))}px`;
    };

    fab.addEventListener('click', (e) => {
        e.stopPropagation();
        if (fab.__leptonDragged) return;
        var open = !isOpen();
        setOpen(open, false);
        // Keyboard activation (no pointer): move focus into the panel.
        if (open && e.detail === 0) {
            setTimeout(() => {
                if (items[0]) items[0].focus();
            }, 80);
        }
    });

    panel.addEventListener('click', (e) => {
        var t = e.target;
        var btn = t?.closest ? t.closest('[data-cmd]') : null;
        if (!btn) return;
        call(btn.getAttribute('data-cmd'));
        setOpen(false, true);
    });

    // Click anywhere else on the page closes the panel.
    document.addEventListener(
        'pointerdown',
        (e) => {
            if (!isOpen()) return;
            var path = e.composedPath ? e.composedPath() : [];
            if (path.indexOf(host) === -1) setOpen(false, false);
        },
        true,
    );

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (isOpen()) setOpen(false, !!shadow.activeElement);
            return;
        }
        if (e.key === 'F12') {
            e.preventDefault();
            call('openInspect');
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            call('restartApp');
            return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            call('reloadUi');
            return;
        }
        if (isOpen() && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            // biome-ignore lint/correctness/noInnerDeclarations: we need to declare the variable here
            var i = items.indexOf(shadow.activeElement);
            if (e.key === 'ArrowDown') i = i >= items.length - 1 ? 0 : i + 1;
            else i = i <= 0 ? items.length - 1 : i - 1;
            items[i].focus();
        }
    });

    var restore = () => {
        try {
            // biome-ignore lint/correctness/noInnerDeclarations: we need to declare the variable here
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            // biome-ignore lint/correctness/noInnerDeclarations: we need to declare the variable here
            var pos = JSON.parse(raw);
            if (typeof pos.left !== 'number' || typeof pos.top !== 'number') return;
            host.style.left = `${pos.left}px`;
            host.style.top = `${pos.top}px`;
            host.style.right = 'auto';
            host.style.bottom = 'auto';
        } catch (_err) {}
    };

    var save = () => {
        var r = host.getBoundingClientRect();
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: r.left, top: r.top }));
        } catch (_err) {}
    };

    var drag = null;
    fab.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        fab.__leptonDragged = false;
        var r = host.getBoundingClientRect();
        drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY };
        fab.setPointerCapture(e.pointerId);
    });
    fab.addEventListener('pointermove', (e) => {
        if (!drag) return;
        if (!fab.__leptonDragged) {
            // Ignore tiny movements so a normal click still toggles the panel.
            if (Math.abs(e.clientX - drag.sx) < 4 && Math.abs(e.clientY - drag.sy) < 4) return;
            fab.__leptonDragged = true;
            setOpen(false, false);
        }
        var x = Math.max(0, Math.min(window.innerWidth - SIZE, e.clientX - drag.dx));
        var y = Math.max(0, Math.min(window.innerHeight - SIZE, e.clientY - drag.dy));
        host.style.left = `${x}px`;
        host.style.top = `${y}px`;
        host.style.right = 'auto';
        host.style.bottom = 'auto';
    });
    var endDrag = () => {
        if (drag && fab.__leptonDragged) {
            save();
            updateSide();
        }
        drag = null;
    };
    fab.addEventListener('pointerup', endDrag);
    fab.addEventListener('pointercancel', endDrag);

    window.addEventListener('resize', () => {
        clampIntoView();
        updateSide();
    });

    var mount = () => {
        if (!document.documentElement) return;
        restore();
        document.documentElement.appendChild(host);
        clampIntoView();
        updateSide();
    };

    if (document.documentElement) mount();
    else document.addEventListener('DOMContentLoaded', mount);
})();
