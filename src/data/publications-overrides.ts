// Hand-edited additions to your automatically fetched publication list.
// Everything here is optional.

export interface ExtraLink {
  label: string;
  href: string;
}

// Add links to a paper that was fetched automatically.
// Key = the paper's DOI in lowercase, WITHOUT "https://doi.org/".
//
//   "10.1234/example.5678": [
//     { label: "Code", href: "https://github.com/you/repo" },
//     { label: "Data", href: "https://zenodo.org/..." },
//   ],
export const extraLinks: Record<string, ExtraLink[]> = {};

// Hide a fetched paper (for example a duplicate record).
// Use the DOI in lowercase without the "https://doi.org/" prefix.
export const hiddenDois: string[] = [];

// Hide a fetched paper that has no DOI, by its exact title.
export const hiddenTitles: string[] = [
  "A Review of the Applications and Mechanisms of CRISPR-Cas9 Systems", 
];

// Anything that won't be found automatically: talks, posters, or a paper
// that isn't indexed yet. These are always shown.
export interface ManualEntry {
  section: "Peer-reviewed articles" | "Preprints" | "Presentations" | "Other";
  year: string;
  title: string;
  authors?: string;
  venue: string;
  links?: ExtraLink[];
}

export const manualEntries: ManualEntry[] = [
  // {
  //   section: "Presentations",
  //   year: "2026",
  //   title: "Title of your talk or poster",
  //   venue: "Conference or seminar, location",
  // },
];
