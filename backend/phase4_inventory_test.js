const { test } = require('node:test');
const assert = require('node:assert');
const { validateInventoryPayload } = require('./services/listingService');

test('Phase 4: Inventory Validation', async (t) => {
  await t.test('Missing inventory mode defaults only when absent on create', () => {
    const { inventoryMode } = validateInventoryPayload({ modeIsProvided: false });
    assert.strictEqual(inventoryMode, 'simple');
  });

  await t.test('Explicit unknown inventory mode rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'hacked', modeIsProvided: true });
    assert.ok(errors.inventory_mode);
  });

  await t.test('Unknown edit inventory mode rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variable', modeIsProvided: true, allowPartial: true });
    assert.ok(errors.inventory_mode);
  });

  await t.test('Negative simple stock rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'simple', stock: -1 });
    assert.ok(errors.stock);
  });

  await t.test('Fractional simple stock rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'simple', stock: 1.5 });
    assert.ok(errors.stock);
  });

  await t.test('Oversized simple stock rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'simple', stock: 10000 });
    assert.ok(errors.stock);
  });

  await t.test('Valid simple stock accepted', () => {
    const { errors, stock } = validateInventoryPayload({ inventoryMode: 'simple', stock: 5 });
    assert.strictEqual(Object.keys(errors).length, 0);
    assert.strictEqual(stock, 5);
  });

  await t.test('Empty variant list rejected in variant mode', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([]) });
    assert.ok(errors.variants);
  });

  await t.test('Missing variant title rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([{ price: 100, stock: 1 }]) });
    assert.ok(errors['variants[0].title']);
  });

  await t.test('Variant price 0 rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([{ title: 'L', price: 0, stock: 1 }]) });
    assert.ok(errors['variants[0].price']);
  });

  await t.test('Negative variant price rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([{ title: 'L', price: -50, stock: 1 }]) });
    assert.ok(errors['variants[0].price']);
  });

  await t.test('Oversized variant price rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([{ title: 'L', price: 2000000000, stock: 1 }]) });
    assert.ok(errors['variants[0].price']);
  });

  await t.test('Negative variant stock rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([{ title: 'L', price: 100, stock: -1 }]) });
    assert.ok(errors['variants[0].stock']);
  });

  await t.test('Fractional variant stock rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([{ title: 'L', price: 100, stock: 1.5 }]) });
    assert.ok(errors['variants[0].stock']);
  });

  await t.test('Oversized variant stock rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([{ title: 'L', price: 100, stock: 10000 }]) });
    assert.ok(errors['variants[0].stock']);
  });

  await t.test('Duplicate normalized title rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([{ title: 'Size M', price: 100, stock: 1 }, { title: 'size m ', price: 100, stock: 1 }]) });
    assert.ok(errors['variants[1].title']);
  });

  await t.test('Duplicate normalized non-empty SKU rejected', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([{ title: 'Size M', price: 100, stock: 1, sku: 'SKU123' }, { title: 'Size L', price: 100, stock: 1, sku: 'sku123 ' }]) });
    assert.ok(errors['variants[1].sku']);
  });

  await t.test('At least one stocked variant required', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([{ title: 'Size M', price: 100, stock: 0 }, { title: 'Size L', price: 100, stock: 0 }]) });
    assert.strictEqual(errors.variants, 'Ít nhất một phân loại phải có số lượng > 0 để đăng bán.');
  });

  await t.test('Valid variant payload accepted', () => {
    const { errors } = validateInventoryPayload({ inventoryMode: 'variant', variants: JSON.stringify([{ title: 'Size M', price: 100, stock: 1, sku: 'SKU123' }]) });
    assert.strictEqual(Object.keys(errors).length, 0);
  });

  await t.test('Explicit variant -> simple request accepted with simple stock', () => {
    const { errors, inventoryMode, stock } = validateInventoryPayload({ inventoryMode: 'simple', stock: 1, modeIsProvided: true });
    assert.strictEqual(Object.keys(errors).length, 0);
    assert.strictEqual(inventoryMode, 'simple');
    assert.strictEqual(stock, 1);
  });
});