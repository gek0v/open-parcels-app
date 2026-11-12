# Critique: Dashboard & Parcel Detail Screens (Open Parcels)

Method: design review only (detector not applicable, native platform)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Estados canónicos claros; falta indicador persistente del estado de background sync en el Dashboard |
| 2 | Match System / Real World | 4 | Metáforas de albarán, precinto retro y terminal logístico ejecutadas con gran fidelidad |
| 3 | User Control and Freedom | 3 | Archivar, renombrar y filtrar operan bien; falta acción rápida de deshacer al archivar |
| 4 | Consistency and Standards | 2 | ParcelDetailScreen no está conectado a useTheme(); botones de 16-36dp violan estándares HIG y Material 3 |
| 5 | Error Prevention | 3 | Agrupación excesivamente densa de iconos en cabecera de detalle propicia pulsaciones accidentales |
| 6 | Recognition Rather Than Recall | 4 | Badges por color áureo, visualización clara del transportista y timeline de relevo |
| 7 | Flexibility and Efficiency | 3 | Modos de tarjeta Bento/Industrial/Retro aportan versatilidad; faltan gestos de deslizamiento |
| 8 | Aesthetic and Minimalist Design | 3 | Fuerte personalidad neo-brutalista pero penalizada por micro-botones de 9pt en cabeceras |
| 9 | Error Recovery | 3 | Manejo de errores por diálogo modal ante fallos de conexión o transportistas |
| 10 | Help and Documentation | 3 | Controles intuitivos; el toggle de motor REST/Local necesita mejor aclaración de estado |
| **Total** | | **31/40** | **Sólido (Requiere endurecimiento ergonómico nativo)** |

---

## Design Specificity Verdict

- **LLM assessment**: La interfaz de Open Parcels posee una personalidad estética inconfundible y profundamente arraigada en el producto (diseño neo-brutalista industrial, stickers técnicos y paletas áureas de alto impacto). No se confunde con una app genérica de paquetería. Sin embargo, su traslación a ergonomía táctil móvil presenta compromisos severos: se diseñó pensando en estética visual de escritorio/tarjetas antes que en las restricciones del pulgar en movimiento bajo luz natural.
- **Deterministic scan**: Not applicable (native platform).

---

## Overall Impression

El lenguaje visual es potente, audaz y sumamente atractivo. Sin embargo, sufre de "micro-componentitis" en las áreas interactivas (botones de menos de 20dp de altura y fuentes de 9pt) y una ruptura de consistencia crítica: la pantalla de detalle quedó descolgada del nuevo sistema reactivo de temas (`ThemeContext`), permaneciendo estática frente a los cambios de paleta del usuario.

---

## What's Working

1. **Bento Grid & Tarjetas Modulares:** Las variantes Bento, Industrial y RetroOS le dan a la aplicación una identidad distintiva que destaca sobre cualquier competidor.
2. **Timeline de Relevo (Multi-Carrier Journey):** La visualización gráfica del traspaso de paquetes internacionales a operadores locales comunica con gran claridad la cadena de custodia.
3. **Contraste de los Canvas Áureos:** La selección de Acid Lime (#D9FF38) y Cyber Yellow sobre tipografías negras pesadas garantiza visibilidad sobresaliente en exteriores.

---

## Priority Issues

- **[P0] Áreas táctiles críticas subdimensionadas (<48dp):**
  - *Problema*: Los botones de cabecera (`engineToggle`, `langToggleBtn`, `Palette`) tienen ~16-20dp de altura y en `ParcelDetailScreen` los botones de acción tienen solo 36x36dp con 6dp de separación.
  - *Impacto*: Incumplimiento estricto de Material Design 3 (48x48dp) y Apple HIG (44x44pt). Frustración y fallos de pulsación continuos con una sola mano.
  - *Fix*: Expandir el `hitSlop` y refactorizar a áreas de toque de al menos 48x48dp o convertirlos en una barra de utilidades unificada.
  - *Comando*: `/impeccable adapt` y `/impeccable layout`.

- **[P0] Pérdida de reactividad de temas en `ParcelDetailScreen`:**
  - *Problema*: `ParcelDetailScreen.tsx` utiliza `Theme.colors.background` estático en lugar de consumir `useTheme()`.
  - *Impacto*: Cuando el usuario cambia de paleta en el Dashboard (ej. a Dark Cyber o Monocromo), al entrar a un paquete los colores se desincronizan.
  - *Fix*: Inyectar `useTheme()` y enlazar los tokens dinámicos de superficie, bordes y fondo.
  - *Comando*: `/impeccable polish`.

- **[P1] Micro-tipografía (9pt) y riesgo de rotura por Dynamic Type:**
  - *Problema*: Etiquetas informativas y botones tienen `fontSize: 9` en hardcoded px.
  - *Impacto*: Si el usuario activa fuentes grandes de accesibilidad en el sistema, el texto se solapará o quedará ilegible.
  - *Fix*: Subir la escala mínima a 11-12sp con `allowFontScaling` y contenedor flexible.
  - *Comando*: `/impeccable typeset`.

- **[P1] Inconsistencias en espesores de borde y sombras mecánicas:**
  - *Problema*: Se alternan bordes de 1.5px, 2px, 2.5px y 3px sin una convención de tokens rigurosa.
  - *Impacto*: Pérdida de coherencia en el sistema neo-brutalista.
  - *Fix*: Unificar bajo los tokens `Theme.borders.width` (`2.5px`) y `Theme.borders.thin` (`2px`).
  - *Comando*: `/impeccable distill`.

---

## Persona Red Flags

- **David (Usuario en Movimiento / Exteriores)**: Al intentar consultar su paquete mientras camina bajo el sol, los botones de 36px en la esquina superior derecha de la pantalla de detalle son demasiado pequeños. Al intentar pulsar "Actualizar" toca accidentalmente "Editar Alias" o "Archivar".
- **Elena (Compradora Frecuente / Configuración de Accesibilidad)**: Tiene el tamaño de texto del sistema aumentado al 130%. Los micro-textos de 9pt en los botones de cabecera del Dashboard quedan cortados o se desbordan de sus cajas.

---

## Questions to Consider

- ¿Deberían moverse los controles de utilidad del Dashboard (idioma, motor, tema) a una pantalla dedicada o cajón de ajustes para despejar la cabecera del listado?
- ¿Podría el detalle del paquete adoptar una acción primaria flotante (FAB) o botón grande inferior para la actualización de tracking, en lugar de un micro-icono en la barra superior?
