/**
 * Pull your recent watches (and optionally a favorites list) from Letterboxd's
 * public RSS feeds while the site builds. No API key needed.
 *
 *   Recent watches : https://letterboxd.com/<user>/rss/
 *   A list         : https://letterboxd.com/<user>/list/<slug>/rss/
 *
 * Nothing here can fail the build. Problems are logged with a "[letterboxd]"
 * prefix, and the section simply shows less (or hides) if data is missing.
 */
import { letterboxd, manualFavorites } from "../data/films";

export interface Film {
  title: string;
  year: string;
  poster: string; // full URL, or a site-relative path for manual posters
  href: string;
  rating: string; // e.g. "★★★½", or "" if unrated
  watched: string; // e.g. "Oct 8, 2026", or ""
  rewatch: boolean;
}

const TIMEOUT_MS = 20000;

/* ------------------------------ Parsing ------------------------------- */

function decode(text: string): string {
  return text
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : undefined;
}

function items(xml: string): string[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
}

function stars(rating?: string): string {
  const r = Number(rating);
  if (!r || r <= 0) return "";
  return "★".repeat(Math.floor(r)) + (r % 1 >= 0.5 ? "½" : "");
}

function prettyDate(iso?: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function posterFrom(block: string): string {
  const description = decode(tag(block, "description") ?? "");
  return description.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? "";
}

function toFilm(block: string): Film | null {
  const rawTitle = tag(block, "letterboxd:filmTitle") ?? tag(block, "title");
  if (!rawTitle) return null;
  const title = decode(rawTitle);

  // List feeds may only have "Title, 2001" or "Title (2001)" in <title>.
  const yearTag = tag(block, "letterboxd:filmYear");
  const year =
    (yearTag && decode(yearTag)) ||
    title.match(/[(,]\s*(\d{4})\)?(?:\s|$)/)?.[1] ||
    "";
  const cleanTitle = yearTag ? title : title.replace(/\s*[(,]\s*\d{4}\)?.*$/, "").trim() || title;

  return {
    title: cleanTitle,
    year,
    poster: posterFrom(block),
    href: decode(tag(block, "link") ?? ""),
    rating: stars(tag(block, "letterboxd:memberRating")),
    watched: prettyDate(tag(block, "letterboxd:watchedDate")),
    rewatch: (tag(block, "letterboxd:rewatch") ?? "").toLowerCase() === "yes",
  };
}

/* ------------------------------ Fetching ------------------------------ */

async function getXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "academic-portfolio-build (personal site, reads my own RSS)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function getRecent(user: string): Promise<Film[]> {
  const xml = await getXml(`https://letterboxd.com/${user}/rss/`);
  const films = items(xml)
    // The feed also contains list entries; real watches have a film title tag.
    .filter((b) => b.includes("<letterboxd:filmTitle>"))
    .map(toFilm)
    .filter((f): f is Film => f !== null);
  console.log(`[letterboxd] Recent watches: ${films.length} found.`);
  return films.slice(0, letterboxd.recentCount);
}

async function getFavoritesFromList(user: string, slug: string): Promise<Film[]> {
  const xml = await getXml(`https://letterboxd.com/${user}/list/${slug}/rss/`);
  const films = items(xml)
    .map(toFilm)
    .filter((f): f is Film => f !== null)
    .map((f) => ({ ...f, rating: "", watched: "", rewatch: false }));
  console.log(`[letterboxd] Favorites list "${slug}": ${films.length} found.`);
  return films.slice(0, letterboxd.favoritesCount);
}

function manual(): Film[] {
  return manualFavorites.slice(0, letterboxd.favoritesCount).map((m) => ({
    title: m.title,
    year: m.year ?? "",
    poster: m.poster ?? "",
    href: m.href ?? "",
    rating: "",
    watched: "",
    rewatch: false,
  }));
}

export async function getFilmShelf(): Promise<{ favorites: Film[]; recent: Film[] }> {
  const user = letterboxd.username.trim();
  const configured = user !== "" && !user.startsWith("your-");

  let favorites: Film[] = [];
  let recent: Film[] = [];

  if (configured) {
    const [rec, fav] = await Promise.all([
      getRecent(user).catch((err) => {
        console.warn(`[letterboxd] Recent watches failed: ${err.message}`);
        return [] as Film[];
      }),
      letterboxd.favoritesList
        ? getFavoritesFromList(user, letterboxd.favoritesList).catch((err) => {
            console.warn(`[letterboxd] Favorites list failed: ${err.message}`);
            return [] as Film[];
          })
        : Promise.resolve([] as Film[]),
    ]);
    recent = rec;
    favorites = fav;
  } else {
    console.log("[letterboxd] No username set; skipping (see src/data/films.ts).");
  }

  if (favorites.length === 0) favorites = manual();
  return { favorites, recent };
}
