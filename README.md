# Botanical portfolio

A small Astro site for an academic plant-biology portfolio: home, research,
publications, about, and CV. Plain HTML + CSS + Markdown-friendly, no CMS or
front-end framework.

## Where to edit

| What | File |
| --- | --- |
| Name, email, Scholar/ORCID links, nav | `src/data/site.ts` |
| Homepage text | `src/pages/index.astro` |
| Research projects | `src/pages/research.astro` (the `projects` list at the top) |
| Publications | `src/pages/publications.astro` (the `sections` list at the top) |
| About page | `src/pages/about.astro` |
| CV highlights | `src/pages/cv.astro` |
| Colors, fonts, spacing | `src/styles/global.css` (tokens at the top) |
| Images | `public/images/` (swap the placeholder `.svg` files; update the paths if you use `.jpg`) |
| Downloadable CV | `public/cv.pdf` (replace the placeholder) |

Search the project for `Your Name`, `[`, and `you@example.com` to find
placeholders still to fill in.

## Run locally

Install a current Node.js LTS release, then:

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # production build into dist/
npm run preview  # serve the production build
```

`npm install` creates `package-lock.json`. Commit it.

## Deploy to GitHub Pages

1. Push this project to the `main` branch of your GitHub repo.
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Each push to `main` builds and deploys the site through
   `.github/workflows/deploy.yml`.

The workflow sets the site URL and base path automatically:

- Repo named `<account>.github.io` and owned by `<account>` →
  served at `https://<account>.github.io/`.
- Any other owner/name combination → served at
  `https://<owner>.github.io/<repo>/`.

All internal links and images go through `withBase()` in `src/utils/url.ts`,
so the site works in either case.

## Before you publish

- Replace all placeholder text, images, and `public/cv.pdf`.
- Don't include unpublished findings or restricted lab images.
- Check on a phone, with keyboard navigation, and click every external link.
