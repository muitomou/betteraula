/**
 * navbar-injector.js — Better Aula v1.0
 * IIFE Module: BA.NavbarInjector
 *
 * Responsabilidad: inyectar el botón disparador del panel in-app
 * en la navbar de Moodle Boost, con resiliencia a re-renders SPA.
 *
 * Carga: document_idle, ANTES de content.js
 * Depende de: window.BetterAula (inicializa el namespace si no existe)
 * Dependientes: panel-ui.js (BA.PanelUI.toggle debe existir al hacer click)
 */
(function (BA) {

  // ------------------------------------------------------------------
  // SVG del botón (Lucide-style, monocromático, 20×20)
  // Diseño: panel de ajustes con destello/chispa en esquina superior derecha
  // ------------------------------------------------------------------
  var TRIGGER_SVG = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"',
    ' viewBox="0 0 24 24" fill="none" stroke="currentColor"',
    ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"',
    ' aria-hidden="true">',
    /* Panel/layout icon */
    '<rect x="3" y="3" width="18" height="18" rx="2"/>',
    '<path d="M3 9h18"/>',
    '<path d="M9 21V9"/>',
    /* Destello / spark en esquina superior derecha */
    '<path d="M16 6l.5-1.5L18 4l-1.5-.5L16 2l-.5 1.5L14 4l1.5.5z"',
    ' stroke-width="1.5"/>',
    '</svg>'
  ].join('');

  // ------------------------------------------------------------------
  // inject() — crea e inserta el botón en la navbar
  // Se puede llamar múltiples veces (idempotente gracias al id check)
  // ------------------------------------------------------------------
  function inject() {
    // Evitar duplicado si ya existe
    if (document.getElementById('ba-trigger-btn')) return;

    // Estrategia de fallback para encontrar el ancla de inserción.
    // RIESGO CONOCIDO: selectores pueden cambiar entre versiones de Moodle Boost.
    var anchor =
      document.querySelector('#usernavigation') ||
      document.querySelector('.usermenu-container') ||
      document.querySelector('.primary-navigation .navbar-nav') ||
      document.querySelector('.navbar-nav');

    if (!anchor) {
      // No abortar silenciosamente: avisar en consola para diagnóstico,
      // pero sin lanzar error que rompa la página.
      console.warn('[BetterAula] NavbarInjector: no se encontró ancla en la navbar. ' +
        'El botón no será inyectado. Verifica selectores si cambió el DOM de Moodle.');
      return;
    }

    // Usamos <div> en lugar de <li> para evitar conflictos con listas <ul>
    // de Bootstrap que esperan hijos <li> con roles ARIA específicos.
    var btn = document.createElement('div');
    btn.id = 'ba-trigger-btn';
    // Clases de Bootstrap/Moodle para mimetismo visual con iconos nativos
    btn.className = 'nav-link d-flex align-items-center';
    btn.setAttribute('aria-label', 'Abrir Better Aula');
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.style.cssText = 'cursor:pointer;padding:0 8px;color:inherit;';
    btn.innerHTML = TRIGGER_SVG;

    // Click: delegar al PanelUI. Guard para el caso en que panel-ui.js
    // no haya terminado de inicializarse (no debería ocurrir ya que
    // los módulos se cargan secuencialmente, pero es defensivo).
    btn.addEventListener('click', function () {
      if (BA.PanelUI && typeof BA.PanelUI.toggle === 'function') {
        BA.PanelUI.toggle();
      } else {
        console.warn('[BetterAula] NavbarInjector: BA.PanelUI.toggle no disponible aún.');
      }
    });

    // Accesibilidad: también responder a Enter/Space como teclado
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });

    // Insertar al principio del ancla para quedar a la izquierda
    // de los iconos nativos de notificación/avatar.
    anchor.prepend(btn);
  }

  // ------------------------------------------------------------------
  // MutationObserver — resiliencia a re-renders SPA de Moodle Boost
  //
  // Moodle puede desmontar y remontar la navbar en navegación interna.
  // Observamos hijos directos de body (subtree: false) para performance.
  // RIESGO CONOCIDO: subtree:false puede perderse mutaciones profundas;
  // aceptado como trade-off de performance según spec.
  // ------------------------------------------------------------------
  var _observer = new MutationObserver(function () {
    if (!document.getElementById('ba-trigger-btn')) {
      inject();
    }
  });

  _observer.observe(document.body, { childList: true, subtree: false });

  // ------------------------------------------------------------------
  // API pública del módulo
  // ------------------------------------------------------------------
  BA.NavbarInjector = {
    inject: inject
  };

})(window.BetterAula = window.BetterAula || {});
