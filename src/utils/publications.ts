/**
 * Fetch your publications while the site builds. Sources, in order:
 *   1. OpenAlex  (rich: authors, venue, PDF links)
 *   2. ORCID     (your ORCID record directly; no authors, but never lags)
 *   3. src/data/publications-cache.json (last-resort saved list)
 *
 * The build never fails because of this. Every step logs a line starting with
 * "[publications]" so you can see what happened in the GitHub Actions log.
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

type Section = "Peer-reviewed articles" | "Preprints" | "Presentations" | "Other";

const TIMEOUT_MS = 20000;

function cleanDoi(doi?: string | null): string {
  return (doi ?? "")
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase()
    .trim();
}

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": "academic-portfolio-build", ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 200).replace(/\s+/g, " ");
    throw new Error(`HTTP ${res.status} ${body}`);
  }
  return res.json();
}

/* ------------------------------ OpenAlex ------------------------------ */

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

function fromOpenAlexWork(work: any, orcidId: string): Publication {
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
    id: String(work.id),
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

async function fromOpenAlex(orcidId: string): Promise<Publication[]> {
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
    `?filter=authorships.author.orcid:https://orcid.org/${orcidId}` +
    `&per-page=200&sort=publication_date:desc&select=${select}`;

  const data = await getJson(url);
  return (data.results ?? [])
    .filter((w: any) => !w.is_paratext)
    .map((w: any) => fromOpenAlexWork(w, orcidId));
}

/* -------------------------------- ORCID ------------------------------- */

const ORCID_TYPE_MAP: Record<string, string> = {
  "journal-article": "article",
  "review": "article",
  "preprint": "preprint",
  "conference-paper": "presentation",
  "conference-abstract": "presentation",
  "conference-poster": "presentation",
  "lecture-speech": "presentation",
};

function fromOrcidGroup(group: any): Publication | null {
  const w = group?.["work-summary"]?.[0];
  const title = w?.title?.title?.value;
  if (!w || !title) return null;

  const year = w["publication-date"]?.year?.value ?? "";
  const month = w["publication-date"]?.month?.value ?? "01";
  const day = w["publication-date"]?.day?.value ?? "01";

  const ids: any[] =
    group["external-ids"]?.["external-id"] ?? w["external-ids"]?.["external-id"] ?? [];
  const doi = cleanDoi(ids.find((i) => i["external-id-type"] === "doi")?.["external-id-value"]);

  const links: { label: string; href: string }[] = [];
  if (doi) links.push({ label: "DOI", href: `https://doi.org/${doi}` });
  else if (w.url?.value) links.push({ label: "Link", href: w.url.value });

  const rawType = String(w.type ?? "other").toLowerCase().replace(/_/g, "-");

  return {
    id: String(w["put-code"] ?? title),
    year: String(year),
    date: year ? `${year}-${month}-${day}` : "",
    title: stripTags(title),
    authors: [],
    venue: w["journal-title"]?.value ?? "",
    type: ORCID_TYPE_MAP[rawType] ?? rawType,
    doi,
    links,
  };
}

async function fromOrcid(orcidId: string): Promise<Publication[]> {
  const data = await getJson(`https://pub.orcid.org/v3.0/${orcidId}/works`, {
    Accept: "application/json",
  });
  return (data.group ?? [])
    .map(fromOrcidGroup)
    .filter((p: Publication | null): p is Publication => p !== null);
}

/* ------------------------------- Public ------------------------------- */

export async function getPublications(orcidId: string): Promise<{
  items: Publication[];
  source: "openalex" | "orcid" | "cache";
}> {
  try {
    const items = await fromOpenAlex(orcidId);
    console.log(`[publications] OpenAlex returned ${items.length} works.`);
    if (items.length > 0) return { items, source: "openalex" };
  } catch (err) {
    console.warn(`[publications] OpenAlex failed: ${(err as Error).message}`);
  }

  try {
    const items = await fromOrcid(orcidId);
    console.log(`[publications] ORCID returned ${items.length} works.`);
    if (items.length > 0) return { items, source: "orcid" };
  } catch (err) {
    console.warn(`[publications] ORCID failed: ${(err as Error).message}`);
  }

  const saved = cache as Publication[];
  console.warn(`[publications] Using the saved list (${saved.length} works).`);
  return { items: saved, source: "cache" };
}

/** Which heading a work belongs under. */
export function sectionFor(type: string): Section {
  if (type === "preprint") return "Preprints";
  if (type === "presentation") return "Presentations";
  if (["article", "review", "letter", "editorial", "erratum"].includes(type)) {
    return "Peer-reviewed articles";
  }
  return "Other";
}
