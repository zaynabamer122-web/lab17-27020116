---
agent: agent
description: Bring every Third Place page in line with the Lahore Atlas design rules
---

You are working on **Third Place · The Lahore Atlas**. Follow every rule in [the design skill](../skills/my-skill/SKILL.md), and look at the images in `inspiration/` for mood only (never embed or trace them).

The current pages (`index.html`, `about.html`, `css/styles.css`, `styles.css`, `app.js`, `js/hours.js`) were built before the rules existed and break many of them. Rework the site so it fully follows the skill:

① **Brand and type.** Replace the Fraunces/Inter fonts with Cormorant Garamond 300 (headings), Manrope 200–400 (interface) and Noto Nastaliq Urdu (real Urdu words only). No bold anywhere. Wordmark "THIRD PLACE" in small, widely spaced serif capitals with an original SVG arch emblem and the subtitle "The Lahore Atlas". The home headline is "A guide to the spaces between".

② **Palette.** Use only the skill's colours as CSS custom properties: parchment canvas, walnut text, indigo navigation and map lines, and the other colours in their stated roles. No pure white, no neon, no gradients.

③ **Every page** has the atlas navigation (Discover, The Atlas, Collections, My Places, Colophon), a faint survey-linework background, and a footer with a scale bar and "Surveyed in Lahore" plus the current year.

④ **Sections** are labelled with a Walled City gate name and a Roman numeral (e.g. "Roshnai Gate · I"). Lists and steps use ①, ②, ③.

⑤ **Place cards** show name, neighbourhood, an original SVG emblem, spend band ("Rs. 500–1,000" or "Free"), noise level, solo-friendliness, a "Before you go" section, a wax-seal save button and a directions link. Unknown facts say "Check before you go", and sample notes are labelled editors' notes. Do not invent hours, fees, phones, reviews or coordinates.

⑥ **Copy** is literary, calm and precise. Speak to "you" and ask about intentions ("somewhere to read", "somewhere to breathe"), never "categories" or "listings".

⑦ **Ornament.** Add fine botanical manuscript borders only around special collections, and at most one faded tilework accent per screen, both as original hairline SVG in the stated colours.

⑧ **Motion.** Short, stiff springs, ink lines that draw on scroll, and seals that press and recoil. Turn it all off under `prefers-reduced-motion`.

⑨ **Forms** reject phone numbers that aren't 11 digits starting with 03, with a calm inline message, before submitting.

⑩ **Formats.** Coordinates like 31°33′N 74°19′E, distances like "1.2 km", prices like "Rs. 1,500".

Work page by page. Keep the site static (it is served with `python -m http.server 5173` from the project root) and keep existing features such as the map and directions working. When you finish, list each skill rule and where the site now meets it.
