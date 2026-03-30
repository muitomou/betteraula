/**
 * content.js — Better Aula v1.0 (ORQUESTADOR)
 *
 * Este archivo es ahora el orquestador principal. Las responsabilidades
 * están delegadas a los módulos IIFE cargados antes que él:
 *   - navbar-injector.js → BA.NavbarInjector
 *   - panel-ui.js         → BA.PanelUI
 *   - theme-engine.js     → BA.ThemeEngine
 *   - hidden-courses.js   → BA.HiddenCourses
 *
 * content.js retiene:
 *   - IndexedDB (AulifyContentDB) — imágenes de cursos
 *   - injectUploadButtons()       — botón de opciones sobre imagen de curso
 *   - applyConfig()               — pintura de imágenes + ocultamiento + labels
 *   - applyThemeConfig()          — delega a BA.ThemeEngine.apply()
 *   - applyDarkModeConfig()       — lógica de horario (sin cambios)
 *   - scanCourses()               — delega a BA.HiddenCourses.scanCourses()
 *   - Listeners de storage y MutationObserver DOM
 *   - Listener de mensajes Chrome (getCourses, getCustomImages)
 *
 * BRIDGE: BA._hiddenIds — array compartido con HiddenCourses.getList()
 * BA._onNavTextChange    — callback para que ThemeEngine notifique cambios
 */

console.log('[BetterAula] content.js orquestador cargado.');

// ------------------------------------------------------------------
// Namespace guard — por si content.js se carga antes que los módulos
// (no debería ocurrir gracias al orden en manifest.json, pero defensivo)
// ------------------------------------------------------------------
window.BetterAula = window.BetterAula || {};
var BA = window.BetterAula;

// ------------------------------------------------------------------
// Estado global (idéntico al original)
// ------------------------------------------------------------------
var globalConfig = {};
var globalLabels = {};
var globalHidden = [];

// Publicar el array de ramos ocultos en el namespace para que
// BA.HiddenCourses.getList() pueda consultarlo.
BA._hiddenIds = globalHidden;

// ------------------------------------------------------------------
// Callback que ThemeEngine llama cuando cambia el color del nav text,
// para que updateLogoColor() se ejecute en el contexto correcto.
// ------------------------------------------------------------------
BA._onNavTextChange = function (navText) {
  currentNavText = navText;
  updateLogoColor();
};

// ==========================================
// 1. BASE DE DATOS LOCAL (AulifyContentDB)
// SIN CAMBIOS — gestión de imágenes de cursos
// ==========================================
var DB_NAME   = 'AulifyContentDB';
var STORE_NAME = 'customImages';

function initContentDB() {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = function (e) { resolve(e.target.result); };
    request.onerror   = function ()  { reject('Error DB'); };
  });
}

function saveToContentDB(id, base64Data) {
  return initContentDB().then(function (db) {
    return new Promise(function (resolve) {
      var tx = db.transaction([STORE_NAME], 'readwrite');
      tx.objectStore(STORE_NAME).put({ id: id, data: base64Data });
      tx.oncomplete = function () { resolve(); };
    });
  });
}

function getFromContentDB(id) {
  return initContentDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx  = db.transaction([STORE_NAME], 'readonly');
      var req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = function () {
        if (req.result) resolve(req.result.data);
        else reject('No encontrada');
      };
    });
  });
}

function getAllFromContentDB() {
  return initContentDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx  = db.transaction([STORE_NAME], 'readonly');
      var req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = function () { resolve(req.result); };
      req.onerror   = function () { reject('Error DB'); };
    });
  });
}

// ==========================================
// 2. COMPRESIÓN DE IMÁGENES — SIN CAMBIOS
// ==========================================
function compressImageContent(base64Str, maxWidth, callback) {
  var img = new Image();
  img.src = base64Str;
  img.onload = function () {
    var canvas = document.createElement('canvas');
    var width = img.width, height = img.height;
    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
    canvas.width = width; canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    // Comprime a JPEG con 80% de calidad para optimizar carga
    callback(canvas.toDataURL('image/jpeg', 0.8));
  };
}

// ==========================================
// 3. INYECCIÓN DEL BOTÓN DE OPCIONES DE IMAGEN
// SIN CAMBIOS — emojis se mantienen en este hito
// ==========================================
function injectUploadButtons() {
  document.querySelectorAll('[data-course-id]').forEach(function (container) {
    if (container.querySelector('.aulify-options-container')) return;
    var oldBtn = container.querySelector('.aulify-edit-btn');
    if (oldBtn) oldBtn.remove();

    var courseId     = container.getAttribute('data-course-id');
    var imgContainer = container.querySelector('.dashboard-card-img, .card-img, .course-image-view');

    if (imgContainer) {
      imgContainer.style.position = 'relative';

      var optContainer = document.createElement('div');
      optContainer.className = 'aulify-options-container';
      Object.assign(optContainer.style, {
        position: 'absolute', top: '10px', right: '10px',
        zIndex: '20', opacity: '0', transition: 'all 0.3s ease',
        fontFamily: 'Arial, sans-serif'
      });

      imgContainer.addEventListener('mouseenter', function () { optContainer.style.opacity = '1'; });
      imgContainer.addEventListener('mouseleave', function () {
        optContainer.style.opacity = '0';
        menu.style.display = 'none';
      });

      var btn = document.createElement('button');
      btn.innerHTML = '⚙️ Opciones';
      Object.assign(btn.style, {
        backgroundColor: 'rgba(0,0,0,0.7)', color: 'white',
        border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px',
        padding: '6px 12px', cursor: 'pointer',
        fontSize: '12px', fontWeight: 'bold', backdropFilter: 'blur(4px)',
        lineHeight: '1'
      });

      var menu = document.createElement('div');
      Object.assign(menu.style, {
        display: 'none', position: 'absolute', top: '100%', right: '0',
        marginTop: '5px', backgroundColor: '#fff', border: '1px solid #e2e8f0',
        borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        minWidth: '150px', overflow: 'hidden', zIndex: '99999'
      });

      var stopBubbling = function (e) { e.stopPropagation(); };
      ['click', 'mousedown', 'mouseup', 'dblclick'].forEach(function (evt) {
        optContainer.addEventListener(evt, stopBubbling);
      });

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      });

      var createMenu = function (html, color, fn) {
        var i = document.createElement('div');
        i.innerHTML = html;
        Object.assign(i.style, {
          padding: '8px 12px', fontSize: '12px', color: color,
          cursor: 'pointer', borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#fff', transition: 'background 0.2s'
        });
        i.addEventListener('mouseenter', function () { i.style.backgroundColor = '#f7fafc'; });
        i.addEventListener('mouseleave', function () { i.style.backgroundColor = '#fff'; });
        i.addEventListener('click', function (e) {
          e.preventDefault();
          menu.style.display = 'none';
          fn(e);
        });
        return i;
      };

      var itemA = createMenu('Personalizar Imagen', '#2d3748', function () {
        var gi = document.getElementById('ba-global-file-input');
        if (!gi) {
          gi = document.createElement('input');
          gi.id = 'ba-global-file-input';
          gi.type = 'file';
          gi.accept = 'image/png, image/jpeg';
          gi.style.display = 'none';
          document.body.appendChild(gi);
        }
        gi.onchange = function (e) {
          var file = e.target.files[0];
          if (!file) return;
          btn.innerHTML = 'Subiendo...'; btn.style.backgroundColor = '#d69e2e';
          var reader = new FileReader();
          reader.onload = function (ev) {
            compressImageContent(ev.target.result, 800, function (cmp) {
              var cid = 'custom_' + Date.now();
              saveToContentDB(cid, cmp).then(function () {
                chrome.storage.local.get(['courseConfig'], function (res) {
                  var config = res.courseConfig || {};
                  config[courseId] = cid;
                  chrome.storage.local.set({ courseConfig: config }, function () {
                    processAndPaint(imgContainer, cid);
                    btn.innerHTML = '✅ Listo'; btn.style.backgroundColor = '#38a169';
                    setTimeout(function () {
                      btn.innerHTML = '⚙️ Opciones';
                      btn.style.backgroundColor = 'rgba(0,0,0,0.7)';
                    }, 2000);
                    gi.value = '';
                  });
                });
              });
            });
          };
          reader.readAsDataURL(file);
        };
        gi.click();
      });

      var itemB = createMenu('Renombrar', '#2d3748', function () {
        var newName = prompt("Escribe una nueva etiqueta (Ej: 'Semestre 1', 'Matemáticas'):");
        if (newName !== null && newName.trim() !== '') {
          chrome.storage.local.get(['customLabels'], function (res) {
            var labels = res.customLabels || {};
            labels[courseId] = newName.trim();
            chrome.storage.local.set({ customLabels: labels });
          });
        } else if (newName !== null && newName.trim() === '') {
          chrome.storage.local.get(['customLabels'], function (res) {
            var labels = res.customLabels || {};
            delete labels[courseId];
            chrome.storage.local.set({ customLabels: labels });
          });
        }
      });

      var itemC = createMenu('Ocultar Ramo', '#e53e3e', function () {
        // Delegar al módulo HiddenCourses si está disponible
        if (BA.HiddenCourses && typeof BA.HiddenCourses.toggle === 'function') {
          BA.HiddenCourses.toggle(courseId);
        } else {
          // Fallback si el módulo no está disponible
          chrome.storage.local.get(['hiddenCourses'], function (res) {
            var hidden = res.hiddenCourses || [];
            if (hidden.indexOf(courseId) === -1) {
              hidden.push(courseId);
              chrome.storage.local.set({ hiddenCourses: hidden });
            }
          });
        }
      });
      itemC.style.borderBottom = 'none';

      menu.appendChild(itemA);
      menu.appendChild(itemB);
      menu.appendChild(itemC);
      optContainer.appendChild(btn);
      optContainer.appendChild(menu);
      imgContainer.appendChild(optContainer);
    }
  });
}

// ==========================================
// 4. MOTOR DE PINTURA Y ESCANEO
// scanCourses delega al módulo; resto sin cambios
// ==========================================
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'getCourses') {
    // Usar el scanner del módulo si está disponible; fallback al local
    var courses = (BA.HiddenCourses && typeof BA.HiddenCourses.scanCourses === 'function')
      ? BA.HiddenCourses.scanCourses()
      : _scanCoursesLocal();
    sendResponse({ courses: courses });
  } else if (request.action === 'getCustomImages') {
    getAllFromContentDB()
      .then(function (images) { sendResponse({ images: images }); })
      .catch(function ()      { sendResponse({ images: [] }); });
    return true; // Mantener canal abierto para respuesta asíncrona
  }
});

/* Fallback local de scanCourses por si el módulo no cargó */
function _scanCoursesLocal() {
  var courses = [];
  document.querySelectorAll('[data-course-id]').forEach(function (container) {
    var id      = container.getAttribute('data-course-id');
    var titleEl = container.querySelector('h5.card-title, .coursename');
    if (titleEl) {
      var clone = titleEl.cloneNode(true);
      clone.querySelectorAll('.sr-only, .accesshide, .hidden').forEach(function (el) { el.remove(); });
      var cleanName = clone.innerText
        .replace(/El curso es destacado|Nombre del curso/gi, '')
        .replace(/\s+/g, ' ').trim();
      if (cleanName.length < 2) cleanName = 'Ramo ' + id;
      if (id && id !== '1' && !courses.find(function (c) { return c.id === id; })) {
        courses.push({ id: id, name: cleanName });
      }
    }
  });
  return courses;
}

function applyConfig() {
  var defaultImg = globalConfig['global'] || 'images/default1.jpg';
  var layoutChanged = false;

  document.querySelectorAll('[data-course-id]').forEach(function (container) {
    var courseId = container.getAttribute('data-course-id');

    // Bloque 1 — Ocultar ramo (usa .ba-hidden-course, sin cambios)
    var layoutWrapper = container.closest('[class*="col-"], .coursebox, .list-group-item') || container;
    if (globalHidden.indexOf(courseId) !== -1) {
      if (!layoutWrapper.classList.contains('ba-hidden-course')) {
        layoutWrapper.classList.add('ba-hidden-course');
        layoutChanged = true;
      }
      return;
    } else {
      if (layoutWrapper.classList.contains('ba-hidden-course')) {
        layoutWrapper.classList.remove('ba-hidden-course');
        layoutChanged = true;
      }
    }

    // Bloque 2 — Renombrar etiqueta
    var lbl = globalLabels[courseId];
    if (lbl) {
      var catEl = container.querySelector('.course-category, .text-truncate');
      if (catEl) {
        if (!catEl.dataset.originalText) catEl.dataset.originalText = catEl.innerText;
        if (catEl.innerText !== lbl) catEl.innerText = lbl;
      }
    } else {
      var catEl2 = container.querySelector('.course-category, .text-truncate');
      if (catEl2 && catEl2.dataset.originalText) {
        if (catEl2.innerText !== catEl2.dataset.originalText) {
          catEl2.innerText = catEl2.dataset.originalText;
        }
      }
    }

    // Bloque 3 — Pintura de imagen
    var imageToUse = globalConfig[courseId] || defaultImg;
    var cardImg    = container.querySelector('.dashboard-card-img, .card-img, .course-image-view');
    if (cardImg) {
      processAndPaint(cardImg, imageToUse);
    } else {
      container.classList.add('ba-card-ready');
    }
  });

  if (layoutChanged) {
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50);
  }

  injectUploadButtons();
  updateLogoColor();
}

var imageCache = {};

function processAndPaint(element, imagePath) {
  if (imageCache[imagePath]) {
    paintElement(element, imageCache[imagePath]);
    return;
  }

  // A. Foto custom (De la DB del content)
  if (imagePath.startsWith('custom_')) {
    getFromContentDB(imagePath)
      .then(function (base64Data) {
        imageCache[imagePath] = base64Data;
        paintElement(element, base64Data);
      })
      .catch(function (e) { console.warn('[BetterAula] Foto custom no hallada en DB', e); });
    return;
  }

  // B. Foto default (carpeta images/)
  var fullUrl = chrome.runtime.getURL(imagePath);
  fetch(fullUrl)
    .then(function (r) { return r.blob(); })
    .then(function (blob) {
      var reader = new FileReader();
      reader.onloadend = function () {
        imageCache[imagePath] = reader.result;
        paintElement(element, reader.result);
      };
      reader.readAsDataURL(blob);
    })
    .catch(function () { /* silencioso */ });
}

function paintElement(element, base64Url) {
  element.style.setProperty('background-image',    'url(\'' + base64Url + '\')', 'important');
  element.style.setProperty('background-size',     'cover',      'important');
  element.style.setProperty('background-position', 'center',     'important');
  element.style.setProperty('background-repeat',   'no-repeat',  'important');
  element.style.setProperty('filter',  'none', 'important'); // Quita filtros institucionales
  element.style.setProperty('opacity', '1',    'important');
  element.style.setProperty('display', 'block', 'important');

  var container = element.closest('.dashboard-card, .card.coursebox, [data-course-id]');
  if (container) container.classList.add('ba-card-ready');
}

// ==========================================
// 5. LOGO Y AUTO-CONTRASTE — SIN CAMBIOS
// ==========================================
var currentAutoText = '#212529';
var currentNavText  = '#ffffff';

function updateLogoColor() {
  var isDarkMode    = document.documentElement.classList.contains('ba-dark-mode');
  var isNavTextWhite = currentNavText === '#ffffff' || isDarkMode;

  document.querySelectorAll(
    '.navbar-brand img, .logo img, a.navbar-brand .logo, .navbar-brand .sitelogo, img[src*="marca-color"]'
  ).forEach(function (logoImg) {
    if (!logoImg.dataset.originalSrc) {
      if (logoImg.src.includes('logousmletrasblancas')) return;
      logoImg.dataset.originalSrc = logoImg.src;
    }
    if (isNavTextWhite) {
      logoImg.src = chrome.runtime.getURL('logousmletrasblancas.png');
    } else {
      logoImg.src = logoImg.dataset.originalSrc;
    }
  });
}

// ==========================================
// 6. APLICAR TEMA — DELEGA A BA.ThemeEngine
// ==========================================
function applyThemeConfig(themeData) {
  if (!themeData || !themeData.colors) return;

  if (BA.ThemeEngine && typeof BA.ThemeEngine.apply === 'function') {
    // El módulo aplica los colores al :root y llama BA._onNavTextChange
    BA.ThemeEngine.apply(themeData);
  } else {
    // Fallback si el módulo no cargó (no debería ocurrir)
    var colors   = themeData.colors;
    var root     = document.documentElement;
    var dynamics = (BA.ThemeEngine && BA.ThemeEngine.calculateDynamicColors)
      ? BA.ThemeEngine.calculateDynamicColors(colors.bg, colors.accent, colors.nav)
      : { navText: '#ffffff', autoText: '#212529', accentRgbStr: '49, 130, 206' };

    root.style.setProperty('--ba-bg',           colors.bg);
    root.style.setProperty('--ba-nav',           colors.nav);
    root.style.setProperty('--ba-accent',        colors.accent);
    root.style.setProperty('--ba-card-border',   colors.border || colors.bg);
    root.style.setProperty('--ba-text-primary',  colors.text   || '#1a202c');
    root.style.setProperty('--ba-text-nav',      dynamics.navText);
    root.style.setProperty('--ba-auto-text',     dynamics.autoText);
    root.style.setProperty('--ba-accent-rgb',    dynamics.accentRgbStr);

    currentNavText  = dynamics.navText;
    currentAutoText = dynamics.autoText;
    updateLogoColor();
  }
}

// ==========================================
// 7. MODO OSCURO — SIN CAMBIOS EN LA LÓGICA
// Agrega sincronización del panel dark class
// ==========================================
var darkModeInterval = null;

function applyDarkModeConfig(config) {
  if (!config) return;
  var root = document.documentElement;

  if (darkModeInterval) {
    clearInterval(darkModeInterval);
    darkModeInterval = null;
  }

  var checkTime = function () {
    var isDark = false;
    if (config.mode === 'off') {
      isDark = false;
    } else if (config.mode === 'on') {
      isDark = true;
    } else if (config.mode === 'auto') {
      var now     = new Date();
      var current = now.getHours() * 60 + now.getMinutes();

      var startParts = config.start.split(':').map(Number);
      var start      = startParts[0] * 60 + startParts[1];

      var endParts = config.end.split(':').map(Number);
      var end      = endParts[0] * 60 + endParts[1];

      if (start < end) {
        isDark = current >= start && current < end;
      } else { // Cruza la medianoche
        isDark = current >= start || current < end;
      }
    }

    if (isDark) {
      root.classList.add('ba-dark-mode');
    } else {
      root.classList.remove('ba-dark-mode');
    }

    updateLogoColor();

    // Sincronizar clase dark del panel in-app
    if (BA.PanelUI && typeof BA.PanelUI.syncDarkMode === 'function') {
      BA.PanelUI.syncDarkMode(isDark);
    }
  };

  checkTime();
  if (config.mode === 'auto') {
    darkModeInterval = setInterval(checkTime, 60000); // Revisar cada minuto
  }
}

// ==========================================
// 8. VIGILANTES GLOBALES (arranque)
// ==========================================

// Carga inicial: leer todo el storage y aplicar
chrome.storage.local.get(
  ['courseConfig', 'uiThemeConfig', 'darkModeConfig', 'customLabels', 'hiddenCourses'],
  function (result) {
    globalConfig = result.courseConfig  || {};
    globalLabels = result.customLabels  || {};
    globalHidden = result.hiddenCourses || [];

    // Publicar en el namespace para BA.HiddenCourses.getList()
    BA._hiddenIds = globalHidden;

    applyConfig();

    if (result.uiThemeConfig)  applyThemeConfig(result.uiThemeConfig);
    if (result.darkModeConfig) applyDarkModeConfig(result.darkModeConfig);
  }
);

// Escuchar cambios instantáneos (desde popup o desde el panel in-app)
// KNOWN ISSUE: si popup y panel están abiertos simultáneamente puede
// haber race conditions en storage. Documentado, no resuelto en v1.0.
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (namespace === 'local') {
    var needsApply = false;

    if (changes.courseConfig)  { globalConfig = changes.courseConfig.newValue  || {}; needsApply = true; }
    if (changes.customLabels)  { globalLabels = changes.customLabels.newValue  || {}; needsApply = true; }
    if (changes.hiddenCourses) {
      globalHidden  = changes.hiddenCourses.newValue || [];
      BA._hiddenIds = globalHidden; // Mantener bridge sincronizado
      needsApply = true;

      // Actualizar lista en el panel si está abierto
      if (BA.PanelUI && typeof BA.PanelUI.renderHiddenList === 'function') {
        BA.PanelUI.renderHiddenList(globalHidden);
      }
    }

    if (needsApply) applyConfig();

    if (changes.uiThemeConfig)  applyThemeConfig(changes.uiThemeConfig.newValue);
    if (changes.darkModeConfig) applyDarkModeConfig(changes.darkModeConfig.newValue);
  }
});

// Vigilante del DOM — para cuando Moodle inyecta componentes dinámicamente
// RIESGO CONOCIDO: subtree:true puede causar degradación en páginas pesadas.
// Es necesario aquí para detectar cambios en la grilla de cursos.
new MutationObserver(function () {
  applyConfig();
}).observe(document.body, { childList: true, subtree: true });