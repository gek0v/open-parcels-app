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
export const NeoTheme = {
  colors: {
    canvas: '#D8FF38',        // Fondo Acid Lime
    canvasSubtle: '#EDFF85',
    black: '#000000',
    white: '#FFFFFF',
    yellow: '#FFE600',
    coral: '#FF5733',
    blue: '#2563EB',
    purple: '#7C3AED',
    mint: '#059669',
    pink: '#F472B6',
    grayBg: '#F4F4F0',
  },
  borders: {
    thick: 2.5,
    normal: 2,
    color: '#000000',
  },
  shadows: {
    hard: {
      shadowColor: '#000000',
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 6,
    },
    hardSm: {
      shadowColor: '#000000',
      shadowOffset: { width: 2.5, height: 2.5 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
  },
  radius: {
    card: 16,
    badge: 8,
    button: 12,
    pill: 9999,
  }
};
```
