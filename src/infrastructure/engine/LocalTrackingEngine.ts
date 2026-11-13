import { ITrackingEngine } from './ITrackingEngine';
import { Carrier, DetectedCarrier } from '../../domain/models/carrier';
import { Parcel, TrackRequestParams } from '../../domain/models/parcel';
import { TrackingEvent } from '../../domain/models/event';
import { CanonicalStatus } from '../../domain/models/status';
import {
  CARRIERS_CATALOG,
  detectCandidateCarriers,
  findCarrierBySlug,
} from '../../domain/validators/detection';
import { TrackingEngineError } from './errors';
import { getLocalizedStatusText } from './mapper';
import { fetchInPostLive } from './inpostLive';
import { fetchCorreosSpainLive, fetchCorreosExpressLive } from './correosLive';
import { fetchGLSSpainLive, fetchSEURLive } from './spainCouriersLive';

export class LocalTrackingEngine implements ITrackingEngine {
  readonly engineName = 'Open Parcels Embedded (Local-First)';
  readonly isLocal = true;

  async getCarriers(): Promise<Carrier[]> {
    return CARRIERS_CATALOG;
  }

  async detect(trackingNumber: string, countryHint?: string): Promise<DetectedCarrier[]> {
    return detectCandidateCarriers(trackingNumber, countryHint);
  }

  async track(params: TrackRequestParams): Promise<Parcel> {
    const rawNumber = params.trackingNumber.trim();
    if (!rawNumber) {
      throw new TrackingEngineError(
        'El número de seguimiento no puede estar vacío',
        'MISSING_NUMBER',
        400
      );
    }

    const candidates = await this.detect(rawNumber, params.destinationCountry);
    let selectedCarrier: Carrier;

    if (params.carrierHint) {
      selectedCarrier = findCarrierBySlug(params.carrierHint);
    } else if (candidates.length > 0) {
      const liveCandidate =
        params.allowSimulated === true
          ? undefined
          : candidates.find((c) => c.carrier.hasLiveTracking);
      selectedCarrier = liveCandidate ? liveCandidate.carrier : candidates[0].carrier;
    } else {
      selectedCarrier = findCarrierBySlug('correos-spain');
    }

    if (selectedCarrier.requiresPostalCode && !params.postalCode?.trim()) {
      throw new TrackingEngineError(
        `Código postal obligatorio para ${selectedCarrier.name}`,
        'POSTAL_CODE_REQUIRED',
        422
      );
    }

    if (params.allowSimulated === false && !selectedCarrier.hasLiveTracking) {
      throw new TrackingEngineError(
        `El transportista ${selectedCarrier.name} no dispone de adaptador en vivo`,
        'CARRIER_NOT_IMPLEMENTED',
        501
      );
    }

    const slug = selectedCarrier.slug;
    const postalCode = params.postalCode?.trim() || '';

    // Real live tracking for InPost / Mondial Relay
    if ((slug === 'inpost' || slug === 'inpost-es') && params.allowSimulated !== true) {
      try {
        return await fetchInPostLive(
          rawNumber,
          postalCode,
          selectedCarrier,
          params.destinationCountry,
          params.lang
        );
      } catch (err) {
        if (err instanceof TrackingEngineError && err.code === 'POSTAL_CODE_REQUIRED') {
          throw err;
        }
        if (params.allowSimulated === false) {
          throw err;
        }
        console.warn('InPost live fetch failed, falling back to local backup:', err);
      }
    }

    // Real live tracking for Correos España
    if (slug === 'correos-spain' && params.allowSimulated !== true) {
      try {
        return await fetchCorreosSpainLive(rawNumber, selectedCarrier, params.lang);
      } catch (err) {
        if (err instanceof TrackingEngineError && err.code === 'POSTAL_CODE_REQUIRED') {
          throw err;
        }
        if (params.allowSimulated === false) {
          throw err;
        }
        console.warn('Correos España live fetch failed, falling back to local backup:', err);
      }
    }

    // Real live tracking for Correos Express
    if (slug === 'correosexpress' && params.allowSimulated !== true) {
      try {
        return await fetchCorreosExpressLive(rawNumber, selectedCarrier, params.lang);
      } catch (err) {
        if (err instanceof TrackingEngineError && err.code === 'POSTAL_CODE_REQUIRED') {
          throw err;
        }
        if (params.allowSimulated === false) {
          throw err;
        }
        console.warn('Correos Express live fetch failed, falling back to local backup:', err);
      }
    }

    // Real live tracking for GLS Spain
    if (slug === 'asm-gls-spain' && params.allowSimulated !== true) {
      try {
        return await fetchGLSSpainLive(rawNumber, postalCode, selectedCarrier, params.lang);
      } catch (err) {
        if (err instanceof TrackingEngineError && err.code === 'POSTAL_CODE_REQUIRED') {
          throw err;
        }
        if (params.allowSimulated === false) {
          throw err;
        }
        console.warn('GLS Spain live fetch failed, falling back to local backup:', err);
      }
    }

    // Real live tracking for SEUR
    if (slug === 'seur' && params.allowSimulated !== true) {
      try {
        return await fetchSEURLive(rawNumber, postalCode, selectedCarrier, params.lang);
      } catch (err) {
        if (err instanceof TrackingEngineError && err.code === 'POSTAL_CODE_REQUIRED') {
          throw err;
        }
        if (params.allowSimulated === false) {
          throw err;
        }
        console.warn('SEUR live fetch failed, falling back to local backup:', err);
      }
    }

    const cleanUpper = rawNumber.toUpperCase();
    const isAliExpress323 = /^323\d{20}$/.test(cleanUpper);
    const isChainedJourney =
      slug === 'cainiao' ||
      cleanUpper.startsWith('LP') ||
      (isAliExpress323 && (slug === 'cainiao' || slug === 'correosexpress'));

    const now = new Date();
    let additionalCarriers: Carrier[] | undefined;
    let lastMileCarrier: Carrier | undefined;
    let lastMileTrackingNumber: string | undefined;
    let events: TrackingEvent[] = [];
    let status: CanonicalStatus = 'in_transit';
    let progress = 45;
    let origin = { code: 'CN', name: 'China' };
    let destination = { code: 'ES', name: 'España' };
    let serviceType: string | undefined;
    let estimatedDelivery: string | undefined;

    if (slug === 'inpost' || slug === 'inpost-es') {
      origin = { code: 'ES', name: 'España' };
      destination = { code: 'ES', name: 'España' };
      status = 'info_received';
      progress = 15;
      serviceType = 'Punto Pack / Locker';

      events = [
        {
          id: 'ev-1',
          date: new Date(now.getTime() - 3600 * 1000 * 18).toISOString(),
          status: 'info_received',
          stage: 'created',
          description: 'El envío ha sido registrado telemáticamente por el remitente.',
          location: 'Hub Central InPost',
          carrierSlug: slug,
          carrierName: selectedCarrier.name,
          eventCode: 'INP.REG.01',
        },
        {
          id: 'ev-2',
          date: new Date(now.getTime() - 3600 * 1000 * 6).toISOString(),
          status: 'info_received',
          stage: 'created',
          description: 'Paquete en espera de entrega en Punto Pack / Locker.',
          location: `Locker ${postalCode || '28001'}`,
          carrierSlug: slug,
          carrierName: selectedCarrier.name,
          eventCode: 'INP.LOC.02',
        },
      ];
    } else if (slug === 'seur') {
      origin = { code: 'ES', name: 'España' };
      destination = { code: 'ES', name: 'España' };
      status = 'out_for_delivery';
      progress = 85;
      serviceType = 'SEUR 24';
      estimatedDelivery = new Date(now.getTime() + 3600 * 1000 * 8).toISOString();

      events = [
        {
          id: 'ev-1',
          date: new Date(now.getTime() - 86400 * 1000 * 2).toISOString(),
          status: 'info_received',
          stage: 'created',
          description: 'Envío documentado en origen.',
          location: 'Madrid, ES',
          carrierSlug: 'seur',
          carrierName: selectedCarrier.name,
          eventCode: 'SEUR.REG',
        },
        {
          id: 'ev-2',
          date: new Date(now.getTime() - 86400 * 1000 * 1).toISOString(),
          status: 'in_transit',
          stage: 'transit',
          description: 'En tránsito por red nacional SEUR.',
          location: 'Centro Logístico Nacional, ES',
          carrierSlug: 'seur',
          carrierName: selectedCarrier.name,
          eventCode: 'SEUR.TR',
        },
        {
          id: 'ev-3',
          date: new Date(now.getTime() - 3600 * 1000 * 2).toISOString(),
          status: 'out_for_delivery',
          stage: 'last_mile',
          description: 'En reparto hacia el código postal de destino.',
          location: `CP ${postalCode}, ES`,
          carrierSlug: 'seur',
          carrierName: selectedCarrier.name,
          eventCode: 'SEUR.OOTD',
        },
      ];
    } else if (slug === 'asm-gls-spain') {
      origin = { code: 'ES', name: 'España' };
      destination = { code: 'ES', name: 'España' };
      status = 'in_transit';
      progress = 55;
      serviceType = 'BusinessParcel';

      events = [
        {
          id: 'ev-1',
          date: new Date(now.getTime() - 86400 * 1000 * 1).toISOString(),
          status: 'info_received',
          stage: 'created',
          description: 'Información del envío recibida en GLS Spain.',
          location: 'Barcelona Hub, ES',
          carrierSlug: 'asm-gls-spain',
          carrierName: selectedCarrier.name,
          eventCode: 'GLS.01',
        },
        {
          id: 'ev-2',
          date: new Date(now.getTime() - 3600 * 1000 * 10).toISOString(),
          status: 'in_transit',
          stage: 'transit',
          description: 'Salida de plataforma hacia agencia de destino.',
          location: `Delegación CP ${postalCode}, ES`,
          carrierSlug: 'asm-gls-spain',
          carrierName: selectedCarrier.name,
          eventCode: 'GLS.02',
        },
      ];
    } else if (isChainedJourney) {
      const cainiaoCarrier = findCarrierBySlug('cainiao');
      const ceCarrier = findCarrierBySlug('correosexpress');
      if (slug === 'correosexpress') {
        additionalCarriers = [cainiaoCarrier];
        lastMileCarrier = ceCarrier;
      } else {
        lastMileCarrier = ceCarrier;
        additionalCarriers = [ceCarrier];
      }
      lastMileTrackingNumber = isAliExpress323
        ? cleanUpper
        : `69${cleanUpper.replace(/\D/g, '').slice(0, 14).padEnd(14, '0')}`;
      status = 'out_for_delivery';
      progress = 85;
      serviceType = 'AliExpress Standard / Last-Mile Handover';

      events = [
        {
          id: 'ev-1',
          date: new Date(now.getTime() - 86400 * 1000 * 7).toISOString(),
          status: 'info_received',
          stage: 'created',
          description: 'Pedido recibido por la plataforma logística Cainiao.',
          location: 'Shenzhen Warehouse, CN',
          carrierSlug: 'cainiao',
          carrierName: 'Cainiao Global',
          eventCode: 'CN.WH.01',
          carrierIndex: 0,
        },
        {
          id: 'ev-2',
          date: new Date(now.getTime() - 86400 * 1000 * 5).toISOString(),
          status: 'in_transit',
          stage: 'transit',
          description: 'Salida del vuelo internacional con destino al país receptor.',
          location: 'Aeropuerto Internacional Shenzhen (SZX)',
          carrierSlug: 'cainiao',
          carrierName: 'Cainiao Global',
          eventCode: 'CN.AIR.OUT',
          carrierIndex: 0,
        },
        {
          id: 'ev-3',
          date: new Date(now.getTime() - 86400 * 1000 * 2).toISOString(),
          status: 'in_transit',
          stage: 'customs',
          description: 'Despacho de aduanas completado con éxito en destino.',
          location: 'Aduana Madrid-Barajas (MAD), ES',
          carrierSlug: 'cainiao',
          carrierName: 'Cainiao Global',
          eventCode: 'ES.CUS.OK',
          carrierIndex: 0,
        },
        {
          id: 'ev-4',
          date: new Date(now.getTime() - 86400 * 1000 * 1).toISOString(),
          status: 'in_transit',
          stage: 'handover',
          description: 'Transferido a operador local de última milla.',
          location: 'Centro Logístico Coslada, Madrid',
          carrierSlug: 'correosexpress',
          carrierName: 'Correos Express',
          eventCode: 'CXP.IN.01',
          carrierIndex: 1,
        },
        {
          id: 'ev-5',
          date: new Date(now.getTime() - 3600 * 1000 * 3).toISOString(),
          status: 'out_for_delivery',
          stage: 'last_mile',
          description: 'En reparto: el mensajero se encuentra en ruta para entrega en el domicilio.',
          location: 'Delegación Destino',
          carrierSlug: 'correosexpress',
          carrierName: 'Correos Express',
          eventCode: 'CXP.OOTD.05',
          carrierIndex: 1,
        },
      ];
    } else if (slug === 'ups' || cleanUpper.startsWith('1Z')) {
      origin = { code: 'DE', name: 'Alemania' };
      destination = { code: 'ES', name: 'España' };
      status = 'in_transit';
      progress = 55;
      serviceType = 'UPS Standard';

      events = [
        {
          id: 'ev-1',
          date: new Date(now.getTime() - 86400 * 1000 * 3).toISOString(),
          status: 'info_received',
          stage: 'created',
          description: 'Etiqueta de envío creada.',
          location: 'Köln, DE',
          carrierSlug: 'ups',
          carrierName: 'UPS',
        },
        {
          id: 'ev-2',
          date: new Date(now.getTime() - 86400 * 1000 * 2).toISOString(),
          status: 'in_transit',
          stage: 'transit',
          description: 'Escaneo de salida en instalación de clasificación.',
          location: 'Frankfurt Hub, DE',
          carrierSlug: 'ups',
          carrierName: 'UPS',
        },
        {
          id: 'ev-3',
          date: new Date(now.getTime() - 3600 * 1000 * 12).toISOString(),
          status: 'in_transit',
          stage: 'transit',
          description: 'Llegada al centro de distribución internacional.',
          location: 'Madrid Hub, ES',
          carrierSlug: 'ups',
          carrierName: 'UPS',
        },
      ];
    } else {
      origin = { code: 'ES', name: 'España' };
      destination = { code: 'ES', name: 'España' };
      status = 'in_transit';
      progress = 35;

      events = [
        {
          id: 'ev-1',
          date: new Date(now.getTime() - 86400 * 1000 * 2).toISOString(),
          status: 'info_received',
          stage: 'created',
          description: 'Pre-registrado en el sistema.',
          location: 'Oficina Central',
          carrierSlug: slug,
          carrierName: selectedCarrier.name,
        },
        {
          id: 'ev-2',
          date: new Date(now.getTime() - 3600 * 1000 * 14).toISOString(),
          status: 'in_transit',
          stage: 'transit',
          description: 'En tránsito hacia el centro de distribución provincial.',
          location: 'Centro de Clasificación',
          carrierSlug: slug,
          carrierName: selectedCarrier.name,
        },
      ];
    }

    return {
      id: 'p-' + Math.random().toString(36).substring(2, 9),
      trackingNumber: rawNumber,
      carrier: selectedCarrier,
      additionalCarriers,
      lastMileTrackingNumber,
      lastMileCarrier,
      status,
      statusText: getLocalizedStatusText(status, params.lang),
      progress,
      origin,
      destination,
      postalCode: postalCode || undefined,
      estimatedDelivery,
      daysInTransit: Math.max(1, Math.floor(events.length * 1.2)),
      serviceType,
      fromCache: false,
      isLiveData: false,
      events,
      updatedAt: now.toISOString(),
      createdAt: now.toISOString(),
      isArchived: false,
    };
  }
}