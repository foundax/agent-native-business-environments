# Agent-Native Business Environments

## From generated pages to working business experiences

> **Let agents organize goals and creative work. Give them clear capabilities, reliable business rules, and
> actionable feedback.**

[简体中文](README.zh-CN.md) · [Engineering design](docs/design.md) · [Run and adapt](docs/walkthrough.md)

A merchant asks: "Launch a restrained, well-designed collection for customers in the UK, with an opening
offer, delivery, and returns."

Behind this request, the agent must create products, associate media, understand inventory, configure
shipping, reuse return terms, and connect a promotion before presenting these capabilities in a usable
interface. A good-looking page does not guarantee a product can be purchased. An existing shipping record may
not cover the target destination. Furthermore, the agent must handle layout, media composition, interaction,
and visual feedback.

**How do we turn a complex business system into an environment an agent can explore, understand, compose, and
verify, so it can complete open-ended goals within a limited context and execution budget?**

This project addresses this core problem. It shares practices originating in [Foundax](https://foundax.com)
and is highly applicable to CRM, ERP, marketing, and operations software that require tasks spanning multiple
business objects. Here, "Agent-Native" means capabilities can be progressively discovered, composed through
ordinary code, and executed via explicit contracts and verifiable feedback. This layer can be built on top of
existing business services.

## Quick Start and Walkthrough

The repository provides **design documentation, an executable system reference, synthetic business data, and
an adaptable storefront template**. These example interfaces and business rules are for educational reference
and do not map to Foundax's private codebase or real data models.

Prerequisites: Node.js 22 or newer. There are no third-party dependencies, no npm packages to install, and no
model keys or Foundax accounts required.

From the downloaded repository root, run:

```sh
npm run demo
```

Open the printed address, `http://127.0.0.1:4317`. The command runs a scripted sequence:

1. Creates related products, shipping, promotion, and campaign records, deliberately selecting the wrong
   shipping policy.
2. Demonstrates a business check failing ("policy exists, but does not cover the UK"), then repairs the
   reference.
3. Serves an ordinary page using the SDK's current business view. A demo order computes prices on the host
   side and reduces simulated stock.

**This is a deterministic walkthrough; it does not call a model.** Raw data, editable page files, and write
results persist in `.local/`. You can resume later with `npm start`. Replaying the demo requires a fresh
`BUSINESS_HOME` directory; existing data will not be overwritten. There are no real payments, taxes, actual
fulfillment, or internet publication in this demo.

To bring your own Coding Agent into the environment, start with [TASK.md](TASK.md). The task entry uses the
same SDK and CLI. Any browser, vision, and computer-use tools must be provided by your agent's environment.

## 1. Where should complexity live?

Dumping every API, database schema, and design requirement into the context window does not automatically
create a useful working environment. The model still has to locate entry points, resolve relationships,
translate fields, and retain those details throughout the creative process.

Fixed workflows serve known paths; discrete tools serve well-defined single actions; code environments support
tasks requiring exploration and composition. Composing capabilities through code offers a different
orchestration approach rather than replacing standard Tool Calling. The architectural challenge lies in how
capabilities and state are organized:

| Design question                                   | What this project contributes                                                                                         |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| How are objects created and related?              | Named domain contracts, explicit ID references, batched related writes, host validation, and revision prerequisites.  |
| How is irrelevant information minimized?          | Query the domain catalog first, then read only necessary contracts and data; provide guidelines for managing history. |
| How does a page use actual business capabilities? | An SDK projection joins prices, offers, shipping, returns, and media into a unified view.                             |
| How can agents retain creative freedom?           | Standard HTML/CSS/JavaScript for presentation, leaving business rules executed strictly on the host.                  |
| What supports design quality?                     | Template intent, adaptation instructions, media descriptions, and viewable assets.                                    |
| How are feedback and costs managed?               | Separate checks for business, code, and visuals; inspect only the changes that affect outcomes.                       |
| How can other agents integrate?                   | Shared SDK, CLI, and project files that do not rely on a specific model's private state.                              |

The shared goal of these choices is to "leave more attention for design." The system handles rule validation
and data assembly, but this does not imply the system can directly manipulate the model's internal attention
mechanism.

## 2. One task, explicit responsibilities

```text
User goal → Internal or external Coding Agent
              ├─ Domain catalog → Progressively read contracts, data, and media
              ├─ SDK / CLI → Host validation → Business state and revisions
              └─ Template brief → Ordinary page code → Browser observation and feedback
                                          ↓
                              SDK view and controlled demo orders
```

The SDK in this reference implementation runs in both Node.js and the browser. The host assembles the campaign
view and computes discounted prices. Order placement only accepts inputs like product IDs and quantities; it
does not trust any final price asserted by the page. If a write creates a version conflict, the host rejects
the overwrite and requires the agent to re-read and revise its intent.

Pages read current data upon loading or explicit refresh; orders retain their simulated transaction prices and
return terms.

These mechanisms clearly separate what the system is responsible for versus the agent. For detailed deductions
on draft states, cross-domain writes, context lifecycles, and production integration, see the
[engineering design](docs/design.md).

## 3. Scope and boundaries of this repository

| Area                            | Repository scope                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business host, SDK & CLI        | Runnable. Single-shop service, domain writes, revision conflicts, views, and simulated orders. (Note: Single-process JSON file writing is not a database transaction.) |
| Page, template & media          | Runnable. Standard browser code, synthetic SVG assets, design intent, and adaptation instructions.                                                                     |
| Progressive disclosure          | Runnable catalog and domain reads. The user or external agent chooses what to read; this package does not automatically load or compress context.                      |
| Model orchestration & context   | Design and pseudocode. The repository does not include model calls or a built-in agent loop.                                                                           |
| Browser observation             | Real preview endpoints and inspection steps; no bundled screenshot or computer-use tools.                                                                              |
| Editor, compiler, and isolation | Architecture boundaries and related projects. No complete editor, compiler, identity system, tenant isolation, or sandbox provided.                                    |

The local process relies on a single-writer model. Do not edit the generated JSON business state directly, and
do not share a single `BUSINESS_HOME` directory across multiple hosts. This directory is a local workspace,
not a security isolation boundary. Real payments, inventory reservations, retry idempotency, and production
deployments must be integrated into actual business services.

## 4. Design, performance, and openness

Templates communicate scene intent and media requirements alongside source code. SDK results encapsulate
business semantics (like pre-calculated offers and shipping rules) so pages do not have to reimplement them.

These engineering choices involve trade-offs: the [engineering design](docs/design.md) thoroughly explores the
balance between reuse and freedom, retrieval turns versus context size, current state versus historical
records, and validation overhead versus actionable feedback.

When the environment is structured like an ordinary code project, exposing a CLI is a natural architectural
choice. External coding agents can combine their available browser, vision, and computer-use capabilities to
continue working. This repository's CLI is a standalone simulation for teaching purposes; Foundax's commercial
CLI is a completely separate product.

## 5. Read and experiment

- **[Agent task](TASK.md)**: Begin with your own agent in an environment that has an existing tray, IE
  shipping, and return policies, but incomplete campaign configurations.
- **[Run and adapt](docs/walkthrough.md)**: Inspect data, edit page code, handle revision conflicts, and place
  demo orders.
- **[Engineering design](docs/design.md)**: Deep dive into business representation, context management,
  quality feedback, and production integration boundaries.
- **[Template brief](template/TEMPLATE.md)**: Understand layout composition, media requirements, and the
  boundary between authored and business-owned content.
- **[Agent Business Workspace](https://github.com/foundax/agent-business-workspace)**: Workspaces and snapshot
  lifecycles.
- **[Agent Editable UI](https://github.com/foundax/agent-editable-ui)**: Continuous collaboration between
  source code, visual editing, and data.

We welcome discussions on real business scenarios, API trade-offs, and experiment results. To contribute, see
[CONTRIBUTING.md](CONTRIBUTING.md). Engineering discussions: contact@novariseintl.com. Licensed under the
[MIT License](LICENSE).

When connecting external models, account for model deployment, data authorization, and cross-border transfer
requirements applicable to your region. This repository's code makes zero network requests to any model
services; external agent behavior depends entirely on your toolchain and configurations.
