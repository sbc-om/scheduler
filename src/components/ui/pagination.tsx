import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Parse a page number / page size off a URLSearchParams-style input with
 * hard bounds so we never build unbounded queries from a malicious URL.
 */
export function parsePagination(
  searchParams:
    | Record<string, string | string[] | undefined>
    | URLSearchParams
    | undefined,
  opts: { defaultSize?: number; maxSize?: number } = {},
): { page: number; pageSize: number } {
  const defaultSize = opts.defaultSize ?? DEFAULT_PAGE_SIZE;
  const maxSize = opts.maxSize ?? 100;
  const raw =
    searchParams instanceof URLSearchParams
      ? {
          page: searchParams.get("page") ?? undefined,
          size: searchParams.get("size") ?? undefined,
        }
      : {
          page: pickFirst(searchParams?.page),
          size: pickFirst(searchParams?.size),
        };
  const pageNum = Math.max(1, Math.floor(Number(raw.page) || 1));
  let sizeNum = Math.floor(Number(raw.size) || defaultSize);
  if (!Number.isFinite(sizeNum) || sizeNum < 1) sizeNum = defaultSize;
  if (sizeNum > maxSize) sizeNum = maxSize;
  return { page: pageNum, pageSize: sizeNum };
}

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

/** Build a URL search-param string that preserves existing filters. */
function buildHref(
  basePath: string,
  current: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(current)) {
    if (typeof v === "string" && v.length > 0) merged[k] = v;
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === "") delete merged[k];
    else merged[k] = v;
  }
  const sp = new URLSearchParams(merged);
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Server-rendered pagination bar rendered underneath a data table. It uses
 * plain `<Link>`s so navigation works without JavaScript and preserves any
 * additional query parameters already present in `preservedParams`.
 */
export function Pagination({
  basePath,
  page,
  pageSize,
  totalItems,
  preservedParams,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  itemLabel = "items",
  className,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  totalItems: number;
  /** All current query params so pagination links keep filters intact. */
  preservedParams?: Record<string, string | string[] | undefined>;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalItems);

  const current: Record<string, string | undefined> = {};
  if (preservedParams) {
    for (const [k, v] of Object.entries(preservedParams)) {
      if (Array.isArray(v)) current[k] = v[0];
      else if (typeof v === "string") current[k] = v;
    }
  }

  const firstHref = buildHref(basePath, current, { page: "1" });
  const prevHref = buildHref(basePath, current, {
    page: String(Math.max(1, safePage - 1)),
  });
  const nextHref = buildHref(basePath, current, {
    page: String(Math.min(totalPages, safePage + 1)),
  });
  const lastHref = buildHref(basePath, current, { page: String(totalPages) });

  const windowPages = buildPageWindow(safePage, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-3 border-t border-border/60 bg-muted/30 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>
          {totalItems === 0 ? (
            <>No {itemLabel}</>
          ) : (
            <>
              Showing <span className="font-medium text-foreground">{from}</span>
              {"–"}
              <span className="font-medium text-foreground">{to}</span> of{" "}
              <span className="font-medium text-foreground">{totalItems}</span>{" "}
              {itemLabel}
            </>
          )}
        </span>
        <form action={basePath} method="get" className="flex items-center gap-2">
          {/* keep existing params on size change */}
          {Object.entries(current)
            .filter(([k]) => k !== "size" && k !== "page")
            .map(([k, v]) =>
              v ? <input key={k} type="hidden" name={k} value={v} /> : null,
            )}
          <label className="text-[11px] uppercase tracking-wider">
            Rows
            <select
              name="size"
              defaultValue={String(pageSize)}
              className="ml-2 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <noscript>
            <button
              type="submit"
              className="rounded-md border border-input bg-background px-2 py-1"
            >
              Apply
            </button>
          </noscript>
        </form>
      </div>

      <nav
        aria-label="Pagination"
        className="flex items-center gap-1 self-end sm:self-auto"
      >
        <PageLink
          href={firstHref}
          disabled={safePage <= 1}
          label="First page"
          icon={<ChevronsLeft className="h-3.5 w-3.5" />}
        />
        <PageLink
          href={prevHref}
          disabled={safePage <= 1}
          label="Previous page"
          icon={<ChevronLeft className="h-3.5 w-3.5" />}
        />
        {windowPages.map((p, i) =>
          p === "…" ? (
            <span
              key={`gap-${i}`}
              className="px-2 text-muted-foreground select-none"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(basePath, current, { page: String(p) })}
              aria-current={p === safePage ? "page" : undefined}
              className={cn(
                "inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 font-medium tabular-nums transition-colors",
                p === safePage
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-muted",
              )}
            >
              {p}
            </Link>
          ),
        )}
        <PageLink
          href={nextHref}
          disabled={safePage >= totalPages}
          label="Next page"
          icon={<ChevronRight className="h-3.5 w-3.5" />}
        />
        <PageLink
          href={lastHref}
          disabled={safePage >= totalPages}
          label="Last page"
          icon={<ChevronsRight className="h-3.5 w-3.5" />}
        />
      </nav>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  icon,
}: {
  href: string;
  disabled?: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  const base =
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent transition-colors";
  if (disabled) {
    return (
      <span
        aria-hidden
        className={cn(base, "cursor-not-allowed text-muted-foreground/50")}
      >
        {icon}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(base, "text-foreground hover:border-border hover:bg-muted")}
    >
      {icon}
    </Link>
  );
}

/** Build a compact "1 … 4 5 6 … 20" style window around the current page. */
function buildPageWindow(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
