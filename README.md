<p align="center">
  <img src="icon128.png" alt="Better Aula Logo" width="128">
</p>

<h1 align="center">Better Aula</h1>

**Personalización para el Moodle de la USM.**

![Version](https://img.shields.io/badge/Versión-1.1.0-blue)
![License](https://img.shields.io/badge/Licencia-MIT-green)
![Chrome](https://img.shields.io/badge/Plataforma-Chrome-orange)
![Firefox](https://img.shields.io/badge/Plataforma-Firefox-red)

Better Aula es una extensión de navegador construida para transformar y modernizar la experiencia de uso en el sistema Aula (Moodle) de la UTFSM. Su arquitectura está orientada al rendimiento, la estética y la experiencia de usuario, permitiendo un alto grado de personalización visual sin comprometer la fluidez de la plataforma institucional.

## Características Principales

*   **Motor de Temas Avanzado:** Personalización de la paleta de colores de la interfaz, incluyendo la barra de navegación, colores de acento y fondos generales.
*   **Gestión de Temas Personalizados:** Posibilidad de crear, visualizar en tiempo real, guardar localmente y alternar entre distintas configuraciones de color personalizadas.
*   **Modo Oscuro Integrado:** Soporte nativo para modo oscuro, con opciones de activación manual o programación automática basada en horarios.
*   **Gestión de Cursos:** Capacidad para renombrar asignaturas con etiquetas personalizadas y ocultar/mostrar ramos específicos para mantener un panel de control limpio.
*   **Sistema de Fondos Multimedia:** Soporte para personalizar las tarjetas de los cursos utilizando imágenes locales o gradientes de malla (mesh gradients) animados.
*   **Página de inicio de sesión personalizada:** La portada de Aula (la que aparece antes de iniciar sesión) usa tu tema y tu modo oscuro. Puedes cambiar la imagen principal por una tuya o por un gradiente, ocultar el recuadro «¿Nuevo aquí?» y los logos institucionales, y activar un diseño compacto. En esa página, el botón **Better Aula** del menú superior abre el panel. La extensión no lee ni modifica los formularios ni los botones de inicio de sesión.
*   **Optimización de Rendimiento:** Utilización de IndexedDB para el almacenamiento en caché de imágenes y recursos multimedia, garantizando una carga instantánea y reduciendo la redundancia de red.

## Privacidad y Seguridad

La privacidad es un pilar fundamental en la arquitectura de Better Aula. Esta extensión es de **Código Abierto (Open Source)**, lo que permite la auditoría completa de su comportamiento. 

**Better Aula no intercepta, no lee ni almacena credenciales de acceso (contraseñas o tokens).** Todo el procesamiento de datos, preferencias de usuario y almacenamiento de imágenes se realiza **exclusivamente de forma local** en el navegador del usuario utilizando `chrome.storage.local` e `IndexedDB`. La extensión no se comunica con servidores de terceros, a excepción de las peticiones requeridas para cargar imágenes estáticas proporcionadas explícitamente por el usuario.

## Instalación

### Instalación desde Tiendas
*(Próximamente)*
*   [Descargar para Google Chrome]()
*   [Descargar para Mozilla Firefox]()

### Instalación para Desarrolladores
Si deseas compilar la extensión o probarla en modo desarrollador:

1.  Clona o descarga este repositorio en tu máquina local.
2.  Abre Google Chrome y navega a `chrome://extensions/`.
3.  Activa el **Modo de desarrollador** en la esquina superior derecha.
4.  Haz clic en **Cargar descomprimida** y selecciona el directorio raíz de este proyecto.

## Contribución

Better Aula es un proyecto de código abierto mantenido por y para la comunidad estudiantil. Toda ayuda es bienvenida.

### Reportar errores o proponer ideas
*   Abre un **Issue** en el repositorio describiendo qué pasó, los pasos para reproducirlo, el navegador y su versión y, si puedes, una captura (sin datos personales: tapa tu nombre, RUT o correo).

### Contribuir con código
1.  Haz un fork del repositorio y crea una rama descriptiva (`fix/selector-navbar`, `feat/tema-login`, etc.).
2.  Carga la extensión sin empaquetar (ver *Instalación para Desarrolladores*) y prueba tus cambios en Aula.
3.  Mantén el estilo del proyecto: JavaScript sin dependencias, un módulo por responsabilidad bajo el namespace `window.BetterAula`, y nada de `console.log` en el código final.
4.  Nunca leas, guardes ni envíes credenciales, cookies o `sesskey` de Moodle: toda la información debe quedarse en el navegador del usuario.
5.  Abre un **Pull Request** explicando qué cambia y por qué.

## Licencia y Créditos

**Autor original:** Mauro Castillo, quien creó y desarrolló Better Aula.

Gracias a todas las personas que contribuyen con issues y pull requests.

Este proyecto se distribuye bajo la [Licencia MIT](LICENSE). Eres libre de utilizar, modificar y distribuir este software, siempre y cuando se incluya la nota de derechos de autor y la licencia original.
