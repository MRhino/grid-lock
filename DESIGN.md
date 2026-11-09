---
name: Grid Lock
description: A sliding-traffic puzzle built as a printed-tin wind-up toy city.
colors:
  ground: "#0f6b70"
  ground-2: "#0b5a5f"
  tomato: "#d9382a"
  tomato-d: "#a12218"
  ink: "#16233a"
  bed: "#1d3557"
  bed-line: "#2b4a73"
  sun: "#f7bd12"
  cab-shade: "#c98a00"
  cab-light: "#ffd95a"
  tin: "#f2f0e4"
  mist: "#b9c8d8"
  tier-warm-up: "#4a5a63"
  tier-green-light: "#2f7d3a"
  tier-commuter: "#1f5fa8"
  tier-roadworks: "#a8560f"
  tier-standstill: "#8a2f6b"
  tier-total-gridlock: "#b3261e"
typography:
  display:
    fontFamily: "Bowlby One, Impact, sans-serif"
    fontSize: "min(21vw, 96px)"
    fontWeight: 400
    lineHeight: 0.9
  headline:
    fontFamily: "Bowlby One, Impact, sans-serif"
    fontSize: "54px"
    fontWeight: 400
    lineHeight: 1
  numeral:
    fontFamily: "Bowlby One, Impact, sans-serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1
  title:
    fontFamily: "Bowlby One, Impact, sans-serif"
    fontSize: "25px"
    fontWeight: 400
    lineHeight: 1
  lead:
    fontFamily: "Barlow Semi Condensed, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 700
  body:
    fontFamily: "Barlow Semi Condensed, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.25
  label:
    fontFamily: "Barlow Semi Condensed, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  full: "50%"
spacing:
  xs: "8px"
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "22px"
components:
  button-primary:
    backgroundColor: "{colors.tomato}"
    textColor: "{colors.tin}"
    typography: "{typography.title}"
    rounded: "{rounded.xl}"
    width: "min(290px, 82vw)"
    height: "62px"
  button-primary-alt:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.xl}"
    width: "min(290px, 82vw)"
    height: "62px"
  button-tool:
    backgroundColor: "{colors.tin}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    width: "120px"
    height: "66px"
  button-tool-disabled:
    backgroundColor: "{colors.ground-2}"
    rounded: "{rounded.lg}"
    height: "66px"
  chip:
    backgroundColor: "{colors.tin}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 15px"
    height: "44px"
  round-icon-button:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "46px"
  counter:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tin}"
    rounded: "{rounded.md}"
    padding: "5px 8px 6px"
  level-cell:
    backgroundColor: "{colors.tier-green-light}"
    textColor: "{colors.tin}"
    rounded: "{rounded.md}"
  tier-tag:
    backgroundColor: "{colors.tier-green-light}"
    textColor: "{colors.tin}"
    rounded: "{rounded.sm}"
    padding: "4px 14px 5px"
---

# Design System: Grid Lock

## Overview

**Creative North Star: "The Printed-Tin Toy City"**

Grid Lock is a wind-up toy you pick up, not an app you open. Everything is a piece of lithographed tinplate: a sea-teal ground printed with a repeating car and star motif, a tomato tray with an inked rim, an ink-blue road bed, and flat hard-edged vehicles with printed windows, wheels and seam tabs. The black-and-white checker cab is the hero, and it is the only yellow vehicle on the road.

Colour is saturated and opaque, the way printing ink on metal is. Depth comes from stamped plate edges and the small shadow a metal part throws, never from light. The world refuses the neon-on-dark puzzle app and the flat-tile puzzle app, and it keeps the look of the commercial puzzle that inspired the game out entirely.

The system is dense and thumb-sized on a portrait phone. Motion is mechanical: vehicles lift when grabbed, clack when they land, and earned stars stamp in on a clear.

**Key Characteristics:**
- Opaque litho colour on a printed teal ground, with no glow and no translucent glass.
- One poster face (Bowlby One) for words and numbers that act as signage, and one condensed label face for everything else.
- Raised parts are tin plates with a stamped edge.
- The road bed, its dashed exit lane and the sun gate are always printed, so the way out is always visible.
- Vehicles are drawn in code as flat three-tone prints, each with an ink outline.

## Colors

A saturated tin-toy print set: teal ground, tomato and sun as the loud inks, navy for roads and rules, warm tin as the paper-white.

### Primary
- **Tomato Tin** (#d9382a): The tray around the board, the main PLAY plate, and the full-screen result sheet.
- **Fired Tomato** (#a12218): The tray's outer edge, inner rim lines on tomato plates, and tool icons printed on tin.

### Secondary
- **Cab Sun** (#f7bd12): The hero cab body, the exit gate, the GRID half of the title, the PAR number, the hint ring, the drop ghost, focus outlines, road dashes and earned stars.
- **Cab Shade** (#c98a00) and **Cab Light** (#ffd95a): The cab's printed lower body and roof, and the core of the star badge.

### Tertiary
- **Tier Inks** (Warm-Up #4a5a63, Green Light #2f7d3a, Commuter #1f5fa8, Roadworks #a8560f, Standstill #8a2f6b, Total Gridlock #b3261e): One ink per difficulty tier, filling that tier's tag and level cells. They are deliberately deeper than the traffic prints so Tin Plate lettering stays legible on them.
- **Vehicle Prints**: Seven traffic bodies alongside the cab: tomato, blue, tin, purple, green, orange and pink, each a body, shade and light triple from `src/toys.ts`. Tomato and tin share the interface inks; the others appear only on vehicles.

### Neutral
- **Sea Teal Ground** (#0f6b70): The lithographed surface behind every screen, and the browser theme colour.
- **Deep Teal Print** (#0b5a5f): The printed motif on the ground, and the surface of a disabled tool.
- **Toy Ink** (#16233a): Text on tin and sun plates, vehicle outlines, counters, and the save panel.
- **Road Bed** (#1d3557): The board surface and every printed road strip.
- **Lane Line** (#2b4a73): Board cell rules and the ghost's fill.
- **Tin Plate** (#f2f0e4): Warm off-white for lettering on teal and tomato, tool and chip plates, and the board's inner rim.
- **Faded Label** (#b9c8d8): Small captions on Toy Ink, such as MOVES, PAR and the save panel heading.

### Named Rules
**The One Yellow Car Rule.** Traffic never uses yellow. Sun on the road belongs to the cab alone, so the piece you are looking for is found at a glance.

**The Large Sun Rule.** Sun on Sea Teal Ground and Tin Plate on Tomato Tin clear only large-text contrast (3.65:1 and 4.04:1). Use them at 20px bold or larger. Sun on Toy Ink reads at any size.

**The Printed Ink Rule.** Surface fills are opaque ink. The dashed lane on the board is the one printed element held back with opacity, so vehicles stay in front of it.

## Typography

**Display Font:** Bowlby One (with Impact, sans-serif)
**Body Font:** Barlow Semi Condensed (with system-ui, sans-serif)

**Character:** Bowlby One is fat, slightly uneven poster lettering, like a name stamped on a toy box. Barlow Semi Condensed is the small print: narrow, sturdy and legible at thumb distance.

### Hierarchy
- **Display** (400, min(21vw, 96px), 0.9): The stacked GRID / LOCK title only.
- **Headline** (400, 54px, 1): Screen headings. The result sheet's Cleared! scales to min(15vw, 66px).
- **Numeral** (400, 36px, 1): The current level number in the play header, dropping to 26px at the narrow breakpoint.
- **Title** (400, 25px, 1): Plate buttons. The same register covers counter numbers and the level list header at 24px, tier tags at 21px and cell numbers at 20px.
- **Lead** (700, 21px): The start-screen line, with result text at 22px and the star total at 20px.
- **Body** (600, 16px, 1.25): Instructions, capped at 330px wide.
- **Label** (700, 15px): Captions and status, 12-16px by context. MOVES and PAR are the only uppercase labels.

### Named Rules
**The Two Voices Rule.** Bowlby One carries signage and numbers at weight 400, its only weight. Barlow Semi Condensed carries everything else at 600 or 700, the only weights loaded.

## Layout

A single centred column for a portrait phone. Every screen fills the viewport, respects the safe areas, and sits on the printed ground; the page itself never scrolls, and only the menu and level list scroll inside their own panes.

The play screen stacks a header row, the board centred in all remaining space, and a row of three tools. The board is six square cells whose size is calculated from the space available: the smaller of (width - 64px) / 6 and (height - 40px) / 6, capped at 100px, leaving room for the tray and the exit gate that protrudes to the right.

The level list holds to 480px wide and uses a five-column grid with 8px gaps, grouped under a tier tag for each pack. Road strips bleed past the screen padding to the edges. Spacing stays tight: 8-10px between related controls, 14px screen gutters in play, 20-22px around full screens. Interactive targets are at least 44px.

At 360px wide and below, the header's level number and tier name stack so the counters keep their room.

## Elevation & Depth

A hybrid of plate edges and contact shadow, with no light effects. Raised tin parts carry a 2px stamped edge plus a short soft shadow. Plates are outlined with inset rim rings, and the tray is built from concentric printed rings. Vehicles throw a drop shadow that follows their silhouette and grows when grabbed. Disabled plates lose their shadow and sink flat into the ground.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 2px 0 #0003, 0 5px 9px #0b1a2a66`): Every raised plate: buttons, tools, chips, counters, tags and level cells.
- **Tray** (`box-shadow: 0 0 0 3px #16233a, 0 0 0 7px #f2f0e4, 0 0 0 19px #d9382a, 0 0 0 21px #a12218, 0 16px 22px 14px #06303366`): The board only. Ink line, tin rim, tomato tray, fired edge, then the shadow the tray casts on the ground.
- **Resting Vehicle** (`filter: drop-shadow(0 3px 2px #06122480)`): Vehicles on the board.
- **Grabbed Vehicle** (`filter: drop-shadow(0 8px 5px #06122499)`): A vehicle under the finger, scaled to 1.05.

### Named Rules
**The Plate Rule.** Every raised plate carries the Lift shadow. Plate buttons, tools, level cells and the back button go down 2px when pressed.

**The No Glow Rule.** Shadows are dark and fall downward. No coloured halos, no neon, no bloom, on any state including hints and stars.

## Shapes

Pressed-metal corners: soft enough to feel stamped, never pill-soft on rectangles. Plates step from 6px on tags and the board, through 8px on chips, counters and cells, 10px on tools, to 12px on the big plate buttons. The back button is the one full circle. Vehicles have heavier rounded noses on cars and squarer bodies on trucks, and the exit gate is square against the tray and rounded on its open side. Icons are inline SVG with rounded strokes and joins.

## Components

### Buttons
Heavy tin plates that you push.
- **Shape:** Stamped corners (12px) on big plates, 10px on tools, 8px on chips, a full circle for back.
- **Primary:** Tomato Tin plate with Tin Plate lettering in the Title face, 62px tall and min(290px, 82vw) wide, with a two-line inset rim of Tin Plate and Fired Tomato.
- **Primary Alt:** Cab Sun plate with Toy Ink lettering and a single Toy Ink inset rim, for LEVELS and NEXT.
- **Tools:** Tin Plate at 66px tall with a 24px Fired Tomato icon over a 16px bold label.
- **Pressed / Focus:** Plate buttons, tools, level cells and the back button translate down 2px when pressed. Focus is a 3px Cab Sun outline offset by 2px. The app is touch-first and has no hover treatment.
- **Disabled:** Tools turn Deep Teal Print with pale lettering and no shadow.

### Chips
Small Tin Plate buttons (8px radius, 44px minimum height, 16px bold Toy Ink) for secondary actions such as Replay, Copy and Sound. A plain underlined link is used only for restoring a save.

### Cards / Containers
- **Counters:** Toy Ink plates (8px, Lift) with a small Faded Label over a Title numeral. PAR prints its number in Cab Sun.
- **Save Panel:** A Toy Ink panel (10px) holding the ID, status and restore link. The save ID uses the platform monospace so its characters stay distinguishable.

### Level Grid
Square tier-coloured tiles (8px radius, 2px inset light rim, Lift) with a Tin Plate numeral and tiny Cab Sun stars. Locked tiles mix the tier ink with Deep Teal Print at 42% and drop the Lift. Each tier opens with a matching tag.

### Board
A Road Bed square ruled in 2px Lane Line cells inside the Tray rings. A dashed Cab Sun lane is printed along the exit row, leading to a protruding sun gate with an ink arrow that nudges three times on load.

### Vehicles
Flat litho prints in code: a Toy Ink outline, a body with a darker lower band and lighter roof, pale glass, cream lamps, red tail lights, light grey tyres and tiny seam tabs. Cars are two cells and trucks three, with one continuous outline around cab and cargo. The cab adds checker bands and a roof light.

- **Motion:** Slides settle in .16s on a springy curve. A grabbed vehicle lifts instantly; release plays a .2s clack, squashing to .95 and rebounding. The cab leaves through the gate in .42s.
- **Hint:** The suggested vehicle gets a 4px solid Cab Sun ring and a slow bob, and a 4px dashed Cab Sun ghost marks its destination.

### Parade and Result Sheet
Road strips with Tin Plate edges carry a slow parade of vehicles on the start screen and the departing cab on the result sheet. The result sheet is a full-screen Tomato Tin plate with Fired Tomato and Tin Plate rims, where earned stars stamp down one after another (.34s, staggered .13s). Under reduced motion, these loops, the clack and the stamp are removed.

## Do's and Don'ts

### Do:
- **Do** print new surfaces on the Sea Teal Ground with its car and star motif.
- **Do** keep the board, dashed exit lane and sun gate visible at all times.
- **Do** give every raised plate the Lift shadow, and give plate buttons, tools, level cells and the back button a 2px press.
- **Do** build new vehicles as flat body, shade and light triples with a Toy Ink outline and light tyres, because dark tyres vanish on the Road Bed.
- **Do** draw icons as inline SVG with heavy rounded strokes.
- **Do** keep hint and focus cues obvious, using Cab Sun lines at 3-4px, solid or dashed.

### Don't:
- **Don't** give any traffic vehicle a yellow body.
- **Don't** use glow, neon, bloom or coloured halos.
- **Don't** use soft colour gradients; gradients here only draw hard-edged rules, dashes and gate stops.
- **Don't** set small text in Sun on Sea Teal Ground or Tin Plate on Tomato Tin.
- **Don't** split a truck's outline between cargo and cab; a gap reads as two vehicles.
- **Don't** echo the name, card layouts or look of the commercial puzzle that inspired the game.
