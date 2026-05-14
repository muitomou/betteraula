/**
 * @file panel-ui.js
 * @description Inyección y manejo de la UI del panel de configuración flotante.
 */
(function (BA) {

  // ------------------------------------------------------------------
  // CSS del panel — vive dentro del Shadow DOM, completamente aislado.
  // NOTA: las variables CSS de Moodle NO se heredan dentro del shadow.
  // Todos los valores son autónomos.
  // ------------------------------------------------------------------
  var PANEL_CSS = [
    /* Reset base dentro del shadow */
    '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',

    /* Fuente del sistema — sin Google Fonts para no hacer fetch externo */
    ':host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }',

    /* Panel lateral */
    '#ba-panel {',
    '  position: fixed;',
    '  top: 0;',
    '  right: -380px;', /* Empieza fuera de la pantalla */
    '  width: 380px;',
    '  height: 100vh;',
    '  overflow-y: auto;',
    '  overflow-x: hidden;',
    '  pointer-events: auto;', /* El panel sí captura eventos */
    '  z-index: 1;',           /* Dentro del shadow, el host ya tiene z-index alto */

    /* Fondo glassmorphism — modo claro por defecto */
    '  background: rgba(250, 251, 253, 0.96);',
    '  backdrop-filter: blur(14px) saturate(160%);',
    '  -webkit-backdrop-filter: blur(14px) saturate(160%);',

    /* RIESGO CONOCIDO: backdrop-filter falla si un ancestro tiene transform.
       Moodle Boost puede tener transforms en la navbar. Fallback sólido: */
    '  box-shadow: -6px 0 28px rgba(0, 0, 0, 0.18);',
    '  border-left: 1px solid rgba(0, 0, 0, 0.08);',

    /* Transición de apertura */
    '  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);',
    '  transform: translateX(0);', /* Empieza en posición cerrada (right:-380px) */
    '}',

    /* Fallback si backdrop-filter no está soportado */
    '@supports not (backdrop-filter: blur(1px)) {',
    '  #ba-panel { background: rgba(250, 251, 253, 0.99) !important; }',
    '}',

    /* Estado abierto — añadido por toggle() */
    '#ba-panel.ba-open {',
    '  transform: translateX(-380px);',
    '}',

    /* Modo oscuro del panel — clase añadida por ThemeEngine */
    '#ba-panel.ba-panel-dark {',
    '  background: rgba(22, 24, 35, 0.97);',
    '  border-left-color: rgba(255, 255, 255, 0.08);',
    '}',
    '@supports not (backdrop-filter: blur(1px)) {',
    '  #ba-panel.ba-panel-dark { background: rgba(22, 24, 35, 0.99) !important; }',
    '}',

    /* ---- Header ---- */
    '#ba-header {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  padding: 20px 20px 16px;',
    '  border-bottom: 1px solid rgba(0, 0, 0, 0.07);',
    '  position: sticky;',
    '  top: 0;',
    '  background: inherit;',
    '  backdrop-filter: inherit;',
    '  -webkit-backdrop-filter: inherit;',
    '  z-index: 10;',
    '}',

    '.ba-logo-wrap {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 10px;',
    '}',

    '.ba-logo-icon {',
    '  color: #3b82f6;',
    '  flex-shrink: 0;',
    '}',

    '.ba-title {',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '  color: #111827;',
    '  letter-spacing: -0.2px;',
    '}',

    '.ba-version {',
    '  font-size: 11px;',
    '  color: #9ca3af;',
    '  margin-top: 1px;',
    '}',

    '#ba-close-btn {',
    '  width: 32px;',
    '  height: 32px;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  border: none;',
    '  background: rgba(0, 0, 0, 0.05);',
    '  border-radius: 8px;',
    '  cursor: pointer;',
    '  color: #6b7280;',
    '  transition: background 0.15s, color 0.15s;',
    '  flex-shrink: 0;',
    '}',
    '#ba-close-btn:hover {',
    '  background: rgba(0, 0, 0, 0.1);',
    '  color: #111827;',
    '}',

    /* ---- Secciones ---- */
    '.ba-section {',
    '  padding: 18px 20px;',
    '  border-bottom: 1px solid rgba(0, 0, 0, 0.06);',
    '}',

    '.ba-section-title {',
    '  font-size: 11px;',
    '  font-weight: 700;',
    '  text-transform: uppercase;',
    '  letter-spacing: 0.8px;',
    '  color: #9ca3af;',
    '  margin-bottom: 12px;',
    '}',

    /* ---- Temas predefinidos ---- */
    '.ba-theme-grid {',
    '  display: grid;',
    '  grid-template-columns: repeat(4, 1fr);',
    '  gap: 8px;',
    '}',

    '.ba-theme-swatch {',
    '  height: 36px;',
    '  border-radius: 10px;',
    '  border: 2.5px solid transparent;',
    '  cursor: pointer;',
    '  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;',
    '  outline: none;',
    '}',
    '.ba-theme-swatch:hover { transform: scale(1.08); }',
    '.ba-theme-swatch.ba-active {',
    '  border-color: #fff;',
    '  box-shadow: 0 0 0 2.5px #3b82f6;',
    '}',

    /* ---- Temas guardados ---- */
    '#ba-saved-themes-section { display: none; }',

    '.ba-saved-grid {',
    '  display: grid;',
    '  grid-template-columns: repeat(4, 1fr);',
    '  gap: 8px;',
    '  margin-top: 10px;',
    '}',

    '.ba-saved-theme-wrap {',
    '  position: relative;',
    '  width: 100%;',
    '}',

    '.ba-saved-del {',
    '  position: absolute;',
    '  top: -6px;',
    '  right: -6px;',
    '  width: 18px;',
    '  height: 18px;',
    '  background: #ef4444;',
    '  color: white;',
    '  border: none;',
    '  border-radius: 50%;',
    '  font-size: 9px;',
    '  font-weight: bold;',
    '  cursor: pointer;',
    '  display: none;',
    '  align-items: center;',
    '  justify-content: center;',
    '  z-index: 2;',
    '}',
    '.ba-saved-theme-wrap:hover .ba-saved-del { display: flex; }',

    /* ---- Color rows (custom theme) ---- */
    '.ba-color-row {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  margin-bottom: 10px;',
    '}',
    '.ba-color-row:last-of-type { margin-bottom: 0; }',

    '.ba-color-label {',
    '  font-size: 13px;',
    '  color: #374151;',
    '  font-weight: 500;',
    '}',

    '.ba-color-input-wrap {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '}',

    '.ba-color-preview {',
    '  width: 24px;',
    '  height: 24px;',
    '  border-radius: 6px;',
    '  border: 1px solid rgba(0,0,0,0.15);',
    '  cursor: pointer;',
    '  transition: transform 0.15s;',
    '  flex-shrink: 0;',
    '}',
    '.ba-color-preview:hover { transform: scale(1.15); }',

    /* Input type=color — oculto, activado por el preview */
    '.ba-color-native {',
    '  opacity: 0;',
    '  width: 0;',
    '  height: 0;',
    '  position: absolute;',
    '  pointer-events: none;',
    '}',

    '.ba-hex-input {',
    '  width: 72px;',
    '  padding: 4px 6px;',
    '  border: 1px solid #d1d5db;',
    '  border-radius: 6px;',
    '  font-family: "SF Mono", "Fira Code", monospace;',
    '  font-size: 12px;',
    '  text-transform: uppercase;',
    '  color: #374151;',
    '  background: transparent;',
    '  transition: border-color 0.15s;',
    '}',
    '.ba-hex-input:focus {',
    '  outline: none;',
    '  border-color: #3b82f6;',
    '}',

    /* Botón guardar tema */
    '#ba-save-theme-btn {',
    '  width: 100%;',
    '  margin-top: 12px;',
    '  padding: 8px;',
    '  background: #3b82f6;',
    '  color: white;',
    '  border: none;',
    '  border-radius: 8px;',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  gap: 6px;',
    '  transition: background 0.15s;',
    '}',
    '#ba-save-theme-btn:hover { background: #2563eb; }',

    /* ---- Dark Mode ---- */
    '.ba-select {',
    '  width: 100%;',
    '  padding: 8px 10px;',
    '  border: 1px solid #d1d5db;',
    '  border-radius: 8px;',
    '  font-size: 13px;',
    '  color: #374151;',
    '  background: transparent;',
    '  cursor: pointer;',
    '  appearance: none;',
    '  -webkit-appearance: none;',
    '  background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E");',
    '  background-repeat: no-repeat;',
    '  background-position: right 10px center;',
    '  padding-right: 32px;',
    '}',
    '.ba-select:focus { outline: none; border-color: #3b82f6; }',

    '#ba-auto-time-container {',
    '  margin-top: 10px;',
    '  display: none;',
    '}',

    '.ba-time-row {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  margin-bottom: 8px;',
    '  font-size: 13px;',
    '  color: #374151;',
    '}',

    '.ba-time-input {',
    '  border: 1px solid #d1d5db;',
    '  border-radius: 6px;',
    '  padding: 4px 6px;',
    '  font-size: 12px;',
    '  background: transparent;',
    '  color: #374151;',
    '}',
    '.ba-time-input:focus { outline: none; border-color: #3b82f6; }',

    /* ---- Ramos ocultos ---- */
    '#ba-hidden-courses-list {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 6px;',
    '  margin-top: 4px;',
    '}',

    '.ba-hidden-row {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  background: rgba(0, 0, 0, 0.03);',
    '  border: 1px solid rgba(0, 0, 0, 0.07);',
    '  border-radius: 8px;',
    '  padding: 8px 10px;',
    '  font-size: 13px;',
    '}',

    '.ba-hidden-name {',
    '  color: #374151;',
    '  font-weight: 500;',
    '  max-width: 230px;',
    '  white-space: nowrap;',
    '  overflow: hidden;',
    '  text-overflow: ellipsis;',
    '}',

    '.ba-show-btn {',
    '  background: #22c55e;',
    '  color: white;',
    '  border: none;',
    '  border-radius: 6px;',
    '  padding: 4px 10px;',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  flex-shrink: 0;',
    '  transition: background 0.15s;',
    '}',
    '.ba-show-btn:hover { background: #16a34a; }',

    '#ba-no-hidden-msg {',
    '  font-size: 13px;',
    '  color: #9ca3af;',
    '  text-align: center;',
    '  padding: 8px 0;',
    '}',

    /* ---- Footer ---- */
    '#ba-footer {',
    '  padding: 16px 20px;',
    '  text-align: center;',
    '  font-size: 11px;',
    '  color: #9ca3af;',
    '}',

    '#ba-footer a {',
    '  color: #3b82f6;',
    '  text-decoration: none;',
    '}',
    '#ba-footer a:hover { text-decoration: underline; }',

    /* ---- Dark mode overrides dentro del panel ---- */
    '#ba-panel.ba-panel-dark .ba-section-title { color: #6b7280; }',
    '#ba-panel.ba-panel-dark .ba-title { color: #f9fafb; }',
    '#ba-panel.ba-panel-dark .ba-version { color: #6b7280; }',
    '#ba-panel.ba-panel-dark #ba-close-btn {',
    '  background: rgba(255,255,255,0.08);',
    '  color: #9ca3af;',
    '}',
    '#ba-panel.ba-panel-dark #ba-close-btn:hover {',
    '  background: rgba(255,255,255,0.15);',
    '  color: #f9fafb;',
    '}',
    '#ba-panel.ba-panel-dark .ba-section { border-bottom-color: rgba(255,255,255,0.06); }',
    '#ba-panel.ba-panel-dark #ba-header { border-bottom-color: rgba(255,255,255,0.06); }',
    '#ba-panel.ba-panel-dark .ba-color-label { color: #d1d5db; }',
    '#ba-panel.ba-panel-dark .ba-hex-input {',
    '  border-color: rgba(255,255,255,0.15);',
    '  color: #f9fafb;',
    '}',
    '#ba-panel.ba-panel-dark .ba-select {',
    '  border-color: rgba(255,255,255,0.15);',
    '  color: #f9fafb;',
    '}',
    '#ba-panel.ba-panel-dark .ba-time-input {',
    '  border-color: rgba(255,255,255,0.15);',
    '  color: #f9fafb;',
    '}',
    '#ba-panel.ba-panel-dark .ba-time-row { color: #d1d5db; }',
    '#ba-panel.ba-panel-dark .ba-hidden-row {',
    '  background: rgba(255,255,255,0.04);',
    '  border-color: rgba(255,255,255,0.08);',
    '}',
    '#ba-panel.ba-panel-dark .ba-hidden-name { color: #d1d5db; }',
    '#ba-panel.ba-panel-dark #ba-no-hidden-msg { color: #6b7280; }',
    '#ba-panel.ba-panel-dark #ba-footer { color: #6b7280; }',
  ].join('\n');

  // ------------------------------------------------------------------
  // HTML del panel — estructura completa
  // ------------------------------------------------------------------
  var PANEL_HTML = [
    /* Header */
    '<div id="ba-header">',
    '  <div class="ba-logo-wrap">',
    '    <span class="ba-logo-icon">',
    '      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"',
    '           viewBox="0 0 24 24" fill="none" stroke="currentColor"',
    '           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '        <rect x="3" y="3" width="18" height="18" rx="2"/>',
    '        <path d="M3 9h18"/><path d="M9 21V9"/>',
    '        <path d="M16 6l.5-1.5L18 4l-1.5-.5L16 2l-.5 1.5L14 4l1.5.5z" stroke-width="1.5"/>',
    '      </svg>',
    '    </span>',
    '    <div>',
    '      <div class="ba-title">Better Aula</div>',
    '      <div class="ba-version">v1.0</div>',
    '    </div>',
    '  </div>',
    '  <button id="ba-close-btn" aria-label="Cerrar panel Better Aula">',
    '    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"',
    '         viewBox="0 0 24 24" fill="none" stroke="currentColor"',
    '         stroke-width="2.5" stroke-linecap="round">',
    '      <path d="M18 6L6 18M6 6l12 12"/>',
    '    </svg>',
    '  </button>',
    '</div>',

    /* Sección: Temas predefinidos */
    '<div class="ba-section">',
    '  <div class="ba-section-title">Tema base</div>',
    '  <div class="ba-theme-grid" id="ba-theme-grid">',
    '    <button class="ba-theme-swatch" data-theme="usm" title="Clásico USM"',
    '      style="background:linear-gradient(135deg,#2d3748,#3182ce)"></button>',
    '    <button class="ba-theme-swatch" data-theme="ocean" title="Ocean"',
    '      style="background:linear-gradient(135deg,#0f172a,#0ea5e9)"></button>',
    '    <button class="ba-theme-swatch" data-theme="forest" title="Forest"',
    '      style="background:linear-gradient(135deg,#064e3b,#10b981)"></button>',
    '    <button class="ba-theme-swatch" data-theme="sunset" title="Sunset"',
    '      style="background:linear-gradient(135deg,#7c2d12,#f97316)"></button>',
    '    <button class="ba-theme-swatch" data-theme="pink" title="Pink"',
    '      style="background:linear-gradient(135deg,#FFE0E6,#FFB6C1)"></button>',
    '    <button class="ba-theme-swatch" data-theme="purple" title="Purple"',
    '      style="background:linear-gradient(135deg,#EDE9FE,#8B5CF6)"></button>',
    '    <button class="ba-theme-swatch" data-theme="celeste" title="Celeste"',
    '      style="background:linear-gradient(135deg,#E0F2FE,#38BDF8)"></button>',
    '    <button class="ba-theme-swatch" data-theme="coffee" title="Coffee"',
    '      style="background:linear-gradient(135deg,#FDE68A,#F59E0B)"></button>',
    '  </div>',
    '</div>',

    /* Sección: Temas guardados */
    '<div class="ba-section" id="ba-saved-themes-section">',
    '  <div class="ba-section-title">Temas guardados</div>',
    '  <div class="ba-saved-grid" id="ba-saved-theme-grid"></div>',
    '</div>',

    /* Sección: Tema personalizado */
    '<div class="ba-section">',
    '  <div class="ba-section-title">Personalizar colores</div>',

    /* Color Nav */
    '  <div class="ba-color-row">',
    '    <span class="ba-color-label">Navbar</span>',
    '    <div class="ba-color-input-wrap">',
    '      <div class="ba-color-preview" id="ba-preview-nav" title="Click para abrir selector"></div>',
    '      <input type="color" id="ba-native-nav" class="ba-color-native">',
    '      <input type="text" id="ba-hex-nav" class="ba-hex-input" maxlength="7" placeholder="#HEX">',
    '    </div>',
    '  </div>',

    /* Color Acento */
    '  <div class="ba-color-row">',
    '    <span class="ba-color-label">Acento</span>',
    '    <div class="ba-color-input-wrap">',
    '      <div class="ba-color-preview" id="ba-preview-accent" title="Click para abrir selector"></div>',
    '      <input type="color" id="ba-native-accent" class="ba-color-native">',
    '      <input type="text" id="ba-hex-accent" class="ba-hex-input" maxlength="7" placeholder="#HEX">',
    '    </div>',
    '  </div>',

    /* Color Fondo */
    '  <div class="ba-color-row">',
    '    <span class="ba-color-label">Fondo</span>',
    '    <div class="ba-color-input-wrap">',
    '      <div class="ba-color-preview" id="ba-preview-bg" title="Click para abrir selector"></div>',
    '      <input type="color" id="ba-native-bg" class="ba-color-native">',
    '      <input type="text" id="ba-hex-bg" class="ba-hex-input" maxlength="7" placeholder="#HEX">',
    '    </div>',
    '  </div>',

    '  <button id="ba-save-theme-btn">',
    '    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"',
    '         viewBox="0 0 24 24" fill="none" stroke="currentColor"',
    '         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
    '      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>',
    '      <polyline points="17 21 17 13 7 13 7 21"/>',
    '      <polyline points="7 3 7 8 15 8"/>',
    '    </svg>',
    '    Guardar este tema',
    '  </button>',
    '</div>',

    /* Sección: Modo oscuro */
    '<div class="ba-section">',
    '  <div class="ba-section-title">Modo oscuro</div>',
    '  <select id="ba-dark-mode-select" class="ba-select">',
    '    <option value="off">Desactivado</option>',
    '    <option value="on">Siempre activo</option>',
    '    <option value="auto">Automatico por horario</option>',
    '  </select>',
    '  <div id="ba-auto-time-container">',
    '    <div class="ba-time-row">',
    '      <span>Hora inicio:</span>',
    '      <input type="time" id="ba-time-start" class="ba-time-input" value="20:00">',
    '    </div>',
    '    <div class="ba-time-row">',
    '      <span>Hora fin:</span>',
    '      <input type="time" id="ba-time-end" class="ba-time-input" value="07:00">',
    '    </div>',
    '  </div>',
    '</div>',

    /* Sección: Ramos ocultos */
    '<div class="ba-section">',
    '  <div class="ba-section-title">Ramos ocultos</div>',
    '  <p id="ba-no-hidden-msg">No hay ramos ocultos.</p>',
    '  <div id="ba-hidden-courses-list"></div>',
    '</div>',

    /* Footer */
    '<div id="ba-footer">',
    '  <div>Better Aula v1.0 &mdash; Aula USM</div>',
    '  <div style="margin-top:4px; font-size: 10px; color: #6b7280; font-weight: 500;">Desarrollado por Mauro Castillo</div>',
    '  <div style="margin-top:8px; font-size: 11px;">',
    '    ¿Te gusta Better Aula? <a href="https://link.mercadopago.cl/donacionbetteraula" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: none;">Apoya el proyecto aquí</a>',
    '  </div>',
    '  <div style="margin-top:8px">',
    '    <a href="https://github.com" target="_blank" rel="noopener">',
    '      Reportar un problema',
    '    </a>',
    '  </div>',
    '</div>',
  ].join('\n');

  // ------------------------------------------------------------------
  // Variables de estado del panel
  // ------------------------------------------------------------------
  var _isOpen = false;
  var _shadow = null;
  var _panel = null;
  var _backdrop = null;

  // ------------------------------------------------------------------
  // _createDOM() — crea el host, shadow root, backdrop y monta el HTML
  // ------------------------------------------------------------------
  function _createDOM() {
    /* Host — cubre toda la pantalla pero pointer-events:none para no
       bloquear clics en Moodle cuando el panel está cerrado. */
    var host = document.createElement('div');
    host.id = 'ba-panel-host';
    host.style.cssText = [
      'position:fixed;',
      'top:0;right:0;',
      'width:0;height:0;',   /* Sin dimensiones en el host; las tiene el panel */
      'z-index:99999;',
      'pointer-events:none;' /* El panel interno activa sus propios eventos */
    ].join('');
    document.body.appendChild(host);

    /* Shadow root en modo 'open' — necesario para que theme-engine.js
       pueda escribir variables CSS dentro del shadow desde fuera. */
    _shadow = host.attachShadow({ mode: 'open' });

    /* Inyectar CSS dentro del shadow (aislado de Moodle) */
    var styleEl = document.createElement('style');
    styleEl.textContent = PANEL_CSS;
    _shadow.appendChild(styleEl);

    /* Panel principal */
    _panel = document.createElement('div');
    _panel.id = 'ba-panel';
    _panel.setAttribute('role', 'dialog');
    _panel.setAttribute('aria-label', 'Panel de configuración Better Aula');
    _panel.innerHTML = PANEL_HTML;
    _shadow.appendChild(_panel);

    /* Backdrop — FUERA del shadow, en el documento principal.
       Vive en el DOM normal para cubrir toda la página. */
    _backdrop = document.createElement('div');
    _backdrop.id = 'ba-backdrop';
    _backdrop.style.cssText = [
      'display:none;',
      'position:fixed;',
      'inset:0;',
      'background:rgba(0,0,0,0.28);',
      'z-index:99998;',
      'transition:opacity 0.28s ease;'
    ].join('');
    _backdrop.addEventListener('click', function () { BA.PanelUI.close(); });
    document.body.appendChild(_backdrop);
  }

  // ------------------------------------------------------------------
  // _bindEvents() — registra eventos sobre el shadow root
  // ------------------------------------------------------------------
  function _bindEvents() {
    /* Botón cerrar */
    _shadow.querySelector('#ba-close-btn').addEventListener('click', function () {
      BA.PanelUI.close();
    });

    /* Escape key desde el documento */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _isOpen) BA.PanelUI.close();
    });

    /* ---- Temas predefinidos ---- */
    _shadow.querySelectorAll('.ba-theme-swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var themeId = btn.getAttribute('data-theme');
        if (BA.ThemeEngine && typeof BA.ThemeEngine.applyPreset === 'function') {
          BA.ThemeEngine.applyPreset(themeId);
        }
      });
    });

    /* ---- Color pickers (preview click → abre native input color) ----
       La estrategia: el <div class="ba-color-preview"> recibe el click,
       posiciona el <input type="color"> encima y lo dispara programáticamente.
       Esto funciona en MV2 sin eval y sin fetch externo. */
    var colorPairs = [
      { previewId: 'ba-preview-nav',    nativeId: 'ba-native-nav',    hexId: 'ba-hex-nav',    key: 'nav'    },
      { previewId: 'ba-preview-accent', nativeId: 'ba-native-accent', hexId: 'ba-hex-accent', key: 'accent' },
      { previewId: 'ba-preview-bg',     nativeId: 'ba-native-bg',     hexId: 'ba-hex-bg',     key: 'bg'     }
    ];

    colorPairs.forEach(function (pair) {
      var preview = _shadow.getElementById(pair.previewId);
      var native  = _shadow.getElementById(pair.nativeId);
      var hexInp  = _shadow.getElementById(pair.hexId);

      /* Click en preview → abre color picker nativo */
      preview.addEventListener('click', function () {
        native.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;';
        native.click();
      });

      /* Cambio en picker nativo → actualizar preview y hex */
      native.addEventListener('input', function () {
        var val = native.value;
        preview.style.backgroundColor = val;
        hexInp.value = val.toUpperCase();
        _dispatchColorChange(pair.key, val);
      });

      /* Escritura en hex input → validar y aplicar */
      hexInp.addEventListener('input', function () {
        var val = hexInp.value;
        if (!val.startsWith('#')) { val = '#' + val; hexInp.value = val; }
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          preview.style.backgroundColor = val;
          native.value = val;
          _dispatchColorChange(pair.key, val);
        }
      });
    });

    /* ---- Guardar tema ---- */
    _shadow.getElementById('ba-save-theme-btn').addEventListener('click', function () {
      if (BA.ThemeEngine && typeof BA.ThemeEngine.saveCurrentAsCustom === 'function') {
        BA.ThemeEngine.saveCurrentAsCustom();
      }
    });

    /* ---- Dark Mode select ---- */
    _shadow.getElementById('ba-dark-mode-select').addEventListener('change', function () {
      _saveDarkModeConfig();
    });
    _shadow.getElementById('ba-time-start').addEventListener('change', function () {
      _saveDarkModeConfig();
    });
    _shadow.getElementById('ba-time-end').addEventListener('change', function () {
      _saveDarkModeConfig();
    });
  }

  /* Helper: despacha el cambio de color a ThemeEngine */
  function _dispatchColorChange(colorKey, hexVal) {
    if (BA.ThemeEngine && typeof BA.ThemeEngine.applyCustomColor === 'function') {
      BA.ThemeEngine.applyCustomColor(colorKey, hexVal);
    }
  }

  /* Helper: lee los valores del select y time inputs y guarda en storage */
  function _saveDarkModeConfig() {
    var mode  = _shadow.getElementById('ba-dark-mode-select').value;
    var start = _shadow.getElementById('ba-time-start').value;
    var end   = _shadow.getElementById('ba-time-end').value;

    var timeContainer = _shadow.getElementById('ba-auto-time-container');
    timeContainer.style.display = mode === 'auto' ? 'block' : 'none';

    var config = { mode: mode, start: start, end: end };
    chrome.storage.local.set({ darkModeConfig: config });
    /* El listener de content.js capturará el cambio en storage y aplicará */
  }

  // ------------------------------------------------------------------
  // Inicialización — se ejecuta al cargar el módulo
  // ------------------------------------------------------------------
  _createDOM();
  _bindEvents();

  /* Inyectar el botón de la navbar ahora que el panel ya existe */
  if (BA.NavbarInjector && typeof BA.NavbarInjector.inject === 'function') {
    BA.NavbarInjector.inject();
  }

  // ------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------
  BA.PanelUI = {

    toggle: function () {
      if (_isOpen) {
        BA.PanelUI.close();
      } else {
        BA.PanelUI.open();
      }
    },

    open: function () {
      _isOpen = true;
      _panel.classList.add('ba-open');
      _backdrop.style.display = 'block';

      /* Sincronizar estado de dark mode en el panel */
      var isDark = document.documentElement.classList.contains('ba-dark-mode');
      if (isDark) {
        _panel.classList.add('ba-panel-dark');
      } else {
        _panel.classList.remove('ba-panel-dark');
      }

      /* Hidratar controles con valores actuales del storage */
      chrome.storage.local.get(
        ['uiThemeConfig', 'darkModeConfig', 'hiddenCourses', 'savedCustomThemes'],
        function (prefs) {
          if (BA.ThemeEngine && typeof BA.ThemeEngine.hydrate === 'function') {
            BA.ThemeEngine.hydrate(prefs, _shadow);
          }
          BA.PanelUI.renderHiddenList(prefs.hiddenCourses || []);
          BA.PanelUI.renderSavedThemes(prefs.savedCustomThemes || []);
        }
      );
    },

    close: function () {
      _isOpen = false;
      _panel.classList.remove('ba-open');
      _backdrop.style.display = 'none';
    },

    /* Exponer shadow para que ThemeEngine pueda actualizar el panel dark class */
    getShadow: function () {
      return _shadow;
    },

    /* Sincroniza dark mode class en el panel cuando cambia el estado global */
    syncDarkMode: function (isDark) {
      if (!_panel) return;
      if (isDark) {
        _panel.classList.add('ba-panel-dark');
      } else {
        _panel.classList.remove('ba-panel-dark');
      }
    },

    /* Renderiza la lista de ramos ocultos dentro del panel */
    renderHiddenList: function (hiddenIds) {
      if (!_shadow) return;
      var list = _shadow.getElementById('ba-hidden-courses-list');
      var msg  = _shadow.getElementById('ba-no-hidden-msg');
      if (!list) return;

      list.innerHTML = '';

      if (!hiddenIds || hiddenIds.length === 0) {
        msg.style.display = 'block';
        return;
      }
      msg.style.display = 'none';

      /* Obtener nombres reales usando HiddenCourses.getList() */
      var courseList = (BA.HiddenCourses && typeof BA.HiddenCourses.getList === 'function')
        ? BA.HiddenCourses.getList()
        : [];

      hiddenIds.forEach(function (courseId) {
        /* Buscar nombre real en courseList; fallback a "Ramo {id}" */
        var match = courseList.filter(function (c) { return c.id === courseId; })[0];
        var name  = match ? match.name : ('Ramo ' + courseId);

        var row = document.createElement('div');
        row.className = 'ba-hidden-row';

        var nameSpan = document.createElement('span');
        nameSpan.className = 'ba-hidden-name';
        nameSpan.textContent = name;
        nameSpan.title = name;

        var showBtn = document.createElement('button');
        showBtn.className = 'ba-show-btn';
        showBtn.textContent = 'Mostrar';

        (function (cid) {
          showBtn.addEventListener('click', function () {
            if (BA.HiddenCourses && typeof BA.HiddenCourses.toggle === 'function') {
              BA.HiddenCourses.toggle(cid);
            }
          });
        })(courseId);

        row.appendChild(nameSpan);
        row.appendChild(showBtn);
        list.appendChild(row);
      });
    },

    /* Renderiza la grilla de temas guardados */
    renderSavedThemes: function (savedThemes) {
      if (!_shadow) return;
      var section = _shadow.getElementById('ba-saved-themes-section');
      var grid    = _shadow.getElementById('ba-saved-theme-grid');
      if (!grid) return;

      grid.innerHTML = '';

      if (!savedThemes || savedThemes.length === 0) {
        section.style.display = 'none';
        return;
      }
      section.style.display = 'block';

      /* PASO 1 — Log obligatorio de la estructura real del objeto.
         Estructura confirmada en codebase: { id, colors: { nav, accent, bg, border, text, navText } }
         El console.log permite verificar en runtime si ha cambiado (ej. temas guardados desde popup.js). */
      console.log('[BA] savedCustomThemes sample:',
        savedThemes[0] ? JSON.stringify(savedThemes[0]) : 'vacío');

      /* PASO 2 — Renderizar cada ítem con la estructura HTML especificada.
         Clave real del color del swatch: theme.colors.accent (verificado en log y en codebase).
         Fallback: theme.colors.nav si accent no existe (temas muy viejos del popup). */
      savedThemes.forEach(function (theme, i) {
        var swatchColor = (theme.colors && theme.colors.accent)
          ? theme.colors.accent
          : (theme.colors && theme.colors.nav ? theme.colors.nav : '#666');

        var item = document.createElement('div');
        item.className = 'ba-saved-theme-item';
        item.setAttribute('data-index', String(i));
        item.style.cssText = [
          'display:flex;align-items:center;gap:8px;',
          'padding:8px 10px;border-radius:8px;cursor:pointer;',
          'background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.07);',
          'transition:background 0.15s;'
        ].join('');

        /* Swatch circular de color */
        var swatch = document.createElement('span');
        swatch.className = 'ba-swatch';
        swatch.style.cssText = [
          'background:' + swatchColor + ';',
          'width:18px;height:18px;border-radius:50%;',
          'display:inline-block;flex-shrink:0;',
          'border:2px solid rgba(255,255,255,0.25);',
          'vertical-align:middle;pointer-events:none;'
        ].join('');

        /* Nombre del tema: usa theme.name si existe, sino "Tema N" */
        var label = document.createElement('span');
        label.className = 'ba-theme-name';
        label.textContent = theme.name || ('Tema ' + (i + 1));
        label.style.cssText = 'font-size:12px;color:#374151;flex:1;' +
          'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

        /* Botón eliminar */
        var delBtn = document.createElement('button');
        delBtn.className = 'ba-saved-del';
        delBtn.setAttribute('aria-label', 'Eliminar tema guardado');
        delBtn.style.cssText = 'position:static;display:flex;width:16px;height:16px;flex-shrink:0;';
        delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"' +
          ' viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
          ' stroke-width="3" stroke-linecap="round">' +
          '<path d="M18 6L6 18M6 6l12 12"/></svg>';

        (function (t) {
          delBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (BA.ThemeEngine && typeof BA.ThemeEngine.deleteSavedTheme === 'function') {
              BA.ThemeEngine.deleteSavedTheme(t.id);
            }
          });
        })(theme);

        item.appendChild(swatch);
        item.appendChild(label);
        item.appendChild(delBtn);
        grid.appendChild(item);
      });

      /* PASO 3 — Event listener por ítem usando querySelectorAll sobre el shadow root */
      _shadow.querySelectorAll('.ba-saved-theme-item').forEach(function (el) {
        el.addEventListener('click', function () {
          var idx   = parseInt(el.getAttribute('data-index'), 10);
          var theme = savedThemes[idx];
          if (!theme) return;
          window.BetterAula.ThemeEngine.apply(theme);
          chrome.storage.local.set({ uiThemeConfig: theme });
        });
      });
    }
  };

})(window.BetterAula = window.BetterAula || {});
