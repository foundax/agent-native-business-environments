import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyPlan, campaignIssues, campaignView, placeOrder } from '../src/business.mjs';
import { createEnvironment, createHost, root } from '../src/server.mjs';
import { createBusinessClient } from '../sdk/client.mjs';

const seed = JSON.parse(readFileSync(join(root, 'fixtures/business.json'), 'utf8'));
const plan = JSON.parse(readFileSync(join(root, 'examples/launch-plan.json'), 'utf8'));
const media = JSON.parse(readFileSync(join(root, 'template/media.json'), 'utf8'));

function prepared() {
  return applyPlan(seed, plan, media);
}

function orderInput(revision) {
  return {
    expectedRevision: revision,
    campaignId: 'quiet-mornings',
    country: 'GB',
    items: [{ productId: 'cup', quantity: 1 }],
  };
}

test('a multi-domain plan resolves relations and SDK prices without mutating the original state', () => {
  const state = prepared();
  const view = campaignView(state, 'quiet-mornings', media);
  assert.equal(state.revision, 1);
  assert.equal(seed.products.length, 1);
  assert.deepEqual(campaignIssues(state, 'quiet-mornings', media), []);
  assert.deepEqual(
    view.products.map((product) => product.offerPrice),
    ['£21.60', '£28.80'],
  );
  assert.equal(view.shipping.fee, '£5.00');
  assert.equal(view.products[0].returns.days, 30);
});

test('an existing shipping record is insufficient when its country does not match the goal', () => {
  const wrongPlan = structuredClone(plan);
  wrongPlan.operations.at(-1).value.shippingPolicyId = 'ie-standard';
  const state = applyPlan(seed, wrongPlan, media);
  assert.deepEqual(
    campaignIssues(state, 'quiet-mornings', media).map((issue) => issue.code),
    ['shipping_coverage'],
  );
  assert.throws(() => campaignView(state, 'quiet-mornings', media), { code: 'campaign_not_ready' });
});

test('invalid related data aborts the whole write', () => {
  const invalid = structuredClone(plan);
  invalid.operations[0].value.returnPolicyId = 'missing';
  assert.throws(() => applyPlan(seed, invalid, media), { code: 'returns_missing' });
  assert.equal(seed.revision, 0);
  assert.equal(seed.promotions.length, 0);
});

test('business input rejects hidden fields and fractional money', () => {
  const invalid = structuredClone(plan);
  invalid.operations[0].value.shopId = 'another-shop';
  assert.throws(() => applyPlan(seed, invalid, media), { code: 'ERR_ASSERTION' });
  delete invalid.operations[0].value.shopId;
  invalid.operations[0].value.priceMinor = 24.5;
  assert.throws(() => applyPlan(seed, invalid, media), { code: 'ERR_ASSERTION' });
});

test('stale plans cannot overwrite later business changes', () => {
  assert.throws(() => applyPlan(prepared(), plan, media), { code: 'revision_conflict' });
});

test('the host computes the order total and decrements inventory atomically', () => {
  const state = prepared();
  const { next, order } = placeOrder(state, orderInput(state.revision), media);
  assert.equal(order.totalMinor, 2660);
  assert.equal(next.products.find((product) => product.id === 'cup').stock, 11);
  assert.equal(state.products.find((product) => product.id === 'cup').stock, 12);
  assert.equal(order.lines[0].returnPolicy.days, 30);
  assert.equal(next.revision, 2);
});

test('orders reject unsupported destinations, insufficient stock and client supplied prices', () => {
  const state = prepared();
  const input = orderInput(state.revision);
  input.country = 'US';
  assert.throws(() => placeOrder(state, input, media), { code: 'country_not_supported' });
  input.country = 'GB';
  input.items[0].quantity = 13;
  assert.throws(() => placeOrder(state, input, media), { code: 'insufficient_stock' });
  input.items[0].quantity = 1;
  input.totalMinor = 1;
  assert.throws(() => placeOrder(state, input, media), { code: 'ERR_ASSERTION' });
  assert.equal(state.orders.length, 0);
});

test('later product prices update the page view without rewriting transaction history', () => {
  const { next } = placeOrder(prepared(), orderInput(1), media);
  const cup = next.products.find((product) => product.id === 'cup');
  const changed = applyPlan(
    next,
    {
      expectedRevision: next.revision,
      operations: [{ domain: 'products', value: { ...cup, priceMinor: 3000 } }],
    },
    media,
  );
  assert.equal(campaignView(changed, 'quiet-mornings', media).products[0].offerPrice, '£27.00');
  assert.equal(changed.orders[0].lines[0].unitPriceMinor, 2160);
  assert.throws(() => placeOrder(changed, orderInput(1), media), { code: 'revision_conflict' });
});

test('SDK, HTTP host and persisted state share one write boundary', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'business-environment-'));
  const environment = createEnvironment(directory);
  const host = createHost(environment);
  await new Promise((resolve) => host.listen(0, '127.0.0.1', resolve));
  context.after(async () => {
    await new Promise((resolve) => host.close(resolve));
    rmSync(directory, { recursive: true });
  });
  const origin = `http://127.0.0.1:${host.address().port}`;
  const client = createBusinessClient(origin);
  assert.equal((await client.catalog()).length, 5);
  assert.equal((await client.read('products')).rows.length, 1);
  const writes = await Promise.allSettled([client.apply(plan), client.apply(plan)]);
  assert.equal(writes.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(writes.find((result) => result.status === 'rejected').reason.code, 'revision_conflict');
  const { order } = await client.order(orderInput(1));
  assert.equal(order.totalMinor, 2660);
  assert.equal(createEnvironment(directory).read().orders.length, 1);
  const wrongOrigin = await fetch(`${origin}/api/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Business-Client': 'reference',
      Origin: 'https://example.org',
    },
    body: JSON.stringify(plan),
  });
  assert.equal(wrongOrigin.status, 403);
  assert.equal((await fetch(`${origin}/business.json`)).status, 404);
  assert.equal((await fetch(`${origin}/`)).status, 200);
  const view = await client.campaign('quiet-mornings');
  for (const product of view.products) {
    assert.equal((await fetch(new URL(product.media.src, origin))).status, 200);
  }
});
