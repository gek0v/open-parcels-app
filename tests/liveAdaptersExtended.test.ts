import { afterEach, describe, expect, it } from 'bun:test';
import { findCarrierBySlug } from '../src/domain/validators/detection';
import {
  fetchCainiaoLive,
  fetchYunExpressLive,
  parseCainiaoPayload,
  parseYunExpressHtmlPayload,
  parseYunExpressJsonPayload,
} from '../src/infrastructure/engine/crossBorderLive';
import { TrackingEngineError } from '../src/infrastructure/engine/errors';
import { LocalTrackingEngine } from '../src/infrastructure/engine/LocalTrackingEngine';
import {
  fetchCTTExpressLive,
  fetchMRWLive,
  fetchNacexLive,
  parseCTTHtmlPayload,
  parseCTTJsonPayload,
  parseMRWHtmlPayload,
  parseMRWJsonPayload,
  parseNacexHtmlPayload,
  parseNacexJsonPayload,
} from '../src/infrastructure/engine/spainCouriersExtendedLive';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Cross-Border Live Adapters (Cainiao & YunExpress)', () => {
  it('parses Cainiao module payload with last-mile chaining and newest-first sorting', async () => {
    const carrier = findCarrierBySlug('cainiao');
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          module: [
            {
              mailNo: '323999888777666',
              originCountry: 'China',
              destCountry: 'Spain',
              destCp: 'Correos Express',
              status: 'DELIVERED',
              statusDesc: 'Entregado al destinatario',
              sectionList: [
                {
                  sectionName: 'Origin',
                  detailList: [
                    {
                      time: 1763400000000,
                      desc: 'Order received by carrier',
                      actionCode: 'CRE_100',
                    },
                    {
                      timeStr: '2026-11-19 12:30:00',
                      desc: 'Import customs clearance completed',
                      actionCode: 'CC_OK',
                    },
                  ],
                },
                {
                  sectionName: 'LastMile',
                  detailList: [
                    {
                      timeStr: '2026-11-21 15:45:00',
                      desc: 'Package delivered',
                      standerdDesc: 'Paquete entregado con éxito',
                      actionCode: 'GTMS_SIGNED',
                    },
                  ],
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as any;

    const parcel = await fetchCainiaoLive('323999888777666', carrier, 'es', 'ES');
    expect(parcel.isLiveData).toBe(true);
    expect(parcel.status).toBe('delivered');
    expect(parcel.progress).toBe(100);
    expect(parcel.origin?.code).toBe('CN');
    expect(parcel.destination?.code).toBe('ES');
    expect(parcel.lastMileCarrier?.slug).toBe('correosexpress');
    expect(parcel.lastMileTrackingNumber).toBe('323999888777666');
    expect(parcel.additionalCarriers?.[0]?.slug).toBe('correosexpress');
    expect(parcel.events).toHaveLength(3);
    expect(parcel.events[0].status).toBe('delivered');
    expect(parcel.events[0].carrierSlug).toBe('correosexpress');
    expect(parcel.events[0].carrierIndex).toBe(1);
    expect(parcel.events[0].description).toBe('Paquete entregado con éxito');
    expect(parcel.events[2].carrierIndex).toBe(0);
  });

  it('maps Cainiao anti-bot challenge and ORDER_NOT_FOUND to typed TrackingEngineError', async () => {
    const carrier = findCarrierBySlug('cainiao');

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: false, errorCode: 'RGV587_FLAG' }), {
        status: 200,
      })) as any;

    await expect(fetchCainiaoLive('LP123', carrier)).rejects.toMatchObject({
      code: 'CARRIER_TEMPORARILY_UNAVAILABLE',
      httpStatus: 403,
    });

    expect(() =>
      parseCainiaoPayload({ success: false, errorCode: 'ORDER_NOT_FOUND' }, 'LP123', carrier)
    ).toThrow(TrackingEngineError);

    try {
      parseCainiaoPayload({ success: false, errorCode: 'ORDER_NOT_FOUND' }, 'LP123', carrier);
    } catch (err) {
      expect((err as TrackingEngineError).code).toBe('SHIPMENT_NOT_FOUND');
    }
  });

  it('parses YunExpress JSON payload with last-mile extraction and HTML fallback', async () => {
    const carrier = findCarrierBySlug('yunexpress');
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          code: '200',
          data: [
            {
              trackingNumber: 'YT2631122334455667',
              originCountry: 'CN',
              destinationCountry: 'ES',
              lastMileCarrier: 'Correos',
              status: 'IN_TRANSIT',
              events: [
                {
                  date: '2026-11-18 09:00:00',
                  status: 'PICKED UP',
                  location: 'Shenzhen, China',
                  description: 'Received at origin facility',
                },
                {
                  date: '2026-11-20 14:20:00',
                  status: 'HANDOVER',
                  location: 'Madrid, Spain',
                  description: 'Handed over to local carrier, tracking number: PQ4F6P0703418520134120K',
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as any;

    const parcel = await fetchYunExpressLive('YT2631122334455667', carrier, 'es', 'ES');
    expect(parcel.isLiveData).toBe(true);
    expect(parcel.status).toBe('in_transit');
    expect(parcel.lastMileCarrier?.slug).toBe('correos-spain');
    expect(parcel.lastMileTrackingNumber).toBe('PQ4F6P0703418520134120K');
    expect(parcel.events).toHaveLength(2);
    expect(parcel.events[0].stage).toBe('handover');

    const htmlParcel = parseYunExpressHtmlPayload(
      `<table>
        <tr><td>2026-11-21 10:00:00</td><td>Delivered</td><td>Madrid</td><td>Delivered to consignee</td></tr>
        <tr><td>2026-11-19 08:00:00</td><td>In Transit</td><td>Shenzhen</td><td>Departed facility</td></tr>
      </table>`,
      'YT2631122334455667',
      carrier,
      'es'
    );
    expect(htmlParcel.status).toBe('delivered');
    expect(htmlParcel.events).toHaveLength(2);
    expect(() =>
      parseYunExpressJsonPayload({ success: false, code: '404', message: 'Not found' }, 'YT1', carrier)
    ).toThrow(TrackingEngineError);
  });
});

describe('Extended Spain Couriers Live Adapters (CTT Express, MRW, Nacex)', () => {
  it('parses CTT Express JSON and HTML payloads and detects not-found/WAF', async () => {
    const carrier = findCarrierBySlug('ctt-express');

    const jsonParcel = parseCTTJsonPayload(
      {
        shipmentCode: '00828000001234567890',
        origen: { city: 'Madrid' },
        destino: { city: 'Valladolid' },
        eventos: [
          {
            fecha: '20/11/2026',
            hora: '08:15:00',
            estado: 'EN REPARTO',
            ubicacion: 'Valladolid',
            descripcion: 'Envío en ruta de reparto',
          },
          {
            fecha: '19/11/2026',
            hora: '19:00:00',
            estado: 'ADMITIDO',
            ubicacion: 'Madrid',
            descripcion: 'Envío recogido en origen',
          },
        ],
      },
      '00828000001234567890',
      carrier,
      'es'
    );

    expect(jsonParcel.isLiveData).toBe(true);
    expect(jsonParcel.status).toBe('out_for_delivery');
    expect(jsonParcel.origin?.name).toBe('Madrid');
    expect(jsonParcel.destination?.name).toBe('Valladolid');
    expect(jsonParcel.events[0].status).toBe('out_for_delivery');
    expect(jsonParcel.events[0].location).toBe('Valladolid, Spain');

    globalThis.fetch = (async () =>
      new Response(
        `<html><body>
          <div>Origen: Barcelona</div>
          <div>Destino: Sevilla</div>
          <div>Estado actual: Entregado</div>
          <table>
            <tr><td>21/11/2026 11:30</td><td>Entregado</td><td>Sevilla</td><td>Entrega realizada</td></tr>
          </table>
        </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      )) as any;

    const htmlParcel = await fetchCTTExpressLive('00828000001234567890', carrier, 'es');
    expect(htmlParcel.status).toBe('delivered');
    expect(htmlParcel.origin?.name).toBe('Barcelona');
    expect(htmlParcel.destination?.name).toBe('Sevilla');

    globalThis.fetch = (async () =>
      new Response('<html><body>No se ha encontrado ningún envío</body></html>', {
        status: 200,
      })) as any;
    await expect(fetchCTTExpressLive('00828000000000000000', carrier)).rejects.toMatchObject({
      code: 'SHIPMENT_NOT_FOUND',
    });

    expect(() => parseCTTHtmlPayload('<html><body>Empty</body></html>', '123', carrier)).toThrow(
      TrackingEngineError
    );
  });

  it('parses MRW JSON and HTML scraping payloads cleanly', async () => {
    const carrier = findCarrierBySlug('mrw-spain');

    const jsonParcel = parseMRWJsonPayload(
      {
        numeroEnvio: '028150001234',
        franquiciaOrigen: 'Madrid Coslada',
        franquiciaDestino: 'Valencia',
        eventos: [
          {
            fecha: '21/11/2026',
            hora: '13:05',
            estado: 'ENTREGADO',
            franquicia: 'Valencia',
            descripcion: 'Entrega realizada al destinatario',
          },
          {
            fecha: '20/11/2026',
            hora: '10:00',
            estado: 'RECOGIDO',
            franquicia: 'Madrid',
            descripcion: 'Envío recogido en franquicia origen',
          },
        ],
      },
      '028150001234',
      carrier,
      'es'
    );
    expect(jsonParcel.status).toBe('delivered');
    expect(jsonParcel.progress).toBe(100);
    expect(jsonParcel.events).toHaveLength(2);

    globalThis.fetch = (async () =>
      new Response(
        `<html><body>
          <div>Franquicia de origen: Bilbao</div>
          <div>Franquicia de destino: Zaragoza</div>
          <table>
            <tr class="cookie-banner"><td>21/11/2026</td><td>cookie</td><td>consent</td></tr>
            <tr><td>21/11/2026 09:15</td><td>En reparto</td><td>Zaragoza</td><td>En furgoneta de reparto</td></tr>
          </table>
        </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      )) as any;

    const htmlParcel = await fetchMRWLive('028150001234', carrier, 'es');
    expect(htmlParcel.status).toBe('out_for_delivery');
    expect(htmlParcel.events).toHaveLength(1);
    expect(htmlParcel.origin?.name).toBe('Bilbao');
    expect(htmlParcel.destination?.name).toBe('Zaragoza');

    expect(() => parseMRWHtmlPayload('<html>no table</html>', '123', carrier)).toThrow(
      TrackingEngineError
    );
  });

  it('parses Nacex JSON and HTML scraping payloads and integrates with LocalTrackingEngine', async () => {
    const carrier = findCarrierBySlug('nacex-spain');

    const jsonParcel = parseNacexJsonPayload(
      {
        albaran: 'NCX123456789',
        agenciaOrigen: 'Madrid',
        agenciaDestino: 'Málaga',
        eventos: [
          {
            fecha: '21/11/2026 12:10',
            estado: 'ENTREGA OK',
            agencia: 'Málaga',
            descripcion: 'Entregado en destino',
          },
        ],
      },
      'NCX123456789',
      carrier,
      'es'
    );
    expect(jsonParcel.status).toBe('delivered');
    expect(jsonParcel.events[0].location).toBe('Málaga, Spain');

    const htmlParcel = parseNacexHtmlPayload(
      `<html><body>
        <div>Agencia de origen: Alicante</div>
        <div>Agencia de destino: Murcia</div>
        <table>
          <tr><td>21/11/2026 08:40</td><td>Zendesk chat</td><td>support</td></tr>
          <tr><td>21/11/2026 08:40</td><td>En ruta</td><td>Murcia</td><td>Salida a reparto</td></tr>
        </table>
      </body></html>`,
      'NCX123456789',
      carrier,
      'es'
    );
    expect(htmlParcel.status).toBe('out_for_delivery');
    expect(htmlParcel.events).toHaveLength(1);

    // Full LocalTrackingEngine integration across all 5 ported slugs with allowSimulated: false
    const engine = new LocalTrackingEngine();
    const cases: Array<{ slug: string; num: string; body: any }> = [
      {
        slug: 'cainiao',
        num: 'LP00123456789012',
        body: {
          success: true,
          module: [
            {
              mailNo: 'LP00123456789012',
              detailList: [{ timeStr: '2026-11-21 10:00:00', desc: 'In transit' }],
            },
          ],
        },
      },
      {
        slug: 'yunexpress',
        num: 'YT2600000000000001',
        body: {
          success: true,
          code: '200',
          data: [
            {
              trackingNumber: 'YT2600000000000001',
              events: [{ date: '2026-11-21 10:00:00', status: 'IN_TRANSIT', description: 'Hub' }],
            },
          ],
        },
      },
      {
        slug: 'ctt-express',
        num: '0001234567890123456789',
        body: {
          shipmentCode: '0001234567890123456789',
          eventos: [{ fecha: '21/11/2026', hora: '10:00', estado: 'EN REPARTO', descripcion: 'En ruta' }],
        },
      },
      {
        slug: 'mrw-spain',
        num: '028150001234',
        body: {
          numeroEnvio: '028150001234',
          eventos: [{ fecha: '21/11/2026', hora: '10:00', estado: 'TRANSITO', descripcion: 'Plataforma' }],
        },
      },
      {
        slug: 'nacex-spain',
        num: 'NCX123456789',
        body: {
          albaran: 'NCX123456789',
          eventos: [{ fecha: '21/11/2026', hora: '10:00', estado: 'TRANSITO', descripcion: 'En agencia' }],
        },
      },
    ];

    for (const c of cases) {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify(c.body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })) as any;

      const res = await engine.track({
        trackingNumber: c.num,
        carrierHint: c.slug,
        allowSimulated: false,
      });
      expect(res.carrier.slug).toBe(c.slug);
      expect(res.isLiveData).toBe(true);
      expect(res.events.length).toBeGreaterThan(0);
    }

    globalThis.fetch = (async () => new Response('Cloudflare Ray ID', { status: 403 })) as any;
    await expect(fetchNacexLive('NCX123456789', carrier)).rejects.toMatchObject({
      code: 'CARRIER_TEMPORARILY_UNAVAILABLE',
      httpStatus: 403,
    });
  });
});
