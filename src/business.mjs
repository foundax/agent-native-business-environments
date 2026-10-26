import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export class BusinessError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function requireCondition(condition, code, message) {
  if (!condition) throw new BusinessError(code, message);
}

function fields(value, names) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'Expected an object');
  assert.deepEqual(Object.keys(value).sort(), [...names].sort(), `Expected fields: ${names.join(', ')}`);
}

function text(value) {
  assert.ok(typeof value === 'string' && value.trim().length > 0, 'Expected non-empty text');
}

function identifier(value) {
  assert.match(value, /^[a-z][a-z0-9-]{0,63}$/, 'IDs use lowercase letters, digits and hyphens');
}

function integer(value, minimum, maximum = 1_000_000) {
  assert.ok(
    Number.isSafeInteger(value) && value >= minimum && value <= maximum,
    'Integer outside allowed range',
  );
}

function productIds(value) {
  assert.ok(Array.isArray(value) && value.length > 0 && value.length <= 20, 'Select 1–20 products');
  assert.equal(new Set(value).size, value.length, 'Product IDs must be unique');
  value.forEach(identifier);
}

function validateEntity(domain, value) {
  switch (domain) {
    case 'products':
      fields(value, ['id', 'title', 'description', 'priceMinor', 'stock', 'mediaId', 'returnPolicyId']);
      text(value.title);
      text(value.description);
      integer(value.priceMinor, 1);
      integer(value.stock, 0);
      identifier(value.mediaId);
      identifier(value.returnPolicyId);
      break;
    case 'shippingPolicies':
      fields(value, ['id', 'country', 'feeMinor', 'deliveryDays']);
      assert.match(value.country, /^[A-Z]{2}$/);
      integer(value.feeMinor, 0);
      assert.match(value.deliveryDays, /^\d+–\d+$/);
      break;
    case 'returnPolicies':
      fields(value, ['id', 'days', 'description']);
      integer(value.days, 1, 365);
      text(value.description);
      break;
    case 'promotions':
      fields(value, ['id', 'percent', 'productIds']);
      integer(value.percent, 1, 90);
      productIds(value.productIds);
      break;
    case 'campaigns':
      fields(value, ['id', 'title', 'country', 'productIds', 'shippingPolicyId', 'promotionId']);
      text(value.title);
      assert.match(value.country, /^[A-Z]{2}$/);
      productIds(value.productIds);
      identifier(value.shippingPolicyId);
      identifier(value.promotionId);
      break;
    default:
      throw new BusinessError('unknown_domain', `Unknown writable domain: ${domain}`);
  }
  identifier(value.id);
}

export function validateStoredState(state) {
  fields(state, [
    'revision',
    'shop',
    'products',
    'shippingPolicies',
    'returnPolicies',
    'promotions',
    'campaigns',
    'orders',
  ]);
  integer(state.revision, 0, Number.MAX_SAFE_INTEGER);
  fields(state.shop, ['id', 'name', 'currency']);
  assert.equal(state.shop.id, 'studio');
  assert.equal(state.shop.currency, 'GBP');
  text(state.shop.name);
  for (const domain of ['products', 'shippingPolicies', 'returnPolicies', 'promotions', 'campaigns']) {
    assert.ok(Array.isArray(state[domain]));
    state[domain].forEach((value) => validateEntity(domain, value));
    assert.equal(
      new Set(state[domain].map((value) => value.id)).size,
      state[domain].length,
      'Duplicate stored ID',
    );
  }
  assert.ok(Array.isArray(state.orders));
}

export function campaignIssues(state, campaignId, media) {
  const campaign = state.campaigns.find((value) => value.id === campaignId);
  if (!campaign) return [{ code: 'campaign_missing', message: `Create campaign ${campaignId}.` }];
  const issues = [];
  const shipping = state.shippingPolicies.find((value) => value.id === campaign.shippingPolicyId);
  if (!shipping || shipping.country !== campaign.country) {
    issues.push({
      code: 'shipping_coverage',
      message: `Select a shipping policy covering ${campaign.country}.`,
    });
  }
  const promotion = state.promotions.find((value) => value.id === campaign.promotionId);
  if (!promotion) issues.push({ code: 'promotion_missing', message: 'Select an existing promotion.' });
  for (const productId of campaign.productIds) {
    const product = state.products.find((value) => value.id === productId);
    if (!product) {
      issues.push({ code: 'product_missing', message: `Create product ${productId}.` });
      continue;
    }
    if (product.stock === 0)
      issues.push({ code: 'stock_empty', message: `${productId} has no available stock.` });
    if (!state.returnPolicies.some((value) => value.id === product.returnPolicyId)) {
      issues.push({ code: 'returns_missing', message: `${productId} needs a return policy.` });
    }
    if (!media.some((value) => value.id === product.mediaId)) {
      issues.push({ code: 'media_missing', message: `${productId} needs a known media reference.` });
    }
    if (promotion && !promotion.productIds.includes(productId)) {
      issues.push({ code: 'promotion_coverage', message: `${productId} is outside the selected promotion.` });
    }
  }
  return issues;
}

export function applyPlan(state, plan, media) {
  fields(plan, ['expectedRevision', 'operations']);
  requireCondition(
    plan.expectedRevision === state.revision,
    'revision_conflict',
    'Read current data before applying a new plan.',
  );
  assert.ok(Array.isArray(plan.operations) && plan.operations.length > 0 && plan.operations.length <= 50);
  const next = structuredClone(state);
  for (const operation of plan.operations) {
    fields(operation, ['domain', 'value']);
    validateEntity(operation.domain, operation.value);
    const index = next[operation.domain].findIndex((value) => value.id === operation.value.id);
    if (index < 0) next[operation.domain].push(structuredClone(operation.value));
    else next[operation.domain][index] = structuredClone(operation.value);
  }
  for (const product of next.products) {
    requireCondition(
      next.returnPolicies.some((value) => value.id === product.returnPolicyId),
      'returns_missing',
      product.id,
    );
    requireCondition(
      media.some((value) => value.id === product.mediaId),
      'media_missing',
      product.id,
    );
  }
  for (const promotion of next.promotions) {
    requireCondition(
      promotion.productIds.every((id) => next.products.some((value) => value.id === id)),
      'product_missing',
      promotion.id,
    );
  }
  // Draft campaigns may be incomplete; the launch check reports semantic gaps separately.
  next.revision += 1;
  return next;
}

export function campaignView(state, campaignId, media) {
  const issues = campaignIssues(state, campaignId, media);
  if (issues.length)
    throw new BusinessError('campaign_not_ready', 'Resolve business checks before previewing.', issues);
  const campaign = state.campaigns.find((value) => value.id === campaignId);
  const promotion = state.promotions.find((value) => value.id === campaign.promotionId);
  const shipping = state.shippingPolicies.find((value) => value.id === campaign.shippingPolicyId);
  const format = (amount) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: state.shop.currency,
    }).format(amount / 100);
  const products = campaign.productIds.map((id) => {
    const product = state.products.find((value) => value.id === id);
    const discountedMinor = Math.round((product.priceMinor * (100 - promotion.percent)) / 100);
    return {
      ...product,
      discountedMinor,
      price: format(product.priceMinor),
      offerPrice: format(discountedMinor),
      media: media.find((value) => value.id === product.mediaId),
      returns: state.returnPolicies.find((value) => value.id === product.returnPolicyId),
    };
  });
  return {
    revision: state.revision,
    shop: state.shop,
    campaign,
    products,
    promotion: { percent: promotion.percent },
    shipping: { ...shipping, fee: format(shipping.feeMinor) },
  };
}

export function placeOrder(state, input, media) {
  fields(input, ['expectedRevision', 'campaignId', 'country', 'items']);
  requireCondition(
    input.expectedRevision === state.revision,
    'revision_conflict',
    'Refresh prices and stock before confirming.',
  );
  identifier(input.campaignId);
  assert.ok(Array.isArray(input.items) && input.items.length > 0 && input.items.length <= 20);
  const view = campaignView(state, input.campaignId, media);
  requireCondition(
    input.country === view.campaign.country,
    'country_not_supported',
    'Destination is outside this campaign.',
  );
  assert.equal(
    new Set(input.items.map((item) => item.productId)).size,
    input.items.length,
    'Duplicate order item',
  );
  const next = structuredClone(state);
  const lines = input.items.map((item) => {
    fields(item, ['productId', 'quantity']);
    integer(item.quantity, 1, 100);
    const product = view.products.find((value) => value.id === item.productId);
    requireCondition(product, 'product_not_in_campaign', `Unknown campaign product: ${item.productId}`);
    requireCondition(product.stock >= item.quantity, 'insufficient_stock', product.id);
    next.products.find((value) => value.id === product.id).stock -= item.quantity;
    return {
      productId: product.id,
      quantity: item.quantity,
      unitPriceMinor: product.discountedMinor,
      returnPolicy: structuredClone(product.returns),
    };
  });
  const totalMinor = lines.reduce(
    (total, line) => total + line.unitPriceMinor * line.quantity,
    view.shipping.feeMinor,
  );
  const order = {
    id: randomUUID(),
    status: 'simulated',
    campaignId: input.campaignId,
    country: input.country,
    lines,
    shippingFeeMinor: view.shipping.feeMinor,
    totalMinor,
    currency: state.shop.currency,
  };
  next.orders.push(order);
  next.revision += 1;
  return { next, order };
}
