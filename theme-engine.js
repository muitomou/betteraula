/**
 * theme-engine.js — Better Aula v1.0
 * IIFE Module: BA.ThemeEngine
 *
 * Responsabilidad: motor centralizado de temas. Aplica colores al :root
 * del documento directamente (sin mensajes cross-context, ya que ahora
 * vivimos en el mismo content script context que la página).
 *
 * Contiene la versión CANÓNICA de calculateDynamicColors().
 * NOTA: theme_injector.js mantiene su propia copia independiente porque
 * necesita ejecutarse en document_start de forma completamente aislada.
 * popup.js también mantiene la suya mientras coexistan ambas UIs.
 *
 * Carga: document_idle, DESPUÉS de panel-ui.js, ANTES de content.js
 */
(function (BA) {

  // ------------------------------------------------------------------
  // Definición de temas predefinidos (idéntica a popup.js para coherencia)
  // ------------------------------------------------------------------
  var THEMES = {
    usm:     { bg: '#f7fafc', nav: '#2d3748', accent: '#3182ce', border: '#e2e8f0', text: '#1a202c', navText: '#ffffff' },
    ocean:   { bg: '#f0f9ff', nav: '#0f172a', accent: '#0ea5e9', border: '#bae6fd', text: '#0f172a', navText: '#ffffff' },
    forest:  { bg: '#f0fdf4', nav: '#064e3b', accent: '#10b981', border: '#a7f3d0', text: '#064e3b', navText: '#ffffff' },
    sunset:  { bg: '#fff7ed', nav: '#7c2d12', accent: '#f97316', border: '#fed7aa', text: '#431407', navText: '#ffffff' },
    pink:    { bg: '#FFF5F7', nav: '#FFE0E6', accent: '#FFB6C1', border: '#FFC5D3', text: '#831843', navText: '#000000' },
    purple:  { bg: '#F5F3FF', nav: '#EDE9FE', accent: '#8B5CF6', border: '#DDD6FE', text: '#4C1D95', navText: '#000000' },
    celeste: { bg: '#F0F8FF', nav: '#E0F2FE', accent: '#38BDF8', border: '#BAE6FD', text: '#0C4A6E', navText: '#000000' },
    coffee:  { bg: '#FEF3C7', nav: '#FDE68A', accent: '#F59E0B', border: '#FCD34D', text: '#78350F', navText: '#000000' }
  };

  // Estado interno del tema activo y temas guardados
  var _currentTheme = { id: 'usm', colors: THEMES.usm };
  var _savedThemes  = [];

  // ------------------------------------------------------------------
  // calculateDynamicColors — VERSIÓN CANÓNICA
  //
  // Calcula colores de texto con contraste automático basado en luminancia
  // percibida (fórmula ITU-R BT.601 — idéntica a la usada en popup.js
  // y theme_injector.js para consistencia visual).
  //
  // @param {string} hexBg     — color de fondo (#RRGGBB)
  // @param {string} hexAccent — color de acento (#RRGGBB)
  // @param {string} hexNav    — color de navbar (#RRGGBB), nullable
  // @returns {{ autoText: string, accentRgbStr: string, navText: string }}
  // ------------------------------------------------------------------
  function calculateDynamicColors(hexBg, hexAccent, hexNav) {
    var hex2rgb = function (hex) {
      var v = (hex || '').replace('#', '');
      if (v.length === 3) v = v.split('').map(function (c) { return c + c; }).join('');
      var num = parseInt(v, 16) || 0;
      return [num >> 16, (num >> 8) & 255, num & 255];
    };

    var bgRgb     = hex2rgb(hexBg);
    var luminance = (bgRgb[0] * 299 + bgRgb[1] * 587 + bgRgb[2] * 114) / 1000;
    var autoText  = luminance > 128 ? '#212529' : '#ffffff';

    var navText = '#ffffff';
    if (hexNav) {
      var navRgb      = hex2rgb(hexNav);
      var navLuminance = (navRgb[0] * 299 + navRgb[1] * 587 + navRgb[2] * 114) / 1000;
      navText = navLuminance > 128 ? '#212529' : '#ffffff';
    }

    var accentRgb    = hex2rgb(hexAccent);
    var accentRgbStr = accentRgb[0] + ', ' + accentRgb[1] + ', ' + accentRgb[2];

    return { autoText: autoText, accentRgbStr: accentRgbStr, navText: navText };
  }

  // ------------------------------------------------------------------
  // _applyColorsToRoot — escribe variables CSS en document.documentElement
  // Ventaja vs popup: directo, sin chrome.tabs.sendMessage, instantáneo.
  // ------------------------------------------------------------------
  function _applyColorsToRoot(colors) {
    var root     = document.documentElement;
    var dynamics = calculateDynamicColors(colors.bg, colors.accent, colors.nav);

    root.style.setProperty('--ba-bg',          colors.bg);
    root.style.setProperty('--ba-nav',         colors.nav);
    root.style.setProperty('--ba-accent',      colors.accent);
    root.style.setProperty('--ba-card-border', colors.border || colors.bg);
    root.style.setProperty('--ba-text-primary',colors.text   || '#1a202c');
    root.style.setProperty('--ba-text-nav',    dynamics.navText);
    root.style.setProperty('--ba-auto-text',   dynamics.autoText);
    root.style.setProperty('--ba-accent-rgb',  dynamics.accentRgbStr);

    /* Notificar a content.js para actualizar el logo */
    if (typeof BA._onNavTextChange === 'function') {
      BA._onNavTextChange(dynamics.navText);
    }
  }

  // ------------------------------------------------------------------
  // _buildCustomColors — construye un objeto colors desde los tres hex
  // inputs del panel. Replica la lógica de updateCustomTheme en popup.js.
  // ------------------------------------------------------------------
  function _buildCustomColors(navCol, accCol, bgCol) {
    var hex2rgb = function (hex) {
      var v = (hex || '').replace('#', '');
      if (v.length === 3) v = v.split('').map(function (c) { return c + c; }).join('');
      var n = parseInt(v, 16) || 0;
      return [n >> 16, (n >> 8) & 255, n & 255];
    };
    var bgR     = hex2rgb(bgCol);
    var navR    = hex2rgb(navCol);
    var bgLuma  = (bgR[0] * 299  + bgR[1] * 587  + bgR[2] * 114)  / 1000;
    var navLuma = (navR[0] * 299 + navR[1] * 587 + navR[2] * 114) / 1000;
    return {
      nav:    navCol,
      accent: accCol,
      bg:     bgCol,
      border: bgCol,
      text:   bgLuma  > 128 ? '#1a202c' : '#ffffff',
      navText:navLuma > 128 ? '#212529' : '#ffffff'
    };
  }

  // ------------------------------------------------------------------
  // _readPanelHexInputs — lee los tres hex inputs del panel desde el shadow
  // ------------------------------------------------------------------
  function _readPanelHexInputs(shadow) {
    var navVal = shadow.getElementById('ba-hex-nav')    ? shadow.getElementById('ba-hex-nav').value    : '';
    var accVal = shadow.getElementById('ba-hex-accent') ? shadow.getElementById('ba-hex-accent').value : '';
    var bgVal  = shadow.getElementById('ba-hex-bg')     ? shadow.getElementById('ba-hex-bg').value     : '';
    return { navVal: navVal, accVal: accVal, bgVal: bgVal };
  }

  // ------------------------------------------------------------------
  // hydrate — sincroniza los controles del panel con el estado actual.
  // Llamado por PanelUI.open() después de leer storage.
  // ------------------------------------------------------------------
  function hydrate(prefs, shadow) {
    if (!shadow) return;

    /* Tema activo */
    if (prefs.uiThemeConfig) {
      _currentTheme = prefs.uiThemeConfig;
    }
    if (prefs.savedCustomThemes) {
      _savedThemes = prefs.savedCustomThemes;
    }

    /* Marcar swatch activo */
    shadow.querySelectorAll('.ba-theme-swatch').forEach(function (btn) {
      btn.classList.remove('ba-active');
      if (btn.getAttribute('data-theme') === _currentTheme.id) {
        btn.classList.add('ba-active');
      }
    });

    /* Sincronizar color inputs con el tema activo */
    var colors = _currentTheme.colors || THEMES.usm;
    _syncColorInputs(shadow, colors);

    /* Dark mode */
    if (prefs.darkModeConfig) {
      var dm = prefs.darkModeConfig;
      var selectEl = shadow.getElementById('ba-dark-mode-select');
      if (selectEl) selectEl.value = dm.mode || 'off';

      var timeStart = shadow.getElementById('ba-time-start');
      var timeEnd   = shadow.getElementById('ba-time-end');
      if (timeStart) timeStart.value = dm.start || '20:00';
      if (timeEnd)   timeEnd.value   = dm.end   || '07:00';

      var timeContainer = shadow.getElementById('ba-auto-time-container');
      if (timeContainer) timeContainer.style.display = dm.mode === 'auto' ? 'block' : 'none';
    }
  }

  /* helper: sincroniza los tres color inputs y previews dentro del shadow */
  function _syncColorInputs(shadow, colors) {
    var pairs = [
      { hexId: 'ba-hex-nav',    previewId: 'ba-preview-nav',    nativeId: 'ba-native-nav',    val: colors.nav    },
      { hexId: 'ba-hex-accent', previewId: 'ba-preview-accent', nativeId: 'ba-native-accent', val: colors.accent },
      { hexId: 'ba-hex-bg',     previewId: 'ba-preview-bg',     nativeId: 'ba-native-bg',     val: colors.bg     }
    ];
    pairs.forEach(function (p) {
      var hexEl     = shadow.getElementById(p.hexId);
      var previewEl = shadow.getElementById(p.previewId);
      var nativeEl  = shadow.getElementById(p.nativeId);
      if (hexEl)     hexEl.value = (p.val || '').toUpperCase();
      if (previewEl) previewEl.style.backgroundColor = p.val || '';
      if (nativeEl)  nativeEl.value = p.val || '';
    });
  }

  // ------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------
  BA.ThemeEngine = {

    /** Exponer calculateDynamicColors para uso interno de otros módulos */
    calculateDynamicColors: calculateDynamicColors,

    /**
     * apply — aplica un objeto themeConfig al :root.
     * Llamado desde los vigilantes de storage en content.js.
     * @param {Object} themeData — { id, colors: { bg, nav, accent, ... } }
     */
    apply: function (themeData) {
      if (!themeData || !themeData.colors) return;
      _currentTheme = themeData;
      _applyColorsToRoot(themeData.colors);
    },

    /**
     * applyPreset — carga un tema predefinido por ID.
     * Llamado por los swatches del panel.
     */
    applyPreset: function (themeId) {
      if (!THEMES[themeId]) return;
      _currentTheme = { id: themeId, colors: THEMES[themeId] };
      _applyColorsToRoot(_currentTheme.colors);
      chrome.storage.local.set({ uiThemeConfig: _currentTheme });

      /* Actualizar swatch activo en el panel */
      var shadow = BA.PanelUI && BA.PanelUI.getShadow ? BA.PanelUI.getShadow() : null;
      if (shadow) {
        shadow.querySelectorAll('.ba-theme-swatch').forEach(function (btn) {
          btn.classList.toggle('ba-active', btn.getAttribute('data-theme') === themeId);
        });
        _syncColorInputs(shadow, THEMES[themeId]);
      }
    },

    /**
     * applyFull — carga un tema completo (objeto con id + colors).
     * Usado por temas guardados al hacer click.
     */
    applyFull: function (theme) {
      if (!theme || !theme.colors) return;
      _currentTheme = theme;
      _applyColorsToRoot(theme.colors);
      chrome.storage.local.set({ uiThemeConfig: _currentTheme });

      var shadow = BA.PanelUI && BA.PanelUI.getShadow ? BA.PanelUI.getShadow() : null;
      if (shadow) {
        shadow.querySelectorAll('.ba-theme-swatch').forEach(function (btn) {
          btn.classList.remove('ba-active');
        });
        _syncColorInputs(shadow, theme.colors);
        BA.PanelUI.renderSavedThemes(_savedThemes);
      }
    },

    /**
     * applyCustomColor — modifica uno de los colores del tema actual
     * en tiempo real mientras el usuario escribe/elige en el panel.
     * Solo construye un nuevo tema custom sin tocar temas predefinidos.
     * @param {string} key — 'nav' | 'accent' | 'bg'
     * @param {string} hex — valor hexadecimal
     */
    applyCustomColor: function (key, hex) {
      var shadow = BA.PanelUI && BA.PanelUI.getShadow ? BA.PanelUI.getShadow() : null;
      if (!shadow) return;

      var inputs = _readPanelHexInputs(shadow);
      var nav    = key === 'nav'    ? hex : (inputs.navVal || (_currentTheme.colors && _currentTheme.colors.nav)    || '#2d3748');
      var acc    = key === 'accent' ? hex : (inputs.accVal || (_currentTheme.colors && _currentTheme.colors.accent) || '#3182ce');
      var bg     = key === 'bg'     ? hex : (inputs.bgVal  || (_currentTheme.colors && _currentTheme.colors.bg)     || '#f7fafc');

      var colors = _buildCustomColors(nav, acc, bg);
      _currentTheme = { id: 'custom', colors: colors };
      _applyColorsToRoot(colors);

      /* Persistir en storage (debounceable, pero en este hito es directo) */
      chrome.storage.local.set({ uiThemeConfig: _currentTheme });

      /* Deseleccionar swatches predefinidos */
      shadow.querySelectorAll('.ba-theme-swatch[data-theme]').forEach(function (btn) {
        btn.classList.remove('ba-active');
      });
    },

    /**
     * saveCurrentAsCustom — guarda el tema actual en savedCustomThemes.
     * Equivalente al botón "Guardar este tema" del popup.js.
     */
    saveCurrentAsCustom: function () {
      var shadow = BA.PanelUI && BA.PanelUI.getShadow ? BA.PanelUI.getShadow() : null;
      if (!shadow) return;

      var inputs = _readPanelHexInputs(shadow);
      var navCol = inputs.navVal || (_currentTheme.colors && _currentTheme.colors.nav)    || '#2d3748';
      var accCol = inputs.accVal || (_currentTheme.colors && _currentTheme.colors.accent) || '#3182ce';
      var bgCol  = inputs.bgVal  || (_currentTheme.colors && _currentTheme.colors.bg)     || '#f7fafc';

      var newTheme = {
        id:     'custom_' + Date.now(),
        colors: _buildCustomColors(navCol, accCol, bgCol)
      };

      _savedThemes.push(newTheme);
      _currentTheme = newTheme;

      chrome.storage.local.set(
        { savedCustomThemes: _savedThemes, uiThemeConfig: _currentTheme },
        function () {
          _applyColorsToRoot(newTheme.colors);
          BA.PanelUI.renderSavedThemes(_savedThemes);
        }
      );
    },

    /**
     * deleteSavedTheme — elimina un tema guardado por ID.
     * Si era el activo, vuelve al tema 'usm'.
     */
    deleteSavedTheme: function (themeId) {
      _savedThemes = _savedThemes.filter(function (t) { return t.id !== themeId; });

      var payload = { savedCustomThemes: _savedThemes };

      if (_currentTheme.id === themeId) {
        _currentTheme = { id: 'usm', colors: THEMES.usm };
        payload.uiThemeConfig = _currentTheme;
        _applyColorsToRoot(THEMES.usm);
      }

      chrome.storage.local.set(payload, function () {
        var shadow = BA.PanelUI && BA.PanelUI.getShadow ? BA.PanelUI.getShadow() : null;
        if (shadow) {
          BA.PanelUI.renderSavedThemes(_savedThemes);
        }
      });
    },

    /**
     * hydrate — sincroniza los controles del panel con el storage.
     * Llamado por PanelUI.open().
     */
    hydrate: hydrate
  };

})(window.BetterAula = window.BetterAula || {});
