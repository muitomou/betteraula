/**
 * @file image-picker.js
 * @description Componente Shadow DOM para galería y subida de imágenes.
 */
(function(BA) {

  var _host = null;
  var _shadow = null;
  var _courseId = null;
  var _isOpen = false;

  var HTML_CONTENT = `
      <style>
        :host { display: block; position: fixed; inset: 0; z-index: 100000; font-family: sans-serif; }
        .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
        .modal { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; max-width: 90vw; background: #fff; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; max-height: 80vh; }
        .header { padding: 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .title { font-size: 18px; font-weight: bold; margin: 0; color: #1a202c; }
        .close { background: none; border: none; font-size: 24px; cursor: pointer; color: #718096; }
        .tabs { display: flex; border-bottom: 1px solid #e2e8f0; background: #f7fafc; }
        .tab { flex: 1; padding: 12px; text-align: center; cursor: pointer; color: #4a5568; font-weight: 500; border-bottom: 2px solid transparent; }
        .tab.active { color: #3182ce; border-bottom-color: #3182ce; background: #fff; }
        .content { padding: 16px; overflow-y: auto; flex: 1; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .item { position: relative; aspect-ratio: 16/9; background: #e2e8f0; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; }
        .item:hover { border-color: #3182ce; }
        .item img { width: 100%; height: 100%; object-fit: cover; }
        .item .label { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: #fff; font-size: 12px; padding: 4px; text-align: center; }
        .item .del-btn { position: absolute; top: 4px; right: 4px; background: rgba(220, 38, 38, 0.9); border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; justify-content: center; align-items: center; }
        .item .del-btn svg { width: 14px; height: 14px; fill: white; }
        .item-placeholder { display:flex; align-items:center; justify-content:center; width:100%; height:100%; background:#cbd5e0; color:#4a5568; font-size: 12px; font-weight: bold;}
        .dropzone { border: 2px dashed #cbd5e0; border-radius: 8px; padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .dropzone:hover, .dropzone.dragover { border-color: #3182ce; background: #ebf8ff; }
        .hidden { display: none !important; }
        .stats { font-size: 12px; color: #718096; margin-top: 12px; text-align: right; }
        
        @keyframes baAestheticFlow {
            0% { background-position: 0% 0%, 100% 100%; }
            50% { background-position: 100% 100%, 0% 0%; }
            100% { background-position: 0% 0%, 100% 100%; }
        }
        .ba-mesh-card {
            background-repeat: no-repeat !important;
            animation: baAestheticFlow 20s ease-in-out infinite !important;
            transform: translateZ(0); 
            will-change: background-position;
            background-size: 200% 200%, 200% 200% !important;
        }
        .ba-mesh-usm { background-color: #2b6cb0 !important; background-image: radial-gradient(circle at 10% 20%, rgba(49, 130, 206, 0.9) 0%, rgba(49, 130, 206, 0) 90%), radial-gradient(circle at 90% 80%, rgba(99, 179, 237, 0.8) 0%, rgba(99, 179, 237, 0) 90%) !important; }
        .ba-mesh-ocean { background-color: #0369a1 !important; background-image: radial-gradient(circle at 10% 20%, rgba(14, 165, 233, 0.9) 0%, rgba(14, 165, 233, 0) 90%), radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.8) 0%, rgba(56, 189, 248, 0) 90%) !important; }
        .ba-mesh-forest { background-color: #047857 !important; background-image: radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.9) 0%, rgba(16, 185, 129, 0) 90%), radial-gradient(circle at 90% 80%, rgba(52, 211, 153, 0.8) 0%, rgba(52, 211, 153, 0) 90%) !important; }
        .ba-mesh-sunset { background-color: #c2410c !important; background-image: radial-gradient(circle at 10% 20%, rgba(249, 115, 22, 0.9) 0%, rgba(249, 115, 22, 0) 90%), radial-gradient(circle at 90% 80%, rgba(251, 146, 60, 0.8) 0%, rgba(251, 146, 60, 0) 90%) !important; }
        .ba-mesh-pink { background-color: #e11d48 !important; background-image: radial-gradient(circle at 10% 20%, rgba(251, 113, 133, 0.9) 0%, rgba(251, 113, 133, 0) 90%), radial-gradient(circle at 90% 80%, rgba(255, 182, 193, 0.8) 0%, rgba(255, 182, 193, 0) 90%) !important; }
        .ba-mesh-purple { background-color: #6d28d9 !important; background-image: radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.9) 0%, rgba(139, 92, 246, 0) 90%), radial-gradient(circle at 90% 80%, rgba(167, 139, 250, 0.8) 0%, rgba(167, 139, 250, 0) 90%) !important; }
        .ba-mesh-celeste { background-color: #0284c7 !important; background-image: radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.9) 0%, rgba(56, 189, 248, 0) 90%), radial-gradient(circle at 90% 80%, rgba(125, 211, 252, 0.8) 0%, rgba(125, 211, 252, 0) 90%) !important; }
        .ba-mesh-coffee { background-color: #b45309 !important; background-image: radial-gradient(circle at 10% 20%, rgba(245, 158, 11, 0.9) 0%, rgba(245, 158, 11, 0) 90%), radial-gradient(circle at 90% 80%, rgba(251, 191, 36, 0.8) 0%, rgba(251, 191, 36, 0) 90%) !important; }
      </style>
      <div class="backdrop"></div>
      <div class="modal">
        <div class="header">
          <h2 class="title">Personalizar Fondo</h2>
          <button class="close">&times;</button>
        </div>
        <div class="tabs">
          <div class="tab active" data-target="tab-presets">Galería Better Aula</div>
          <div class="tab" data-target="tab-customs">Mis subidas</div>
          <div class="tab" data-target="tab-upload">Subir archivo</div>
        </div>
        <div class="content">
          <div id="tab-presets" class="tab-pane">
             <div class="grid" id="presets-grid"></div>
          </div>
          <div id="tab-customs" class="tab-pane hidden">
             <div class="grid" id="customs-grid"></div>
             <div class="stats" id="customs-stats"></div>
          </div>
          <div id="tab-upload" class="tab-pane hidden">
             <div class="dropzone" id="dropzone">
                <svg style="width:48px;height:48px;margin-bottom:16px;color:#a0aec0;" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.759-1.576 3.5 3.5 0 01-2.903 6.556H5.5zM10 5a1 1 0 011 1v3.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 9.586V6a1 1 0 011-1z"></path></svg>
                <div style="font-size:16px;color:#2d3748;font-weight:600;margin-bottom:8px">Arrastra una imagen aquí</div>
                <div style="font-size:12px;color:#718096;margin-bottom:16px">JPG, PNG o WEBP (máx. 5MB)</div>
                <button style="background:#3182ce;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;">Seleccionar archivo</button>
                <input type="file" id="file-input" style="display:none" accept="image/jpeg,image/png,image/webp">
             </div>
             <div id="upload-feedback" style="margin-top:16px;text-align:center;font-weight:bold;color:#3182ce;"></div>
          </div>
        </div>
      </div>
  `;

  function createDOM() {
    _host = document.createElement('div');
    _host.id = 'ba-image-picker-host';
    _host.style.cssText = 'position:fixed; inset:0; z-index:100000; display:none;';
    document.body.appendChild(_host);

    _shadow = _host.attachShadow({ mode: 'open' });
    _shadow.innerHTML = HTML_CONTENT;

    // Bind events
    _shadow.querySelector('.backdrop').addEventListener('click', closePicker);
    _shadow.querySelector('.close').addEventListener('click', closePicker);
    
    var tabs = _shadow.querySelectorAll('.tab');
    tabs.forEach(function(t) {
      t.addEventListener('click', function() {
        tabs.forEach(function(x) { x.classList.remove('active'); });
        t.classList.add('active');
        _shadow.querySelectorAll('.tab-pane').forEach(function(p) { p.classList.add('hidden'); });
        _shadow.getElementById(t.dataset.target).classList.remove('hidden');
      });
    });

    var dropzone = _shadow.getElementById('dropzone');
    var fileInput = _shadow.getElementById('file-input');
    
    dropzone.addEventListener('click', function() { fileInput.click(); });
    dropzone.addEventListener('dragover', function(e) { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', function(e) { dropzone.classList.remove('dragover'); });
    dropzone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function(e) {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && _isOpen) closePicker();
    });
  }

  function openPicker(courseId) {
    if (!_host) createDOM();
    _courseId = courseId;
    _isOpen = true;
    _host.style.display = 'block';
    _shadow.querySelector('.tab[data-target="tab-presets"]').click();
    _shadow.getElementById('upload-feedback').innerText = '';
    loadData();
  }

  function closePicker() {
    _isOpen = false;
    _host.style.display = 'none';
  }

  async function loadData() {
    if (!BA.ImageManager) return;
    const all = await BA.ImageManager.getAll();
    const presets = all.filter(x => x.source === 'extension');
    const customs = all.filter(x => x.source === 'indexeddb');

    const renderItem = (item, isCustom) => {
       const div = document.createElement('div');
       div.className = 'item';
       
       let mediaHtml = '';
       if (item.type === 'css') {
          mediaHtml = `<div class="${item.className}" style="width:100%;height:100%;"></div>`;
       } else {
          const src = item.url || item.data;
          mediaHtml = `<img src="${src}" onerror="this.outerHTML='<div class=\\'item-placeholder\\'>${item.label || 'Imagen'}</div>'">`;
       }
       
       div.innerHTML = mediaHtml;
       
       if (item.label && item.source === 'extension') {
          const bg = document.createElement('div');
          bg.className = 'label';
          bg.innerText = item.label;
          div.appendChild(bg);
       }
       
       if (isCustom) {
          const btn = document.createElement('button');
          btn.className = 'del-btn';
          btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
          btn.onclick = async (e) => {
             e.stopPropagation();
             await BA.ImageManager.delete(item.id);
             loadData();
          };
          div.appendChild(btn);
       }

       div.onclick = () => {
          applyResource({
             id: item.id,
             type: item.type,
             source: item.source,
             data: item.data,
             mimeType: item.mimeType
          });
       };
       return div;
    };

    const pGrid = _shadow.getElementById('presets-grid');
    pGrid.innerHTML = '';
    presets.forEach(p => pGrid.appendChild(renderItem(p, false)));

    const cGrid = _shadow.getElementById('customs-grid');
    cGrid.innerHTML = '';
    if (customs.length === 0) {
       cGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#718096">Aún no has subido archivos. Ve a Subir archivo →</div>';
    } else {
       customs.forEach(c => cGrid.appendChild(renderItem(c, true)));
    }
    
    const sizeBytes = customs.reduce((acc, c) => acc + (c.size || 0), 0);
    _shadow.getElementById('customs-stats').innerText = 'Usando ' + (sizeBytes / (1024*1024)).toFixed(1) + ' MB';
  }

  async function handleFile(file) {
    const feedback = _shadow.getElementById('upload-feedback');
    feedback.innerText = 'Procesando...';
    
    try {
      let res;
      if (file.type.startsWith('image/')) {
         feedback.innerText = 'Comprimiendo imagen...';
         res = await BA.ImageManager.saveFromFile(file);
      } else {
         throw new Error('Formato no soportado');
      }
      feedback.innerText = '¡Aplicando...!';
      applyResource(res);
    } catch (e) {
      feedback.innerText = 'Error: ' + e.message;
      setTimeout(() => { feedback.innerText = ''; }, 3000);
    }
  }

  function applyResource(res) {
    chrome.storage.local.get(['courseConfig'], (data) => {
       const config = data.courseConfig || {};
       config[_courseId] = res;
       chrome.storage.local.set({ courseConfig: config }, () => {
          BA.ImageManager.apply(_courseId, res);
          closePicker();
       });
    });
  }

  // Export public API
  BA.ImagePicker = {
    open: openPicker,
    close: closePicker
  };

})(window.BetterAula = window.BetterAula || {});
