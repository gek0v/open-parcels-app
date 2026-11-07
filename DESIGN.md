# 🎨 Open Parcels — Sistema de Diseño Neo-Brutalista (Design System)

Inspirado en las referencias visuales de diseño brutalista y neo-brutalismo aplicadas a interfaces móviles de alta conversión y paquetería técnica.

---

## 1. Principios de Diseño Clave

1. **Bordes Negros Marcados (Heavy Outlines):**
   - Todos los contenedores, botones, inputs y tarjetas tienen bordes negros de `2.5px` sólidos (`#000000`). Cero sutilezas o bordes difuminados.

2. **Sombras Duras sin Desenfoque (Hard Drop Shadows):**
   - Desplazamiento rígido a 45º: `4px 4px 0px #000000` (o `5px 5px 0px #000000`). Cero radio de desenfoque (`blur: 0`).
   - Al pulsar un botón, la sombra se reduce a `0px` y el elemento se desplaza `+2px, +2px` para simular un clic mecánico táctil real.

3. **Paleta Cromática de Alto Impacto (Punchy Neo-Brutalist Palette):**
   - **Canvas Principal (App Background):** Acid Lime (`#D6FF38` / `#CEFF1A`), enérgico y memorable.
   - **Superficies Modulares (Cards):**
     - Primary White: `#FFFFFF` (para lectura clara de información).
     - Cyber Yellow: `#FFE600` (resaltados, InPost, alertas).
     - Electric Blue: `#3B82F6` (tránsito, transportistas aéreos).
     - Neon Tangerine / Coral: `#FF5733` (en reparto, acciones clave).
     - Mint Fresh: `#10B981` (entregado).
     - Electric Violet: `#7C3AED` (pre-registros, branding Open Parcels).
     - Deep Pitch Black: `#000000` (bordes, tipografía pesada, sombras).

4. **Metáforas Visuales de Logística & OS Retro (Industrial Artifacts):**
   - **Window Header & Dot Buttons:** Cabeceras de tarjeta estilo ventana retro con tres botones de control (`🔴 🟡 🟢`) o barra de título técnica.
   - **Stickers & Badges:** Etiquetas de estado con apariencia de precinto o pegatina de mensajería con borde negro y sombra.
   - **Segmented Block Progress:** Indicador de avance por bloques o barra contrastada con borde de caja.
   - **Tipografía Expresiva:** Titulares en Black Sans-Serif gruesa, combinados con fuentes monospaced para números de albarán, códigos postales y tracking UPU/UPS.

---

## 2. Tokens del Sistema

```typescript
export const Theme = {
  colors: {
    background: '#D9FF38',       // Acid Lime canvas
    backgroundSubtle: '#ECFF82',
    surface: '#FFFFFF',
    surfaceSubtle: '#F4F4EB',
    surfaceElevated: '#FFE600',
    black: '#000000',
    yellow: '#FFE600',
    coral: '#FF5C38',
    blue: '#2563EB',
    purple: '#7C3AED',
    mint: '#10B981',
    pink: '#F472B6',
  },
  borders: { width: 2.5, thin: 2, color: '#000000' },
  radius: { xs: 4, sm: 8, md: 14, lg: 20, full: 9999 },
  shadows: {
    sm: hardShadow(2.5), // 2.5px 2.5px 0px #000000
    md: hardShadow(4),   // 4px   4px   0px #000000
    lg: hardShadow(5),   // 5px   5px   0px #000000
    none: noShadow(),    // estado presionado
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    ...noShadow(),
  },
};
```

### Escala canónica de sombras

| Token | Desplazamiento | Uso |
| --- | --- | --- |
| `shadows.sm` | `2.5px 2.5px 0px #000000` | Badges de estado, chips de transportista, botones de icono, navegación y acciones secundarias. |
| `shadows.md` | `4px 4px 0px #000000` | Tarjetas, inputs, botones de ancho completo y CTAs. |
| `shadows.lg` | `5px 5px 0px #000000` | FAB, diálogos, hojas modales y elementos flotantes. |
| `pressed` | `translate(2px, 2px)` + sombra `0` | Hundimiento mecánico de cualquier control al pulsar. |

### Implementación por plataforma (sin desenfoque)

- **Web:** `boxShadow: '4px 4px 0px #000000'` (CSS puro, borde de sombra perfectamente nítido).
- **iOS:** `shadowColor: '#000000'`, `shadowOffset: { width: 4, height: 4 }`, `shadowOpacity: 1`, `shadowRadius: 0`.
- **Android:** `boxShadow` de la New Architecture (React Native 0.76+). Nunca `elevation`: siempre genera un halo difuso y rompe el estilo.
- **Press:** la sombra se colapsa a `0px` y el control se desplaza `+2px / +2px`, como una tecla mecánica real.

### Reglas de composición

1. **Un solo lenguaje de sombra:** ninguna sombra usa blur ni colores distintos al negro puro.
2. **Jerarquía clara:** los elementos pequeños nunca usan `md`/`lg`; las tarjetas nunca usan `sm`.
3. **Contraste tipográfico:** titulares `900`, etiquetas/captions `800`, cuerpo `600–700`. Los metadatos usan monoespaciada.
4. **Stickers armonizados:** los badges de estado y chips comparten radio, borde negro y sombra `sm`; el color comunica el estado, no la forma.
5. **Orden en móvil y web:** el contenido mantiene un ancho máximo legible en web (columna centrada) y los márgenes laterales se mantienen en `20px`.
```
