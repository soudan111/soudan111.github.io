// @ts-check
import { defineConfig } from "astro/config";

// The deploy workflow sets these automatically. Locally they fall back to the
// defaults below, so `npm run dev` just works.
//
//   SITE_URL  – where the site is served, e.g. https://connort117.github.io
//   BASE_PATH – "/" for a user site (https://<account>.github.io/),
//               "/<repo-name>" for a project site.
const site = process.env.SITE_URL ?? "https://connort117.github.io";
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  site,
  base,
});
