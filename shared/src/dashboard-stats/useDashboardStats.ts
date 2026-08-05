import { useEffect, useRef, useState } from "react";

type FetcherResult<T> = { status: "ok"; data: T } | { status: "forbidden" } | { status: "error" };
type Fetchers = Record<string, () => Promise<FetcherResult<unknown>>>;
type Results<T extends Fetchers> = { [K in keyof T]: Awaited<ReturnType<T[K]>> extends FetcherResult<infer D> ? D | null : never };

/**
 * Fires every fetcher in parallel on mount and merges the results into a plain
 * `{key: data | null}` map. A fetcher that errors, 403s, or never resolves just
 * leaves its key `null` — dashboards treat that as "keep the static fallback for
 * this one stat" rather than surfacing an error toast for a background stat load.
 */
export function useDashboardStats<T extends Fetchers>(fetchers: T): { data: Results<T>; loading: boolean } {
 const fetchersRef = useRef(fetchers);
 fetchersRef.current = fetchers;

 const [data, setData] = useState<Results<T>>(() => {
 const initial = {} as Results<T>;
 for (const key of Object.keys(fetchers)) {
 (initial as Record<string, unknown>)[key] = null;
 }
 return initial;
 });
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 let cancelled = false;
 const keys = Object.keys(fetchersRef.current);

 setLoading(true);
 Promise.all(keys.map((key) => fetchersRef.current[key]()))
 .then((results) => {
 if (cancelled) return;
 const next = {} as Results<T>;
 keys.forEach((key, index) => {
 const result = results[index];
 (next as Record<string, unknown>)[key] = result.status === "ok" ? result.data : null;
 });
 setData(next);
 })
 .finally(() => {
 if (!cancelled) setLoading(false);
 });

 return () => {
 cancelled = true;
 };
 // Runs once per mount — callers pass a stable set of fetcher keys (they capture
 // whatever params they need in closures rather than being reactive dependencies).
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 return { data, loading };
}
