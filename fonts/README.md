# Fonts

The Daffa Porto design system uses three families, all loaded from Google Fonts at runtime via the `@import` at the top of `colors_and_type.css`.

| Family | Role | Weights used | Source |
| --- | --- | --- | --- |
| **Instrument Serif** | Display, hero titles, italic editorial moments | 400 (regular + italic) | [Google Fonts](https://fonts.google.com/specimen/Instrument+Serif) — SIL OFL 1.1 |
| **Geist** | Body sans — all UI, paragraphs, navigation | 300, 400, 500, 600, 700 | [Google Fonts](https://fonts.google.com/specimen/Geist) — SIL OFL 1.1 |
| **Geist Mono** | Labels, eyebrows, code, metadata, numeric annotation | 400, 500, 600 | [Google Fonts](https://fonts.google.com/specimen/Geist+Mono) — SIL OFL 1.1 |

## Status

⚠️ **No font files were provided by the user.** All three families are loaded from the Google Fonts CDN. If you need an offline / self-hosted system, ask and I'll bundle the `.woff2` files into this folder and rewrite the `@import` to local `@font-face` blocks.

## Substitution notes

If Google Fonts is blocked, the system falls back as follows (declared in `colors_and_type.css`):

- `Instrument Serif` → `Iowan Old Style` → `Georgia` → serif
- `Geist` → `-apple-system` → `BlinkMacSystemFont` → `Inter` → system-ui
- `Geist Mono` → `JetBrains Mono` → `SF Mono` → `Menlo`

Geist + Geist Mono ship with macOS-like metrics, so the system-font fallback is visually close. Instrument Serif's fallback to Georgia changes the optical sizing materially — the display headlines will read smaller/less editorial.
