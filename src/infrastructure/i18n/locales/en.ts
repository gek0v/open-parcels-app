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
    avgDays: 'AVG DAYS',
    avgDaysSub: 'DELIVERY TIME',
    topCarrier: 'TOP CARRIER',
    topCarrierSub: 'MOST USED',
    pace: 'ON-TIME PACE',
    paceOptimal: 'OPTIMAL',
    paceNormal: 'NORMAL',
    paceAlert: 'ATTENTION',
    paceUpToDate: 'ON TRACK',
    ofShipments: 'of parcels',
    noData: 'No data',
  },

  // Filters
  filter: {
    active: 'IN TRANSIT',
    delivered: 'DELIVERED',
    archived: 'ARCHIVED',
    design: 'LAYOUT:',
  },

  // Sorting
  sort: {
    label: 'SORT:',
    updated: 'RECENT',
    days: 'DAYS',
    carrier: 'CARRIER',
  },

  // Clipboard Detection Banner
  clipboardBanner: {
    title: 'CLIPBOARD DETECTED',
    addBtn: 'ADD',
    dismissBtn: 'DISMISS',
    dismissAria: 'Dismiss clipboard tracking number',
    addAria: 'Add parcel from clipboard',
  },

  // Search
  search: {
    placeholder: 'Search by alias, code or carrier...',
    clearAria: 'Clear search query',
    searchAria: 'Search parcels',
  },

  // Empty State
  empty: {
    noResults: 'NO RESULTS',
    noActive: 'NO SHIPMENTS IN TRANSIT',
    noDelivered: 'NO DELIVERED PARCELS',
    noArchived: 'NO ARCHIVED PARCELS',
    subNoResults: 'Try searching with a different parcel code, alias or carrier name.',
    subActive: 'Tap "+" or "SCAN CODE" to track your first shipment with camera or tracking code.',
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
    copySummaryBtn: 'COPY SUMMARY',
    shareSummaryBtn: 'SHARE',
  },

  // Modals
  newParcelModal: {
    title: 'NEW SHIPMENT',
    subtitle: 'Enter tracking code or scan the barcode',
    trackingNumberLabel: 'TRACKING NUMBER',
    trackingPlaceholder: 'e.g. 1Z9999999999999999 or PQ481920391ES',
    postalCodeLabel: 'POSTAL CODE (REQUIRED)',
    postalCodePlaceholder: 'e.g. 28001',
    postalCodeHint: 'This courier requires destination postal code.',
    aliasLabel: 'FRIENDLY ALIAS (OPTIONAL)',
    aliasPlaceholder: 'e.g. Mechanical Keyboard or Shoes',
    detectedCarrier: 'DETECTED CARRIER',
    selectCarrier: 'SELECT CARRIER',
    startTrackingBtn: 'START TRACKING',
    cameraScanBtn: 'SCAN WITH CAMERA',
    cancelBtn: 'CANCEL',
  },

  deleteModal: {
    title: 'CONFIRM DELETION',
    heading: 'DELETE THIS SHIPMENT?',
    warning: 'This will permanently remove the parcel and its entire tracking timeline. This cannot be undone.',
    confirmBtn: 'YES, DELETE',
    cancelBtn: 'CANCEL',
  },

  renameModal: {
    title: 'RENAME SHIPMENT',
    label: 'CUSTOM ALIAS',
    placeholder: 'e.g. Vinted Clothes, New Phone...',
    saveBtn: 'SAVE ALIAS',
    cancelBtn: 'CANCEL',
  },

  updateModal: {
    title: 'NEW UPDATE AVAILABLE',
    closeAria: 'Close update dialog',
    current: 'CURRENT',
    newBadge: 'NEW',
    apkOfficial: 'OFFICIAL APK',
    apkInstallable: 'INSTALLABLE APK',
    changelogTitle: "WHAT'S NEW IN THIS RELEASE:",
    laterBtn: 'LATER',
    updateBtn: 'UPDATE',
    downloading: 'DOWNLOADING...',
    preparing: 'PREPARING INSTALLER...',
    preparingHelp: 'Opening native Android package installer...',
    readyToInstall: 'READY TO INSTALL',
    readySubtitle: 'The APK package has finished downloading to your device.',
    installNowBtn: 'INSTALL NOW',
    cancelDownloadBtn: 'CANCEL',
    retryBtn: 'RETRY',
    openSettingsBtn: 'OPEN SETTINGS',
    browserFallback: 'Download from browser',
    errorTitle: 'UPDATE ERROR',
    downloadError: 'Failed to download the APK. Check your connection and try again.',
    noApkError: 'This release does not have a downloadable APK asset attached.',
    installError: 'Failed to launch the Android package installer.',
    permissionError: 'Permission needed: please allow "Install unknown apps" for Open Parcels.',
    toastTitlePrefix: 'NEW VERSION',
    toastSubtitle: 'Tap here to download and install',
    toastReadySubtitle: 'Downloaded • Tap to install now',
  },

  // Backup & Restore
  backup: {
    title: 'BACKUP & RESTORE',
    subtitle: 'Private on-device JSON parcel management',
    btnLabel: 'BACKUP',
    exportCardTitle: 'EXPORT BACKUP (JSON)',
    exportCardDesc: 'Save a versioned JSON file containing all your shipments, milestones, and aliases.',
    exportBtn: 'EXPORT TO JSON FILE',
    exportSuccess: 'Backup file exported successfully (%d parcels).',
    exportError: 'Failed to export backup file.',
    importCardTitle: 'RESTORE FROM JSON FILE',
    importCardDesc: 'Select a previous JSON backup. Existing parcels will be smartly merged without duplicates.',
    importBtn: 'SELECT JSON FILE',
    importSuccessTitle: 'Restore Completed',
    importSuccessDesc: '%d new parcels imported, %d parcels updated.',
    importErrorTitle: 'Restore Error',
    importInvalid: 'Selected file does not have a valid Open Parcels structure.',
    close: 'CLOSE',
  },

  // Share
  share: {
    shareAria: 'Share parcel details',
    copySummary: 'Copy summary',
    shareSummary: 'Share summary',
    copiedToast: 'Formatted parcel summary copied to clipboard!',
    copyBtn: 'COPY SUMMARY',
    shareBtn: 'SHARE',
  },
};
