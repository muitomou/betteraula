const fs = require('fs');
const path = require('path');

const files = [
  { name: 'content.js', desc: 'Orquestador principal de módulos inyectados.' },
  { name: 'hidden-courses.js', desc: 'Gestor de ramos ocultos, interactúa directamente con el DOM de Moodle.' },
  { name: 'image-manager.js', desc: 'Gestor de medios mediante IndexedDB para portabilidad.' },
  { name: 'image-picker.js', desc: 'Componente Shadow DOM para galería y subida de imágenes.' },
  { name: 'navbar-injector.js', desc: 'Inyecta el botón de acceso a Better Aula en la navegación nativa de Moodle.' },
  { name: 'theme-engine.js', desc: 'Motor centralizado de temas que aplica colores calculados al :root.' },
  { name: 'theme_injector.js', desc: 'Inyección temprana anti-FOUC para prevenir flashes de color.' }
];

// Regex for emojis
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2122}\u{A9}\u{AE}]/gu;

files.forEach(f => {
  const filePath = path.join(__dirname, f.name);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove old JSDoc or header
  content = content.replace(/\/\*\*[\s\S]*?\*\/\n?/, '');
  // Remove slash-slash header in theme_injector.js
  content = content.replace(/\/\/ =+[\s\S]*?\/\/ =+\n\n/, '');

  // Add new header
  const header = `/**
 * @file ${f.name}
 * @description ${f.desc}
 */\n`;
  content = header + content;

  // Remove emojis
  content = content.replace(emojiRegex, '');

  // Remove obvious comments
  content = content.replace(/\/\/ Obtener elemento.*/g, '');
  content = content.replace(/\/\/ Asignar evento.*/g, '');
  content = content.replace(/\/\/ Retorna la url.*/g, '');
  content = content.replace(/\/\* PASO \d.*/g, '');

  fs.writeFileSync(filePath, content);
});

console.log('Refactoring complete.');
