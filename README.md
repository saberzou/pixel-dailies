# Pixel Dailies

A minimal, elegant pixel art gallery with animated artwork displayed on Polaroid-style cards.

## Design Philosophy

- **Modern & Clean:** Inspired by Happy Hues color palettes
- **Minimalist:** Single HTML file, no build process
- **Elegant:** Polaroid cards with smooth 3D flip animations
- **Responsive:** Works beautifully on all screen sizes

## Color Palette

- Background: `#E8F5E9` (soft mint green)
- Cards: `#FFFFFE` (pure white)
- Text: `#2B2C34` (dark charcoal)
- Accent: `#FF6B9D` (soft coral pink)

## Typography

- **Headers:** Space Grotesk (bold, modern)
- **Body:** DM Sans (clean, readable)

## Features

- **Animated Pixel Art:** 2-4 frames per piece, smooth looping
- **Interactive Cards:** Click to flip and reveal title
- **Pixel-Perfect Rendering:** Uses CSS `image-rendering: pixelated`
- **Zero Dependencies:** Pure HTML/CSS/JS

## Adding New Artwork

Edit `data.js` and add a new entry to the `gallery` array:

```javascript
{
  date: "2026-02-19",
  title: "Your Title",
  size: 64,
  fps: 2,
  palette: ["#color1", "#color2", ...],
  frames: [
    "0000111100002233...", // 4096 hex chars (64×64)
    "0000111100002233...", // frame 2
  ]
}
```

Each character in the frame string is a palette index (0-F = 0-15).

## Current Gallery

1. **Sunflower** — Yellow petals swaying in the breeze
2. **Coffee Break** — Rising steam from a warm cup
3. **Blink** — A cute cat with blinking eyes
4. **Prism** — Color-cycling geometric pattern

## Technical Details

- **Canvas Size:** 64×64 pixels
- **Display Size:** Scaled up to ~320px (responsive)
- **Frame Rate:** 2-4 FPS per piece
- **Animation:** RequestAnimationFrame for smooth playback

## Design Inspiration

Color palette inspired by [Happy Hues](https://www.happyhues.co) — modern, youthful, accessible color schemes for digital design.

---

Built with ❤️ for Saber
