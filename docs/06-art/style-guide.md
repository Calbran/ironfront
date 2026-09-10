# Ironfront — Visual style guide

Version 0.2 · September 9, 2026 · Reference-led revision

## Direction and status

The owner rejected the first paper-panel specimen as too website-like and supplied three references: a grand-strategy country-selection screen, an ornamental steampunk HUD sheet, and a close battlefield view with a bottom command bar. These establish the desired game character. The specific treatments below are proposals, not shipped UI or newly approved mechanics. DESIGN.md remains the record of the current application.

**An industrial war machine overlooking a living continent.** Dark iron HUD, aged brass fittings, inset instruments, illustrated unit cards and inhabited terrain. The game world fills the screen; its controls feel like equipment around its edges. Paper is an occasional dispatch or dossier insert, not the main interface surface.

The previous conversation specimen is superseded. Its paper panels, flat button treatment and website-like layout should not guide the redesign.

## What to take from the references

| Reference | Take | Adapt for Ironfront |
|---|---|---|
| Grand-strategy screen | Dominant political map; textured dark frames; portraits and insignia; dense resource/time strip; geographic labels following land | Keep the map hierarchy and material depth, but use fewer controls and readable type |
| Steampunk HUD sheet | Brass bezels; mechanical gauges; inset meters; bevels and corner fittings | Use machinery at focal points; keep most command text on quiet surfaces |
| Battlefield view | Terrain that feels inhabited; visible troops, buildings and cover; bottom selection strip and contextual commands | Aim for a consistent top-down or shallow-angle 2D/2.5D presentation before considering a full 3D engine |

The screenshots are visual references, not permission to reuse assets. Do not copy watermarked UI elements, historical insignia, portraits, or layouts verbatim. Create original faction art and components.

## 1. Screen composition

- **Top instrument bar:** nation crest, industry/fuel/manpower, campaign clock and connection state. Compact framed values; no large marketing header in a campaign.
- **World:** occupy nearly the entire viewport. Terrain, settlements, units and activity are the main visual content.
- **Bottom command tray:** selected unit portrait or illustration, strength/supply/cover, standing orders and group selection. Empty selection leaves a compact tray.
- **Corner minimap:** framed strategic overview, useful once the map is zoomed. A minimap is proposed, not currently implemented.
- **Side drawers:** research, recruitment and nation development open on demand. Avoid permanent stacks of empty panels.
- **Dispatches:** optional paper telegrams inside dark metal framing; do not interrupt every tick.

On phones, use a compact resource strip and collapsible bottom selection drawer. Expand detailed orders or rosters on demand. Keep touch targets generous while making the visible art compact. This replaces the earlier proposal to preserve the left paper overlay; implementation is future work.

## 2. Materials and palette

Use three materials consistently: blackened iron for structure, aged brass for fittings, and dark enamel for control faces. Surface texture should be subtle at normal viewing distance. Wear belongs at edges and corners, not across numbers and labels.

| Proposed token | Hex | Purpose |
|---|---|---|
| Iron shadow | #111719 | HUD recesses and deep edges |
| Iron face | #252B2B | Main panel surfaces |
| Iron raised | #39403D | Raised button faces and bevels |
| Aged brass | #8E713E | Bezels, frame corners and separators |
| Brass highlight | #C4A66A | Active fittings and selected controls |
| Ivory lettering | #E8E0CC | Primary text on dark surfaces |
| Quiet lettering | #B4B6AA | Secondary text on dark surfaces |
| Command enamel | #3D5846 | Committed action and safe state |
| Warning ember | #D18C52 | Attention; pair with text/symbol |
| Damage red | #BA6155 | Damage or blocked state; pair with text/symbol |
| Dispatch paper | #D5C6A4 | Briefings and historical dossiers only |
| Dispatch ink | #2B302B | Text on paper |

These are starting art tokens, not validated contrast results. Use opaque dark backing behind critical text. Retain independent player ownership colors; faction art palettes never replace ownership semantics.

Aether: copper/teal enamel, turbine housings and wing motifs. Crownward: navy/ivory, brass regimental badges and standards. Directorate: charcoal/oxblood, rivets and foundry stamps. Exact faction art remains provisional.

## 3. Fonts

- **Brand and major headings:** a restrained engraved serif or small-cap treatment. Georgia is a temporary specimen fallback; choose a production display face after seeing it in the HUD.
- **Commands and unit names:** retain self-hosted Barlow Condensed, 16–22px, medium/semibold, to suggest equipment labels.
- **Body and data:** a readable sans-serif at 14–16px; tabular numerals for supplies, strength and time. Existing system stack can remain during the prototype.
- **Geographic names:** serif capitals, 13–20 screen px, subtle light/dark casing for contrast; orient along the country's dominant axis where practical.
- **Settlement names:** clean sans-serif, 11–13 screen px, with label culling rather than smaller type.

The game feel comes primarily from composition, materials and art. Changing only the font will not solve it. Keep long text out of decorative faces; avoid blackletter for commands. No new font dependency is chosen by this revision.

## 4. UI parts and states

Panels use layered edges: dark outer stroke, narrow metal bevel, recessed interior. Buttons feel pressable through shallow lighting and inset pressed states. Use a few visible rivets at structural corners, not a gear on every row. Gauges are appropriate for supply or readiness, with exact numbers beside them; use simple meters where a dial adds no meaning.

- Default: dark enamel face, ivory label, quiet brass/iron frame.
- Hover: modest edge highlight; no glow across the entire panel.
- Selected: brighter brass edge plus pressed/inset state and a persistent mark.
- Keyboard focus: a clear additional outline, distinct from selection.
- Disabled: subdued face with a visible reason; avoid illegible text.
- Pending: “Sending order…” and duplicate submission prevention.
- Error: rust/red indicator with explicit text retaining the attempted choice.
- Disconnected: persistent last-update state; stop misleading battle animation.

Keep labels, numbers, meters and interactions live in code. Artwork supplies backgrounds and frames. Stretchable panel art should use separate corners/edges or nine-slice construction so rivets and bevels do not distort.

## 5. Map and territory presentation

The earlier flat map remains a useful technical foundation, but is no longer the target art direction. Add coherent relief lighting, forest canopy masses, settlement footprints and water depth. Use low-frequency texture and a consistent light direction. Avoid uniform noise that obscures routes and troops.

**Overview:** large country silhouettes and names, subdued political tints over visible terrain, major settlements, clear ownership boundaries. Territory outlines remain irregular and quieter than country/ownership edges.

**Regional:** towns become street/building clusters, forests become canopy groups, hills and industrial districts gain volume, unit counters reveal local presence.

**Detail:** small troops or role silhouettes, buildings, emplacements and localized engagement effects. A strong 2D/2.5D pass is a practical first target; full 3D is not required by these references.

Terrain features cross administrative lines. Current control, historical borders and actual fighting must remain distinct. An ownership boundary alone must never generate gunfire. Retain shared geometry for fills, hit areas and border strokes. Preserve correct adjacency, movement and server authority beneath presentation.

Layer order: terrain/relief → water and routes → ownership tint → administrative lines → settlements → units and verified engagements → selection/order overlays → labels → HUD. Use culling and screen-space sizing to preserve legibility.

## 6. Settlements, units and buildings

Settlement size changes the visible footprint: a hamlet has a handful of roofs; a village a lane and clusters; a town a civic center and street blocks; cities have industrial districts and denser roofs. Major cities gain multiple districts and occasional chimneys or rail-yard shapes. Use consistent perspective and light direction across the atlas.

Selected units receive illustrated cards: rifle squad, motorized infantry, gun battery, landship, fighter and bomber. Map art remains simpler than card art. Infantry may read as small clustered soldiers/dots at close zoom; artillery and vehicles need distinctive silhouettes. Unit identity stays visible when grouping for mass orders.

Use a shared industrial building family for factories, oil processors, depots, recruitment halls, airfields, anti-air, fortifications and research. Include neutral silhouettes first and faction details second. Additional buildings and direct squad mechanics remain future systems.

Representative smoke and firing can communicate an active engagement, with restrained short bursts. Effects must reflect server-known activity and stop after retreat, destruction, ceasefire or stale state. They do not resolve damage. Reduced motion keeps static engagement markers and order arrows.

## 7. First art package

See [the asset brief](art-asset-brief.md) for generation prompts and deliverables.

Start with three small sets:

1. One neutral iron/brass HUD kit: panel corners/edges, button states, meter housing and portrait frame.
2. Three identity cards: Crownward rifle squad, Directorate landship and Aether interceptor, sharing lighting and framing.
3. One terrain/building study: settlement roof clusters, forest canopy and an industrial depot in a consistent overhead perspective.

Generate a cohesive concept sheet first, then separate usable assets. Keep generated lettering out of production. Verify transparency, edge continuity, lighting, scale and downsampled readability; generation is source art, not automatic engine-ready output. No art generation has been requested or performed in this revision.

## 8. Next design pass and checks

Build one campaign-screen mockup using the dark top bar, bottom unit tray and richer map, then assess the direction before restyling every screen. Do not start with another palette sheet or typography-only redesign.

Check desktop/phone, readable costs and orders, long place names, dense unit groups, keyboard navigation, reduced motion and zoom. Review text contrast on composited textures, not isolated palette swatches. Keep a textual alternative to map selection and avoid tiny controls copied from desktop reference screenshots.
