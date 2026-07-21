import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-context";

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
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (result !== null) {
        setData(result);
        options.onSuccess?.(result);
      } else {
        setError("Failed to fetch data");
        options.onError?.("Failed to fetch data");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      options.onError?.(message);
      toast({ title: "Error", description: message, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [fetchFn, options, toast]);

  useEffect(() => {
    if (options.immediate !== false) {
      void execute();
    }
  }, [execute, options.immediate]);

  return { data, loading, error, refetch: execute, setData };
}