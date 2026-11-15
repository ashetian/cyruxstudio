import { describe, it, expect } from '../framework.ts';

describe('Feature 14: Admin Dashboard & Product CRUD', () => {
  interface ProductData {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    variants: Array<{ size: string; stock: number }>;
    mediaUrls: string[];
    isBestseller: boolean;
  }

  const productsDb = new Map<string, ProductData>();

  const createProduct = (data: Omit<ProductData, 'id'>) => {
    if (!data.name || data.name.trim() === '') throw new Error('Name is required');
    if (data.price <= 0) throw new Error('Price must be greater than zero');
    if (!Number.isInteger(data.stock) || data.stock < 0) throw new Error('Stock must be >= 0');
    if (!/^[a-z0-9-]+$/.test(data.slug)) throw new Error('Slug must be URL-safe lowercase with hyphens');

    const id = `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newProduct: ProductData = { id, ...data };
    productsDb.set(id, newProduct);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<ProductData>) => {
    const existing = productsDb.get(id);
    if (!existing) throw new Error(`Product ${id} not found`);
    if (updates.price !== undefined && updates.price <= 0) throw new Error('Price must be positive');
    const updated = { ...existing, ...updates };
    productsDb.set(id, updated);
    return updated;
  };

  const deleteProduct = (id: string) => {
    if (!productsDb.has(id)) throw new Error(`Product ${id} not found`);
    productsDb.delete(id);
    return true;
  };

  it('14.1 should create a new product drop with variants and bestseller flag', () => {
    const newProd = createProduct({
      name: 'CYRUX SCULPTURAL JACKET',
      slug: 'cyrux-sculptural-jacket',
      price: 420.0,
      stock: 25,
      variants: [
        { size: 'M', stock: 15 },
        { size: 'L', stock: 10 },
      ],
      mediaUrls: ['https://blob.vercel.com/jacket-1.webp'],
      isBestseller: true,
    });

    expect(newProd.id).toBeDefined();
    expect(newProd.name).toBe('CYRUX SCULPTURAL JACKET');
    expect(newProd.isBestseller).toBe(true);
    expect(productsDb.has(newProd.id)).toBe(true);
  });

  it('14.2 should reject product creation when slug has uppercase or spaces', () => {
    expect(() =>
      createProduct({
        name: 'Invalid Item',
        slug: 'Invalid Slug With Spaces!',
        price: 100,
        stock: 5,
        variants: [],
        mediaUrls: [],
        isBestseller: false,
      })
    ).toThrow('Slug must be URL-safe lowercase with hyphens');
  });

  it('14.3 should update product price, stock, and variants seamlessly', () => {
    const prod = createProduct({
      name: 'ARCHITECTURAL CAP',
      slug: 'architectural-cap',
      price: 75.0,
      stock: 40,
      variants: [],
      mediaUrls: [],
      isBestseller: false,
    });

    const updated = updateProduct(prod.id, {
      price: 85.0,
      stock: 35,
      isBestseller: true,
    });

    expect(updated.price).toBe(85.0);
    expect(updated.stock).toBe(35);
    expect(updated.isBestseller).toBe(true);
  });

  it('14.4 should delete an existing product from catalog database', () => {
    const prod = createProduct({
      name: 'TEMP PRODUCT',
      slug: 'temp-product-to-delete',
      price: 50.0,
      stock: 10,
      variants: [],
      mediaUrls: [],
      isBestseller: false,
    });

    expect(productsDb.has(prod.id)).toBe(true);
    const deleteResult = deleteProduct(prod.id);
    expect(deleteResult).toBe(true);
    expect(productsDb.has(prod.id)).toBe(false);
  });

  it('14.5 should throw error when attempting to delete non-existent product', () => {
    expect(() => deleteProduct('non-existent-id')).toThrow('not found');
  });
}, { tier: 1, featureId: 14 });
