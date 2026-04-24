# UI Contract: Design Token System

**Feature**: specs/002-ui-ux-redesign
**Date**: 2026-04-21

---

## Purpose

This contract defines the interface between the design token layer (`tokens.css`, `theme.css`) and all consuming components. Components MUST reference tokens by name — they MUST NOT use raw color, spacing, or typography values.

---

## Color Tokens — Semantic Layer

| Token | Role | Dark value | Light value |
|-------|------|-----------|------------|
| `--color-bg-base` | Page background | `#0f1117` | `#f8f9fc` |
| `--color-bg-raised` | Cards, panels, list rows | `#1a1d27` | `#ffffff` |
| `--color-bg-overlay` | Side panels, modals, drawers | `#21253a` | `#ffffff` |
| `--color-bg-subtle` | Hover backgrounds, zebra stripes | `#161924` | `#f1f3f9` |
| `--color-text-primary` | Main content text | `#e8eaf2` | `#1a1d27` |
| `--color-text-secondary` | Supporting text, labels | `#8892b0` | `#4a5568` |
| `--color-text-tertiary` | Metadata, timestamps, hints | `#5a6480` | `#718096` |
| `--color-text-inverse` | Text on accent backgrounds | `#ffffff` | `#ffffff` |
| `--color-accent` | Primary actions, active states, links | `#6c8ef5` | `#3b5bdb` |
| `--color-accent-subtle` | Accent tinted backgrounds | `rgba(108,142,245,0.12)` | `rgba(59,91,219,0.08)` |
| `--color-accent-hover` | Accent hover state | `#8aaaf7` | `#2f4bbf` |
| `--color-border` | Default borders | `#2a2f42` | `#e2e8f0` |
| `--color-border-strong` | Emphasized borders, dividers | `#3a4156` | `#cbd5e0` |
| `--color-success` | Positive states, completed | `#4ade80` | `#16a34a` |
| `--color-warning` | Caution states, in-progress | `#fbbf24` | `#d97706` |
| `--color-error` | Error states, critical | `#f87171` | `#dc2626` |
| `--color-focus` | Keyboard focus ring | `#6c8ef5` | `#3b5bdb` |

---

## Spacing Tokens

All spacing uses a 4px base unit. Use these tokens for padding, margin, gap, and size values.

| Token | Value |
|-------|-------|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-12` | `48px` |
| `--space-16` | `64px` |

---

## Typography Tokens

| Token | Value |
|-------|-------|
| `--font-sans` | `'Inter', system-ui, -apple-system, sans-serif` |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace` |
| `--text-xs` | `11px` |
| `--text-sm` | `13px` |
| `--text-base` | `14px` |
| `--text-lg` | `16px` |
| `--text-xl` | `20px` |
| `--text-2xl` | `26px` |
| `--font-normal` | `400` |
| `--font-medium` | `500` |
| `--font-semibold` | `600` |
| `--line-tight` | `1.25` |
| `--line-normal` | `1.5` |
| `--line-relaxed` | `1.7` |

**Mono usage**: Use `--font-mono` for all numeric data (currency amounts, percentages, counts, dates in analytics/finance), code display, and time values. All other text uses `--font-sans`.

---

## Border Radius Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `4px` | Input fields, small chips |
| `--radius-md` | `8px` | Cards, panels, buttons |
| `--radius-lg` | `12px` | Large cards, side panels |
| `--radius-full` | `9999px` | Pills, avatar circles, toggle switches |

---

## Shadow Tokens

| Token | Dark value | Light value |
|-------|-----------|------------|
| `--shadow-raised` | `0 1px 3px rgba(0,0,0,0.4)` | `0 1px 3px rgba(0,0,0,0.08)` |
| `--shadow-elevated` | `0 4px 12px rgba(0,0,0,0.5)` | `0 4px 12px rgba(0,0,0,0.12)` |
| `--shadow-overlay` | `0 8px 24px rgba(0,0,0,0.6)` | `0 8px 24px rgba(0,0,0,0.18)` |

---

## Compliance Rules

1. **No raw color values** in component CSS. Every color MUST use `var(--color-*)`.
2. **No raw pixel values** for spacing outside the token scale. Use `var(--space-N)` or documented multiples.
3. **No hardcoded font families**. All font references MUST use `var(--font-sans)` or `var(--font-mono)`.
4. **Theme switching** MUST work by toggling `data-theme` on `<html>` only — no JavaScript color changes on individual elements.
5. **New tokens** MUST be added to `tokens.css` before use — never define tokens inline in component files.
6. **File size gate**: If `tokens.css` approaches 300 lines, split into `tokens/colors.css`, `tokens/spacing.css`, `tokens/typography.css` and import from a barrel `tokens/index.css`.

---

## CSS Structure

```css
/* tokens.css — primitives + semantics */
:root {
  /* Primitive: raw values, never used directly in components */
  --_blue-600: #2563eb;
  --_gray-900: #0f1117;
  /* ... */

  /* Semantic: apply meaning, used in components */
  --color-accent: var(--_blue-600);
  --color-bg-base: var(--_gray-900);
  /* ... */
}

/* theme.css — override semantics per theme */
[data-theme="light"] {
  --color-accent: #3b5bdb;
  --color-bg-base: #f8f9fc;
  /* ... */
}

[data-theme="dark"] {
  /* dark is default; overrides only needed if light is default */
}
```
