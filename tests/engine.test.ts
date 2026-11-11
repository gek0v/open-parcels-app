import { afterEach, describe, expect, it, mock } from 'bun:test';
import { RestTrackingEngine } from '../src/infrastructure/engine/RestTrackingEngine';
import { TrackingEngineError, isPostalCodeRequiredError } from '../src/infrastructure/engine/errors';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('RestTrackingEngine Go Engine Alignment', () => {
  it('sends aligned /api/v1/track request payload and maps full TrackResponsePayload', async () => {
    let capturedUrl = '';
    let capturedBody: Record<string, any> = {};

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        JSON.stringify({
          tracking_number: 'LP00561234567890',
          carrier: {
            slug: 'cainiao',
            name: 'Cainiao Global',
            country: 'CN',
            country_name: 'China',
            type: 'cross_border',
            website: 'https://global.cainiao.com',
            tracking_url: 'https://global.cainiao.com/detail.htm?mailNoList=%s',
          },
          additional_carriers: [
            {
              slug: 'correosexpress',
              name: 'Correos Express',
              country: 'ES',
              country_name: 'Spain',
              type: 'express',
            },
          ],
          last_mile_tracking_number: '6900561234567890',
          last_mile_carrier: {
            slug: 'correosexpress',
            name: 'Correos Express',
            country: 'ES',
          },
          status: 'out_for_delivery',
          status_text: 'En reparto',
          progress: 85,
          origin: { code: 'CN', name: 'China' },
          destination: { code: 'ES', name: 'Spain' },
          estimated_delivery: '2026-11-12T18:00:00Z',
          delivered_at: null,
          days_in_transit: 6,
          weight: '1.45 kg',
          service_type: 'Cainiao Standard for Special Goods',
          flight_legs: [
            {
              flight_number: 'CA907',
              origin: 'HKG',
              destination: 'MAD',
              status: 'arrived',
              actual_arrival: '2026-11-10T09:15:00Z',
            },
          ],
          from_cache: true,
          is_live_data: true,
          updated_at: '2026-11-11T10:00:00Z',
          events: [
            {
              date: '2026-11-11T09:00:00Z',
              raw_date: '2026-11-11 09:00:00',
              status: 'out_for_delivery',
              stage: 'last_mile',
              description: 'En reparto',
              location: 'Madrid, ES',
              carrier_slug: 'correosexpress',
              carrier_name: 'Correos Express',
              carrier_index: 1,
            },
            {
              date: '2026-11-10T18:00:00Z',
              status: 'in_transit',
              stage: 'handover',
              description: 'Handed over to local carrier',
              location: 'Coslada, Madrid',
              carrier_slug: 'cainiao',
              carrier_name: 'Cainiao Global',
              carrier_index: 0,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    const engine = new RestTrackingEngine('http://localhost:8080');
    const parcel = await engine.track({
      trackingNumber: 'LP00561234567890',
      carrierHint: 'cainiao',
      destinationCountry: 'ES',
      postalCode: '28001',
      lang: 'es',
      allowSimulated: false,
      forceRefresh: true,
      email: 'user@example.com',
      phone: '+34600000000',
      additionalFields: { nif: '12345678A' },
    });

    expect(capturedUrl).toBe('http://localhost:8080/api/v1/track');
    expect(capturedBody.tracking_number).toBe('LP00561234567890');
    expect(capturedBody.language).toBe('es');
    expect(capturedBody.postal_code).toBe('28001');
    expect(capturedBody.destination_country).toBe('ES');
    expect(capturedBody.allow_simulated).toBe(false);
    expect(capturedBody.force_refresh).toBe(true);
    expect(capturedBody.email).toBe('user@example.com');
    expect(capturedBody.phone).toBe('+34600000000');
    expect(capturedBody.additional_fields).toEqual({ nif: '12345678A' });

    expect(parcel.lastMileTrackingNumber).toBe('6900561234567890');
    expect(parcel.lastMileCarrier?.slug).toBe('correosexpress');
    expect(parcel.estimatedDelivery).toBe('2026-11-12T18:00:00Z');
    expect(parcel.weight).toBe('1.45 kg');
    expect(parcel.serviceType).toBe('Cainiao Standard for Special Goods');
    expect(parcel.fromCache).toBe(true);
    expect(parcel.isLiveData).toBe(true);
    expect(parcel.flightLegs?.[0].flightNumber).toBe('CA907');
    expect(parcel.events[0].stage).toBe('last_mile');
    expect(parcel.events[0].rawDate).toBe('2026-11-11 09:00:00');
    expect(parcel.events[0].carrierIndex).toBe(1);
    expect(parcel.events[1].stage).toBe('handover');
  });

  it('maps Go /api/v1/detect matched_pattern and carrier metadata', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          tracking_number: '36150127630406',
          candidates: [
            {
              carrier: {
                slug: 'seur',
                name: 'SEUR',
                country: 'ES',
                country_name: 'Spain',
                type: 'express',
              },
              confidence: 1.0,
              matched_pattern: 'SEUR Spain parcel number',
              reason: 'Matched pattern: SEUR Spain parcel number',
            },
          ],
        }),
        { status: 200 }
      )) as unknown as typeof fetch;

    const engine = new RestTrackingEngine('http://localhost:8080');
    const results = await engine.detect('36150127630406', 'ES');

    expect(results.length).toBe(1);
    expect(results[0].carrier.slug).toBe('seur');
    expect(results[0].carrier.requiresPostalCode).toBe(true);
    expect(results[0].matchedRule).toBe('SEUR Spain parcel number');
    expect(results[0].reason).toBe('Matched pattern: SEUR Spain parcel number');
  });

  it('parses all typed domain error codes from Go REST API', async () => {
    const cases: { status: number; apiCode: string; expectedCode: string }[] = [
      { status: 422, apiCode: 'POSTAL_CODE_REQUIRED', expectedCode: 'POSTAL_CODE_REQUIRED' },
      { status: 422, apiCode: 'MISSING_POSTAL_CODE', expectedCode: 'MISSING_POSTAL_CODE' },
      { status: 404, apiCode: 'SHIPMENT_NOT_FOUND', expectedCode: 'SHIPMENT_NOT_FOUND' },
      { status: 501, apiCode: 'CARRIER_NOT_IMPLEMENTED', expectedCode: 'CARRIER_NOT_IMPLEMENTED' },
      { status: 429, apiCode: 'CARRIER_RATE_LIMITED', expectedCode: 'CARRIER_RATE_LIMITED' },
      { status: 502, apiCode: 'CARRIER_UNAVAILABLE', expectedCode: 'CARRIER_TEMPORARILY_UNAVAILABLE' },
      {
        status: 502,
        apiCode: 'CARRIER_TEMPORARILY_UNAVAILABLE',
        expectedCode: 'CARRIER_TEMPORARILY_UNAVAILABLE',
      },
    ];

    const engine = new RestTrackingEngine('http://localhost:8080');

    for (const c of cases) {
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            error: {
              code: c.apiCode,
              message: `Error: ${c.apiCode}`,
            },
          }),
          { status: c.status }
        )) as unknown as typeof fetch;

      let caught: unknown;
      try {
        await engine.track({ trackingNumber: 'TEST1234' });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(TrackingEngineError);
      expect((caught as TrackingEngineError).code).toBe(c.expectedCode as any);
      expect((caught as TrackingEngineError).message).toBe(`Error: ${c.apiCode}`);

      if (c.apiCode === 'POSTAL_CODE_REQUIRED' || c.apiCode === 'MISSING_POSTAL_CODE') {
        expect(isPostalCodeRequiredError(caught)).toBe(true);
      }
    }
  });

  it('supports ParcelsApp v4 async polling (/trackings?async=true + GET /trackings/{id})', async () => {
    let callCount = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      callCount++;
      const url = String(input);
      if (url.endsWith('/trackings?async=true')) {
        return new Response(
          JSON.stringify({
            request_id: 'req_async_123',
            status: 'processing',
            done: false,
            expires_at: '2026-11-11T12:00:00Z',
            results: [],
          }),
          { status: 200 }
        );
      }

      if (url.endsWith('/trackings/req_async_123') && callCount === 2) {
        return new Response(
          JSON.stringify({
            request_id: 'req_async_123',
            status: 'processing',
            done: false,
            expires_at: '2026-11-11T12:00:00Z',
            results: [],
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          request_id: 'req_async_123',
          status: 'completed',
          done: true,
          expires_at: '2026-11-11T12:00:00Z',
          results: [
            {
              tracking_number: 'LP00561234567890',
              state: 'completed',
              from_cache: true,
              shipment: {
                trackingId: 'LP00561234567890',
                status: 'delivered',
                origin: 'China',
                originCode: 'CN',
                destination: 'Spain',
                destinationCode: 'ES',
                daysInTransit: 5,
                detectedCarrier: { slug: 'cainiao', name: 'Cainiao Global' },
                services: [
                  { slug: 'cainiao', name: 'Cainiao Global' },
                  { slug: 'correosexpress', name: 'Correos Express' },
                ],
                states: [
                  {
                    state: 'Entregado al destinatario',
                    location: 'Madrid, ES',
                    date: '2026-11-11T09:00:00Z',
                    carrier: 1,
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const engine = new RestTrackingEngine('http://localhost:8080');
    const parcel = await engine.trackAsync(
      { trackingNumber: 'LP00561234567890', lang: 'es' },
      { pollIntervalMs: 10, timeoutMs: 2000 }
    );

    expect(callCount).toBe(3);
    expect(parcel.trackingNumber).toBe('LP00561234567890');
    expect(parcel.status).toBe('delivered');
    expect(parcel.fromCache).toBe(true);
    expect(parcel.lastMileCarrier?.slug).toBe('correosexpress');
    expect(parcel.events[0].carrierSlug).toBe('correosexpress');
    expect(parcel.events[0].status).toBe('delivered');
  });

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

  it('correctly extracts Astro props and normalizes InPost live events without false delivered status', async () => {
    const { parseInPostHtmlToParcel } = await import('../src/infrastructure/engine/inpostLive');
    const { findCarrierBySlug } = await import('../src/domain/validators/detection');

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

    const { LocalTrackingEngine } = await import('../src/infrastructure/engine/LocalTrackingEngine');
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
