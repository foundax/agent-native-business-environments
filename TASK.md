# Agent task: prepare a collection that supports a simulated purchase

You are preparing a UK launch for the fictional brand Still Objects. The merchant wants a restrained, warm
page emphasizing everyday rituals. Adapt the supplied reference with at least one reasoned layout or
content-organization change while preserving business interactions.

## Merchant-supplied facts

- Existing product `tray`: read its name, price, and inventory from the business service.
- New product `cup`: Morning cup, £24.00, stock 12, media `cup`, existing return policy `standard`.
- Campaign ID `quiet-mornings`: include both `cup` and `tray`, each with a 10% discount.
- Destination `GB`: £5.00 shipping per order, estimated 3–5 days. Existing coverage for another country is
  insufficient.
- Use provided facts. Do not invent certifications, origin, sustainability claims, or commercial fulfillment
  guarantees.

## Start working

Keep `npm start` running in a separate terminal. The default working directory is `.local/`. If you already
ran the scripted demo, use a fresh directory so completed demo state is not mistaken for an agent result:

```sh
BUSINESS_HOME=/tmp/still-objects-agent-run npm start
```

Use a directory that has not been used before. Stop an earlier host if it occupies the port. In another
terminal:

```sh
npm run cli -- catalog
npm run cli -- read products
```

Select contracts and data from the catalog, prepare your related-write plan, and submit it with
`apply <file>`. Edit the new directory's `site/` files. Read `site/TEMPLATE.md` before adapting the page. Use
the printed preview address and available browser/vision tools to inspect the result and make informed
adjustments.

## Acceptance

1. Create the new product and link both products, the GB shipping policy, and a 10% promotion to the campaign.
2. `check quiet-mornings` reports no business issues. The page consumes SDK prices, delivery, and return
   terms.
3. Use supplied media. Explain at least one design change and which previews you actually inspected.
4. Place one simulated `cup` order: £21.60 after discount plus £5.00 delivery, total £26.60; stock changes
   from 12 to 11.
5. Report completed steps, results, and unperformed visual or interaction checks. Do not claim a real payment
   or launch.

The scripted plan in `examples/launch-plan.json` is available for comparison after an independent attempt.
These fixed facts make the task reproducible; they do not represent real merchant pricing, shipping, or legal
terms.
