# GSAP Motion Desk

Visual GSAP playground: stage blocks, motion paths, pose keyframes, and a master timeline — then export readable GSAP code.

## Features

- **Stage** — drop headings, cards, buttons, boxes; edit content on canvas
- **Paths** — line / arc / semicircle / wave presets; drag center, radius, Bézier handles
- **Path motion** — bind an element to a path; scrub progress; add pose keyframes (rotation, scale, opacity…)
- **Timeline** — schedule path motions and clips; trim start/duration
- **Export** — copy GSAP + MotionPathPlugin code; JSON project import/export
- **i18n** — English / 中文 toggle

## Run

No build step. Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or: python -m http.server 5173
```

Then open the printed local URL.

## Stack

Vanilla JS + [GSAP](https://gsap.com/) + MotionPathPlugin (vendored under `js/vendor/`).

## License

MIT — see [LICENSE](LICENSE). GSAP is used under its own license; keep attribution when redistributing the vendor files.
