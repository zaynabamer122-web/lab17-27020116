# Third Place · The Lahore Atlas

This repository is **Third Place**, a Lahore city atlas that helps people find places to spend time that aren't home, university or work.

- Before building or changing any page, read and follow `.github/skills/my-skill/SKILL.md`. Its 14 rules (brand, tone, palette, thin fonts, required page elements, gate labels, price/coordinate formats, place cards, motion, phone validation, no invented facts, manuscript borders, tilework, inspiration) are mandatory.
- Look at the images in `inspiration/` for mood, line quality and palette. Never copy, trace or embed them on the site.
- Never invent opening hours, entry fees, phone numbers, reviews or coordinates for a real place. Write "Check before you go" instead, and label sample notes as editors' notes.
- The site is a React + Vite app (`npm run dev` to preview, `npm run build` for Vercel). Every page (`index.html`, `about.html`, …) must be listed in `build.rollupOptions.input` in `vite.config.js`.
- Remove old files the site no longer uses, so the GitHub repo holds only the live site and the skill.
