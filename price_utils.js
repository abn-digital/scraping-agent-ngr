/**
 * Shared helpers for list vs offer pricing and Magento Promociones dedupe.
 */

/** Parse S/ amounts from free text. */
function parseSolAmount(raw) {
  if (raw == null) return null;
  const n = parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Partner / coupon offer buried in Magento descriptions, e.g.:
 *   "Con el código yape, por S/20.90 llévate…"
 *   "2 Parrilleras medianas… a S/30.80"
 *   "Con el código de Interseguro, por S/24.90…"
 *
 * @returns {{ offerPrice: number, partner: string|null } | null}
 */
function parsePartnerOfferFromDescription(description) {
  const text = String(description || '');
  if (!text) return null;

  const partner =
    /\byape\b/i.test(text) ? 'yape'
      : /\bentel\b/i.test(text) ? 'entel'
        : /\binterseguro\b/i.test(text) ? 'interseguro'
          : /\bc[oó]digo\b/i.test(text) ? 'codigo'
            : null;

  // Prefer "por S/X" (most Magento cupones), then "a S/X"
  const por = text.match(/\bpor\s*S\/\s*([\d.,]+)/i);
  const a = text.match(/\ba\s*S\/\s*([\d.,]+)/i);
  const offerPrice = parseSolAmount(por?.[1]) || parseSolAmount(a?.[1]);
  if (!offerPrice) return null;

  return { offerPrice, partner };
}

/**
 * Normalize Magento-style price fields:
 * - If Magento exposes oldPrice > finalPrice → final is offer, old is list
 * - Else if description embeds a lower partner offer → that becomes price
 *
 * Mutates and returns the product.
 */
function applyOfferPricing(product) {
  if (!product || typeof product.price !== 'number' || product.price <= 0) return product;

  let listPrice = product.price;
  let offerPrice = product.price;
  let partner = product.promoPartner || null;

  if (typeof product.originalPrice === 'number' && product.originalPrice > product.price) {
    listPrice = product.originalPrice;
    offerPrice = product.price;
  }

  const blob = `${product.name || ''} ${product.description || ''}`;
  const fromDesc = parsePartnerOfferFromDescription(blob);
  if (fromDesc && fromDesc.offerPrice < listPrice) {
    offerPrice = fromDesc.offerPrice;
    partner = fromDesc.partner || partner;
  }

  if (offerPrice < listPrice) {
    product.price = offerPrice;
    product.originalPrice = listPrice;
    if (partner) product.promoPartner = partner;
  } else if (product.originalPrice === product.price) {
    delete product.originalPrice;
  }

  return product;
}

/** True when category is a Promociones / Cupones mirror section. */
function isPromoCategory(category) {
  return /promocion|cupon|cupones/i.test(String(category || ''));
}

/**
 * Collapse Magento duplicates that appear once in carta and again under Promociones.
 * Prefers the non-promo category; keeps distinct prices as separate rows.
 *
 * @param {Array<object>} products
 * @returns {Array<object>}
 */
function dedupePreferCatalogCategory(products) {
  const byName = new Map();
  for (const p of products) {
    if (!p?.name) continue;
    const key = p.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(p);
  }

  const out = [];
  for (const group of byName.values()) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }

    // Same name + same price → keep best category (non-promo first)
    const byPrice = new Map();
    for (const p of group) {
      const pk = Number(p.price).toFixed(2);
      if (!byPrice.has(pk)) byPrice.set(pk, []);
      byPrice.get(pk).push(p);
    }

    for (const variants of byPrice.values()) {
      const sorted = [...variants].sort((a, b) => {
        const ap = isPromoCategory(a.category) ? 1 : 0;
        const bp = isPromoCategory(b.category) ? 1 : 0;
        if (ap !== bp) return ap - bp;
        return String(a.category || '').localeCompare(String(b.category || ''));
      });
      out.push(sorted[0]);
    }
  }

  return out;
}

module.exports = {
  parseSolAmount,
  parsePartnerOfferFromDescription,
  applyOfferPricing,
  isPromoCategory,
  dedupePreferCatalogCategory,
};
