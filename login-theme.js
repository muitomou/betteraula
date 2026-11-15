/**
 * @file login-theme.js
 * @description Aplica el tema de Better Aula a la página de inicio de sesión
 * (portada) de Aula USM: colores del tema, modo oscuro, imagen o gradiente del
 * hero y opciones de diseño (ocultar "¿Nuevo aquí?", ocultar logos, compacto).
 *
 * Reglas de este módulo:
 *   - Solo toca elementos decorativos. NUNCA lee, modifica ni escucha los
 *     formularios, inputs ni botones de inicio de sesión.
 *   - Si la página cambia y no se encuentran los elementos, no hace nada
 *     (sin errores ni mensajes en consola).
 *
 * Carga: document_idle, después de panel-ui.js, image-manager.js e image-picker.js.
 * Estilos: login-theme.css (inyectado en document_start).
 */
(function (BA) {

  var STORAGE_KEY = 'loginPageConfig';
  var DEFAULTS = { hero: null, hideNewUser: false, hideLogos: false, compact: false };

  /* Gradientes disponibles: id del preset de ImageManager → clase CSS */
  var MESH_IDS = ['usm', 'ocean', 'forest', 'sunset', 'pink', 'purple', 'celeste', 'coffee'];
  var MESH_LABELS = {
    usm: 'USM', ocean: 'Ocean', forest: 'Forest', sunset: 'Sunset',
    pink: 'Pink', purple: 'Purple', celeste: 'Celeste', coffee: 'Coffee'
  };

  /* Selectores en orden de preferencia: si la USM cambia una clase,
     se intenta con el siguiente (atributos ARIA / estructura). */
  var PARTS = {
    shell:   ['.login-shell', 'section[aria-labelledby="access-title"]'],
    hero:    ['.login-shell .hero-panel', '.hero-panel', '[class*="hero"]'],
    access:  ['.access-panel', '#access-title'],
    newUser: ['.new-user', 'aside#ayuda', 'aside[aria-labelledby="new-user-title"]'],
    logos:   ['.institutional-trust', 'section[aria-label*="Acreditaci"]', '.trust-logos'],
    header:  ['.site-header', 'body > header'],
    utility: ['.utility-bar'],
    footer:  ['.site-footer', 'body > footer'],
    nav:     ['.main-nav', 'nav[aria-label="Navegación principal"]', 'header nav']
  };

  var DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

  var _active = false;
  var _config = Object.assign({}, DEFAULTS);
  var _els = {};

  function _query(list) {
    for (var i = 0; i < list.length; i++) {
      try {
        var el = document.querySelector(list[i]);
        if (el) return el;
      } catch (e) { /* selector no soportado: probar el siguiente */ }
    }
    return null;
  }

  /* #access-title es el h2; el panel es su contenedor */
  function _resolveAccess() {
    var el = _query(PARTS.access);
    if (el && el.id === 'access-title') el = el.parentElement;
    return el;
  }

  function _detect() {
    _els = {
      shell:   _query(PARTS.shell),
      hero:    _query(PARTS.hero),
      access:  _resolveAccess(),
      newUser: _query(PARTS.newUser),
      logos:   _query(PARTS.logos),
      header:  _query(PARTS.header),
      utility: _query(PARTS.utility),
      footer:  _query(PARTS.footer),
      nav:     _query(PARTS.nav)
    };
    /* Es la portada si existe el contenedor principal, o hero + panel de acceso */
    return !!(_els.shell || (_els.hero && _els.access));
  }

  /* Marca los elementos con data-ba-login para que el CSS no dependa
     de los nombres de clase de la página. */
  function _mark() {
    Object.keys(_els).forEach(function (key) {
      if (_els[key]) _els[key].setAttribute('data-ba-login', key);
    });
  }

  // ------------------------------------------------------------------
  // Colores del tema
  // ------------------------------------------------------------------
  function _isLight(hex) {
    var v = String(hex || '').replace('#', '');
    if (v.length === 3) v = v.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(v)) return false;
    var n = parseInt(v, 16);
    var l = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
    return l > 160;
  }

  function _applyThemeColors(themeConfig) {
    var root = document.documentElement;
    var colors = themeConfig && themeConfig.colors;
    if (!colors) {
      root.classList.remove('ba-login-themed', 'ba-login-nav-light');
      root.style.removeProperty('--ba-login-on-accent');
      return;
    }
    root.classList.add('ba-login-themed');
    root.classList.toggle('ba-login-nav-light', _isLight(colors.nav));
    root.style.setProperty('--ba-login-on-accent', _isLight(colors.accent) ? '#1a202c' : '#ffffff');
  }

  // ------------------------------------------------------------------
  // Hero: imagen propia (IndexedDB) o gradiente
  // ------------------------------------------------------------------
  function _meshKey(id) {
    var key = String(id || '').replace('preset_mesh_', '');
    return MESH_IDS.indexOf(key) !== -1 ? key : null;
  }

  function _clearHero(hero) {
    hero.classList.remove('ba-mesh-card', 'ba-login-hero-custom');
    MESH_IDS.forEach(function (k) { hero.classList.remove('ba-mesh-' + k); });
    hero.style.removeProperty('background');
  }

  function _applyHero(heroCfg) {
    var hero = _els.hero;
    if (!hero) return;
    _clearHero(hero);
    if (!heroCfg || !heroCfg.id) return;

    if (heroCfg.type === 'css') {
      var key = _meshKey(heroCfg.id);
      if (!key) return;
      hero.classList.add('ba-login-hero-custom', 'ba-mesh-card', 'ba-mesh-' + key);
      return;
    }

    if (heroCfg.type === 'image' && BA.ImageManager && typeof BA.ImageManager.getAll === 'function') {
      BA.ImageManager.getAll().then(function (all) {
        var item = (all || []).filter(function (x) { return x.id === heroCfg.id; })[0];
        if (!item || !DATA_URL_RE.test(item.data || '')) return;
        /* Si el usuario cambió de opción mientras cargaba, no pisar */
        if (!_config.hero || _config.hero.id !== heroCfg.id) return;
        hero.classList.add('ba-login-hero-custom');
        hero.style.setProperty('background',
          'linear-gradient(180deg, rgba(0,0,0,.10) 0%, rgba(0,0,0,.55) 70%, rgba(0,0,0,.75) 100%), ' +
          'url("' + item.data + '") center / cover no-repeat', 'important');
      }).catch(function () { /* sin IndexedDB: se mantiene la imagen original */ });
    }
  }

  // ------------------------------------------------------------------
  // Opciones de diseño
  // ------------------------------------------------------------------
  function _applyLayout(cfg) {
    var root = document.documentElement;
    root.classList.toggle('ba-login-hide-newuser', !!cfg.hideNewUser);
    root.classList.toggle('ba-login-hide-logos', !!cfg.hideLogos);
    root.classList.toggle('ba-login-compact', !!cfg.compact);
  }

  function _applyConfig(cfg) {
    _config = Object.assign({}, DEFAULTS, cfg || {});
    if (!_active) return;
    _applyLayout(_config);
    _applyHero(_config.hero);
  }

  function _save(patch) {
    var next = Object.assign({}, _config, patch);
    _config = next;
    var payload = {};
    payload[STORAGE_KEY] = next;
    chrome.storage.local.set(payload);
    /* storage.onChanged aplicará el cambio en esta y otras pestañas */
  }

  // ------------------------------------------------------------------
  // Botón para abrir el panel (la portada no tiene la navbar de Moodle).
  // Se agrega al menú del header; si no existe, queda flotando abajo.
  // ------------------------------------------------------------------
  function _injectLauncher() {
    if (document.getElementById('ba-login-launcher')) return;
    var inNav = !!_els.nav;
    var host = document.createElement('div');
    host.id = 'ba-login-launcher';
    var shadow = host.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = inNav ? [
      ':host { all: initial; display: inline-flex; color: inherit; }',
      'button { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px;',
      '  border: 1px solid currentColor; border-radius: 999px; cursor: pointer; background: transparent;',
      '  color: inherit; font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; opacity: .9; }',
      'button:hover { opacity: 1; background: rgba(255,255,255,.12); }',
      'button:focus-visible { outline: 3px solid #fcb100; outline-offset: 2px; }',
      'svg { width: 15px; height: 15px; }'
    ].join('\n') : [
      ':host { all: initial; position: fixed; right: 20px; bottom: 20px; z-index: 99990; }',
      'button { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px;',
      '  border: 0; border-radius: 999px; cursor: pointer; font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
      '  color: #fff; background: rgba(17, 24, 39, .88); box-shadow: 0 6px 20px rgba(0,0,0,.25); }',
      'button:hover { background: rgba(17, 24, 39, 1); }',
      'button:focus-visible { outline: 3px solid #fcb100; outline-offset: 2px; }',
      'svg { width: 16px; height: 16px; }'
    ].join('\n');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Abrir Better Aula');
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    [['rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }],
     ['path', { d: 'M3 9h18' }],
     ['path', { d: 'M9 21V9' }]].forEach(function (def) {
      var n = document.createElementNS(svgNS, def[0]);
      Object.keys(def[1]).forEach(function (a) { n.setAttribute(a, def[1][a]); });
      svg.appendChild(n);
    });
    var label = document.createElement('span');
    label.textContent = 'Better Aula';
    btn.appendChild(svg);
    btn.appendChild(label);
    btn.addEventListener('click', function () {
      if (BA.PanelUI && typeof BA.PanelUI.toggle === 'function') BA.PanelUI.toggle();
    });
    shadow.appendChild(style);
    shadow.appendChild(btn);
    (inNav ? _els.nav : document.body).appendChild(host);
  }

  // ------------------------------------------------------------------
  // Controles del panel (sección "Página de inicio de sesión")
  // ------------------------------------------------------------------
  function _heroSelectValue(hero) {
    if (!hero || !hero.id) return 'default';
    if (hero.type === 'css' && _meshKey(hero.id)) return 'preset_mesh_' + _meshKey(hero.id);
    if (hero.type === 'image') return 'image';
    return 'default';
  }

  function hydrate(cfg, shadow) {
    if (!shadow) return;
    var c = Object.assign({}, DEFAULTS, cfg || {});
    var sel = shadow.getElementById('ba-login-hero-select');
    var pick = shadow.getElementById('ba-login-hero-pick');
    if (sel) sel.value = _heroSelectValue(c.hero);
    if (pick) pick.style.display = (sel && sel.value === 'image') ? 'block' : 'none';
    [['ba-login-hide-newuser', 'hideNewUser'],
     ['ba-login-hide-logos', 'hideLogos'],
     ['ba-login-compact', 'compact']].forEach(function (p) {
      var el = shadow.getElementById(p[0]);
      if (el) el.checked = !!c[p[1]];
    });
  }

  function _openImagePicker() {
    if (!BA.ImagePicker || typeof BA.ImagePicker.open !== 'function') return;
    BA.ImagePicker.open(null, {
      onSelect: function (res) {
        if (!res || !res.id) return;
        if (res.type === 'css' && _meshKey(res.id)) {
          _save({ hero: { type: 'css', id: res.id } });
        } else if (res.type === 'image' && res.source === 'indexeddb') {
          _save({ hero: { type: 'image', id: res.id } });
        }
        var shadow = BA.PanelUI && BA.PanelUI.getShadow ? BA.PanelUI.getShadow() : null;
        hydrate(_config, shadow);
      }
    });
  }

  function _bindPanel() {
    var shadow = BA.PanelUI && BA.PanelUI.getShadow ? BA.PanelUI.getShadow() : null;
    if (!shadow) return;
    var sel = shadow.getElementById('ba-login-hero-select');
    var pick = shadow.getElementById('ba-login-hero-pick');
    if (!sel || !pick) return;

    /* Rellenar opciones de gradiente */
    MESH_IDS.forEach(function (k) {
      var opt = document.createElement('option');
      opt.value = 'preset_mesh_' + k;
      opt.textContent = 'Gradiente ' + MESH_LABELS[k];
      sel.appendChild(opt);
    });

    sel.addEventListener('change', function () {
      var v = sel.value;
      pick.style.display = v === 'image' ? 'block' : 'none';
      if (v === 'default') {
        _save({ hero: null });
      } else if (v === 'image') {
        if (!(_config.hero && _config.hero.type === 'image')) _openImagePicker();
      } else if (_meshKey(v)) {
        _save({ hero: { type: 'css', id: v } });
      }
    });
    pick.addEventListener('click', _openImagePicker);

    [['ba-login-hide-newuser', 'hideNewUser'],
     ['ba-login-hide-logos', 'hideLogos'],
     ['ba-login-compact', 'compact']].forEach(function (p) {
      var el = shadow.getElementById(p[0]);
      if (!el) return;
      el.addEventListener('change', function () {
        var patch = {};
        patch[p[1]] = el.checked;
        _save(patch);
      });
    });
  }

  // ------------------------------------------------------------------
  // Inicio
  // ------------------------------------------------------------------
  function _init() {
    _bindPanel();

    _active = _detect();
    if (_active) {
      document.documentElement.classList.add('ba-login-page');
      _mark();
      _injectLauncher();
    }

    chrome.storage.local.get([STORAGE_KEY, 'uiThemeConfig'], function (res) {
      if (_active) _applyThemeColors(res.uiThemeConfig);
      _applyConfig(res[STORAGE_KEY]);
    });

    chrome.storage.onChanged.addListener(function (changes, ns) {
      if (ns !== 'local') return;
      if (changes[STORAGE_KEY]) _applyConfig(changes[STORAGE_KEY].newValue);
      if (_active && changes.uiThemeConfig) _applyThemeColors(changes.uiThemeConfig.newValue);
    });
  }

  BA.LoginTheme = {
    hydrate: hydrate,
    isActive: function () { return _active; }
  };

  try {
    _init();
  } catch (e) {
    /* Nunca romper la página de login por un cambio de estructura */
  }

})(window.BetterAula = window.BetterAula || {});
