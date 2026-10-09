/**
 * Fetch your publications from OpenAlex (free, no API key) using your ORCID iD.
 * This runs while the site builds, so the list updates whenever the site is
 * rebuilt (on every push, and weekly via the scheduled workflow).
 *
 * If the request fails, the build does NOT fail: it falls back to the last
 * saved list in src/data/publications-cache.json.
 */
import cache from "../data/publications-cache.json";

export interface Author {
  name: string;
  self: boolean;
}

export interface Publication {
  id: string;
  year: string;
  date: string;
  title: string;
  authors: Author[];
  venue: string;
  type: string;
  doi: string; // lowercase, without the https://doi.org/ prefix
  links: { label: string; href: string }[];
}

function cleanDoi(doi?: string | null): string {
  return (doi ?? "")
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase()
    .trim();
}

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function venueFrom(work: any): string {
  const source = work.primary_location?.source?.display_name ?? "";
  const b = work.biblio ?? {};
  const parts: string[] = [];
  if (b.volume) parts.push(b.issue ? `${b.volume}(${b.issue})` : `${b.volume}`);
  if (b.first_page) {
    parts.push(b.last_page && b.last_page !== b.first_page ? `${b.first_page}–${b.last_page}` : `${b.first_page}`);
  }
  return [source, parts.join(", ")].filter(Boolean).join(", ");
}

function toPublication(work: any, orcidId: string): Publication {
  const doi = cleanDoi(work.doi);
  const authors: Author[] = (work.authorships ?? []).map((a: any) => ({
    name: a.author?.display_name ?? "",
    self: (a.author?.orcid ?? "").includes(orcidId),
  }));

  const links: { label: string; href: string }[] = [];
  if (doi) links.push({ label: "DOI", href: `https://doi.org/${doi}` });
  const pdf = work.best_oa_location?.pdf_url;
  if (pdf) links.push({ label: "PDF", href: pdf });

  return {
    id: work.id,
    year: String(work.publication_year ?? ""),
    date: work.publication_date ?? "",
    title: stripTags(work.title ?? work.display_name ?? "Untitled"),
    authors,
    venue: venueFrom(work),
    type: work.type ?? "other",
    doi,
    links,
  };
}

export async function getPublications(orcidId: string): Promise<{
  items: Publication[];
  source: "live" | "cache";
}> {
  const select = [
    "id",
    "doi",
    "title",
    "publication_year",
    "publication_date",
    "type",
    "authorships",
    "primary_location",
    "best_oa_location",
    "biblio",
  ].join(",");

  const url =
    "https://api.openalex.org/works" +
    `?filter=author.orcid:https://orcid.org/${orcidId}` +
    `&per-page=200&sort=publication_date:desc&select=${select}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`OpenAlex responded ${res.status}`);
    const data: any = await res.json();
    const items = (data.results ?? [])
      .filter((w: any) => !w.is_paratext)
      .map((w: any) => toPublication(w, orcidId));
    return { items, source: "live" };
  } catch (err) {
    console.warn(
      `[publications] Could not fetch from OpenAlex (${(err as Error).message}). Using the saved list.`,
    );
    return { items: cache as Publication[], source: "cache" };
  }
}

/** Which heading a fetched work belongs under. */
export function sectionFor(type: string): "Peer-reviewed articles" | "Preprints" | "Other" {
  if (type === "preprint") return "Preprints";
  if (["article", "review", "letter", "editorial", "erratum"].includes(type)) {
    return "Peer-reviewed articles";
  }
  return "Other";
}
