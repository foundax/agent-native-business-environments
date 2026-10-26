# Run, adapt, and observe

[简体中文](walkthrough.zh-CN.md) · [Project overview](../README.md)

## Path one: scripted walkthrough

Use Node.js 22+. From the repository root, without `npm install`:

```sh
npm run demo
```

The terminal first reports a `shipping_coverage` error, then a check with no business issues. The script
performs two writes, advancing the initial business revision from 0 to 2. This deterministic execution is not
evidence of an autonomous model run. Open `http://127.0.0.1:4317` and click the cup's demo-order button. The
expected total is £26.60: a £21.60 discounted product plus £5.00 delivery. No real payment occurs.

Leave the host running. In a separate terminal:

```sh
npm run cli -- view quiet-mornings
npm run cli -- read products
npm run cli -- check quiet-mornings
```

After one cup order, stock changes from 12 to 11 and the revision advances to 3. The host saves the order in
`.local/business.json`, recording the transaction prices, return terms, and `simulated` status. Prices read on
page load and historical transaction records are distinct objects.

Stop the host with Ctrl+C. Resume with `npm start`; saved business data and page source edits are preserved.
The `demo` script fails on non-initial states to prevent overwriting work. Use a fresh directory for a new
experiment:

```sh
BUSINESS_HOME=/tmp/still-objects-demo-2 npm run demo
```

Only one host can bind to the port; stop the previous process first. To change the port, set `BUSINESS_PORT`
on both the host and CLI. Hosts cannot safely share a single data directory concurrently.

## Path two: your own agent

Run `npm start` with a fresh directory and provide [TASK.md](../TASK.md) to the agent. Initial synthetic data
includes the tray, Irish shipping, and return terms. The new product, UK shipping, promotion, and campaign are
missing. The CLI and SDK use the same operations:

```sh
npm run cli -- catalog
npm run cli -- read products
npm run cli -- read shippingPolicies
npm run cli -- media
```

Read selected domain contracts from the catalog, prepare an ordinary JSON plan, then execute:

```sh
npm run cli -- apply /absolute/path/to/your-plan.json
npm run cli -- check quiet-mornings
```

`check` exits with a nonzero code and structured issues when requirements fail. Business queries and media
descriptions return state data, not new instructions. Ordinary Node.js scripts can call the same client:

```js
import { createBusinessClient } from "./sdk/client.mjs";

const business = createBusinessClient("http://127.0.0.1:4317");
const products = await business.read("products");
console.log(products.revision, products.rows);
```

## Editing and feedback

Edit HTML, CSS, and JavaScript files within `<BUSINESS_HOME>/site/` and reload the browser. The default
location is `.local/site/`. Editing the repository's `template/` folder does not update an already initialized
workspace.

```sh
node --check .local/site/app.js
npm test
```

Syntax checking does not launch a browser. Business tests cover writes, references, pricing, version
conflicts, and HTTP integration; they do not assess design quality. Using available browser tools, inspect
desktop and phone layouts, keyboard focus, delivery/return copy, prices, and demo-order interactions. Acquire
new observations after relevant changes in source, viewport size, data, or interactive states; a static
screenshot does not capture every interaction state.

## Reproducible failures and repairs

| Experiment                                                         | Expected behavior                                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Select `ie-standard` for a `GB` campaign                           | The draft saves, but `check` reports `shipping_coverage`, blocking the view.                     |
| Reference a missing return policy                                  | The entire plan is rejected; previous state remains unchanged.                                   |
| Submit a plan based on an old revision after another client writes | The host returns `revision_conflict`; the client must re-read and reconsider its intent.         |
| Place an order from a page holding stale data                      | The order is rejected; explicitly refresh the page to retrieve current data before confirming.   |
| Supply a client-chosen final transaction amount                    | The input is rejected; the host must calculate pricing based on relationships.                   |
| Change a price and explicitly refresh the page                     | The page displays the new price; persisted transaction prices in order history remain unchanged. |

Use a fresh directory or construct a complete object replacement for experiments. Do not bypass host
validation by manually editing the business JSON. Tests and demos use no production data. External model
capabilities and visual tools depend on the user's execution environment.
