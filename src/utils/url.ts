/**
 * Prefix a site-relative path with the configured base path, so links and
 * images work whether the site lives at the domain root
 * (https://connort117.github.io/) or under a subpath
 * (https://soudan111.github.io/connort117.github.io/).
 *
 *   withBase("/")            -> "/"  or "/repo/"
 *   withBase("research/")    -> "/research/"  or "/repo/research/"
 *   withBase("images/a.svg") -> "/images/a.svg"
 */
export function withBase(path: string = "/"): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const clean = path.replace(/^\/+/, "");
  return `${base}/${clean}`;
}
