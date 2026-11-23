import { describe, it, expect } from '../framework.ts';
import {
  fileExists,
  readFileText,
} from '../phase2-helpers.ts';

describe('Feature 35: Dynamic Storefront Catalog, Lookbook, Cart & Product Specs', () => {
  it('35.1 should implement FeaturedCollections in featured-collections.tsx and mount it on the storefront', () => {
    expect(fileExists('src/components/storefront/featured-collections.tsx')).toBe(true);

    const featSrc = readFileText('src/components/storefront/featured-collections.tsx');
    expect(featSrc).toContain('collections');

    const containerSrc = readFileText('src/components/storefront/storefront-container.tsx');
    const pageSrc = readFileText('src/app/page.tsx');
    expect(
      containerSrc.includes('FeaturedCollections') || pageSrc.includes('FeaturedCollections')
    ).toBe(true);
  });

  it('35.2 should render dynamic headings, custom product badges, and discountPrice in BestsellerGrid', () => {
    const gridSrc = readFileText('src/components/storefront/bestseller-grid.tsx');

    expect(gridSrc).toContain('discountPrice');
    expect(gridSrc).toContain('badge');
    expect(
      gridSrc.includes('heading') ||
        gridSrc.includes('title') ||
        gridSrc.includes('sectionCopy') ||
        gridSrc.includes('cms')
    ).toBe(true);
  });

  it('35.3 should mount CampaignBlock on the storefront and wire it to dynamic CMS lookbook data', () => {
    const containerSrc = readFileText('src/components/storefront/storefront-container.tsx');
    const pageSrc = readFileText('src/app/page.tsx');
    expect(
      containerSrc.includes('CampaignBlock') || pageSrc.includes('CampaignBlock')
    ).toBe(true);

    const campaignSrc = readFileText('src/components/storefront/campaign-block.tsx');
    expect(
      campaignSrc.includes('lookbook') ||
        campaignSrc.includes('cards') ||
        campaignSrc.includes('cms')
    ).toBe(true);
  });

  it('35.4 should render dynamic garment specs and shipping/care copy in ProductDetail', () => {
    const detailSrc = readFileText('src/components/storefront/product-detail.tsx');

    expect(
      detailSrc.includes('discountPrice') || detailSrc.includes('cms')
    ).toBe(true);
    expect(
      detailSrc.includes('specs') ||
        detailSrc.includes('care') ||
        detailSrc.includes('cms') ||
        detailSrc.includes('shippingInfo')
    ).toBe(true);
  });

  it('35.5 should integrate coupon validation & shipping threshold in CartDrawer and dynamic currency in SearchModal', () => {
    const cartSrc = readFileText('src/components/storefront/cart-drawer.tsx');
    expect(cartSrc).toContain('/api/coupons/validate');
    expect(
      cartSrc.includes('freeShippingThreshold') ||
        cartSrc.includes('shippingThreshold')
    ).toBe(true);

    const searchSrc = readFileText('src/components/storefront/search-modal.tsx');
    expect(searchSrc).toContain('currency');
    expect(searchSrc).not.toContain('formatProductPrice(item.price, "USD")');
  });
}, { tier: 1, featureId: 35 });
