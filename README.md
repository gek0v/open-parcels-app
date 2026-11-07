# 📦 Open Parcels Mobile (Android & iOS)

> Aplicación móvil oficial universal de rastreo de envíos y paquetería impulsada por el motor de alto rendimiento **[Open Parcels (v1.0.2)](https://github.com/gek0v/open-parcels)**.

---

## 🌟 Características Principales

1. **Arquitectura Local-First con Motor Embebido:**
   - La aplicación integra el motor de detección de transportistas y cálculo de estados localmente en el dispositivo (`LocalTrackingEngine`), con capacidad de alternar a cliente REST hacia `open-parcels serve` cuando se requiera infraestructura en la nube.
2. **Autodetección Inteligente y Checksums Matemáticos:**
   - Reconocimiento reactivo instantáneo según el usuario escribe o pega un código de seguimiento:
     - **UPU S10 (Módulo 11)** con pesos `8, 6, 4, 2, 3, 5, 9, 7` (Correos España, USPS, correos nacionales).
     - **UPS 1Z (Módulo 10)** con ponderación alfanumérica idéntica al core Go de Open Parcels.
     - **IATA AWB (Módulo 7)** para carga aérea.
     - **Cainiao Global / AliExpress** (`LP` + 14 dígitos).
     - **InPost / Mondial Relay** (códigos de 8 y 24 dígitos).
3. **Parámetros Obligatorios por Transportista:**
   - Despliegue dinámico y reactivo del campo de **Código Postal** cuando el transportista lo exige (ej. InPost, Mondial Relay, CTT Express), con manejo estricto de errores (`MISSING_POSTAL_CODE`).
4. **Encadenamiento y Fusión Multitransportista (Multi-Carrier Journey):**
   - Visualización clara del relevo entre el operador internacional de origen (ej. Cainiao Global) y el transportista local de última milla (ej. Correos Express), con timeline cronológico vertical de hitos deduplicados.
5. **Sistema de Diseño Adaptativo (Adaptive HIG / Material You):**
   - **iOS:** Filosofía Human Interface Guidelines con estética limpia, tipografía SF Pro, bordes suaves, desenfoque y cabeceras nativas.
   - **Android:** Material Design 3 con superficies tonales, Floating Action Button (FAB) expresivo y elevación visual.
6. **Escaneo de Código de Barras y QR con Cámara:**
   - Lector integrado con `expo-camera` para Code 128, Code 39, QR y DataMatrix en paquetes físicos o pantallas.

---

## 🏗️ Estructura del Proyecto

```
open-parcels-app/
├── ARCHITECTURE.md                 # Documento de arquitectura técnica detallada
├── App.tsx                         # Orquestador principal de navegación
├── src/
│   ├── domain/                     # Capa de Dominio (Pura, sin dependencias externas)
│   │   ├── models/
│   │   │   ├── carrier.ts          # Contratos de transportistas y detección
│   │   │   ├── event.ts            # Hitos y etapas del envío
│   │   │   ├── parcel.ts           # Modelo de paquete principal y contratos de request/response
│   │   │   └── status.ts           # 8 estados canónicos y metadatos
│   │   └── validators/
│   │       ├── checksums.ts        # Algoritmos UPU S10, UPS 1Z, IATA AWB
│   │       └── detection.ts        # Reglas y catálogo de autocompletado
│   ├── infrastructure/             # Capa de Infraestructura
│   │   ├── engine/                 # Motores de seguimiento conmutables
│   │   │   ├── ITrackingEngine.ts  # Interfaz unificada
│   │   │   ├── LocalTrackingEngine.ts # Motor Local-First embebido
│   │   │   ├── RestTrackingEngine.ts  # Cliente REST HTTP para open-parcels serve
│   │   │   └── index.ts            # Gestor de motor activo
│   │   └── storage/
│   │       └── ParcelRepository.ts # Persistencia local persistente con AsyncStorage
│   └── presentation/               # Capa de Presentación
│       ├── theme/
│       │   └── adaptiveTheme.ts    # Tokens adaptativos HIG / Material You
│       ├── components/
│       │   ├── common/             # AdaptiveCard, ProgressBar, StatusBadge, AdaptiveHeader
│       │   ├── dashboard/          # ParcelCard, SegmentedFilter
│       │   ├── scanner/            # CameraScannerModal, CarrierDetectorBar
│       │   └── detail/             # JourneyFlow, EventTimeline
│       └── screens/
│           ├── DashboardScreen.tsx # Lista con tabs, buscador, FAB y toggle de motor
│           ├── NewParcelModal.tsx  # Alta asistida con escáner y CP condicional
│           └── ParcelDetailScreen.tsx # Detalle completo, Journey y Timeline
└── tests/
    └── domain.test.ts              # Suite de pruebas unitarias (10/10 pasadas)
```

---

## 🚀 Puesta en Marcha

### Prerrequisitos
- Node.js >= 18 (o Bun >= 1.0)
- npm o bun instalado

### Instalación de dependencias
```bash
npm install
```

### Ejecución en Modo Desarrollo
```bash
# Iniciar servidor Expo (Web, iOS, Android)
npm start

# Ejecutar directamente en Web
npm run web

# Ejecutar en Emulador Android
npm run android

# Ejecutar en Simulador iOS
npm run ios
```

### Ejecutar Tests Unitarios
```bash
bun test
# o
npx tsc --noEmit
```

---

## 🔗 Integración con el Motor Open Parcels (Go Core)

- **Modo Local-First (Por defecto):** Utiliza los algoritmos matemáticos y lógica de validación interna emulando el motor Go directamente en el dispositivo.
- **Modo REST Daemon:** Permite conectarse a un binario `open-parcels serve --port 8080` local o remoto pulsando el selector de motor en la cabecera de la aplicación.
