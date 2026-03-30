// ==========================================
// SCRIPT DE INYECCIÓN TEMPRANA (ANTI-FOUC)
// Ejecutado en document_start (antes del body)
// ==========================================

function calculateDynamicColors(hexBg, hexAccent, hexNav) {
    const hex2rgb = (hex) => {
        let v = (hex || '').replace('#', '');
        if (v.length === 3) v = v.split('').map(c => c + c).join('');
        const num = parseInt(v, 16) || 0;
        return [num >> 16, (num >> 8) & 255, num & 255];
    };
    
    const bgRgb = hex2rgb(hexBg);
    const luminance = (bgRgb[0] * 299 + bgRgb[1] * 587 + bgRgb[2] * 114) / 1000;
    const autoText = luminance > 128 ? '#212529' : '#ffffff';
    
    let navText = '#ffffff';
    if (hexNav) {
        const navRgb = hex2rgb(hexNav);
        const navLuminance = (navRgb[0] * 299 + navRgb[1] * 587 + navRgb[2] * 114) / 1000;
        navText = navLuminance > 128 ? '#212529' : '#ffffff';
    }
    
    const accentRgb = hex2rgb(hexAccent);
    const accentRgbStr = `${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}`;
    
    return { autoText, accentRgbStr, navText };
}

function applyInitialTheme(result) {
    const root = document.documentElement;
    
    // 1. Temas y Colores Custom
    if (result.uiThemeConfig && result.uiThemeConfig.colors) {
        const colors = result.uiThemeConfig.colors;
        root.style.setProperty('--ba-bg', colors.bg);
        root.style.setProperty('--ba-nav', colors.nav);
        root.style.setProperty('--ba-accent', colors.accent);
        root.style.setProperty('--ba-card-border', colors.border || colors.bg);
        root.style.setProperty('--ba-text-primary', colors.text || '#1a202c');
        
        const dynamics = calculateDynamicColors(colors.bg, colors.accent, colors.nav);
        root.style.setProperty('--ba-text-nav', dynamics.navText);
        root.style.setProperty('--ba-auto-text', dynamics.autoText);
        root.style.setProperty('--ba-accent-rgb', dynamics.accentRgbStr);
    }
    
    // 2. Dark Mode Evaluator (Ejecución cero milisegundos)
    if (result.darkModeConfig) {
        const config = result.darkModeConfig;
        if (config.mode === 'on') {
            root.classList.add('ba-dark-mode');
        } else if (config.mode === 'auto') {
            const now = new Date();
            const current = now.getHours() * 60 + now.getMinutes();
            const [startH, startM] = config.start.split(':').map(Number);
            const start = startH * 60 + startM;
            const [endH, endM] = config.end.split(':').map(Number);
            const end = endH * 60 + endM;
            
            let isDark = false;
            if (start < end) {
                isDark = current >= start && current < end;
            } else { // Pasa la medianoche
                isDark = current >= start || current < end;
            }
            if (isDark) root.classList.add('ba-dark-mode');
        }
    }
}

// Wrapper Cross-Browser para API Storage de extensiones (Chromium/Firefox)
const storageApi = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

// Disparamos la lectura a DB de la extensión en cuanto compila el script
storageApi.local.get(['uiThemeConfig', 'darkModeConfig'], applyInitialTheme);
