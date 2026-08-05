import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@shared/ui/toast-context";

type FetchState<T> = {
 data: T | null;
 loading: boolean;
 error: string | null;
};

type FetchOptions = {
 immediate?: boolean;
 onSuccess?: (data: unknown) => void;
 onError?: (error: string) => void;
};

export function useApi<T>(
 fetchFn: () => Promise<T | null>,
 options: FetchOptions = {},
): FetchState<T> & {
 refetch: () => Promise<void>;
 setData: (data: T | null) => void;
} {
 const { toast } = useToast();
 const optionsRef = useRef(options);
 const [data, setData] = useState<T | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 optionsRef.current = options;
 }, [options]);

 const execute = useCallback(async () => {
 setLoading(true);
 setError(null);
 try {
 const result = await fetchFn();
 if (result !== null) {
 setData(result);
 optionsRef.current.onSuccess?.(result);
 } else {
 setError("Failed to fetch data");
 optionsRef.current.onError?.("Failed to fetch data");
 }
 } catch (err) {
 const message = err instanceof Error ? err.message : "Unknown error";
 setError(message);
 optionsRef.current.onError?.(message);
 toast({ title: "Error", description: message, type: "error" });
 } finally {
 setLoading(false);
 }
 }, [fetchFn, toast]);

 useEffect(() => {
 if (options.immediate !== false) {
 void execute();
 }
 }, [execute, options.immediate]);

 return { data, loading, error, refetch: execute, setData };
}
