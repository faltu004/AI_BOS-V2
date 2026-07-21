import { useCallback, useState } from "react";
import type { ExtractedActionItem, MeetingAIData, MeetingDecision, MeetingReport, MeetingSummary, MeetingTranscription } from "../meeting-ai.types";

const API_BASE = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://127.0.0.1:5000/api/v1";

function getAuthHeader(): Record<string, string> {
  const session = localStorage.getItem("ai_bos_auth_session");
  if (!session) return {};
  try {
    const parsed = JSON.parse(session);
    return { Authorization: `Bearer ${parsed.accessToken}` };
  } catch {
    return {};
  }
}

type UseMeetingAIOptions = {
  meetingId: string;
  onSuccess?: (data: MeetingAIData) => void;
  onError?: (error: Error) => void;
};

type UseMeetingAIResult = {
  transcribe: () => Promise<MeetingTranscription | null>;
  summarize: () => Promise<MeetingSummary | null>;
  extractActions: () => Promise<ExtractedActionItem[] | null>;
  extractDecisions: () => Promise<MeetingDecision[] | null>;
  generateReport: (reportType?: "executive" | "detailed" | "action-items") => Promise<MeetingReport | null>;
  loadAIData: () => Promise<MeetingAIData | null>;
  isLoading: boolean;
  error: string | null;
};

export function useMeetingAI({ meetingId, onSuccess, onError }: UseMeetingAIOptions): UseMeetingAIResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      onError?.(new Error(message));
    },
    [onError],
  );

  const transcribe = useCallback(async (): Promise<MeetingTranscription | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/meetings/ai/${meetingId}/transcribe`, {
        method: "POST",
        headers: getAuthHeader(),
      });
      if (!response.ok) throw new Error("Failed to transcribe meeting");
      const json = await response.json();
      const data = json.data as MeetingTranscription;
      return data;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, handleError]);

  const summarize = useCallback(async (): Promise<MeetingSummary | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/meetings/ai/${meetingId}/summarize`, {
        method: "POST",
        headers: getAuthHeader(),
      });
      if (!response.ok) throw new Error("Failed to summarize meeting");
      const json = await response.json();
      const data = json.data as MeetingSummary;
      return data;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, handleError]);

  const extractActions = useCallback(async (): Promise<ExtractedActionItem[] | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/meetings/ai/${meetingId}/extract-actions`, {
        method: "POST",
        headers: getAuthHeader(),
      });
      if (!response.ok) throw new Error("Failed to extract action items");
      const json = await response.json();
      const data = json.data as ExtractedActionItem[];
      return data;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, handleError]);

  const extractDecisions = useCallback(async (): Promise<MeetingDecision[] | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/meetings/ai/${meetingId}/extract-decisions`, {
        method: "POST",
        headers: getAuthHeader(),
      });
      if (!response.ok) throw new Error("Failed to extract decisions");
      const json = await response.json();
      const data = json.data as MeetingDecision[];
      return data;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, handleError]);

  const generateReport = useCallback(
    async (reportType: "executive" | "detailed" | "action-items" = "executive"): Promise<MeetingReport | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/meetings/ai/${meetingId}/generate-report?report_type=${reportType}`, {
          method: "POST",
          headers: getAuthHeader(),
        });
        if (!response.ok) throw new Error("Failed to generate report");
        const json = await response.json();
        const data = json.data as MeetingReport;
        return data;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [meetingId, handleError],
  );

  const loadAIData = useCallback(async (): Promise<MeetingAIData | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/meetings/ai/${meetingId}`, {
        headers: getAuthHeader(),
      });
      if (!response.ok) throw new Error("Failed to load meeting AI data");
      const json = await response.json();
      const data = json.data as MeetingAIData;
      onSuccess?.(data);
      return data;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, onSuccess, handleError]);

  return {
    transcribe,
    summarize,
    extractActions,
    extractDecisions,
    generateReport,
    loadAIData,
    isLoading,
    error,
  };
}
