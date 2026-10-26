# Still Objects: template intent and adaptation

[简体中文](TEMPLATE.zh-CN.md)

## The intended experience

The fictional merchant sells two everyday objects. The page gives them room to be considered: an editorial
introduction, an asymmetric product pair, then practical purchase information. Warm paper, olive tones, and
amber illustration reinforce a quiet domestic setting. Display typography carries the emotional opening;
small, readable labels carry the business details.

The template makes a design decision, not a universal rule. A technical catalog with many variants would
require a different hierarchy. The current design uses no decorative animation. Smooth anchor scrolling is
disabled for reduced-motion users.

## What belongs where

- `index.html`: brand voice, hero copy, section order, semantic headings and navigation.
- `style.css`: layout, typography, colors, proportions and responsive behavior.
- `app.js`: SDK reads, business field rendering and the explicit demo-order interaction.
- Business host: product names, descriptions, prices, discounts, inventory, shipping and return terms.
- `media.json` and `assets/`: supplied illustrations and their intended composition.

The hero headline is authored page copy. The campaign title is separate business metadata. Read calculated
prices and delivery terms from the SDK; do not hardcode them as constants to match an initial screenshot.

## Media and adaptation

The cup has a transparent background and a handle extending to the right. Preserve that silhouette. The tray
is seen from above and supports a secondary, wider composition. These are synthetic SVG illustrations, not
actual photographs. Do not infer material certifications, physical dimensions, manufacturing methods, or
origin from their appearance.

Inspect the images with available tools before changing crop or scale. If replacing the asset set in a fork,
update the image files, manifest, and host static-file allowlist simultaneously. The current contract
intentionally exposes only the two bundled media assets.

For this task, adapt at least one of hierarchy, section arrangement, typography, or copy organization. Explain
how it serves the shopper journey. Preserve product data bindings, demo-order semantics, delivery/returns
visibility, and the explicit notice that no real payment occurs.

## Feedback to seek

At desktop and phone widths, inspect headline wrapping, handle cropping, product hierarchy, readable business
details, keyboard focus, and the actual demo order result. Do not compress purposeful whitespace merely to fit
every section into a single viewport. After business state changes, use “Refresh prices & availability”; the
page reads data on load or explicit refresh without automatic polling.

Source edits are visible after a browser reload. There is no HMR, visual editor, compiler, or publish service
in this template.
