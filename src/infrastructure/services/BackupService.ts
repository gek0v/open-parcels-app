import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Parcel } from '../../domain/models/parcel';
import { parcelRepository } from '../storage/ParcelRepository';
import { cleanTrackingNumber } from '../../domain/validators/checksums';
import { findCarrierBySlug } from '../../domain/validators/detection';

export const BACKUP_APP_IDENTIFIER = 'open-parcels';
export const BACKUP_CURRENT_VERSION = 1;

export interface BackupData {
  version: number;
  app: 'open-parcels';
  exportedAt: string; // ISO-8601
  parcels: Parcel[];
}

export interface BackupValidationResult {
  valid: boolean;
  errors: string[];
  data?: BackupData;
}

export interface MergeResult {
  merged: Parcel[];
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  changedParcels: Parcel[];
}

export interface ImportResult {
  success: boolean;
  totalInFile: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  error?: string;
  errors?: string[];
}

export interface ExportResult {
  success: boolean;
  fileUri: string;
  fileName: string;
  parcelCount: number;
  data: BackupData;
}

/**
 * Validates the schema and structure of an Open Parcels JSON backup.
 */
export function validateBackupData(raw: unknown): BackupValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['El archivo no contiene un objeto JSON válido.'] };
  }

  const obj = raw as Record<string, any>;

  if (obj.app !== BACKUP_APP_IDENTIFIER) {
    errors.push(`Identificador de aplicación inválido (esperado: "${BACKUP_APP_IDENTIFIER}").`);
  }

  if (typeof obj.version !== 'number' || obj.version < 1) {
    errors.push('Versión de esquema inválida o ausente en el archivo de respaldo.');
  }

  if (typeof obj.exportedAt !== 'string' || isNaN(Date.parse(obj.exportedAt))) {
    errors.push('Fecha de exportación inválida o ausente (formato ISO-8601 requerido).');
  }

  if (!Array.isArray(obj.parcels)) {
    errors.push('El campo "parcels" debe ser un array.');
    return { valid: false, errors };
  }

  // Validate individual parcels
  obj.parcels.forEach((p, idx) => {
    const prefix = `Paquete #${idx + 1}`;
    if (!p || typeof p !== 'object') {
      errors.push(`${prefix}: no es un objeto válido.`);
      return;
    }

    if (!p.trackingNumber || typeof p.trackingNumber !== 'string' || !p.trackingNumber.trim()) {
      errors.push(`${prefix}: número de seguimiento ausente o vacío.`);
    }

    if (!p.carrier || typeof p.carrier !== 'object' || !p.carrier.slug || typeof p.carrier.slug !== 'string') {
      errors.push(`${prefix} (${p.trackingNumber || 'sin código'}): transportista inválido.`);
    }

    if (!p.status || typeof p.status !== 'string') {
      errors.push(`${prefix} (${p.trackingNumber || 'sin código'}): estado del envío ausente.`);
    }

    if (p.events && !Array.isArray(p.events)) {
      errors.push(`${prefix} (${p.trackingNumber || 'sin código'}): "events" debe ser un array.`);
    } else if (Array.isArray(p.events)) {
      p.events.forEach((ev: any, evIdx: number) => {
        if (!ev || typeof ev !== 'object') {
          errors.push(`${prefix} evento #${evIdx + 1}: estructura inválida.`);
        } else if (!ev.date || isNaN(Date.parse(ev.date))) {
          errors.push(`${prefix} evento #${evIdx + 1}: fecha inválida.`);
        }
      });
    }

    if (p.createdAt && isNaN(Date.parse(p.createdAt))) {
      errors.push(`${prefix}: fecha "createdAt" con formato inválido.`);
    }
    if (p.updatedAt && isNaN(Date.parse(p.updatedAt))) {
      errors.push(`${prefix}: fecha "updatedAt" con formato inválido.`);
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: obj as BackupData,
  };
}

/**
 * Merges incoming backup parcels with existing local parcels intelligently:
 * - Upserts by clean trackingNumber (no duplicates)
 * - Preserves existing customAlias if present
 * - Updates tracking status and events if imported parcel is newer or has more events
 */
export function mergeParcels(
  existingParcels: Parcel[],
  incomingParcels: Parcel[],
  options: { preserveCustomAlias?: boolean } = { preserveCustomAlias: true }
): MergeResult {
  const mergedMap = new Map<string, Parcel>();
  const changedParcels: Parcel[] = [];
  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // Index existing parcels by clean tracking number
  for (const p of existingParcels) {
    const key = cleanTrackingNumber(p.trackingNumber);
    mergedMap.set(key, { ...p });
  }

  for (const inc of incomingParcels) {
    const key = cleanTrackingNumber(inc.trackingNumber);
    const existing = mergedMap.get(key);

    if (!existing) {
      // New parcel: ensure carrier metadata and dates are well-formed
      const baseCarrier = findCarrierBySlug(inc.carrier?.slug || '');
      const newParcel: Parcel = {
        ...inc,
        id: inc.id || `parcel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        carrier: {
          ...baseCarrier,
          ...inc.carrier,
        },
        events: Array.isArray(inc.events) ? inc.events : [],
        daysInTransit: typeof inc.daysInTransit === 'number' ? inc.daysInTransit : 0,
        progress: typeof inc.progress === 'number' ? inc.progress : 0,
        createdAt: inc.createdAt || new Date().toISOString(),
        updatedAt: inc.updatedAt || new Date().toISOString(),
        isArchived: !!inc.isArchived,
      };

      mergedMap.set(key, newParcel);
      changedParcels.push(newParcel);
      importedCount++;
    } else {
      // Existing parcel: check if incoming is newer or has more events
      const existingLatestDate = existing.events?.length
        ? new Date(existing.events[existing.events.length - 1].date).getTime()
        : 0;
      const incomingLatestDate = inc.events?.length
        ? new Date(inc.events[inc.events.length - 1].date).getTime()
        : 0;
      const existingUpdated = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const incomingUpdated = new Date(inc.updatedAt || inc.createdAt || 0).getTime();

      const incomingIsNewer =
        incomingLatestDate > existingLatestDate ||
        (incomingLatestDate === existingLatestDate && incomingUpdated > existingUpdated) ||
        (inc.events?.length || 0) > (existing.events?.length || 0);

      let wasModified = false;

      if (incomingIsNewer) {
        // Update journey & status details
        existing.status = inc.status;
        existing.statusText = inc.statusText || existing.statusText;
        existing.progress = inc.progress ?? existing.progress;
        existing.events = Array.isArray(inc.events) ? inc.events : existing.events;
        existing.daysInTransit = inc.daysInTransit ?? existing.daysInTransit;
        existing.deliveredAt = inc.deliveredAt ?? existing.deliveredAt;
        existing.estimatedDelivery = inc.estimatedDelivery ?? existing.estimatedDelivery;
        existing.origin = inc.origin || existing.origin;
        existing.destination = inc.destination || existing.destination;
        existing.serviceType = inc.serviceType || existing.serviceType;
        existing.weight = inc.weight || existing.weight;
        existing.flightLegs = inc.flightLegs || existing.flightLegs;
        existing.isLiveData = inc.isLiveData ?? existing.isLiveData;
        existing.updatedAt = inc.updatedAt || new Date().toISOString();
        wasModified = true;
      }

      // Preserve existing custom alias unless user didn't have one and incoming has one
      if (options.preserveCustomAlias !== false && existing.customAlias) {
        // Keep existing alias intact
      } else if (inc.customAlias && inc.customAlias !== existing.customAlias) {
        existing.customAlias = inc.customAlias;
        existing.updatedAt = new Date().toISOString();
        wasModified = true;
      }

      // Preserve existing user notes if incoming is empty
      if (!existing.notes && inc.notes) {
        existing.notes = inc.notes;
        wasModified = true;
      }

      if (wasModified) {
        mergedMap.set(key, existing);
        changedParcels.push(existing);
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  return {
    merged: Array.from(mergedMap.values()),
    importedCount,
    updatedCount,
    skippedCount,
    changedParcels,
  };
}

export class BackupService {
  /**
   * Generates a versioned backup payload from current repository parcels.
   */
  static async createBackupPayload(): Promise<BackupData> {
    const parcels = await parcelRepository.getAll();
    return {
      version: BACKUP_CURRENT_VERSION,
      app: BACKUP_APP_IDENTIFIER,
      exportedAt: new Date().toISOString(),
      parcels,
    };
  }

  /**
   * Exports parcels to a JSON file and shares it via system share sheet.
   */
  static async exportBackup(): Promise<ExportResult> {
    const payload = await this.createBackupPayload();
    const jsonString = JSON.stringify(payload, null, 2);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `open-parcels-backup-${timestamp}.json`;

    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
    const fileUri = `${baseDir}${fileName}`;

    if (baseDir) {
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType ? (FileSystem.EncodingType.UTF8 as any) : 'utf8',
      });
    }

    // Share via expo-sharing if available
    try {
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable && fileUri) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar copia de seguridad Open Parcels',
          UTI: 'public.json',
        });
      } else if (typeof document !== 'undefined') {
        // Web fallback browser file download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }
    } catch (shareErr) {
      console.warn('Sharing error in BackupService.exportBackup:', shareErr);
    }

    return {
      success: true,
      fileUri,
      fileName,
      parcelCount: payload.parcels.length,
      data: payload,
    };
  }

  /**
   * Imports and merges backup from a raw JSON string.
   */
  static async importBackupFromJsonString(jsonString: string): Promise<ImportResult> {
    let rawObj: unknown;
    try {
      rawObj = JSON.parse(jsonString);
    } catch {
      return {
        success: false,
        totalInFile: 0,
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: 'El archivo seleccionado no tiene un formato JSON válido.',
      };
    }

    const validation = validateBackupData(rawObj);
    if (!validation.valid || !validation.data) {
      return {
        success: false,
        totalInFile: 0,
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: validation.errors[0] || 'Esquema de respaldo inválido.',
        errors: validation.errors,
      };
    }

    const currentParcels = await parcelRepository.getAll();
    const merge = mergeParcels(currentParcels, validation.data.parcels);

    // Save changed parcels to repository
    for (const p of merge.changedParcels) {
      await parcelRepository.save(p);
    }

    return {
      success: true,
      totalInFile: validation.data.parcels.length,
      importedCount: merge.importedCount,
      updatedCount: merge.updatedCount,
      skippedCount: merge.skippedCount,
    };
  }

  /**
   * Prompts user with expo-document-picker to select a backup JSON file and restores it.
   */
  static async importBackupFromDocumentPicker(): Promise<
    ImportResult & { cancelled?: boolean }
  > {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          cancelled: true,
          totalInFile: 0,
          importedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
        };
      }

      const asset = result.assets[0];
      let jsonString = '';

      if (asset.file && typeof (asset.file as any).text === 'function') {
        jsonString = await (asset.file as any).text();
      } else if (asset.uri.startsWith('blob:') || asset.uri.startsWith('http')) {
        const response = await fetch(asset.uri);
        jsonString = await response.text();
      } else {
        jsonString = await FileSystem.readAsStringAsync(asset.uri);
      }

      return await this.importBackupFromJsonString(jsonString);
    } catch (err: any) {
      console.warn('BackupService.importBackupFromDocumentPicker failed:', err);
      return {
        success: false,
        totalInFile: 0,
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: err.message || 'Error al leer el archivo de respaldo seleccionado.',
      };
    }
  }
}
