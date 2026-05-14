# Better Aula

**Personalización para el Moodle de la USM.**

![Version](https://img.shields.io/badge/Versión-1.0.0-blue)
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

Better Aula es un proyecto mantenido por y para la comunidad estudiantil. Si deseas colaborar con el desarrollo, optimizar código o integrar nuevas características, eres más que bienvenid@.

*   Si encuentras un error, por favor abre un **Issue** documentando los pasos para reproducirlo.
*   Si deseas contribuir con código, siéntete libre de hacer un fork del repositorio y enviar un **Pull Request**. Asegúrate de mantener un estilo de código limpio.

## Apoya el Proyecto

El desarrollo, mantenimiento y soporte continuo de Better Aula requiere tiempo y esfuerzo. Si esta herramienta ha mejorado tu experiencia diaria en el estudio y deseas apoyar su desarrollo continuo, puedes realizar una donación.

[Apoya el proyecto aquí](https://link.mercadopago.cl/donacionbetteraula)

## Licencia y Créditos

**Desarrollado por Mauro Castillo.**

Este proyecto se distribuye bajo la [Licencia MIT](LICENSE). Eres libre de utilizar, modificar y distribuir este software, siempre y cuando se incluya la nota de derechos de autor y la licencia original.
