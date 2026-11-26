import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { LocalTrackingEngine } from '../src/infrastructure/engine/LocalTrackingEngine';
import { findCarrierBySlug, CARRIERS_CATALOG } from '../src/domain/validators/detection';
import { TrackingEngineError } from '../src/infrastructure/engine/errors';

describe('Milestone 1: Engine Integrity & Mock Elimination Verification', () => {
  it('unsupported carriers return canonical pending record with no mock events', async () => {
    const engine = new LocalTrackingEngine();
    const result = await engine.track({
      trackingNumber: '1Z9999999999999999',
      carrierHint: 'ups',
      allowSimulated: true,
    });

    expect(result.status).toBe('pending');
    expect(result.events).toHaveLength(0);
    expect(result.isLiveData).toBe(false);
    expect(result.progress).toBe(5);
    expect(result.daysInTransit).toBe(0);
    expect(result.carrier.trackingUrl).toContain('1Z9999999999999999');
  });

  it('rejects unsupported carrier with CARRIER_NOT_IMPLEMENTED when allowSimulated is false', async () => {
    const engine = new LocalTrackingEngine();
    let thrownError: any = null;

    try {
      await engine.track({
        trackingNumber: '1Z9999999999999999',
        carrierHint: 'ups',
        allowSimulated: false,
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(TrackingEngineError);
    expect(thrownError.code).toBe('CARRIER_NOT_IMPLEMENTED');
    expect(thrownError.httpStatus).toBe(501);
  });

  it('verifies that carriers without live scrapers have hasLiveTracking=false in detection catalog', () => {
    const unadaptedCarriers = ['cainiao', 'ups', 'dhl-express', 'dhl-parcel', 'fedex'];
    for (const slug of unadaptedCarriers) {
      const carrier = findCarrierBySlug(slug);
      expect(carrier).toBeDefined();
      expect(carrier?.hasLiveTracking).toBe(false);
      expect(carrier?.capabilities?.supportsLiveApi).toBe(false);
    }
  });

  it('verifies dynamic version rendering in AppLoadingSplash', () => {
    const splashFile = fs.readFileSync(
      path.join(process.cwd(), 'src/presentation/components/common/AppLoadingSplash.tsx'),
      'utf8'
    );
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
    expect(splashFile).not.toContain('v1.0.2');
    expect(splashFile).toContain('CURRENT_APP_VERSION');
    expect(pkg.version).toBe('1.5.6');
    expect(appJson.expo.version).toBe(pkg.version);
  });

  it('verifies dynamic count in CarrierDetectorBar', () => {
    const barFile = fs.readFileSync(
      path.join(process.cwd(), 'src/presentation/components/scanner/CarrierDetectorBar.tsx'),
      'utf8'
    );
    expect(barFile).not.toContain('28 disp.');
    expect(barFile).toContain('CARRIERS_CATALOG.length');
  });

  it('verifies dead mockup styles are purged from DashboardScreen', () => {
    const dashboardFile = fs.readFileSync(
      path.join(process.cwd(), 'src/presentation/screens/DashboardScreen.tsx'),
      'utf8'
    );
    expect(dashboardFile).not.toContain('mockupSwitcher:');
    expect(dashboardFile).not.toContain('mockupTabActive:');
  });
});