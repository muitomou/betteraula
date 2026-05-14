/**
 * @file image-manager.js
 * @description Gestor de medios mediante IndexedDB para portabilidad.
 */
(function(BA) {
  var DB_NAME = 'AulifyContentDB';
  var STORE_NAME = 'customImages';
  
  // Archivos hardcodeados en la extensión:
  // Presets Mesh y básicos
  var PRESETS = [
    { id: 'preset_mesh_usm', type: 'css', source: 'extension', label: 'USM Mesh', className: 'ba-mesh-card ba-mesh-usm', thumb: '' },
    { id: 'preset_mesh_ocean', type: 'css', source: 'extension', label: 'Ocean Mesh', className: 'ba-mesh-card ba-mesh-ocean', thumb: '' },
    { id: 'preset_mesh_forest', type: 'css', source: 'extension', label: 'Forest Mesh', className: 'ba-mesh-card ba-mesh-forest', thumb: '' },
    { id: 'preset_mesh_sunset', type: 'css', source: 'extension', label: 'Sunset Mesh', className: 'ba-mesh-card ba-mesh-sunset', thumb: '' },
    { id: 'preset_mesh_pink', type: 'css', source: 'extension', label: 'Pink Mesh', className: 'ba-mesh-card ba-mesh-pink', thumb: '' },
    { id: 'preset_mesh_purple', type: 'css', source: 'extension', label: 'Purple Mesh', className: 'ba-mesh-card ba-mesh-purple', thumb: '' },
    { id: 'preset_mesh_celeste', type: 'css', source: 'extension', label: 'Celeste Mesh', className: 'ba-mesh-card ba-mesh-celeste', thumb: '' },
    { id: 'preset_mesh_coffee', type: 'css', source: 'extension', label: 'Coffee Mesh', className: 'ba-mesh-card ba-mesh-coffee', thumb: '' },
    {
      id: 'preset_minimal_1',
      type: 'image',
      source: 'extension',
      label: 'Minimal Dark',
      url: chrome.runtime.getURL('assets/presets/minimal_dark.jpg'),
      thumb: chrome.runtime.getURL('assets/presets/minimal_dark.jpg')
    }
  ];

  function initDB() {
    return new Promise(function(resolve, reject) {
      var request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = function(e) { resolve(e.target.result); };
      request.onerror = function() { reject('Error DB'); };
    });
  }

  function _paintImage(element, url) {
    element.style.setProperty('background-image', 'url("' + url + '")', 'important');
    element.style.setProperty('background-size', 'cover', 'important');
    element.style.setProperty('background-position', 'center', 'important');
    element.style.setProperty('background-repeat', 'no-repeat', 'important');
    var container = element.closest('.dashboard-card, .card.coursebox, [data-course-id]');
    if (container) container.classList.add('ba-card-ready');
  }

  BA.ImageManager = {
    getAll: function() {
      return initDB().then(function(db) {
        return new Promise(function(resolve) {
          var tx = db.transaction([STORE_NAME], 'readonly');
          var req = tx.objectStore(STORE_NAME).getAll();
          req.onsuccess = function() {
            var custom = req.result.map(function(r) {
              return {
                id: r.id,
                type: r.type || 'image',
                source: 'indexeddb',
                label: 'Custom',
                data: r.data,
                mimeType: r.mimeType,
                size: r.size || 0
              };
            });
            resolve(PRESETS.concat(custom));
          };
          req.onerror = function() { resolve(PRESETS); };
        });
      });
    },

    apply: function(courseId, resourceObj) {
      var cardContainer = document.querySelector('[data-course-id="' + courseId + '"]');
      if (!cardContainer) return;
      
      var imgContainer = cardContainer.querySelector('.dashboard-card-img, .card-img, .course-image-view');
      if (!imgContainer) return;

      // Limpiar video y overlay previos
      var oldVid = document.getElementById('ba-video-' + courseId);
      if (oldVid) oldVid.remove();
      var oldOverlay = document.getElementById('ba-overlay-' + courseId);
      if (oldOverlay) oldOverlay.remove();
      
      // Limpiar clases CSS anteriores de la tarjeta
      imgContainer.className = imgContainer.className.replace(/ba-mesh-\S+/g, '').replace('ba-mesh-card', '').trim();

      if (resourceObj.type === 'css') {
        var pst = PRESETS.find(function(p) { return p.id === resourceObj.id; });
        if (pst && pst.className) {
           imgContainer.style.removeProperty('background-image');
           var classes = pst.className.split(' ');
           for (var i=0; i<classes.length; i++) {
               imgContainer.classList.add(classes[i]);
           }
           var container = imgContainer.closest('.dashboard-card, .card.coursebox, [data-course-id]');
           if (container) container.classList.add('ba-card-ready');
        }
      } else if (resourceObj.type === 'image') {
        var urlToUse;
        if (resourceObj.source === 'extension') {
          if (resourceObj.id && resourceObj.id.startsWith('preset_')) {
            var preset = PRESETS.find(function(p) { return p.id === resourceObj.id; });
            urlToUse = preset ? preset.url : chrome.runtime.getURL('images/default1.jpg');
          } else {
            urlToUse = chrome.runtime.getURL(resourceObj.id || 'images/default1.jpg');
          }
        } else {
          if (resourceObj.data) {
            urlToUse = resourceObj.data;
          } else {
             initDB().then(function(db) {
               var tx = db.transaction([STORE_NAME], 'readonly');
               var req = tx.objectStore(STORE_NAME).get(resourceObj.id);
               req.onsuccess = function() {
                 if (req.result) {
                   var r = req.result;
                   _paintImage(imgContainer, r.data);
                 }
               };
             });
             return; 
          }
        }
        
        if (urlToUse) {
           _paintImage(imgContainer, urlToUse);
        }

      }
    },

    applyBulk: function(courseConfig) {
      if (!courseConfig) return;
      for (var courseId in courseConfig) {
        if (courseConfig.hasOwnProperty(courseId)) {
          var val = courseConfig[courseId];
          if (typeof val === 'string') {
             val = {
               id: val,
               type: 'image',
               source: val.startsWith('custom_') ? 'indexeddb' : 'extension'
             };
          }
          this.apply(courseId, val);
        }
      }
    },

    saveFromFile: function(file) {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
           var img = new Image();
           img.src = e.target.result;
           img.onload = function() {
             var canvas = document.createElement('canvas');
             var maxWidth = 800;
             var w = img.width, h = img.height;
             if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; }
             canvas.width = w; canvas.height = h;
             var ctx = canvas.getContext('2d');
             ctx.drawImage(img, 0, 0, w, h);
             var b64 = canvas.toDataURL('image/jpeg', 0.8);
             
             var cid = 'custom_' + Date.now();
             initDB().then(function(db) {
               var tx = db.transaction([STORE_NAME], 'readwrite');
               tx.objectStore(STORE_NAME).put({
                 id: cid,
                 data: b64,
                 type: 'image',
                 mimeType: 'image/jpeg',
                 size: Math.round((b64.length * 3) / 4)
               });
               tx.oncomplete = function() {
                 resolve({ id: cid, type: 'image', source: 'indexeddb' });
               };
               tx.onerror = function() { reject('Error saving to DB'); };
             });
           };
        };
        reader.readAsDataURL(file);
      });
    },

    delete: function(resourceId) {
      return initDB().then(function(db) {
         return new Promise(function(resolve) {
           var tx = db.transaction([STORE_NAME], 'readwrite');
           tx.objectStore(STORE_NAME).delete(resourceId);
           tx.oncomplete = function() {
              chrome.storage.local.get(['courseConfig'], function(res) {
                 var config = res.courseConfig || {};
                 var changed = false;
                 for (var k in config) {
                   if (config[k] === resourceId || (typeof config[k] === 'object' && config[k].id === resourceId)) {
                     config[k] = { id: 'images/default1.jpg', type: 'image', source: 'extension' };
                     changed = true;
                     var oldVid = document.getElementById('ba-video-' + k);
                     if (oldVid) oldVid.remove();
                     var oldOverlay = document.getElementById('ba-overlay-' + k);
                     if (oldOverlay) oldOverlay.remove();
                     var cardContainer = document.querySelector('[data-course-id="' + k + '"]');
                     if (cardContainer) {
                       var imgc = cardContainer.querySelector('.dashboard-card-img, .card-img, .course-image-view');
                       if (imgc) _paintImage(imgc, chrome.runtime.getURL('images/default1.jpg'));
                     }
                   }
                 }
                 if (changed) {
                   chrome.storage.local.set({courseConfig: config});
                 }
                 resolve();
              });
           };
         });
      });
    }
  };

})(window.BetterAula = window.BetterAula || {});
