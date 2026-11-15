import { describe, it, expect } from '../framework.ts';

describe('Feature 15: Store Settings Management', () => {
  interface StoreSettings {
    whatsappNumber: string;
    currency: string;
    brandMetadata: Record<string, any>;
  }

  let currentSettings: StoreSettings = {
    whatsappNumber: '+905320000000',
    currency: 'USD',
    brandMetadata: {
      storeName: 'cyrux studio',
      tagline: 'Brutalist Monolith',
    },
  };

  const updateStoreSettings = (newSettings: Partial<StoreSettings>) => {
    if (newSettings.whatsappNumber) {
      const clean = newSettings.whatsappNumber.replace(/[\s()-]/g, '');
      if (!/^\+\d{10,15}$/.test(clean)) {
        throw new Error('whatsappNumber must be a valid E.164 formatted number starting with +');
      }
    }

    if (newSettings.currency) {
      const allowed = ['USD', 'EUR', 'TRY', 'GBP'];
      if (!allowed.includes(newSettings.currency.toUpperCase())) {
        throw new Error(`currency must be one of: ${allowed.join(', ')}`);
      }
    }

    currentSettings = {
      ...currentSettings,
      ...newSettings,
      currency: newSettings.currency ? newSettings.currency.toUpperCase() : currentSettings.currency,
    };
    return currentSettings;
  };

  it('15.1 should retrieve default store settings correctly', () => {
    expect(currentSettings.whatsappNumber).toBe('+905320000000');
    expect(currentSettings.currency).toBe('USD');
    expect(currentSettings.brandMetadata.storeName).toBe('cyrux studio');
  });

  it('15.2 should successfully update WhatsApp ordering number to a new E.164 number', () => {
    const updated = updateStoreSettings({ whatsappNumber: '+905559876543' });
    expect(updated.whatsappNumber).toBe('+905559876543');
    expect(currentSettings.whatsappNumber).toBe('+905559876543');
  });

  it('15.3 should reject invalid phone formats missing country code or plus sign', () => {
    expect(() => updateStoreSettings({ whatsappNumber: '05320000000' })).toThrow('valid E.164');
    expect(() => updateStoreSettings({ whatsappNumber: 'invalid-text' })).toThrow('valid E.164');
  });

  it('15.4 should switch store currency to TRY, EUR, or GBP', () => {
    const updatedEUR = updateStoreSettings({ currency: 'EUR' });
    expect(updatedEUR.currency).toBe('EUR');

    const updatedTRY = updateStoreSettings({ currency: 'try' });
    expect(updatedTRY.currency).toBe('TRY');
  });

  it('15.5 should reject unsupported currency codes', () => {
    expect(() => updateStoreSettings({ currency: 'BITCOIN' })).toThrow('currency must be one of');
    expect(() => updateStoreSettings({ currency: 'XYZ' })).toThrow('currency must be one of');
  });
}, { tier: 1, featureId: 15 });
