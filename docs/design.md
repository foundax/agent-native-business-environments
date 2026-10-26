# Engineering Design: Translating Business Systems into Agent Execution Environments

[简体中文](design.zh-CN.md) · [Project overview](../README.md)

This document explores how to translate complex business systems into agent execution environments. This
repository is an independently authored educational reference and does not map to Foundax's private commercial
code or real data models.

## 1. Establish the boundaries first

Users provide goals rather than fully specified API sequences. The environment must support discovery,
creation, revision, and feedback while retaining business ownership of permissions, rules, and state writes.
This reference distributes complexity across three layers:

```text
Agent and external tools
  User goal / task state / ordinary code / media pixels / browser observation
             │ selective reads, business commands, receipts
             ▼
Business capability layer
  Domain catalog / contracts / SDK projections / CLI / structured errors
             │ authorized calls to existing domain services
             ▼
Business host
  Authorization and scope / relations / pricing / transactions / revisions / audit
```

In production, identity and session scope determine authorization; an agent-supplied tenant ID cannot
establish access.

This repository implements a fixed-shop local host using a Node.js process and JSON persistence; there is no
tenant-selection input. It demonstrates contract delegation. The environment contains no model calls, built-in
agent loop, automatic context compression, production authorization isolation, or complete editor.

Files have distinct boundaries: `src/` contains the host logic, `sdk/` the client interfaces, and `fixtures/`
synthetic initial state. The `.local/site/` directory contains editable page code; `.local/business.json`
belongs to the host. Page source and business revisions evolve separately. Local filesystem access does not
imply production business write authorization.

## 2. From business assets to composable capabilities

### Relationships belong in the contract

Products reference return policies and media. Promotions reference products. Campaigns reference products,
shipping policies, and promotions. Models establish these relationships via explicit IDs, and the host checks
them. Read and write fields use the same names to reduce ambiguous mapping.

The contract need not expose every database detail. It should explain entity meaning, relationships, writable
values, units, and recoverable errors. For example, `priceMinor` is an integer number of GBP pennies, not a
formatted price; `GB` is a country code, not presentation copy. See [catalog](domains/catalog.md),
[fulfillment](domains/fulfillment.md), and [campaigns](domains/campaigns.md).

### Generating data and committing data are different responsibilities

An agent may generate copy and plan relationship structures. The host validates fields, references, amounts,
and revisions. The `apply` interface processes operations in a candidate state and saves once. Products can
reference records created in the same submission. An invalid product or promotion reference rejects the entire
submission.

Campaigns allow incomplete drafts. For instance, selecting a shipping policy that fails to cover the target
country is allowed in a draft; `check` reports the gap, and campaign views and orders remain blocked. "Saving
the creative process" and "satisfying transaction prerequisites" carry different semantics. Production
integrations should determine which invariants apply immediately and which are deferred to publication or
execution.

Writes replace complete objects; this is not a general patch language. `expectedRevision` prevents stale plans
from overwriting later state, but the shop-wide version also conflicts on unrelated changes. Larger systems
may use entity revisions and domain transaction boundaries. Cross-service writes also require decisions about
compensation and partial success.

### An SDK can do more than rename APIs

`campaignView` is a task-oriented read model joining products, offers, shipping, returns, and media. It
reduces repeated domain joins and rule computations for callers, not merely function name lengths.

The page retains compositional freedom, while prices and order calculations share host implementation. Orders
accept products, quantities, destination, and revision, computing amounts on the host. Pages read current data
on load or explicit refresh without automatic polling. Placed orders retain transaction prices and return
terms, while future pages continue reading the latest current business state.

This projection has costs: it targets campaign page tasks, needs semantic maintenance, and may hide
information useful elsewhere. Domain reads remain available. Do not use one oversized SDK response for every
business scenario.

## 3. Build business understanding progressively

### Discover domains before loading their data

`catalog` returns purpose, contract paths, and dependencies. Agents can identify relevant objects before
reading contracts and data. Full domain reads suit the small fixtures here; production reads need pagination,
filtering, and explicit coverage; a truncated dataset must not be presented as complete.

Data receipts carry `revision` identifiers because reads can span versions. This implementation does not
provide snapshot isolation across separate reads. If related reads return differing versions, the agent should
re-read relevant data; the host validates writes against current state. For immutable snapshots and domain
refresh, see [Agent Business Workspace](https://github.com/foundax/agent-business-workspace).

### Separate task state from raw history

Current goals, confirmed facts, pending decisions, business versions, source state, and latest observations
should be distinguishable. Old screenshots may describe modified code; previous tool outputs might describe
stale inventory.

The following is design pseudocode, not an included context manager:

```python
def prepare_model_context(task, state, history):
    context = [task.user_goal, task.constraints, state.pending_decisions]
    context += state.selected_contracts
    context += current_data_receipts(state.business_versions)
    context += current_source_references(state.source_revision)
    context += current_visual_observations(state.source_revision)
    context += history.retrieval_index()
    return fit_to_input_budget(context, preserve=task.user_messages)
```

The history index requires recoverable original records. Compaction must preserve tool-call/result pairing and
user constraints. Summaries lose information, retrieval costs turns, and identifying stale content requires
version evidence. These are mechanisms to design and test, not consequences of simply enabling “automatic
compaction.”

## 4. Keep creative expression in familiar code

This package uses ordinary HTML, CSS, and JavaScript without a page DSL. Native browser code reduces protocol
expression burden; the same business client logic can enter React or TypeScript projects.

Production editors require dedicated handling of ASTs, value provenance, component instance semantics, and
revisions. Models should not be required to maintain internal identities by hand. Identity mapping, merchant
edits, and source rewriting collaboration are explored in
[Agent Editable UI](https://github.com/foundax/agent-editable-ui). This package does not implement a built-in
editor.

Product titles and prices belong to the business system; hero copy, composition, and styles belong to the
page. Campaign titles are business metadata and need not match hero headlines. The page does not duplicate
business data into presentation-only constants.

## 5. Design knowledge, media, and templates

### Design goals connect to business goals

In this scenario's journey, customers understand the product, review offers, and make decisions. Whitespace,
visual hierarchy, and practical-details sections serve this path. Complex industrial goods would require a
different information structure, not just swapped images.

[TEMPLATE.md](../template/TEMPLATE.md) explains intent, adaptable parts, and business bindings. The reference
transfers both a result and the knowledge needed to adapt it. Templates can also homogenize output. The task
requires a reasoned design change, rather than treating fidelity to the original template as the success
criterion.

### Metadata and pixels provide complementary evidence

The media manifest includes IDs, paths, dimensions, transparency, intended use, and composition guidance.
Actual pixels help assess the subject and crop. This example contains explicitly synthetic vector
illustrations, not product photography or an image-generation service. Agents can use available visual tools;
receiving an image URL is not the same as viewing its pixels.

Production media analysis can become stable asset metadata to avoid repeated queries. Descriptions can still
be wrong, and asset changes require invalidation. When an appropriate asset is missing, request it rather than
pretending an existing image satisfies the design.

## 6. Use distinct feedback for distinct questions

| Feedback layer                 | Establishes                                             | Does not establish                                                       |
| ------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| JavaScript syntax check        | Parseable file                                          | Browser execution or good composition.                                   |
| Domain write validation        | Fields, references, and revisions meet write conditions | Draft satisfies all launch requirements.                                 |
| Campaign check and SDK view    | Implemented shipping, promotion, and product rules      | Complete tax, payment, or business rule coverage.                        |
| Simulated order                | Host pricing, stock decrement, and local saves align    | Real payment or fulfillment occurred.                                    |
| Browser and visual observation | Rendering and interaction at current viewport           | Compatibility across all devices, languages and accessibility scenarios. |

Feedback should identify actionable causes. `shipping_coverage` points to a business relationship, making it
easier to resolve than guessing from a generic page error. Errors complement domain documentation and must not
disclose unauthorized details.

Quality and performance tradeoffs:

- **Selective reads** reduce initial context but add discovery steps. Supply common entry points and keep
  detailed material searchable.
- **Composed SDK views** reduce round trips and repeated joins, but require maintenance and may overfetch.
- **Templates** reduce repeated creation, but need assessment of business, asset, and style fit.
- **Visual feedback** catches issues syntax checks miss. Capturing observations again may be worthwhile when
  the viewport, data, interactive state, or source code changes.
- **Replacing stale context** reduces repeated input, but needs original records and a recovery path.

Track read bytes, cumulative input, call count, preparation time, time to a usable preview, and repair rounds.
Also record whether business, interaction, and visual requirements were met. Do not use token drops or call
reductions alone to establish quality improvement. This repository includes no model comparison experiment and
does not present historical Foundax metrics as results for this example.

## 7. Open CLI and external tool environments

Internal agents, external coding agents, and developers can use one business contract. The client can be
imported in scripts or wrapped in the CLI; pages obtain a composed view through the same host. Ordinary
project files let external tools search, modify, preview, and inspect the result directly.

Benefits depend on actual tool capabilities: browsers can interact with pages, vision models can interpret
images, and computer-use tools can support additional interaction. Not every agent provides all of these, and
openness does not guarantee improved design. The package provides common business/project interfaces without
bundling a model or harness.

External use also tests interface clarity. If an outside agent needs extensive undocumented internal
knowledge, some relationships, defaults, or execution feedback have not yet been expressed clearly enough.

## 8. Integrating with a real system

Preserve contract meaning while replacing the simulation with authorized domain services. Production writes
need transactions, audit, idempotency, and concurrency control. A JSON file and shop-wide version demonstrate
only the local mechanism. Orders are not automatically retried; an uncertain network outcome must not cause a
blind resubmission.

Code execution needs actual isolation; `.local/` is not a sandbox. Authorization belongs at the host on every
operation, with separate boundaries for browser origins, network access, and secrets. The local SDK's ability
to submit administrative plans is a single-user teaching choice. Real shoppers must not inherit administrative
permissions; management and consumer operations need separate authorization.

Finally, distinguish business state, source state, and published revisions. Editing a file, passing business
checks, obtaining a preview, and publishing a website are different results. The package ends at local
execution and contributes reproducible responsibilities and experiments rather than a production launch
system.
