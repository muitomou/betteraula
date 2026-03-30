// ==========================================
// 1. GESTIÓN DE LA BASE DE DATOS (IndexedDB)
// ==========================================
let db;
const DB_NAME = "AulifyDB";
const STORE_NAME = "customImages";

const initDB = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = () => reject("Error abriendo DB");
});

async function saveImageToDB(id, base64Data) {
    const db = await initDB;
    return new Promise((resolve, reject) => {
        const request = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME).put({ id, data: base64Data });
        request.onsuccess = () => resolve();
        request.onerror = () => reject();
    });
}

async function deleteImageFromDB(id) {
    const db = await initDB;
    return new Promise((resolve, reject) => {
        const request = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME).delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject();
    });
}

async function getAllCustomImages() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].url.includes("aula.usm.cl")) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "getCustomImages" }, function (response) {
                    if (chrome.runtime.lastError) {
                        console.warn("Error enviando mensaje para obtener imágenes:", chrome.runtime.lastError);
                        resolve([]);
                    } else if (response && response.images) {
                        resolve(response.images);
                    } else {
                        resolve([]);
                    }
                });
            } else {
                resolve([]);
            }
        });
    });
}

// ==========================================
// 2. LÓGICA DE LA INTERFAZ
// ==========================================
let currentConfig = {};

document.addEventListener('DOMContentLoaded', async () => {
    chrome.storage.local.get(['courseConfig'], (result) => { currentConfig = result.courseConfig || {}; });
    await loadCustomImagesToGrid();

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0].url.includes("aula.usm.cl")) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "getCourses" }, function (response) {
                if (response && response.courses) populateSelect(response.courses);
            });
        }
    });
    setupImageClicks();
});

function populateSelect(courses) {
    const select = document.getElementById('courseSelect');
    select.innerHTML = '<option value="global">Aplicar a Todos los ramos</option>';
    courses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
    select.addEventListener('change', updateSelectionUI);
    if (typeof renderHiddenCourses === 'function') {
        chrome.storage.local.get(['hiddenCourses'], res => renderHiddenCourses(res.hiddenCourses || []));
    }
}

function updateSelectionUI() {
    const selectedCourse = document.getElementById('courseSelect').value;
    const activeImageId = currentConfig[selectedCourse] || currentConfig['global'] || 'images/default1.png';
    document.querySelectorAll('.option').forEach(img => {
        img.classList.remove('selected');
        if (img.id === activeImageId) img.classList.add('selected');
    });
}

function setupImageClicks() {
    document.getElementById('imageGrid').addEventListener('click', (e) => {
        if (e.target.classList.contains('option')) {
            const selectedCourse = document.getElementById('courseSelect').value;
            const imageId = e.target.id;

            // FIX: Si aplicamos a todos, borramos las configuraciones de ramos individuales
            if (selectedCourse === 'global') {
                currentConfig = { 'global': imageId };
            } else {
                currentConfig[selectedCourse] = imageId;
            }

            chrome.storage.local.set({ courseConfig: currentConfig }, () => updateSelectionUI());
        }
    });
}

// ==========================================
// 3. SUBIDA Y COMPRESIÓN DE IMÁGENES
// ==========================================
document.getElementById('imageUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        compressImage(event.target.result, 800, async (compressedBase64) => {
            const customId = "custom_" + Date.now();
            await saveImageToDB(customId, compressedBase64);
            addImageToGrid(customId, compressedBase64);

            const selectedCourse = document.getElementById('courseSelect').value;
            // FIX: Respetar la lógica global también al subir foto nueva
            if (selectedCourse === 'global') {
                currentConfig = { 'global': customId };
            } else {
                currentConfig[selectedCourse] = customId;
            }

            chrome.storage.local.set({ courseConfig: currentConfig }, () => updateSelectionUI());
        });
    };
    reader.readAsDataURL(file);
});

function compressImage(base64Str, maxWidth, callback) {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.8));
    };
}

async function loadCustomImagesToGrid() {
    const customImages = await getAllCustomImages();
    customImages.forEach(imgData => addImageToGrid(imgData.id, imgData.data));
    updateSelectionUI();
}

function addImageToGrid(id, base64Data) {
    const grid = document.getElementById('imageGrid');

    const container = document.createElement('div');
    container.className = 'item-container';
    container.id = 'container_' + id;

    const img = document.createElement('img');
    img.src = base64Data;
    img.className = 'option custom-img';
    img.id = id;
    img.title = "Tu Imagen Personalizada";

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-badge';
    delBtn.innerHTML = '&#10005;'; // X sym
    delBtn.title = 'Eliminar imagen';
    delBtn.onclick = async (e) => {
        e.stopPropagation();
        await deleteImageFromDB(id);
        container.remove();

        let changed = false;
        for (let key in currentConfig) {
            if (currentConfig[key] === id) {
                currentConfig[key] = 'images/default1.jpg';
                changed = true;
            }
        }
        if (changed) {
            chrome.storage.local.set({ courseConfig: currentConfig }, () => updateSelectionUI());
        }
    };

    container.appendChild(img);
    container.appendChild(delBtn);
    grid.appendChild(container);
}

// ==========================================
// 4. MOTOR DE TEMAS (FASE 2)
// ==========================================
const THEMES = {
    usm: { bg: '#f7fafc', nav: '#2d3748', accent: '#3182ce', border: '#e2e8f0', text: '#1a202c', navText: '#ffffff' },
    ocean: { bg: '#f0f9ff', nav: '#0f172a', accent: '#0ea5e9', border: '#bae6fd', text: '#0f172a', navText: '#ffffff' },
    forest: { bg: '#f0fdf4', nav: '#064e3b', accent: '#10b981', border: '#a7f3d0', text: '#064e3b', navText: '#ffffff' },
    sunset: { bg: '#fff7ed', nav: '#7c2d12', accent: '#f97316', border: '#fed7aa', text: '#431407', navText: '#ffffff' },
    pink: { bg: '#FFF5F7', nav: '#FFE0E6', accent: '#FFB6C1', border: '#FFC5D3', text: '#831843', navText: '#000000' },
    purple: { bg: '#F5F3FF', nav: '#EDE9FE', accent: '#8B5CF6', border: '#DDD6FE', text: '#4C1D95', navText: '#000000' },
    celeste: { bg: '#F0F8FF', nav: '#E0F2FE', accent: '#38BDF8', border: '#BAE6FD', text: '#0C4A6E', navText: '#000000' },
    coffee: { bg: '#FEF3C7', nav: '#FDE68A', accent: '#F59E0B', border: '#FCD34D', text: '#78350F', navText: '#000000' },
    custom: null // Placeholder
};

let currentTheme = { id: 'usm', colors: THEMES.usm };
let savedThemes = [];

function initThemeConfig() {
    chrome.storage.local.get(['uiThemeConfig', 'savedCustomThemes'], (result) => {
        if (result.uiThemeConfig) currentTheme = result.uiThemeConfig;
        if (result.savedCustomThemes) savedThemes = result.savedCustomThemes;
        updateThemeUI();
        renderSavedThemes();
    });

    // Listeners para paletas predefinidas
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const themeId = e.target.getAttribute('data-theme');
            currentTheme = { id: themeId, colors: THEMES[themeId] };
            saveAndApplyTheme(false);
        });
    });

    // Listeners para colores personalizados (Hex Input)
    const inputNav = document.getElementById('themeNav');
    const inputAccent = document.getElementById('themeAccent');
    const inputBg = document.getElementById('themeBg');

    const prevNav = document.getElementById('previewNav');
    const prevAccent = document.getElementById('previewAccent');
    const prevBg = document.getElementById('previewBg');

    const updateCustomTheme = (e) => {
        if (e && e.target.value && !e.target.value.startsWith('#')) {
            e.target.value = '#' + e.target.value;
        }

        const navCol = inputNav.value || '#2d3748';
        const accCol = inputAccent.value || '#3182ce';
        const bgCol = inputBg.value || '#f7fafc';
        
        const hex2rgb = (hex) => { let v = (hex||'').replace('#',''); if(v.length===3)v=v.split('').map(c=>c+c).join(''); const n=parseInt(v,16)||0; return [n>>16,(n>>8)&255,n&255]; };
        const bgR=hex2rgb(bgCol), navR=hex2rgb(navCol);
        const bgLuma = (bgR[0]*299 + bgR[1]*587 + bgR[2]*114)/1000;
        const navLuma = (navR[0]*299 + navR[1]*587 + navR[2]*114)/1000;

        currentTheme = {
            id: 'custom',
            colors: {
                nav: navCol,
                accent: accCol,
                bg: bgCol,
                border: bgCol,
                text: bgLuma > 128 ? '#1a202c' : '#ffffff',
                navText: navLuma > 128 ? '#212529' : '#ffffff'
            }
        };

        // Sincronizar previsualizadores visuales
        prevNav.style.backgroundColor = navCol;
        prevAccent.style.backgroundColor = accCol;
        prevBg.style.backgroundColor = bgCol;

        saveAndApplyTheme(true);
    };

    inputNav.addEventListener('input', updateCustomTheme);
    inputAccent.addEventListener('input', updateCustomTheme);
    inputBg.addEventListener('input', updateCustomTheme);

    // Botón para guardar el tema actual
    document.getElementById('saveThemeBtn').addEventListener('click', () => {
        const newThemeId = 'custom_' + Date.now();
        const navCol = inputNav.value;
        const bgCol = inputBg.value;
        
        const hex2rgb = (hex) => { let v = (hex||'').replace('#',''); if(v.length===3)v=v.split('').map(c=>c+c).join(''); const n=parseInt(v,16)||0; return [n>>16,(n>>8)&255,n&255]; };
        const bgR=hex2rgb(bgCol), navR=hex2rgb(navCol);
        const bgLuma = (bgR[0]*299 + bgR[1]*587 + bgR[2]*114)/1000;
        const navLuma = (navR[0]*299 + navR[1]*587 + navR[2]*114)/1000;
        
        const newTheme = {
            id: newThemeId,
            colors: {
                nav: navCol,
                accent: inputAccent.value,
                bg: bgCol,
                border: bgCol,
                text: bgLuma > 128 ? '#1a202c' : '#ffffff',
                navText: navLuma > 128 ? '#212529' : '#ffffff'
            }
        };

        savedThemes.push(newTheme);
        chrome.storage.local.set({ savedCustomThemes: savedThemes }, () => {
            currentTheme = newTheme;
            saveAndApplyTheme(true);
            renderSavedThemes();
        });
    });
}

function updateThemeUI(isFromPicker = false) {
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    if (currentTheme.id !== 'custom') {
        const activeBtn = document.querySelector(`.theme-btn[data-theme="${currentTheme.id}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    if (!isFromPicker) {
        document.getElementById('themeNav').value = currentTheme.colors.nav;
        document.getElementById('themeAccent').value = currentTheme.colors.accent;
        document.getElementById('themeBg').value = currentTheme.colors.bg;

        document.getElementById('previewNav').style.backgroundColor = currentTheme.colors.nav;
        document.getElementById('previewAccent').style.backgroundColor = currentTheme.colors.accent;
        document.getElementById('previewBg').style.backgroundColor = currentTheme.colors.bg;
    }
}

function renderSavedThemes() {
    const section = document.getElementById('savedThemesSection');
    const grid = document.getElementById('savedThemeGrid');
    grid.innerHTML = '';

    if (savedThemes.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    savedThemes.forEach(theme => {
        const container = document.createElement('div');
        container.className = 'theme-container';

        const btn = document.createElement('button');
        btn.className = 'theme-btn';
        if (currentTheme.id === theme.id) btn.classList.add('active');

        btn.style.background = `linear-gradient(135deg, ${theme.colors.nav}, ${theme.colors.accent})`;
        btn.title = "Tema Personalizado";

        btn.onclick = () => {
            currentTheme = { id: theme.id, colors: theme.colors };
            saveAndApplyTheme(false);
            renderSavedThemes();
            updateThemeUI();
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-badge';
        delBtn.innerHTML = '&#10005;'; // X
        delBtn.title = 'Eliminar tema';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            savedThemes = savedThemes.filter(t => t.id !== theme.id);
            chrome.storage.local.set({ savedCustomThemes: savedThemes }, () => {
                if (currentTheme.id === theme.id) {
                    currentTheme = { id: 'usm', colors: THEMES['usm'] };
                    saveAndApplyTheme(false);
                }
                renderSavedThemes();
                updateThemeUI();
            });
        };

        container.appendChild(btn);
        container.appendChild(delBtn);
        grid.appendChild(container);
    });
}

function saveAndApplyTheme(isFromPicker = false) {
    updateThemeUI(isFromPicker);
    renderSavedThemes(); // update active state on saved themes
    chrome.storage.local.set({ uiThemeConfig: currentTheme });
}

document.addEventListener('DOMContentLoaded', initThemeConfig);

// ==========================================
// 5. MODO OSCURO PROGRAMABLE (FASE 3)
// ==========================================
let currentDarkMode = { mode: 'off', start: '20:00', end: '07:00' };

function initDarkModeConfig() {
    chrome.storage.local.get(['darkModeConfig'], (result) => {
        if (result.darkModeConfig) currentDarkMode = result.darkModeConfig;
        updateDarkModeUI();
    });

    const selectMode = document.getElementById('darkModeSelect');
    const inputStart = document.getElementById('timeStart');
    const inputEnd = document.getElementById('timeEnd');

    const saveDarkMode = () => {
        currentDarkMode = {
            mode: selectMode.value,
            start: inputStart.value,
            end: inputEnd.value
        };
        updateDarkModeUI();
        chrome.storage.local.set({ darkModeConfig: currentDarkMode });
    };

    selectMode.addEventListener('change', saveDarkMode);
    inputStart.addEventListener('change', saveDarkMode);
    inputEnd.addEventListener('change', saveDarkMode);
}

function updateDarkModeUI() {
    document.getElementById('darkModeSelect').value = currentDarkMode.mode;
    document.getElementById('timeStart').value = currentDarkMode.start;
    document.getElementById('timeEnd').value = currentDarkMode.end;

    const timeContainer = document.getElementById('autoTimeContainer');
    if (currentDarkMode.mode === 'auto') {
        timeContainer.style.display = 'block';
    } else {
        timeContainer.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', initDarkModeConfig);

// ==========================================
// 6. INLINE COLOR PICKER (Mini Canvas)
// ==========================================
let activeColorTarget = null;

function initInlineColorPicker() {
    const canvas = document.getElementById('colorCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Gradiente de Matiz (Hue)
    const hueGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    hueGradient.addColorStop(0, "rgb(255,0,0)");
    hueGradient.addColorStop(0.17, "rgb(255,255,0)");
    hueGradient.addColorStop(0.33, "rgb(0,255,0)");
    hueGradient.addColorStop(0.5, "rgb(0,255,255)");
    hueGradient.addColorStop(0.67, "rgb(0,0,255)");
    hueGradient.addColorStop(0.83, "rgb(255,0,255)");
    hueGradient.addColorStop(1, "rgb(255,0,0)");
    ctx.fillStyle = hueGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gradiente de Luminosidad (Lightness/Darkness)
    const litGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    litGradient.addColorStop(0, "rgba(255,255,255,1)");
    litGradient.addColorStop(0.5, "rgba(255,255,255,0)");
    litGradient.addColorStop(0.5, "rgba(0,0,0,0)");
    litGradient.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = litGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pickerDiv = document.getElementById('inlineColorPicker');
    const closeBtn = document.getElementById('closePickerBtn');

    const pickColor = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        // Convert to HEX
        const hex = "#" + ("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);

        if (activeColorTarget) {
            const inputEl = document.getElementById(activeColorTarget);
            inputEl.value = hex;
            inputEl.dispatchEvent(new Event('input'));
        }
    };

    let isDragging = false;
    canvas.addEventListener('mousedown', (e) => { isDragging = true; pickColor(e); });
    canvas.addEventListener('mousemove', (e) => { if (isDragging) pickColor(e); });
    window.addEventListener('mouseup', () => { isDragging = false; });

    closeBtn.addEventListener('click', () => {
        pickerDiv.style.display = 'none';
        activeColorTarget = null;
    });

    // Bind to the new visual previews
    ['Nav', 'Accent', 'Bg'].forEach(type => {
        const prev = document.getElementById('preview' + type);
        prev.style.cursor = 'crosshair';
        prev.title = "Haz clic para abrir el cuentagotas visual";
        prev.addEventListener('click', (e) => {
            activeColorTarget = 'theme' + type;
            const rect = prev.getBoundingClientRect();
            pickerDiv.style.display = 'block';
            // Ubicar debajo del recuadro cliqueado
            pickerDiv.style.top = (rect.bottom + window.scrollY + 8) + 'px';
            pickerDiv.style.left = '40px';
        });
    });
}

document.addEventListener('DOMContentLoaded', initInlineColorPicker);

// ==========================================
// 7. GESTIÓN DE RAMOS OCULTOS
// ==========================================
function initHiddenCourses() {
    chrome.storage.local.get(['hiddenCourses'], (res) => {
        renderHiddenCourses(res.hiddenCourses || []);
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.hiddenCourses) {
            renderHiddenCourses(changes.hiddenCourses.newValue || []);
        }
    });
}

function renderHiddenCourses(hiddenArray) {
    const list = document.getElementById('hiddenCoursesList');
    const msg = document.getElementById('noHiddenMsg');
    if (!list) return;

    list.innerHTML = '';
    
    if (hiddenArray.length === 0) {
        msg.style.display = 'block';
        return;
    }
    
    msg.style.display = 'none';

    hiddenArray.forEach(courseId => {
        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: 'white', padding: '8px', borderRadius: '6px',
            border: '1px solid #e2e8f0', fontSize: '13px'
        });

        const nameSpan = document.createElement('span');
        nameSpan.innerText = `Ramo ${courseId}`;
        nameSpan.style.color = '#4a5568';
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.maxWidth = '210px';
        nameSpan.style.whiteSpace = 'nowrap';
        nameSpan.style.overflow = 'hidden';
        nameSpan.style.textOverflow = 'ellipsis';
        
        const select = document.getElementById('courseSelect');
        if (select) {
            for (let opt of select.options) {
                if (opt.value === courseId) {
                    nameSpan.innerText = opt.textContent;
                    break;
                }
            }
        }

        const btn = document.createElement('button');
        btn.innerHTML = 'Mostrar';
        Object.assign(btn.style, {
            backgroundColor: '#48bb78', color: 'white', border: 'none',
            borderRadius: '4px', padding: '4px 8px', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '11px'
        });

        btn.onclick = () => {
            chrome.storage.local.get(['hiddenCourses'], (res) => {
                let current = res.hiddenCourses || [];
                let updated = current.filter(id => id !== courseId);
                chrome.storage.local.set({ hiddenCourses: updated });
            });
        };

        row.appendChild(nameSpan);
        row.appendChild(btn);
        list.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', initHiddenCourses);