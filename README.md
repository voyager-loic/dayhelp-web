# DayHelp static website

Framework-free source for the DayHelp landing page. The production output is plain HTML, CSS and vanilla JavaScript.

## Requirements

- Node.js 20 or newer
- npm

## Start locally

```bash
npm install
npm run dev
```

Then open the address printed in the terminal.

## Build for hosting

```bash
npm install
npm run build
```

Upload the generated `dist/` folder to Cloudflare Pages, Netlify, GitHub Pages or any ordinary static host.

## Where to edit things

- `src/translations.mjs`: text, services and prices in all four languages
- `src/config.mjs`: domain, recipient email and default language
- `src/styles.css`: design and responsive layout
- `src/template.html`: main page structure
- `src/main.js`: slider and contact-form behaviour
- `src/assets/`: logo/favicon and social sharing image

## Contact form

The current form creates a prepared email using `mailto:`. Change `recipientEmail` in `src/config.mjs` when the real mailbox is ready.

For direct background delivery without opening the visitor's email app, connect the form to a static form service later. No backend is otherwise required.

## Before public launch

- Confirm the prices.
- Replace the placeholder legal information.
- Register and connect the domain.
- Create the real mailbox and update `recipientEmail`.
