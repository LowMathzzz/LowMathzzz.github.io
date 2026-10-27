# lowmath.dev

Portfolio de **Mateo Loechle**, Software Engineer (Backend & Mobile) en Lima, Perú.

**→ [lowmath.dev](https://lowmath.dev)**

## Qué es

Una página estática con mi perfil, proyectos, tecnologías y trayectoria. El fondo es un acuario en pixel art que se recorre con el scroll: los peces nadan en cardumen, comen si haces clic, huyen del cursor y el cielo sigue la hora real de quien visita la página (día y noche).

Está hecho a mano, sin frameworks ni dependencias.

## Tecnologías

- **HTML, CSS y JavaScript** sin paso de build
- **Canvas 2D** para el pixel art generado por código (peces, plantas, cielo)
- **WebGL (GLSL)** para el agua, la luz, las cáusticas y el vidrio
- Español e inglés, tema día/noche y botón para pausar la animación

## Rendimiento

- Los sprites se generan en ratos libres, sin bloquear la carga
- Modo liviano automático en móviles y equipos modestos (30 fps, sin desenfoques)
- ~55 KB comprimidos en total

## Estructura

```
index.html        contenido (español por defecto)
css/styles.css    estilos
js/sprites.js     generadores de sprites pixel art
js/sea.js         motor del fondo: agua, cielo, peces y efectos
js/app.js         idioma, navegación, tema y sección de tecnologías
```

## Correr en local

```bash
python -m http.server 5173
```

Luego abre http://localhost:5173.
