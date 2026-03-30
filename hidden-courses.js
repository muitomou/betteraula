/**
 * hidden-courses.js — Better Aula v1.0
 * IIFE Module: BA.HiddenCourses
 *
 * Responsabilidad: gestionar la lista de ramos ocultos.
 * Escanea el DOM para obtener cursos con nombres reales,
 * y expone toggle() para ocultar/mostrar ramos directamente en el DOM.
 *
 * Carga: document_idle, DESPUÉS de theme-engine.js, ANTES de content.js
 *
 * NOTA: El ocultamiento usa la clase .ba-hidden-course (NO .ba-hidden)
 * según decisión de diseño del hito v1.0.
 */
(function (BA) {

  // ------------------------------------------------------------------
  // scanCourses — escanea el DOM en busca de todos los ramos disponibles.
  //
  // Selectores en orden de prioridad (Moodle Boost en aula.usm.cl):
  //   1. [data-course-id]  — selector nativo más específico
  //   2. .dashboard-card   — tarjetas del dashboard
  //   3. .coursebox        — vista de lista de cursos
  //   4. .course-listitem  — vista alternativa
  //
  // Retorna: Array<{ id, name }>
  // ------------------------------------------------------------------
  function scanCourses() {
    var courses = [];
    var seen    = {};

    /* Intentar primero el selector más específico */
    document.querySelectorAll('[data-course-id]').forEach(function (container) {
      var id = container.getAttribute('data-course-id');
      if (!id || id === '1' || seen[id]) return;

      /* Leer nombre: clonar para eliminar elementos sr-only/accesshide */
      var titleEl = container.querySelector('h5.card-title, .coursename, .card-title, [aria-label]');
      var name    = '';

      if (titleEl) {
        var clone = titleEl.cloneNode(true);
        clone.querySelectorAll('.sr-only, .accesshide, .hidden').forEach(function (el) {
          el.remove();
        });
        name = (clone.innerText || clone.textContent || '')
          .replace(/El curso es destacado|Nombre del curso/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      /* Fallback al aria-label del contenedor */
      if (name.length < 2) {
        name = container.getAttribute('aria-label') || ('Ramo ' + id);
      }

      seen[id] = true;
      courses.push({ id: id, name: name });
    });

    /* Fallback: si no hay [data-course-id], intentar selectores alternativos */
    if (courses.length === 0) {
      var altSelectors = ['.dashboard-card', '.coursebox', '.course-listitem'];
      for (var i = 0; i < altSelectors.length; i++) {
        document.querySelectorAll(altSelectors[i]).forEach(function (container) {
          var courseId = container.getAttribute('data-courseid') ||
                         container.getAttribute('data-course-id') || '';
          if (!courseId || seen[courseId]) return;
          var label = container.querySelector('.card-title, .coursename, [aria-label]');
          var name  = label
            ? (label.innerText || label.textContent || '').replace(/\s+/g, ' ').trim()
            : ('Ramo ' + courseId);
          seen[courseId] = true;
          courses.push({ id: courseId, name: name });
        });
        if (courses.length > 0) break;
      }
    }

    return courses;
  }

  // ------------------------------------------------------------------
  // _applyHiddenState — aplica u oculta la clase ba-hidden-course al
  // wrapper de layout de un ramo, y dispara resize para ajustar grid.
  // ------------------------------------------------------------------
  function _applyHiddenState(courseId, shouldHide) {
    document.querySelectorAll('[data-course-id="' + courseId + '"]').forEach(function (courseEl) {
      /* Subir al wrapper de columna Bootstrap completo para que Flexbox/Grid
         recoloque las tarjetas restantes sin dejar huecos en la grilla.
         Selector en orden de especificidad descendente: columnas Bootstrap primero,
         luego contenedores alternativos de Moodle Boost. */
      var targetEl = courseEl.closest(
        '[class*="col-"], .course-listitem, .dashboard-card-deck-item, .coursebox'
      ) || courseEl;

      if (shouldHide) {
        targetEl.classList.add('ba-hidden-course');
      } else {
        targetEl.classList.remove('ba-hidden-course');
      }
    });
  }

  // ------------------------------------------------------------------
  // _applyAll — aplica el estado oculto a todos los ramos en hiddenIds
  // basado en el arreglo actual del storage.
  // Llamado en la inicialización por content.js.
  // ------------------------------------------------------------------
  function _applyAll(hiddenIds) {
    if (!hiddenIds || hiddenIds.length === 0) return;
    hiddenIds.forEach(function (id) {
      _applyHiddenState(id, true);
    });
  }

  // ------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------
  BA.HiddenCourses = {

    /**
     * getList — retorna la lista completa de cursos escaneados del DOM,
     * enriquecida con si están ocultos según la variable global de content.js.
     *
     * Retorna: Array<{ id, name, hidden }>
     */
    getList: function () {
      var courses  = scanCourses();
      /* Leer el array global que content.js mantiene en BA._hiddenIds */
      var hiddenIds = BA._hiddenIds || [];

      return courses.map(function (c) {
        return {
          id:     c.id,
          name:   c.name,
          hidden: hiddenIds.indexOf(c.id) !== -1
        };
      });
    },

    /**
     * toggle — alterna el estado oculto de un ramo.
     * Actualiza el DOM inmediatamente y persiste en storage.
     * @param {string} courseId
     */
    toggle: function (courseId) {
      chrome.storage.local.get(['hiddenCourses'], function (res) {
        var current = res.hiddenCourses || [];
        var isHidden = current.indexOf(courseId) !== -1;

        var updated;
        if (isHidden) {
          /* Mostrar: remover del array */
          updated = current.filter(function (id) { return id !== courseId; });
          _applyHiddenState(courseId, false);
        } else {
          /* Ocultar: agregar al array */
          updated = current.concat([courseId]);
          _applyHiddenState(courseId, true);
        }

        chrome.storage.local.set({ hiddenCourses: updated }, function () {
          /* Disparar resize para que Moodle/Bootstrap reajuste la grilla */
          setTimeout(function () {
            window.dispatchEvent(new Event('resize'));
          }, 50);
        });
      });
    },

    /**
     * applyAll — aplica el estado oculto inicial a todos los ramos.
     * Llamado por content.js durante el arranque.
     * @param {Array<string>} hiddenIds
     */
    applyAll: _applyAll,

    /**
     * scanCourses — expuesto para uso de content.js (compatible con el
     * scanCourses() original que ya existía en content.js).
     */
    scanCourses: scanCourses
  };

})(window.BetterAula = window.BetterAula || {});
