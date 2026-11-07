export const es = {
  // General & Branding
  appName: 'OPEN PARCELS',
  tagline: 'Rastreo Universal de Paquetería',

  // Statuses
  status: {
    pending: 'Pendiente',
    info_received: 'Info Recibida',
    in_transit: 'En Tránsito',
    out_for_delivery: 'En Reparto',
    delivered: 'Entregado',
    failed_attempt: 'Intento Fallido',
    exception: 'Retenido / Aduana',
    expired: 'Caducado',
  },

  // Engine Chips & Top Bar
  engine: {
    local: 'GO EMBEBIDO',
    rest: 'REST :8080',
    toggleAria: 'Cambiar motor de seguimiento',
    updateBtn: 'ACTUALIZAR',
    checking: 'BUSCANDO...',
  },

  // Bento Stats
  stats: {
    active: 'EN CURSO',
    activeSub: 'ACTIVOS EN RUTA',
    noneActive: 'SIN ENVÍOS ACTIVOS',
    delivered: 'ENTREGADOS',
    deliveredSub: 'HISTORIAL COMPLETADO',
    scanBtn: 'ESCANEAR',
    scanSub: 'CÁMARA / MANUAL',
  },

  // Filters
  filter: {
    active: 'EN CAMINO',
    delivered: 'ENTREGADOS',
    archived: 'ARCHIVADOS',
    design: 'DISEÑO:',
  },

  // Search
  search: {
    placeholder: 'Buscar por alias, código o transportista...',
    clearAria: 'Limpiar búsqueda',
    searchAria: 'Buscar envíos',
  },

  // Empty State
  empty: {
    noResults: 'SIN RESULTADOS',
    noActive: 'NO HAY PAQUETES EN CAMINO',
    noDelivered: 'NO HAY PAQUETES ENTREGADOS',
    noArchived: 'NO HAY ENVÍOS ARCHIVADOS',
    subNoResults: 'Prueba con otro término de búsqueda o número de albarán.',
    subActive: 'Pulsa el botón "+" o "ESCANEAR" para registrar tu primer paquete escaneando su código de barras o introduciendo el número.',
    trackFirstBtn: 'RASTREAR PRIMER ENVÍO',
  },

  // Detail Screen
  detail: {
    back: 'VOLVER',
    copyAria: 'Copiar número de seguimiento',
    copiedToast: '¡Número de seguimiento copiado al portapapeles!',
    daysInTransit: 'DÍAS EN RUTA',
    journeyTitle: 'RELEVO MULTITRANSPORTISTA',
    timelineTitle: 'HISTORIAL DE HITOS CRONOLÓGICOS',
    noEvents: 'Aún no se han recibido eventos para este envío.',
    fetchUpdateBtn: 'ACTUALIZAR',
    fetching: 'CONSULTANDO...',
    editAlias: 'RENOMBRAR',
    archive: 'ARCHIVAR',
    unarchive: 'DESARCHIVAR',
    delete: 'ELIMINAR',
    officialSite: 'CONSULTAR EN WEB OFICIAL',
  },

  // Modals
  newParcelModal: {
    title: 'NUEVO SEGUIMIENTO',
    subtitle: 'Introduce el código o escanea la etiqueta',
    trackingNumberLabel: 'NÚMERO DE SEGUIMIENTO',
    trackingPlaceholder: 'ej. 1Z9999999999999999 o PQ481920391ES',
    postalCodeLabel: 'CÓDIGO POSTAL (OBLIGATORIO)',
    postalCodePlaceholder: 'ej. 28001',
    postalCodeHint: 'Este transportista exige código postal de entrega.',
    aliasLabel: 'ALIAS AMIGABLE (OPCIONAL)',
    aliasPlaceholder: 'ej. Teclado Mecánico o Zapatillas',
    detectedCarrier: 'TRANSPORTISTA DETECTADO',
    selectCarrier: 'SELECCIONA EL TRANSPORTISTA',
    startTrackingBtn: 'INICIAR SEGUIMIENTO',
    cameraScanBtn: 'ESCANEAR CON CÁMARA',
    cancelBtn: 'CANCELAR',
  },

  deleteModal: {
    title: 'CONFIRMAR ELIMINACIÓN',
    heading: '¿ELIMINAR ESTE ENVÍO?',
    warning: 'Esta acción borrará permanentemente el paquete y todo su historial de hitos. No se puede deshacer.',
    confirmBtn: 'SÍ, ELIMINAR',
    cancelBtn: 'CANCELAR',
  },

  renameModal: {
    title: 'RENOMBRAR ENVÍO',
    label: 'ALIAS PERSONALIZADO',
    placeholder: 'ej. Ropa Vinted, Móvil Nuevo...',
    saveBtn: 'GUARDAR ALIAS',
    cancelBtn: 'CANCELAR',
  },

  updateModal: {
    title: 'NUEVA VERSIÓN DISPONIBLE',
    current: 'ACTUAL',
    newBadge: 'NUEVA',
    apkOfficial: 'APK OFICIAL',
    changelogTitle: 'NOVEDADES DE ESTA ACTUALIZACIÓN:',
    laterBtn: 'MÁS TARDE',
    updateBtn: 'ACTUALIZAR',
  },
};

export type TranslationKey = typeof es;
