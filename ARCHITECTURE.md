# Open Parcels Mobile — Arquitectura Técnica & Especificación de Producto

**Versión:** 1.0.1  
**Motor Base:** Open Parcels (v1.0.2)  
**Plataformas:** Android e iOS (con soporte Web para desarrollo y pruebas)  
**Harness / Framework:** Expo SDK 58 + React Native 0.88 (New Architecture) + TypeScript  
**Identidad Visual:** Neo-Brutalismo Industrial  
**Autor:** Equipo de Ingeniería `app-openparcels`  

---

## 1. Visión General y Objetivos

**Open Parcels Mobile** es el cliente móvil oficial de rastreo universal de paquetería impulsado por el motor de código abierto [Open Parcels (v1.0.2)](https://github.com/gek0v/open-parcels). Permite a los usuarios rastrear envíos de más de 1.500 transportistas globales con detección automática reactiva, validaciones matemáticas de checksum, cálculo de progreso en 8 estados canónicos y visualización unificada de viajes multitransportista (*Multi-Carrier Journey*).

### Decisiones Fundamentales de Arquitectura
1. **Stack Tecnológico:** React Native 0.88 + Expo SDK 58 (TypeScript estricto), empaquetado nativo con Gradle 9 y CMake/Ninja en Android.
2. **Modelo de Integración:** **Local-First con Motor Conmutable**. La aplicación ejecuta algoritmos de detección y parsing localmente en el dispositivo (`LocalTrackingEngine`), con capacidad de conmutar en caliente a cliente HTTP REST (`RestTrackingEngine`) hacia demonios locales o remotos (`open-parcels serve --port 8080`).
3. **Lenguaje Visual Canónico:** **Neo-Brutalismo Industrial**. Paleta de alto contraste basada en **Acid Lime (`#D8FF38`)**, **Cyber Yellow (`#FFE600`)** y **Neon Tangerine (`#FF5C38`)**, contornos negros sólidos de `2.5px`, sombras rígidas sin difuminado a 45º (`4px 4px 0px #000`), controles de ventana retro (`🔴 🟡 🟢`) y micro-interacciones mecánicas táctiles.
4. **Distribución Autónoma & In-App Updater:** Sistema de auto-actualización integrado (`UpdateService`) que consulta la API de GitHub Releases y despliega un diálogo nativo (`UpdateAvailableModal`) para descargar e instalar nuevas versiones del APK con un solo toque.

---

## 2. Arquitectura de Capas (Clean Architecture)

```
┌────────────────────────────────────────────────────────┐
│                   Capa de Presentación                  │
│  - Dashboard: Bento Hero Widget, Segmented Filters     │
│  - Detail Screen: Journey Flow, Event Timeline         │
│  - Modales: Camera Scanner, Rename, Delete, Update     │
│  - Design System: Neo-Brutalist Theme Tokens           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Capa de Dominio                     │
│  - Modelos Canónicos: Parcel, Carrier, TrackingEvent   │
│  - 8 Estados Canónicos Normalizados                    │
│  - Validadores Checksum: UPU S10, UPS 1Z, IATA AWB     │
│  - Algoritmo de Detección Reactiva de Transportistas   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                 Capa de Infraestructura                │
│ ┌───────────────────────────┐ ┌──────────────────────┐ │
│ │  Almacenamiento Local     │ │ Motor Open Parcels   │ │
│ │  - ParcelRepository       │ │ - ITrackingEngine    │ │
│ │  - AsyncStorage (v1)      │ │ - LocalTrackingEngine│ │
│ │  - expo-sqlite (Roadmap)  │ │ - RestTrackingEngine │ │
│ └───────────────────────────┘ └──────────────────────┘ │
│ ┌───────────────────────────┐ ┌──────────────────────┐ │
│ │  Servicios Auxiliares     │ │ Distribución         │ │
│ │  - UpdateService (GitHub) │ │ - Release APK        │ │
│ └───────────────────────────┘ └──────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de Datos y 8 Estados Canónicos

### 3.1 Tabla de Estados Canónicos
El motor clasifica todo hito logístico en uno de los 8 estados canónicos estandarizados:

| Estado Canónico | Progreso Base | Etiqueta ES | Etiqueta EN | Color Semántico |
|---|---|---|---|---|
| `pending` | 5% | Pendiente de registro | Pending | `#64748B` (Pizarra) |
| `info_received` | 15% | Información recibida | Info Received | `#7C3AED` (Violeta) |
| `in_transit` | 45% | En tránsito | In Transit | `#0284C7` (Azul Eléctrico) |
| `out_for_delivery` | 85% | En reparto | Out for Delivery | `#FFE600` (Cyber Yellow) |
| `delivered` | 100% | Entregado | Delivered | `#10B981` (Verde Esmeralda) |
| `failed_attempt` | 70% | Intento fallido | Failed Attempt | `#FF5C38` (Neon Coral) |
| `exception` | 50% | Retenido / Aduanas | Exception | `#EF4444` (Rojo Intenso) |
| `expired` | 0% | Caducado | Expired | `#475569` (Gris Oscuro) |

### 3.2 Contratos TypeScript Fundamentales

```typescript
export interface Carrier {
  slug: string;
  name: string;
  website?: string;
  requires_postal_code?: boolean;
  region?: string;
  color?: string;
}

export interface TrackingEvent {
  date: string; // ISO-8601
  status: CanonicalStatus;
  stage: 'created' | 'pickup' | 'customs' | 'transit' | 'delivery' | 'completed' | 'exception';
  description: string;
  location?: string;
  carrier_slug: string;
  carrier_name?: string;
  event_code?: string;
}

export interface Parcel {
  id: string;
  trackingNumber: string;
  customAlias?: string;
  carrier: Carrier;
  additionalCarriers?: Carrier[];
  lastMileCarrier?: Carrier;
  status: CanonicalStatus;
  statusText: string;
  progress: number; // 0 a 100
  origin?: { code: string; name: string };
  destination?: { code: string; name: string };
  postalCode?: string;
  deliveredAt?: string | null;
  daysInTransit: number;
  events: TrackingEvent[];
  updatedAt: string;
  isArchived: boolean;
  createdAt: string;
}
```

---

## 4. Validadores Matemáticos de Checksum

Para garantizar una detección precisa sin falsos positivos, el sistema implementa:

1. **UPU S10 (Módulo 11):**  
   - Estructura: 2 letras de servicio + 8 dígitos de serie + 1 dígito de control + 2 letras ISO de país (ej. `PQ481920391ES`).
   - Ponderación: Factores `8, 6, 4, 2, 3, 5, 9, 7`. Residuo calculado con módulo 11.
2. **UPS 1Z (Módulo 10):**  
   - Estructura: `1Z` + 6 alfanuméricos de cuenta + 2 dígitos de servicio + 7 dígitos de serie + 1 dígito de verificación.
   - Ponderación alfanumérica idéntica al core Go (`(char - '0') % 10` para números; `(ASCII - 63) % 10` para letras). Alternancia de pesos `1` y `2`.
3. **IATA AWB (Módulo 7):**  
   - Estructura: 3 dígitos prefijo de aerolínea + separador opcional + 7 dígitos de serie + 1 dígito de control igual a `(serie % 7)`.
4. **Parámetros Obligatorios Reactivos:**  
   - Despliegue automático de entrada de **Código Postal** para InPost, Mondial Relay y CTT Express, evitando errores `MISSING_POSTAL_CODE`.

---

## 5. Sistema de Diseño Neo-Brutalista

El lenguaje visual implementado en `src/presentation/theme/adaptiveTheme.ts` se rige por las siguientes directrices:

- **Paleta Cromática:**
  - Lienzo: `#D8FF38` (Acid Lime).
  - Acentos Primarios: `#FFE600` (Cyber Yellow) y `#FF5C38` (Neon Tangerine).
  - Fondos de Tarjeta: `#FFFFFF` puro con separadores `#000000`.
- **Bordes:** `2.5px` sólidos de color `#000000` en todos los componentes interactivos.
- **Sombras:** Rígidas y duras a 45 grados sin difuminado:
  - `sm`: `2px 2px 0px #000000`
  - `md`: `4px 4px 0px #000000`
  - `lg`: `6px 6px 0px #000000`
- **Controles de Ventana Retro:** Cabeceras inspiradas en interfaces de sistemas operativos de los 90 (`🔴 🟡 🟢`).
- **Estados Activos (Micro-interacciones):** Al presionar (`active/pressed`), las tarjetas y botones reducen su elevación simulando un pulsador mecánico:
  `transform: [{ translateX: 2 }, { translateY: 2 }]`.

---

## 6. Sistema de Actualizaciones en la App (In-App Updater)

Diseñado para instalaciones autónomas sin dependencia de Google Play Store:
- **Detección Automática:** Consulta `https://api.github.com/repos/gek0v/open-parcels-app/releases/latest`.
- **Comparación Semántica (`isNewerVersion`):** Compara `CURRENT_APP_VERSION` contra el tag publicado en GitHub.
- **Descarga en 1 Toque:** `UpdateAvailableModal` abre la URL de descarga directa del binario `.apk` adjunto para instalación inmediata.
- **Comprobación Manual:** Botón `[ 📥 ACTUALIZAR ]` disponible en la cabecera del Dashboard.

---

## 7. Roadmap y Evolución de Arquitectura

- [x] **Fase 0:** Scaffolding inicial con Expo SDK 58, TypeScript y motor simulado.
- [x] **Fase 0.5:** Transición completa a Sistema de Diseño Neo-Brutalista y Dashboard Bento Hero.
- [x] **Fase 1.0.0:** Generación de APK firmado para Android, splash nativo y assets 3D.
- [x] **Fase 1.0.1:** Sistema de auto-actualizaciones desde GitHub Releases y arranque limpio sin mocks.
- [ ] **Fase 2:** Selector de estilo de tarjeta (Bento, Industrial, RetroOS) y soporte multi-idioma (ES/EN).
- [ ] **Fase 3:** Migración de enrutamiento por estado hacia Expo Router (`src/app/`).
- [ ] **Fase 4:** Persistencia relacional en SQLite con `expo-sqlite` y tareas periódicas en segundo plano con notificaciones locales.
- [ ] **Fase 5:** Enlace nativo JSI / TurboModule con el core Open Parcels Go compilado mediante `gomobile bind`.
