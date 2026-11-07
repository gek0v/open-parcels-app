import AsyncStorage from '@react-native-async-storage/async-storage';
import { Parcel } from '../../domain/models/parcel';
import { findCarrierBySlug } from '../../domain/validators/detection';

const STORAGE_KEY = '@open_parcels:saved_parcels_v1';

export class ParcelRepository {
  async getAll(): Promise<Parcel[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return this.seedInitialParcels();
      }
      const parsed: Parcel[] = JSON.parse(raw);
      return parsed;
    } catch (e) {
      console.warn('Error reading parcels from storage:', e);
      return [];
    }
  }

  async getById(id: string): Promise<Parcel | null> {
    const all = await this.getAll();
    return all.find((p) => p.id === id) || null;
  }

  async save(parcel: Parcel): Promise<void> {
    const all = await this.getAll();
    const existingIndex = all.findIndex(
      (p) => p.id === parcel.id || p.trackingNumber === parcel.trackingNumber
    );

    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...parcel };
    } else {
      all.unshift(parcel);
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async delete(id: string): Promise<void> {
    const all = await this.getAll();
    const filtered = all.filter((p) => p.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  async toggleArchive(id: string): Promise<Parcel | null> {
    const all = await this.getAll();
    const target = all.find((p) => p.id === id);
    if (target) {
      target.isArchived = !target.isArchived;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      return target;
    }
    return null;
  }

  private async seedInitialParcels(): Promise<Parcel[]> {
    const now = new Date();

    const sampleParcels: Parcel[] = [
      {
        id: 'seed-1',
        trackingNumber: 'LP00561234567890',
        customAlias: 'Teclado Mecánico Custom',
        carrier: findCarrierBySlug('cainiao'),
        additionalCarriers: [findCarrierBySlug('correos-express')],
        lastMileCarrier: findCarrierBySlug('correos-express'),
        status: 'out_for_delivery',
        statusText: 'En reparto / Última milla',
        progress: 85,
        origin: { code: 'CN', name: 'China' },
        destination: { code: 'ES', name: 'España' },
        daysInTransit: 6,
        updatedAt: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
        createdAt: new Date(now.getTime() - 86400 * 1000 * 6).toISOString(),
        isArchived: false,
        events: [
          {
            id: 'ev-1',
            date: new Date(now.getTime() - 86400 * 1000 * 6).toISOString(),
            status: 'info_received',
            stage: 'created',
            description: 'Pedido recibido en almacén central de clasificación.',
            location: 'Shenzhen Hub, CN',
            carrierSlug: 'cainiao',
            carrierName: 'Cainiao Global',
            eventCode: 'CN.SZX.01',
          },
          {
            id: 'ev-2',
            date: new Date(now.getTime() - 86400 * 1000 * 4).toISOString(),
            status: 'in_transit',
            stage: 'transit',
            description: 'Embarque aéreo internacional completado.',
            location: 'Vuelo SZX-MAD',
            carrierSlug: 'cainiao',
            carrierName: 'Cainiao Global',
            eventCode: 'CN.FLIGHT.DEP',
          },
          {
            id: 'ev-3',
            date: new Date(now.getTime() - 86400 * 1000 * 2).toISOString(),
            status: 'in_transit',
            stage: 'customs',
            description: 'Despacho aduanero de importación finalizado sin incidencias.',
            location: 'Aduana Madrid-Barajas (MAD)',
            carrierSlug: 'cainiao',
            carrierName: 'Cainiao Global',
            eventCode: 'CUS.RELEASE',
          },
          {
            id: 'ev-4',
            date: new Date(now.getTime() - 86400 * 1000 * 1).toISOString(),
            status: 'in_transit',
            stage: 'pickup',
            description: 'Recibido en centro logístico de última milla.',
            location: 'Coslada Distribución, Madrid',
            carrierSlug: 'correos-express',
            carrierName: 'Correos Express',
            eventCode: 'CXP.HUB.IN',
          },
          {
            id: 'ev-5',
            date: new Date(now.getTime() - 1000 * 60 * 50).toISOString(),
            status: 'out_for_delivery',
            stage: 'delivery',
            description: 'En reparto: el mensajero se encuentra en su ruta habitual.',
            location: 'Reparto Madrid Norte',
            carrierSlug: 'correos-express',
            carrierName: 'Correos Express',
            eventCode: 'CXP.OOTD.01',
          },
        ],
      },
      {
        id: 'seed-2',
        trackingNumber: '75616714',
        customAlias: 'Vinted Pack Zapatillas',
        carrier: findCarrierBySlug('inpost'),
        status: 'info_received',
        statusText: 'Información recibida / Pre-registrado',
        progress: 15,
        origin: { code: 'ES', name: 'España' },
        destination: { code: 'ES', name: 'España' },
        postalCode: '47140',
        daysInTransit: 1,
        updatedAt: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
        createdAt: new Date(now.getTime() - 86400 * 1000 * 1).toISOString(),
        isArchived: false,
        events: [
          {
            id: 'inp-1',
            date: new Date(now.getTime() - 86400 * 1000 * 1).toISOString(),
            status: 'info_received',
            stage: 'created',
            description: 'El envío ha sido registrado telemáticamente por el remitente.',
            location: 'Hub Central InPost',
            carrierSlug: 'inpost',
            carrierName: 'InPost / Mondial Relay',
            eventCode: 'CRE.1001',
          },
          {
            id: 'inp-2',
            date: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
            status: 'info_received',
            stage: 'created',
            description: 'En espera de depósito en Punto Pack o Lockers.',
            location: 'Punto Pack 47140',
            carrierSlug: 'inpost',
            carrierName: 'InPost / Mondial Relay',
            eventCode: 'LOC.WAIT',
          },
        ],
      },
      {
        id: 'seed-3',
        trackingNumber: '1Z9999999999999999',
        customAlias: 'MacBook Pro M-Series',
        carrier: findCarrierBySlug('ups'),
        status: 'delivered',
        statusText: 'Entregado',
        progress: 100,
        origin: { code: 'IE', name: 'Irlanda' },
        destination: { code: 'ES', name: 'España' },
        deliveredAt: new Date(now.getTime() - 86400 * 1000 * 3).toISOString(),
        daysInTransit: 3,
        updatedAt: new Date(now.getTime() - 86400 * 1000 * 3).toISOString(),
        createdAt: new Date(now.getTime() - 86400 * 1000 * 6).toISOString(),
        isArchived: false,
        events: [
          {
            id: 'ups-1',
            date: new Date(now.getTime() - 86400 * 1000 * 6).toISOString(),
            status: 'info_received',
            stage: 'created',
            description: 'Etiqueta creada por Apple Distribution International.',
            location: 'Cork, IE',
            carrierSlug: 'ups',
            carrierName: 'UPS',
          },
          {
            id: 'ups-2',
            date: new Date(now.getTime() - 86400 * 1000 * 4).toISOString(),
            status: 'in_transit',
            stage: 'transit',
            description: 'Escaneo de tránsito en Centro de Distribución Europeo.',
            location: 'Köln, DE',
            carrierSlug: 'ups',
            carrierName: 'UPS',
          },
          {
            id: 'ups-3',
            date: new Date(now.getTime() - 86400 * 1000 * 3).toISOString(),
            status: 'delivered',
            stage: 'completed',
            description: 'Entregado en mano. Firmado por: TITULAR.',
            location: 'Madrid, ES',
            carrierSlug: 'ups',
            carrierName: 'UPS',
          },
        ],
      },
    ];

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sampleParcels));
    return sampleParcels;
  }
}

export const parcelRepository = new ParcelRepository();
