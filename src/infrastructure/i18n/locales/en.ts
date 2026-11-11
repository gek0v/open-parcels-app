import { TranslationKey } from './es';

export const en: TranslationKey = {
  // General & Branding
  appName: 'OPEN PARCELS',
  tagline: 'Universal Parcel Tracking Engine',

  // Statuses
  status: {
    pending: 'Pending',
    info_received: 'Info Received',
    in_transit: 'In Transit',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    failed_attempt: 'Failed Attempt',
    exception: 'Exception / Alert',
    expired: 'Expired',
  },

  // Engine Chips & Top Bar
  engine: {
    local: 'EMBEDDED GO',
    rest: 'REST :8080',
    toggleAria: 'Toggle tracking engine',
    updateBtn: 'UPDATE',
    checking: 'CHECKING...',
  },

  // Bento Stats
  stats: {
    active: 'IN TRANSIT',
    activeSub: 'ACTIVE SHIPMENTS',
    noneActive: 'NO ACTIVE PARCELS',
    delivered: 'DELIVERED',
    deliveredSub: 'ALL-TIME COMPLETED',
    scanBtn: 'SCAN CODE',
    scanSub: 'CAMERA / MANUAL',
  },

  // Filters
  filter: {
    active: 'IN TRANSIT',
    delivered: 'DELIVERED',
    archived: 'ARCHIVED',
    design: 'LAYOUT:',
  },

  // Search
  search: {
    placeholder: 'Search by alias, code or carrier...',
    clearAria: 'Clear search',
    searchAria: 'Search parcels',
  },

  // Empty State
  empty: {
    noResults: 'NO RESULTS FOUND',
    noActive: 'NO PARCELS IN TRANSIT',
    noDelivered: 'NO DELIVERED PARCELS',
    noArchived: 'NO ARCHIVED PARCELS',
    subNoResults: 'Try another search term or tracking code.',
    subActive: 'Tap "+" or "SCAN CODE" to track your first shipment by scanning a barcode or typing its tracking number.',
    trackFirstBtn: 'TRACK FIRST SHIPMENT',
  },

  // Detail Screen
  detail: {
    back: 'BACK',
    copyAria: 'Copy tracking number',
    copiedToast: 'Tracking number copied to clipboard!',
    daysInTransit: 'DAYS IN TRANSIT',
    journeyTitle: 'MULTI-CARRIER JOURNEY',
    timelineTitle: 'CHRONOLOGICAL EVENT HISTORY',
    noEvents: 'No tracking milestones recorded yet.',
    fetchUpdateBtn: 'REFRESH',
    fetching: 'FETCHING...',
    editAlias: 'RENAME',
    archive: 'ARCHIVE',
    unarchive: 'UNARCHIVE',
    delete: 'DELETE',
    officialSite: 'VIEW ON OFFICIAL SITE',
  },

  // Modals
  newParcelModal: {
    title: 'TRACK NEW PARCEL',
    subtitle: 'Enter code or scan shipping barcode',
    trackingNumberLabel: 'TRACKING NUMBER',
    trackingPlaceholder: 'e.g. 1Z9999999999999999 or PQ481920391ES',
    postalCodeLabel: 'POSTAL CODE (REQUIRED)',
    postalCodePlaceholder: 'e.g. 28001 or 10001',
    postalCodeHint: 'This carrier requires destination postal code.',
    aliasLabel: 'FRIENDLY ALIAS (OPTIONAL)',
    aliasPlaceholder: 'e.g. Custom Keyboard or Sneakers',
    detectedCarrier: 'DETECTED CARRIER',
    selectCarrier: 'SELECT CARRIER',
    startTrackingBtn: 'START TRACKING',
    cameraScanBtn: 'SCAN WITH CAMERA',
    cancelBtn: 'CANCEL',
  },

  deleteModal: {
    title: 'CONFIRM DELETION',
    heading: 'DELETE THIS PARCEL?',
    warning: 'This will permanently remove this shipment and its full tracking history. This action cannot be undone.',
    confirmBtn: 'YES, DELETE',
    cancelBtn: 'CANCEL',
  },

  renameModal: {
    title: 'RENAME PARCEL',
    label: 'CUSTOM ALIAS',
    placeholder: 'e.g. Vinted Jacket, New Phone...',
    saveBtn: 'SAVE ALIAS',
    cancelBtn: 'CANCEL',
  },

  updateModal: {
    title: 'NEW UPDATE AVAILABLE',
    closeAria: 'Close update notice',
    current: 'CURRENT',
    newBadge: 'NEW',
    apkOfficial: 'OFFICIAL APK',
    apkInstallable: 'INSTALLABLE APK',
    changelogTitle: 'WHAT IS NEW IN THIS RELEASE:',
    laterBtn: 'LATER',
    updateBtn: 'UPDATE NOW',
    downloading: 'DOWNLOADING...',
    preparing: 'PREPARING INSTALLER...',
    preparingHelp: 'Opening Android package installer...',
    readyToInstall: 'READY TO INSTALL',
    readySubtitle: 'The APK package is already downloaded on your device.',
    installNowBtn: 'INSTALL NOW',
    cancelDownloadBtn: 'CANCEL',
    retryBtn: 'RETRY',
    openSettingsBtn: 'OPEN SETTINGS',
    browserFallback: 'Download from browser',
    errorTitle: 'UPDATE ERROR',
    downloadError: 'Download could not be completed. Check your connection and try again.',
    noApkError: 'This release does not have an attached APK asset for direct download yet.',
    installError: 'Could not launch the Android package installer.',
    permissionError: 'Permission required: enable "Install unknown apps" for Open Parcels.',
    toastTitlePrefix: 'NEW VERSION',
    toastSubtitle: 'Tap here to download and install',
    toastReadySubtitle: 'Downloaded ? Tap to install now',
  },
};
