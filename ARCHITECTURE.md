# Open Parcels Mobile — Arquitectura Técnica & Especificación de Producto

**Versión:** 1.0.0  
**Motor Base:** Open Parcels (v1.0.2)  
**Plataformas:** Android e iOS (con soporte Web de desarrollo)  
**Autor:** Equipo de Ingeniería `app-openparcels`  

---

## 1. Visión General y Objetivos

**Open Parcels Mobile** es la aplicación móvil oficial de rastreo universal de paquetería impulsada por el motor libre Open Parcels. Permite a los usuarios rastrear envíos de más de 1.500 transportistas globales con detección automática inteligente, cálculo de progreso en 8 estados canónicos y visualización unificada de viajes multitransportista (Multi-Carrier Journey).

### Decisiones Clave del Proyecto
1. **Stack Tecnológico:** React Native + Expo SDK 52 (TypeScript).
2. **Modelo de Integración:** **Opción B — Local-First / Motor Go Embebido**. La app es capaz de operar localmente en el dispositivo con librerías nativas compiladas (`.aar` para Android y `.xcframework` para iOS con `gomobile`), con soporte para fallback a cliente REST cuando se use servidor centralizado.
3. **Estilo Visual:** **Adaptive HIG / Material You**. Adaptación profunda a las directrices de diseño del sistema operativo:
   - **iOS:** Apple Human Interface Guidelines (SF Pro, barras translúcidas con desenfoque de fondo `expo-blur`, listas agrupadas, gestos nativos de swipe, háptica fina).
   - **Android:** Material Design 3 (Material You, esquinas redondeadas, superficies tonales, Floating Action Button expresivo, feedback ripple).

---

## 2. Arquitectura del Sistema (Local-First)

```
┌────────────────────────────────────────────────────────┐
│                   Capa de Presentación                  │
│  (Expo Router / Screens: Dashboard, Scan, Detail...)   │
│  (Design System: Adaptive HIG / Material You)           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Capa de Dominio                     │
│  (Modelos tipados, 8 estados canónicos, Journey merge) │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                 Capa de Infraestructura                │
│ ┌───────────────────────────┐ ┌──────────────────────┐ │
│ │  Almacenamiento Local     │ │ Motor Open Parcels   │ │
│ │  (expo-sqlite / MMKV)     │ │ Local-First Bridge   │ │
│ │  - Historial envíos       │ │ (gomobile .aar/.xcf) │ │
│ │  - Cache transportistas   │ │ (Dev Fallback Mock)  │ │
│ └───────────────────────────┘ └──────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 2.1 Módulo Nativo Open Parcels (gomobile bind)
El core de Go se compila como framework nativo:
- **Android:** `openparcels.aar` expuesto a React Native vía un módulo nativo TurboModule / Expo Config Plugin.
- **iOS:** `OpenParcels.xcframework` enlazado en CocoaPods / Swift.
- **Métodos expuestos al puente JavaScript/TypeScript:**
  - `detectCarriers(trackingNumber: string): string` (retorna JSON con candidatos y scores).
  - `trackShipment(paramsJson: string): string` (ejecuta el tracking nativo con reglas UPU S10, UPS 1Z, IATA, etc.).
  - `getCarriersCatalog(): string` (devuelve el catálogo de operadores).

### 2.2 Entorno de Desarrollo y Simulación Local
Para garantizar que el equipo de frontend pueda iterar rápidamente en simuladores, emuladores y navegador web sin necesidad de compilar Go en cada micro-cambio, el puente implementa un **Motor Híbrido Conmutable**:
1. `NativeGoEngine`: invoca el binario embebido gomobile en builds nativas de producción.
2. `RestApiEngine`: cliente HTTP que apunta a `http://localhost:8080` (o servidor remoto con `open-parcels serve`).
3. `MockDevEngine`: emulador TypeScript completo que implementa los algoritmos de detección checksum (Luhn, UPU S10 mod 11, etc.) y simula respuestas exactas de Open Parcels v1.0.2 para desarrollo y tests E2E.

---

## 3. Modelo de Datos y Contratos (Open Parcels v1.0.2)

### 3.1 Estados Canónicos Normalizados
El motor clasifica cada paquete en uno de los 8 estados canónicos:
| Estado | Progreso Base | Descripción ES | Descripción EN |
|---|---|---|---|
| `pending` | 5% | Pendiente de registro | Pending |
| `info_received` | 15% | Información recibida / Pre-registrado | Info Received |
| `in_transit` | 45% | En tránsito | In Transit |
| `out_for_delivery` | 85% | En reparto / Última milla | Out for Delivery |
| `delivered` | 100% | Entregado | Delivered |
| `failed_attempt` | 70% | Intento de entrega fallido | Failed Attempt |
| `exception` | 50% | Excepción / Retenido en aduana | Exception / Alert |
| `expired` | 0% | Caducado / Sin actividad | Expired |

### 3.2 Estructura de Entidades
```typescript
export interface Carrier {
  slug: string;
  name: string;
  website?: string;
  logo_url?: string;
  requires_postal_code?: boolean;
}

export interface TrackingEvent {
  date: string; // ISO-8601
  status: CanonicalStatus;
  stage: 'created' | 'pickup' | 'customs' | 'transit' | 'delivery' | 'completed' | 'exception';
  description: string;
  location?: string;
  carrier_slug: string;
  carrier_name: string;
  event_code?: string;
}

export interface Parcel {
  id: string; // UUID local
  tracking_number: string;
  custom_alias?: string; // ej: "Zapatillas Nike"
  carrier: Carrier;
  additional_carriers?: Carrier[];
  last_mile_carrier?: Carrier;
  status: CanonicalStatus;
  status_text: string;
  progress: number; // 0 a 100
  origin?: { code: string; name: string };
  destination?: { code: string; name: string };
  postal_code?: string;
  delivered_at?: string | null;
  days_in_transit: number;
  events: TrackingEvent[];
  updated_at: string;
  is_archived: boolean;
  created_at: string;
}
```

---

## 4. Sistema de Diseño: Adaptive HIG / Material You

La aplicación implementa un sistema de diseño bifronte dinámico:

### 4.1 iOS (Human Interface Guidelines)
- **Tipografía:** SF Pro Display y SF Pro Text con pesos estándar (`system`).
- **Navegación:** Cabeceras grandes que se reducen al deslizar (`Large Title` con blur).
- **Tab Bar:** Pestañas translúcidas con efectos de desenfoque (`UIBlurEffect` / `expo-blur`) y badges de color.
- **Tarjetas:** Celdas agrupadas con bordes de radio 12-16px, separadores sutiles y chevron indicador.
- **Acciones:** `Swipeable` nativo para archivar/eliminar envíos y menú contextual `ContextMenu`.

### 4.2 Android (Material Design 3 - Material You)
- **Tipografía:** Roboto / Google Sans.
- **Navegación:** Top App Bar con esquinas limpias y elevación tonal dinámica.
- **Navegación Inferior:** Navigation Bar Material 3 con indicador de píldora activa.
- **Floating Action Button (FAB):** Botón flotante prominente `+` en esquina inferior derecha.
- **Tarjetas:** Surface Containers de MD3 con elevación tonal y efectos Ripple al toque.

### 4.3 Colores Semánticos de Estado (Compatibles con ambos sistemas)
- `in_transit`: Azul Zafiro / Cyan (`#0284C7` / `#38BDF8`)
- `out_for_delivery`: Ámbar Cálido (`#D97706` / `#FBBF24`)
- `delivered`: Esmeralda / Menta (`#059669` / `#34D399`)
- `exception` / `failed_attempt`: Carmesí (`#DC2626` / `#F87171`)
- `info_received` / `pending`: Púrpura / Neutro (`#7C3AED` / `#A78BFA`)

---

## 5. Módulos y Pantallas Principales

1. **Dashboard Principal (`/dashboard`):**
   - Segmented Tabs: «En camino» (activos), «Entregados» (finalizados) y «Archivados».
   - Pull-to-refresh para actualizar masivamente todos los envíos con el motor.
   - Resumen rápido de estado y días en tránsito.
   - Acceso rápido a búsqueda y filtrado por nombre/código.

2. **Alta Rápida de Envíos (`/new-shipment`):**
   - **Escáner de Cámara Integrado:** Soporte nativo para Code 128, Code 39, QR y DataMatrix vía `expo-camera`.
   - **Autodetección Reactiva:** Al pegar o teclear, analiza en tiempo real el formato del código y muestra badges con transportistas candidatos y confianza (ej: Correos 98%, Seur 65%).
   - **Selector de Código Postal:** Se muestra automáticamente si el carrier lo exige (ej. InPost, Mondial Relay, CTT Express).
   - **Etiqueta / Alias:** Campo amigable («Teclado mecánico», «Regalo mamá»).

3. **Detalle del Paquete & Journey (`/parcel/[id]`):**
   - Header con estado actual, barra de progreso interactiva (0% a 100%) y transportistas encadenados.
   - **Multi-Carrier Journey Bar:** Muestra el cambio de manos (ej: Cainiao ➔ Aduanas ➔ Correos Express) de forma visual.
   - **Timeline Vertical Cronológico:** Eventos deduplicados, fecha, hora, ubicación y distintivo del transportista que originó el hito.
   - Botón de acceso directo a la web del transportista para trámites oficiales.

---

## 6. Hoja de Ruta de Implementación
- [x] Especificación y arquitectura técnica aprobada.
- [ ] Scaffolding de Expo SDK 52 con TypeScript, dependencias y estructura de carpetas.
- [ ] Implementación de modelos de dominio y validadores de transportistas.
- [ ] Implementación del motor conmutable (Local-First Engine Bridge + Mock/Rest).
- [ ] Sistema de diseño adaptativo (HIG / Material You) y temas de color.
- [ ] Pantallas de Dashboard, Alta con Escáner y Detalle de Envío.
