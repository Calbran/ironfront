---
name: Ironfront
description: A paper-and-petrol operational map for persistent campaign command.
colors:
  accent: "#304e45"
  accent-hover: "#436555"
  ink: "#223b3d"
  muted: "#596b65"
  paper: "#eeeade"
  line: "#c8cbbb"
  sea: "#18363e"
  masthead: "#142d33"
  button-text: "#f4efda"
  button-border: "#aeb9a9"
  button-hover: "#d9dfd0"
  field: "#f7f5eb"
  field-ink: "#243e35"
  field-border: "#b4c0ac"
  focus: "#a27a2c"
  field-focus: "#7c8c60"
  selected-faction: "#dce3d3"
  selected-border: "#a3b59b"
  active-tab: "#365b4a"
  neutral-land: "#9ca696"
  front: "#e8d5a4"
  selected-region: "#f2dfad"
  objective: "#f1d9a0"
  counter: "#e8e1c8"
  counter-selected: "#f2d696"
  defense-sector: "#edd8a3"
  province-boundary: "#435744"
  mountain-selection: "#ecebe0"
  error-surface: "#f0d6c9"
  error-ink: "#672d1d"
  nation-1: "#527b9e"
  nation-2: "#ad6355"
  nation-3: "#5b8b7d"
  nation-4: "#b29a50"
  nation-5: "#8d769d"
  nation-6: "#bb845a"
  nation-7: "#728d4e"
  nation-8: "#7299a7"
typography:
  display:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "clamp(32px, 3.8vw, 56px)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  headline:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif'
    fontSize: "14px"
  label:
    fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif'
    fontSize: "11px"
  map-label:
    fontFamily: "Arial"
    fontSize: "11px"
    fontWeight: 500
rounded:
  control: "3px"
  counter: "1.5px"
  context-panel: "4px"
spacing:
  compact-gap: "8px"
  control-gap: "12px"
  section: "20px"
  panel: "22px"
  map-inset: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.control}"
    padding: "13px 15px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 13px"
  button-secondary-hover:
    backgroundColor: "{colors.button-hover}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.control}"
    padding: "10px 11px"
  faction-selected:
    backgroundColor: "{colors.selected-faction}"
    padding: "12px 10px"
  tabs:
    padding: "0 22px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.context-panel}"
    width: "320px"
---

# Design System: Ironfront

## Overview

**Creative North Star: "The Operational Map"**

The implemented world is a military planning map: deep petrol water, pale paper controls, quiet green actions, procedurally shaded terrain with translucent ownership, and rectangular army counters. Condensed headings give the interface a practical printed character; fine rules organize dense information inside one closable left context panel over the full-screen campaign map.

The accepted direction combines Cold War military silhouettes, Victorian identity, and steampunk engineering. This early proof expresses that direction through typography, an outlined shield mark, shaded cartographic relief, and restrained material colors. Distinctive faction costumes, vehicles, machinery, and illustrations remain future art direction; the terrain raster is generated at runtime from world data in a local canvas, with no external image assets. Ironfront is the approved game name; faction names remain provisional.

This descriptive name summarizes the shipped code; it is not a separately approved brand name. Source of truth: `apps/web/src/style.css`, `App.tsx`, `ContinentalMap.tsx`, `terrainTexture.ts`, `main.tsx`, and the direction contract in `apps/web/index.html`. The independent map-correction review returned ship for the bounded density, boundary, and camera correction. Current desktop, phone, and Fit screenshots were checked. Angular river paths remain a nonblocking limitation of the geographic appearance. This is not a claim of final faction art or validated game balance.

**Key Characteristics:**
- A persistent map is the central visual instrument.
- One paper context panel overlays the full-screen petrol campaign map.
- Condensed headings and compact system-font data stay distinct.
- Relief, geography, and state carry meaning before decoration.

## Colors

Muted military greens bridge warm paper and blue-green water. Frontmatter records the reusable values extracted from code; individual contextual tints remain in the stylesheet. The companion `.impeccable/design.json` adds component previews and synthesized tonal ramps for inspection; those ramps are not additional shipped UI colors.

### Primary

The green accent identifies committed actions; the lighter green is its hover state. Brass focus is reserved for keyboard location, while pale gold marks selected regions and objectives on the dark theater.

### Secondary

The eight nation colors encode player seats. They recur in owned territory, the army symbol, and land standings. They are assigned by seat, independently of the chosen faction. Front-line cream separates ownership; unowned land retains the terrain colors beneath an almost transparent neutral overlay.

### Neutral

Paper is the default UI surface; ink and muted ink provide the reading hierarchy. Petrol sea frames the continent. The masthead is a darker related surface. Fields are slightly lighter than paper, and thin gray-green rules separate panels and rows. Errors use a pale terracotta surface with dark rust text.

**The Ownership Rule.** Nation colors communicate ownership consistently across map and UI; they are not faction art palettes.

## Typography

Display and section headings use self-hosted Barlow Condensed, imported through Fontsource at weights 500 and 600. The body stack is Avenir Next, Avenir, Segoe UI, sans-serif. No downloaded body font is required. Canvas territory names and strength values use Arial; province names and sea annotations use Georgia.

The frontmatter display style is the wide-screen lobby heading. Most section headings use the headline role, with contextual sizes: campaign nation name (27px), selected region (29px), campaign theater heading (20px), and army heading (17px). Compact labels, metadata, and timestamps commonly use the label role. Paragraphs have a line height of 1.6; introductory copy is limited to 340px. Resource totals, timestamps, strength, and percentages use tabular numerals in the DOM.

Province names are uppercase Georgia with 1.5px tracking, sized at 11 screen pixels at fit and 13 from 145% zoom. They give way to territory names at 230% zoom. Territory names are Arial at 11 screen pixels, with the selected name at 13; selection makes a territory name eligible before detail zoom. Province and capital labels are culled against coastline corners, army counters, and earlier labels; territory names are collision-culled with selected-region priority. The region selector remains the dependable textual identifier. Raster text resolution adapts to scale and device pixel ratio. Counter strength uses Arial (8px, weight 600); sea annotations use Georgia (11–13px).

## Layout

The campaign is a fixed full-viewport map with a masthead (60px) and campaign strip (32px) overlaid across the top. The canvas extends underneath the chrome; the page itself does not scroll. A single closable paper context panel overlays the left side, holding nation information, command controls, dispatch history, and session controls. It is 320px wide, inset 16px from the left and 110px from the top, with a 64px bottom clearance. Its contents scroll independently; tabs stay visible at the top. Closing it exposes an Open control in the same area.

At 800px and below the panel narrows to 290px, with a 12px left inset, 105px top inset, and 72px bottom clearance. At 560px and below it remains a left overlay, with width limited to the smaller of 290px and the viewport minus 62px, 92px bottom clearance, and maximum height of the dynamic viewport minus 197px. The phone masthead is 56px high with the 32px strip below it. Nation standings stay inside the panel at every size; there is no separate mobile standings disclosure or stacked campaign page.

Theater and region-count information live in the Nation tab, and reports live in Dispatches. The campaign has no floating dispatch card or survey caption. Only the global header/status, left context panel, and camera/legend controls overlay the full-screen map. Camera controls sit at the bottom right; the campaign footer is hidden.

The lobby remains a fluid map introduction and a 420px enrollment panel, stacking below 800px. Its introductory map is 270px tall on phones. Section spacing stays compact and contextual: frequent gaps of 8–12px, panel insets around 20–24px, and thin horizontal dividers. Preserve scoped campaign overrides rather than applying the older grid and stacked-page rules to the campaign.

## Elevation & Depth

The campaign context panel uses a restrained structural shadow (`0 12px 32px #071a2426`) and a thin border to separate paper from moving map detail. Interior rows remain flat and ruled. Dark opaque backings keep map overlays readable over colored territory. The map layers a runtime-generated terrain raster, translucent territory ownership, province and national boundaries, selection and defense overlays, route lines, and counters. Interpolated elevation and moisture create shaded plains, canopy clusters, highlands, and pale mountain relief. Rivers and coastal shelf strokes establish geographic depth. This raster is computed from the campaign geography; it is not a downloaded texture or external illustration.

## Shapes

Controls have subtly softened corners using the control radius. The campaign context panel has a slightly softer 4px radius; tab underlines remain square. Army counters are compact rounded rectangles with an internal crossed infantry box. The shield mark is inline SVG with fine strokes. New territories use mildly smoothed contour rings that follow the continent and its cutouts. Shared boundaries are smoothed once with fixed coast and junction endpoints. Legacy polygon fills retain their exact geometry rather than receiving contour smoothing. Continuous terrain relief replaces the old individual forest and highland glyphs. Capital locations use small circular marks; army counters have crossed infantry symbols and offset stacks.

## Components

### Buttons

Primary buttons are green with warm pale text; secondary controls are transparent with gray-green borders. A primary objective action can stretch across its panel and show an arrow. The default hover changes background over 0.16s with ease-out timing. Disabled controls use opacity 0.48 and a not-allowed cursor. Keyboard focus uses a brass outline (3px) with 3px offset. Reduced-motion preference removes transitions. Quiet masthead actions use transparent borders and a dark hover surface; text actions use an underline.

### Inputs / Fields

Text inputs and selects use pale fields, thin green-gray borders, and the shared control radius. Labels appear above fields with an 8px gap. Focus uses a muted green outline (2px) with 2px offset. Radio and checkbox choices use the active green. Failed requests appear in a dismissible alert strip; the code does not define a separate invalid-field visual variant.

### Navigation

Tabs are text buttons in a ruled row, with a green bottom border and heavier ink text on the active item. Campaign views share one left context panel for nation, command, dispatch, and session content. Its paper-backed tab row is sticky, with space reserved for a close control. A separate Open control restores the closed panel. This overlay navigation persists on phones. The lobby retains its enrollment tabs and native session-restoration disclosure. The active state does not create a filled pill.

### Cards / Containers

The campaign uses one scrollable paper context panel over the map; its interior groups remain ruled rows rather than individual elevated cards. Resource rows align descriptions left and numbers right. Construction rows place description and effect opposite price and time. Faction choices are radio rows, with a pale green fill and full border when selected. Campaign session controls sit inside the same context panel on a green-tinted paper surface.

### Military command

Military controls extend the existing paper-and-petrol command panel. A native Command army selector switches among the three field armies, identifying each by role, strength, and headquarters region. The selected army presents its condensed role heading opposite strength, then its description, headquarters, and wrapping INF/MOT/ART/ARM composition. Supply, reserves, entrenchment, and defending-region count form a two-column facts grid on desktop and phones; long values wrap within their column.

Standing order and deployment/status text precede the Hold, Recover, and Reserve button row. The current standing-order button is disabled. Planned movement, when present, lists named regions and progress into the next leg. Defensive sector and Fallback and support are native disclosures, collapsed initially and separated by fine rules. Sector choices use checkbox rows with a minimum height (44px), keep headquarters checked, and offer Deploy to sector after a change. The second disclosure contains risk tolerance, fallback position, and the air-support checkbox with its fuel explanation.

A ruled objective group previews the legal named-region corridor to the selected map region. Friendly destinations use Plan redeployment and Redeploy to; other destinations use Plan offensive and Advance to. The full-width primary action names its destination and ends with an arrow. An unavailable corridor produces explanatory text and a disabled action; selecting headquarters prompts another region selection. Route copy uses compact text (12px, line height 1.6) and wraps long names. Pending requests and completed campaigns disable order submission. Experimental supply and withdrawal guidance remains a quiet note beneath the controls.

### Earlier campaign notice

A saved campaign with no new geography, or an earlier dense layout exceeding the larger of 72 territories and 24 per seat, receives a ruled paper notice inside the left context panel. It identifies the earlier map and territory count, explains that a new campaign uses the revised continent, and keeps the current save intact. Its full-width “Save session & open lobby” action opens session controls first. The notice uses existing body typography (12px, line height 1.6), 18px by 20px padding, and a thin lower border; it is not a blocking modal or a second map panel.

### Operational map

The generated continent contains 72–192 territories; the default four-seat world has 96 territories and eight provinces (two provinces per seat). It has with connected rivers, coastal shelves, islands, and a continuous shaded terrain field. Forests, plains, highlands, and pale impassable mountains read at continental scale. Mountains remain unowned; their selection outline is pale gray rather than the warm territory highlight. Ownership tints use low opacity so terrain stays visible. Nation boundaries remain pale gold, while province boundaries are quieter green.

The view opens at Fit (100%) in both campaign and lobby. Province names lead at continent scale; from 145% zoom their labels and boundaries strengthen. Territory borders remain visible at every zoom, using a quiet 0.65 screen-pixel stroke at opacity 0.32. At 230% and above they strengthen to 0.85 pixels at opacity 0.48, and town names and consolidation hours emerge. Province borders are 0.8 screen pixels, national fronts 1.65, and selection outlines 2. Province and capital names are culled when their padded bounds cross the coast or collide with counters or labels; territory names use collision culling. Army counters remain a constant 30 by 16 screen pixels, with 6px offsets for armies sharing a territory. A selected army uses a warmer counter fill and a translucent defense-sector overlay; its route is drawn through planned territory waypoints, falling back to a direct target line when no route is present.

Wheel zoom anchors the world under the cursor and spans 35–600%. Buttons multiply or divide zoom by 1.25 around the viewport center. Fit restores 100% and clears pan. Fit reserves 380px horizontally above 800px viewport width and shifts the continent 170px right to accommodate the left panel; narrower views reserve 32px horizontally. Vertical fit clearance is 140px. Left, middle, and right pointer dragging pan at every scale, with a 5px threshold separating selection from dragging. Camera state persists through campaign polling. Camera bounds and territory rings are cached; wheel gestures transform the existing scene immediately, then refresh label and border detail after 180ms of idle time. Thus screen-size label, counter, and stroke normalization applies to settled renders; these elements temporarily scale with the scene during a gesture. A local 100-wheel-event check recorded 16.7ms median and 17.3ms p95 frame intervals; this is local evidence rather than a cross-device performance guarantee. If rendering fails, fallback copy directs players to the region selector.

The detector's palette advisories for defense-sector cream, province-boundary green, national-front gold, and route gold are intentional semantic overlays. Their canonical values are in the frontmatter (`defense-sector`, `province-boundary`, `front`, `objective`); do not flatten them into a single decorative accent.

## Do's and Don'ts

### Do:
- Do keep ownership swatches consistent between territories, counters, and standings.
- Do preserve visible keyboard focus and the region selector alongside the canvas.
- Do use self-hosted Barlow Condensed for headings and system fonts for control text.
- Do cull overlapping map labels, keep province names on land, and preserve three-digit army-strength fit.
- Do keep future faction artwork distinct from the implemented cartographic identity.

### Don't:
- Don't interpret nation seat colors as permanent faction branding.
- Don't hide land standings on small screens; keep them in the left context panel.
- Don't describe the runtime terrain raster as external faction artwork or add ornamental machinery as if already established.
- Don't turn the context panel's flat ruled groups into separate elevated cards.
