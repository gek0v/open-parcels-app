# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Usuarios particulares y compradores frecuentes en plataformas de comercio electrónico (AliExpress, InPost, Amazon, Correos, etc.) que necesitan rastrear envíos de múltiples operadores logísticos de forma rápida, privada y fiable, tanto en movimiento como en exteriores (luz solar directa).

## Product Purpose

Open Parcels Mobile es un cliente universal de seguimiento de envíos con arquitectura Local-First. Su objetivo es proporcionar visibilidad instantánea y sin fricción de estados de paquetería, deduplicando hitos entre transportistas internacionales y locales (Multi-Carrier Journey), eliminando dependencias obligatorias de la nube o cuentas de usuario.

## Positioning

A diferencia de apps comerciales con publicidad, rastreadores basados en web o servicios centralizados que requieren registrar correos y venden datos de consumo, Open Parcels opera con un motor embebido de alta velocidad (Go Core emulado y compatibilidad con daemon REST local/remoto), validación matemática de checksums (UPU S10, UPS 1Z, IATA AWB) y almacenamiento persistente local en el propio dispositivo.

## Operating Context

- **Entorno de uso:** Móvil (Android e iOS), frecuentemente en movimiento, con una sola mano, bajo condiciones variables de luz exterior.
- **Flujos clave:** 
  1. Pegado rápido de códigos desde portapapeles o escaneo mediante cámara (códigos de barras 1D/2D).
  2. Consulta visual de estado en segundos mediante códigos cromáticos y badges de alto contraste.
  3. Inspección detallada del relevo entre operadores logísticos (Cainiao -> Correos Express, etc.).
  4. Sincronización en segundo plano sin consumo abusivo de batería ni falsas alertas.

## Capabilities and Constraints

- **Arquitectura Local-First:** Persistencia SQLite / AsyncStorage y motor de deduplicación embebido.
- **Enfoque Visual Híbrido:** Base gráfica Neo-Brutalista de alto impacto visual (bordes marcados, sombras rígidas mecánicas, paletas áureas como *Acid Cyber*), pero respetando componentes e interacciones nativas de la plataforma (Human Interface Guidelines en iOS y Material You en Android).
- **Parámetros condicionales por transportista:** Requisito de Código Postal dinámico según operador (InPost, Mondial Relay, CTT).
- **Multi-paleta dinámica:** Capacidad de alternar paletas basadas en el ángulo áureo preservando los tokens del sistema.

## Brand Commitments

- **Identidad:** Técnica, utilitaria, audaz y mecánica (industrial/retro logistics).
- **Legibilidad:** Prioridad absoluta al contraste (mínimo WCAG AA / AAA) en canvas de colores intensos (Acid Lime, Cyber Yellow).
- **Feedback táctil:** Pulsaciones con desplazamiento mecánico (+2px, +2px con reducción de sombra dura a 0px).

## Evidence on Hand

- Sistema de tokens y paletas áureas documentado en `DESIGN.md` y `src/presentation/theme/palettes.ts`.
- Suite de pruebas unitarias de validación y detección en `tests/domain.test.ts`.
- Releases de producción para Android (`open-parcels-v1.3.1.apk`) con instalador in-app nativo.

## Product Principles

1. **Velocidad e Inmediatez Local:** La información de un paquete debe ser legible en menos de 2 segundos desde que se abre la app; sin pantallas de carga innecesarias ni telemetría intrusiva.
2. **Claridad sobre Ruido:** El diseño neo-brutalista debe estructurar y jerarquizar los datos técnicos (albarán, fechas, transportistas), nunca distraer ni dificultar la lectura.
3. **Fidelidad Nativa Híbrida:** En iOS la navegación y transiciones deben sentirse suaves y fluidas (HIG), mientras que en Android se respetan áreas táctiles y patrones de Material You, compartiendo la misma piel gráfica neo-brutalista.
4. **Privacidad por Diseño:** Cero cuentas obligatorias, cero rastreo comercial; los datos pertenecen al dispositivo del usuario.

## Accessibility & Inclusion

- Contraste estricto de texto (WCAG AA mínimo 4.5:1 para texto normal, 3:1 para titulares pesados sobre canvas coloreados).
- Áreas mínimas táctiles de 48x48dp para todos los botones, filtros y tarjetas interactivas.
- Soporte para escalado dinámico de tipografía (Dynamic Type / FontScale) sin truncamiento crítico de números de tracking.
