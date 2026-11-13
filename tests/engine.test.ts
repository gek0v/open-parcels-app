import { afterEach, describe, expect, it, mock } from 'bun:test';
import { LocalTrackingEngine } from '../src/infrastructure/engine/LocalTrackingEngine';
import { TrackingEngineError, isPostalCodeRequiredError } from '../src/infrastructure/engine/errors';
import { findCarrierBySlug } from '../src/domain/validators/detection';
import {
  parseCorreosSpainPayload,
  parseCorreosExpressPayload,
  fetchCorreosSpainLive,
  fetchCorreosExpressLive,
} from '../src/infrastructure/engine/correosLive';
import {
  parseGLSSpainPayload,
  parseSEURPayload,
  fetchGLSSpainLive,
  fetchSEURLive,
} from '../src/infrastructure/engine/spainCouriersLive';
import { parseInPostHtmlToParcel } from '../src/infrastructure/engine/inpostLive';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('NativeGoTrackingEngine On-Device Execution', () => {
  it('handles NativeGoTrackingEngine fallback and Go JSON payload mapping', async () => {
    let available = false;
    mock.module('react-native', () => ({
      Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
      Linking: { openURL: async () => {} },
      TurboModuleRegistry: {
        get: () => ({
          isAvailable: () => available,
          detectCarriers: async (_num: string, _country?: string) =>
            JSON.stringify([
              {
                carrier: { slug: 'seur', name: 'SEUR', country: 'ES' },
                confidence: 1.0,
                matched_pattern: 'Native Go SEUR',
                reason: 'Matched pattern: Native Go SEUR',
              },
            ]),
          verifyChecksum: () => true,
          trackShipment: async () =>
            JSON.stringify({
              tracking_number: '36150127630406',
              carrier: { slug: 'seur', name: 'SEUR', country: 'ES' },
              status: 'delivered',
              status_text: 'Entregado',
              progress: 100,
              days_in_transit: 2,
              is_live_data: true,
              events: [],
              updated_at: '2026-11-11T10:00:00Z',
            }),
        }),
      },
    }));

    const { NativeGoTrackingEngine } = await import(
      '../src/infrastructure/engine/NativeGoTrackingEngine'
    );
    const nativeEngine = new NativeGoTrackingEngine();

    expect(nativeEngine.isNativeLoaded).toBe(false);
    const fallbackDetected = await nativeEngine.detect('36150127630406', 'ES');
    expect(fallbackDetected[0].carrier.slug).toBe('seur');

    available = true;
    expect(nativeEngine.isNativeLoaded).toBe(true);
    const nativeDetected = await nativeEngine.detect('36150127630406', 'ES');
    expect(nativeDetected[0].matchedRule).toBe('Native Go SEUR');

    const tracked = await nativeEngine.track({
      trackingNumber: '36150127630406',
      postalCode: '28001',
    });
    expect(tracked.status).toBe('delivered');
    expect(tracked.isLiveData).toBe(true);
    expect(tracked.carrier.requiresPostalCode).toBe(true);
  });
});

describe('InPost Live Parser & Local Engine Integration', () => {
  const sampleInPostHtml = `<!DOCTYPE html><html><body>
<astro-island uid="test-inpost" props="{&quot;locale&quot;:[0,&quot;es&quot;],&quot;country&quot;:[0,&quot;ES&quot;],&quot;zipCode&quot;:[0,&quot;47140&quot;],&quot;trackingDetails&quot;:[0,{&quot;packageId&quot;:[0,&quot;75616714&quot;],&quot;milestones&quot;:[1,[[0,{&quot;type&quot;:[0,&quot;IN_TRANSIT&quot;],&quot;name&quot;:[0,&quot;En camino&quot;],&quot;date&quot;:[0,&quot;2026-11-11T12:53:58.564Z&quot;],&quot;events&quot;:[1,[[0,{&quot;code&quot;:[0,&quot;MMD.1001&quot;],&quot;name&quot;:[0,&quot;Recibido en el centro logístico&quot;],&quot;date&quot;:[0,&quot;2026-11-11T12:53:58.564Z&quot;],&quot;description&quot;:[0,&quot;Tu paquete ha sido recibido en uno de nuestros centros logísticos.&quot;]}],[0,{&quot;code&quot;:[0,&quot;FMD.1002&quot;],&quot;name&quot;:[0,&quot;Recogido por el mensajero&quot;],&quot;date&quot;:[0,&quot;2026-11-11T10:56:51.253Z&quot;],&quot;description&quot;:[0,&quot;Tu paquete ha iniciado el tránsito y se dirige a uno de nuestros centros logísticos.&quot;]}]]]}],[0,{&quot;type&quot;:[0,&quot;AT_THE_ORIGIN&quot;],&quot;name&quot;:[0,&quot;En preparación&quot;],&quot;date&quot;:[0,&quot;2026-11-10T19:01:43.002Z&quot;],&quot;events&quot;:[1,[[0,{&quot;code&quot;:[0,&quot;FMD.1001&quot;],&quot;name&quot;:[0,&quot;Listo para ser recogido por el mensajero&quot;],&quot;date&quot;:[0,&quot;2026-11-10T19:01:43.002Z&quot;],&quot;description&quot;:[0,&quot;Tu paquete está preparado y será recogido por nuestros mensajeros pronto.&quot;]}],[0,{&quot;code&quot;:[0,&quot;CRE.1001&quot;],&quot;name&quot;:[0,&quot;En preparación&quot;],&quot;date&quot;:[0,&quot;2026-11-06T18:52:46Z&quot;],&quot;description&quot;:[0,&quot;El envío ha sido registrado informáticamente y estamos a la espera de recibir el paquete.&quot;]}]]]}]]]}],&quot;trackingDetailsStatus&quot;:[0,200]}" client="load"></astro-island>
</body></html>`;

  it('correctly extracts Astro props and normalizes InPost live events without false delivered status', () => {
    const parcel = parseInPostHtmlToParcel(
      sampleInPostHtml,
      '75616714',
      '47140',
      findCarrierBySlug('inpost'),
      'ES',
      'es'
    );

    expect(parcel.trackingNumber).toBe('75616714');
    expect(parcel.status).toBe('in_transit');
    expect(parcel.statusText).toBe('En tránsito');
    expect(parcel.progress).toBe(35);
    expect(parcel.isLiveData).toBe(true);
    expect(parcel.events.length).toBe(4);
    expect(parcel.events[0].eventCode).toBe('MMD.1001');
    expect(parcel.events[0].status).toBe('in_transit');
    expect(parcel.events[2].eventCode).toBe('FMD.1001');
    expect(parcel.events[2].status).toBe('info_received');
    expect(parcel.events[3].eventCode).toBe('CRE.1001');
    expect(parcel.events[3].status).toBe('info_received');
  });

  it('LocalTrackingEngine calls live InPost fetch when online', async () => {
    globalThis.fetch = (async () =>
      new Response(sampleInPostHtml, { status: 200, headers: { 'Content-Type': 'text/html' } })
    ) as unknown as typeof fetch;

    const engine = new LocalTrackingEngine();
    const parcel = await engine.track({
      trackingNumber: '75616714',
      carrierHint: 'inpost',
      postalCode: '47140',
    });

    expect(parcel.trackingNumber).toBe('75616714');
    expect(parcel.status).toBe('in_transit');
    expect(parcel.isLiveData).toBe(true);
    expect(parcel.events[0].description).toBe(
      'Tu paquete ha sido recibido en uno de nuestros centros logísticos.'
    );
  });
});

describe('Correos España & Correos Express Live Adapters', () => {
  it('parses Correos España live API response accurately with normalized status and milestones', () => {
    const payload = {
      shipment: {
        shipmentCode: 'PQ4F6P0703418520134120K',
        status: 'EN_REPARTO',
        statusDescription: 'En reparto',
        deliveryDate: null,
        origin: {
          country: 'ES',
          countryName: 'España',
          postalCode: '28001',
          office: 'Madrid Sucursal 1',
        },
        destination: {
          country: 'ES',
          countryName: 'España',
          postalCode: '41001',
          office: 'Sevilla CTA',
        },
        events: [
          {
            eventDate: '13/11/2026 08:30:00',
            status: 'EN_REPARTO',
            description: 'El envío está en reparto para entrega hoy',
            location: 'Sevilla',
            office: 'Unidad de Reparto 4',
          },
          {
            eventDate: '12/11/2026 19:45:00',
            status: 'TRANSITO',
            description: 'En tránsito hacia centro de distribución',
            location: 'Madrid CTA',
            office: 'CTA Coslada',
          },
          {
            eventDate: '11/11/2026 14:10:00',
            status: 'PRE_REGISTRADO',
            description: 'Pre-registrado telemáticamente por el remitente',
            location: 'Madrid',
          },
        ],
      },
    };

    const carrier = findCarrierBySlug('correos-spain');
    const parcel = parseCorreosSpainPayload(payload, 'PQ4F6P0703418520134120K', carrier, 'es');

    expect(parcel.trackingNumber).toBe('PQ4F6P0703418520134120K');
    expect(parcel.status).toBe('out_for_delivery');
    expect(parcel.isLiveData).toBe(true);
    expect(parcel.events).toHaveLength(3);
    expect(parcel.events[0].status).toBe('out_for_delivery');
    expect(parcel.events[0].stage).toBe('last_mile');
    expect(parcel.events[0].location).toContain('España');
    expect(parcel.events[1].status).toBe('in_transit');
    expect(parcel.events[2].status).toBe('info_received');
  });

  it('anti-false-delivery: Correos España "AVISO PARA RECOGIDA / AUSENTE" does not mark delivered', () => {
    const payload = {
      shipment: {
        shipmentCode: 'PQ4F6P0703418520134120K',
        status: 'AVISO_LLEGADA',
        statusDescription: 'Destinatario ausente, aviso para recogida en oficina',
        events: [
          {
            eventDate: '13/11/2026 11:00:00',
            status: 'AVISO_LLEGADA',
            description: 'Intento fallido de entrega: destinatario ausente. Dejado aviso.',
            location: 'Oficina Central',
          },
        ],
      },
    };

    const carrier = findCarrierBySlug('correos-spain');
    const parcel = parseCorreosSpainPayload(payload, 'PQ4F6P0703418520134120K', carrier, 'es');

    expect(parcel.status).not.toBe('delivered');
    expect(parcel.isLiveData).toBe(true);
  });

  it('parses Correos Express live API payload accurately', () => {
    const payload = {
      codigoError: '0',
      mensajeError: '',
      codEnvio: '690012345678901234',
      referencia: 'PEDIDO-9988',
      estado: 'REPARTO',
      descEstado: 'En reparto',
      posicion: [
        {
          fecha: '13/11/2026',
          hora: '09:15:00',
          desc: 'EN REPARTO',
          descrip: 'El paquete se encuentra en reparto con el mensajero.',
          codOfi: '2801',
          nomOfi: 'Madrid Delegación Central',
          tipo: 'R',
        },
        {
          fecha: '12/11/2026',
          hora: '21:00:00',
          desc: 'EN TRANSITO',
          descrip: 'Llegada a nave de clasificación.',
          codOfi: '2800',
          nomOfi: 'Hub Coslada',
          tipo: 'T',
        },
      ],
    };

    const carrier = findCarrierBySlug('correosexpress');
    const parcel = parseCorreosExpressPayload(payload, '690012345678901234', carrier, 'es');

    expect(parcel.trackingNumber).toBe('690012345678901234');
    expect(parcel.status).toBe('out_for_delivery');
    expect(parcel.isLiveData).toBe(true);
    expect(parcel.events).toHaveLength(2);
    expect(parcel.events[0].status).toBe('out_for_delivery');
    expect(parcel.events[0].eventCode).toBe('R');
    expect(parcel.events[1].status).toBe('in_transit');
  });

  it('LocalTrackingEngine dispatches Correos España live query when online', async () => {
    let capturedUrl = '';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      capturedUrl = String(input);
      return new Response(
        JSON.stringify({
          shipment: {
            shipmentCode: 'PQ4F6P0703418520134120K',
            status: 'ENTREGADO',
            statusDescription: 'Entregado al destinatario',
            deliveryDate: '2026-11-13T12:00:00Z',
            events: [
              {
                eventDate: '2026-11-13T12:00:00Z',
                status: 'ENTREGADO',
                description: 'Entregado',
                location: 'Madrid',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    const engine = new LocalTrackingEngine();
    const parcel = await engine.track({
      trackingNumber: 'PQ4F6P0703418520134120K',
      carrierHint: 'correos-spain',
    });

    expect(capturedUrl).toContain('api1.correos.es');
    expect(parcel.status).toBe('delivered');
    expect(parcel.isLiveData).toBe(true);
  });
});

describe('GLS Spain & SEUR Live Adapters (with requiresPostalCode)', () => {
  it('parses GLS Spain live payload and handles postal code validation', () => {
    const payload = {
      trackingNumber: '6123456789',
      status: 'IN_TRANSIT',
      statusDescription: 'En tránsito',
      origin: { city: 'Barcelona', country: 'ES', postalCode: '08001' },
      destination: { city: 'Madrid', country: 'ES', postalCode: '28001' },
      history: [
        {
          date: '2026-11-13T08:00:00Z',
          status: 'IN_TRANSIT',
          description: 'Salida de plataforma logística',
          location: 'Hub Central',
        },
        {
          date: '2026-11-12T16:00:00Z',
          status: 'REGISTERED',
          description: 'Datos registrados en GLS Spain',
          location: 'Barcelona',
        },
      ],
    };

    const carrier = findCarrierBySlug('asm-gls-spain');
    const parcel = parseGLSSpainPayload(payload, '6123456789', '28001', carrier, 'es');

    expect(parcel.trackingNumber).toBe('6123456789');
    expect(parcel.status).toBe('in_transit');
    expect(parcel.postalCode).toBe('28001');
    expect(parcel.isLiveData).toBe(true);
    expect(parcel.events).toHaveLength(2);
    expect(parcel.events[0].status).toBe('in_transit');
    expect(parcel.events[1].status).toBe('info_received');
  });

  it('parses SEUR live payload and maps events and delivery info', () => {
    const payload = {
      codigoSeguimiento: '36150127630406',
      estado: 'REPARTO',
      descripcionEstado: 'Envío en reparto',
      codigoPostalDestino: '28001',
      origen: 'Madrid',
      destino: 'Madrid',
      eventos: [
        {
          fecha: '13/11/2026 08:30:00',
          estado: 'REPARTO',
          descripcion: 'El envío está en reparto hacia su domicilio',
          centro: 'Madrid Centro',
        },
        {
          fecha: '12/11/2026 22:00:00',
          estado: 'TRANSITO',
          descripcion: 'En nave de distribución SEUR',
          centro: 'Madrid Nave 3',
        },
      ],
    };

    const carrier = findCarrierBySlug('seur');
    const parcel = parseSEURPayload(payload, '36150127630406', '28001', carrier, 'es');

    expect(parcel.trackingNumber).toBe('36150127630406');
    expect(parcel.status).toBe('out_for_delivery');
    expect(parcel.isLiveData).toBe(true);
    expect(parcel.events).toHaveLength(2);
    expect(parcel.events[0].status).toBe('out_for_delivery');
    expect(parcel.events[1].status).toBe('in_transit');
  });

  it('LocalTrackingEngine enforces postalCode for SEUR and GLS Spain and calls live API', async () => {
    let capturedUrl = '';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      capturedUrl = String(input);
      return new Response(
        JSON.stringify({
          codigoSeguimiento: '36150127630406',
          estado: 'REPARTO',
          descripcionEstado: 'En reparto',
          codigoPostalDestino: '28001',
          eventos: [
            {
              fecha: '13/11/2026 08:00:00',
              estado: 'REPARTO',
              descripcion: 'En reparto',
              centro: 'SEUR Madrid',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    const engine = new LocalTrackingEngine();

    // 1. Calling without postal code throws typed error
    let postalErr: unknown;
    try {
      await engine.track({
        trackingNumber: '36150127630406',
        carrierHint: 'seur',
      });
    } catch (err) {
      postalErr = err;
    }
    expect(isPostalCodeRequiredError(postalErr)).toBe(true);

    // 2. Calling with postal code executes live SEUR query
    const parcel = await engine.track({
      trackingNumber: '36150127630406',
      carrierHint: 'seur',
      postalCode: '28001',
    });

    expect(capturedUrl).toContain('seur.com/livetracking');
    expect(parcel.status).toBe('out_for_delivery');
    expect(parcel.isLiveData).toBe(true);
  });
});
