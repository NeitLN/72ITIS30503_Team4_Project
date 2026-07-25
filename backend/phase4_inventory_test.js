const { test } = require('node:test');
const assert = require('node:assert');

// Mock validation function isolated from listingService.js to test logic pure rules
function validateVariantPayload(inventoryMode, variantsPayload) {
  const errors = {};
  if (inventoryMode === 'variant') {
    try {
      const parsedVariants = typeof variantsPayload === 'string' ? JSON.parse(variantsPayload || '[]') : (variantsPayload || []);
      if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
        errors.variants = 'Cần ít nhất một phân loại (size/màu).';
      } else {
        let hasStock = false;
        parsedVariants.forEach((v, idx) => {
          if (!v.title || !v.title.trim()) errors[`variants[${idx}].title`] = 'Tên phân loại không được trống.';
          const vPrice = Number(v.price);
          if (!Number.isFinite(vPrice) || vPrice < 0) errors[`variants[${idx}].price`] = 'Giá không hợp lệ.';
          const vStock = Number(v.stock);
          if (!Number.isInteger(vStock) || vStock < 0) errors[`variants[${idx}].stock`] = 'Kho không hợp lệ.';
          else if (vStock > 0) hasStock = true;
          if (v.sku && v.sku.length > 50) errors[`variants[${idx}].sku`] = 'SKU quá dài (tối đa 50 ký tự).';
        });
        if (!hasStock) errors.variants = 'Ít nhất một phân loại phải có số lượng > 0 để đăng bán.';
      }
    } catch (err) {
      errors.variants = 'Dữ liệu phân loại không hợp lệ.';
    }
  }
  return errors;
}

test('Phase 4: Inventory Validation', async (t) => {
  await t.test('Missing variant fields rejected', () => {
    const errs = validateVariantPayload('variant', JSON.stringify([{ price: 100, stock: 1 }]));
    assert.ok(errs['variants[0].title']);
  });

  await t.test('Negative variant stock rejected', () => {
    const errs = validateVariantPayload('variant', JSON.stringify([{ title: 'L', price: 100, stock: -1 }]));
    assert.ok(errs['variants[0].stock']);
  });

  await t.test('Total 0 variant stock across all rows rejected', () => {
    const errs = validateVariantPayload('variant', JSON.stringify([{ title: 'L', price: 100, stock: 0 }, { title: 'M', price: 100, stock: 0 }]));
    assert.ok(errs.variants);
    assert.strictEqual(errs.variants, 'Ít nhất một phân loại phải có số lượng > 0 để đăng bán.');
  });
  
  await t.test('Valid variant payload passes', () => {
    const errs = validateVariantPayload('variant', JSON.stringify([{ title: 'L', price: 100, stock: 1 }]));
    assert.strictEqual(Object.keys(errs).length, 0);
  });
});
