---
version: alpha
name: Kompers
description: Private eligibility proofs on Midnight. A quiet financial desk — white canvas, midnight-navy ink, one teal CTA. Inspired by Stripe’s light institutional canvas and thin type, Coinbase’s scarce-accent trust, and Linear’s hairline precision. Not a copy of any of them.
colors:
  canvas: "#ffffff"
  canvas-soft: "#f4f7fa"
  surface: "#ffffff"
  ink: "#0d253d"
  ink-secondary: "#3d5163"
  ink-mute: "#64748d"
  hairline: "#e3e8ee"
  hairline-strong: "#c9d3dc"
  primary: "#0f5c66"
  primary-press: "#0b454c"
  primary-soft: "#e6f3f4"
  on-primary: "#ffffff"
  success: "#1f7a4d"
  danger: "#b42318"
  warning: "#8a6a12"
typography:
  display:
    fontFamily: "'Source Serif 4', Georgia, serif"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: -0.9px
  title:
    fontFamily: "'Source Serif 4', Georgia, serif"
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: "'Public Sans', system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "'Public Sans', system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  mono:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontSize: 13px
    fontFeature: tnum
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  huge: 64px
---

# Kompers DESIGN.md

Agent-readable design system. Sources of *method* (not pixels):

- [Stripe](https://getdesign.md/stripe/design-md) — white canvas, navy ink, one filled CTA, tabular figures for numbers, generous padding, pill actions.
- [Coinbase](https://getdesign.md/coinbase/design-md) — institutional calm, display weight 400 not 700, scarce primary, trust-first financial UI.
- [Linear](https://getdesign.md/linear.app/design-md) — one chromatic accent, hairline cards, no decorative chrome.

Catalog: [getdesign.md](https://getdesign.md/) · collection: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md).

Kompers is a **private eligibility desk**. A counterparty posts a public bar. You prove a private figure meets it. The chain sees yes/no and a commitment. The number never appears.

## Visual theme

Light. Quiet. Financial. Not a crypto dashboard.

A sticky nav holds the wordmark, a **light/dark theme toggle**, the Preprod chip, and Lace. Dark mode uses Linear-style ink surfaces (`#0c1116`) with a lifted teal CTA so contrast holds. The toggle persists in `localStorage` (`kompers-theme`) and follows `prefers-color-scheme` until the user chooses.

The page is `{colors.canvas}` with a cool `{colors.canvas-soft}` band behind the workspace. Type is deep navy (`{colors.ink}`), never pure black. The only chromatic voltage is midnight teal `{colors.primary}` — used on **one** filled button per band (Prove), focus rings, and the crescent mark. Hairlines, not shadows, do most of the structure. A 1px `{colors.hairline}` and a 14px radius is enough elevation.

Mood: a hiring or lending desk that happens to run a ZK circuit. Someone should feel safe typing a compensation figure.

## Color roles

| Token | Hex | Role |
| --- | --- | --- |
| `{colors.canvas}` | `#ffffff` | Page |
| `{colors.canvas-soft}` | `#f4f7fa` | Hero/workspace band |
| `{colors.ink}` | `#0d253d` | Headlines, body |
| `{colors.ink-mute}` | `#64748d` | Captions, network pill |
| `{colors.hairline}` | `#e3e8ee` | Card and input borders |
| `{colors.primary}` | `#0f5c66` | Single CTA, focus, mark |
| `{colors.primary-soft}` | `#e6f3f4` | Soft tags |
| `{colors.success}` | `#1f7a4d` | Qualified stamp |
| `{colors.danger}` | `#b42318` | Errors, not qualified |

Do not introduce purple, gold-on-black, or neon. Those read as generic AI crypto.

## Typography

- **Display / titles:** Source Serif 4, weight 400. Editorial, not bombastic.
- **UI / body:** Public Sans 400–600. Civic, trustworthy, open source (USWDS lineage).
- **Addresses, hashes, counts:** IBM Plex Mono with `font-variant-numeric: tabular-nums`.

Hero display stairs: 48px desktop → 36px tablet → 30px mobile. Negative tracking only on the hero (`-0.02em`). Body stays 16px / 1.5.

Eyebrows are Public Sans 12px, 0.14em tracking, uppercase, `{colors.ink-mute}`.

## Layout

- Max content width **1080px**, side padding 24px (16px on small screens).
- Sticky top nav, 64px tall, white, bottom hairline.
- Workspace is **two equal columns** from 900px up: private figure | public record.
- Below 900px: stack private first, then public, then contract. Primary button becomes full width, min-height **44px**.
- Section gaps: 32px. Card padding: 24px (20px on small screens).
- 8px spacing scale.

## Components

**Nav** — wordmark + crescent left. Network pill + Lace control right. On <640px the connect control wraps under the brand, still ≥44px.

**Primary button** — teal fill, white label, pill, 10px 18px (14px 18px on mobile). Disabled at 40% opacity.

**Ghost button** — white, 1px hairline, same pill.

**Input** — white, 6px radius, 1px hairline, 12px 14px padding, min-height 44px. Focus: 2px `{colors.primary}` outline.

**Card** — white, 14px radius, 1px hairline, no drop shadow (or 0 1px 2px rgba(13,37,61,0.06) max).

**Qualified stamp** — outline pill, success or danger, mono 11px uppercase.

**Trust row** — three short facts under the hero. Icons optional; text is the product.

## Responsive

| Width | Behavior |
| --- | --- |
| ≥ 900px | Two-up desk, sticky nav inline |
| 640–899px | Stack cards, nav still inline if space |
| < 640px | Stack everything; full-width primary; hero 30px; hide long hashes behind truncation |

Touch targets ≥ 44×44px. No hover-only actions.

## Do

- One filled teal button per band.
- Tabular numbers for threshold, proof count.
- Say what observers **cannot** see next to what they can.
- Keep contract join visible — first-time users must deploy or paste an address.
- Prefer hairlines and whitespace over gradients.

## Don't

- Don't use Stripe indigo `#533afd`, Coinbase blue `#0052ff`, or Linear lavender `#5e6ad2` as Kompers primary.
- Don't ship dark gold-on-black stacked cards (generic moonshot demo).
- Don't use Inter as the brand face.
- Don't put the secret figure in a public panel, URL, or log.
- Don't add illustrations, 3D orbs, or purple meshes.

## Agent prompt

Rebuild Kompers UI from this file. Light institutional desk. Source Serif 4 + Public Sans + IBM Plex Mono. Teal `#0f5c66` CTA. Two-up private vs public. Mobile-first 44px targets. Trustworthy enough to type a real number.
