# Guía de Contribución a Open Parcels Mobile 🤝📦

¡Bienvenido a la comunidad de **Open Parcels Mobile**! Nos entusiasma recibir contribuciones de desarrolladores, diseñadores y entusiastas de la logística de todo el mundo.

---

## 🛠️ Entorno de Desarrollo Local

### Requisitos Previos
- **Node.js:** v20.x o superior.
- **Bun:** v1.1.x o superior (utilizado para el ejecutor de tests de alta velocidad).
- **Expo CLI / EAS CLI:** `npm install -g eas-cli` (opcional para builds nativas en la nube).
- **Android SDK:** (Opcional, solo si compilas APKs nativos localmente).

### Instalación y Puesta en Marcha
1. Clona el repositorio:
   ```bash
   git clone https://github.com/gek0v/open-parcels-app.git
   cd open-parcels-app
   ```
2. Instala las dependencias:
   ```bash
   bun install   # o npm install
   ```
3. Inicia el servidor de desarrollo Expo:
   ```bash
   npm run start
   ```
   - Pulsa `w` para abrir en navegador Web.
   - Pulsa `a` para abrir en emulador de Android conectado.
   - Pulsa `i` para abrir en simulador de iOS.

---

## 🧪 Pruebas y Validación de Calidad

Antes de enviar cualquier Pull Request, asegúrate de que todos los checks automáticos pasen localmente:

```bash
# 1. Ejecutar la suite de tests unitarios
bun run test

# 2. Comprobar tipos de TypeScript en modo estricto
bun run typecheck

# 3. Validar reglas de estilo y ESLint
bun run lint
```

---

## 🎨 Directrices del Sistema de Diseño Neo-Brutalista

Toda pantalla o componente nuevo debe adherirse estrictamente al lenguaje visual definido en `DESIGN.md` y `adaptiveTheme.ts`:

- **Contornos y Bordes:** Siempre sólidos y negros (`borderWidth: 2.5`, `borderColor: '#000000'`).
- **Sombras:** Rígidas, sin difuminado, a 45 grados (`4px 4px 0px #000000`).
- **Paleta Canónica:**
  - Lienzo: `#D8FF38` (Acid Lime).
  - Acentos: `#FFE600` (Cyber Yellow) y `#FF5C38` (Neon Tangerine).
  - Tarjetas: `#FFFFFF` puro.
- **Micro-interacciones:** Al presionar un botón o tarjeta, debe desplazarse `2px` en X e Y para simular una pulsación mecánica física.

---

## 📜 Convención de Commits

Seguimos el estándar [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(modulo): descripción corta` (Nueva funcionalidad)
- `fix(modulo): descripción corta` (Corrección de error)
- `ui(componente): descripción corta` (Ajustes de interfaz o estilos)
- `refactor(modulo): descripción corta` (Refactorización de código)
- `docs(seccion): descripción corta` (Documentación)
- `test(modulo): descripción corta` (Tests nuevos o actualizados)
- `ci(actions): descripción corta` (Workflows y automatización)

---

## 🚀 Flujo de Trabajo con Pull Requests

1. Crea una rama descriptiva a partir de `main`:
   ```bash
   git checkout -b feat/nuevo-transportista-gls
   ```
2. Realiza tus cambios y verifica que `bun run test` pase al 100%.
3. Haz commit siguiendo las convenciones.
4. Envía tu Pull Request contra la rama `main` completando la plantilla `.github/PULL_REQUEST_TEMPLATE.md`.
