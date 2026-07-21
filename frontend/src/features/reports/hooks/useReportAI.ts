import { useCallback, useState } from "react";
import type { ReportFormat, ReportRequest, ReportResponse, ScheduledReport } from "../report-ai.types";

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

type UseReportAIOptions = {
  onSuccess?: (data: ReportResponse) => void;
  onError?: (error: Error) => void;
};

type UseReportAIResult = {
  generateReport: (request: ReportRequest) => Promise<ReportResponse | null>;
  exportReport: (reportId: string, format: ReportFormat) => Promise<Blob | null>;
  scheduleReport: (request: ReportRequest) => Promise<ScheduledReport | null>;
  loadScheduledReports: () => Promise<ScheduledReport[] | null>;
  deleteScheduledReport: (reportId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
};

export function useReportAI({ onSuccess, onError }: UseReportAIOptions): UseReportAIResult {
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

  const generateReport = useCallback(
    async (request: ReportRequest): Promise<ReportResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/reports/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            report_type: request.reportType,
            format: request.format,
            date_range: request.dateRange,
            sections: request.sections,
            recipients: request.recipients,
            schedule: request.schedule,
          }),
        });
        if (!response.ok) throw new Error("Failed to generate report");
        const json = await response.json();
        const data = json.data as ReportResponse;
        onSuccess?.(data);
        return data;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, handleError],
  );

  const exportReport = useCallback(
    async (reportId: string, format: ReportFormat): Promise<Blob | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/reports/export/${reportId}?format=${format}`, {
          method: "POST",
          headers: getAuthHeader(),
        });
        if (!response.ok) throw new Error("Failed to export report");
        return await response.blob();
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError],
  );

  const scheduleReport = useCallback(
    async (request: ReportRequest): Promise<ScheduledReport | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/reports/schedule`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            report_type: request.reportType,
            format: request.format,
            frequency: request.schedule || "weekly",
            recipients: request.recipients || [],
            schedule: request.schedule,
          }),
        });
        if (!response.ok) throw new Error("Failed to schedule report");
        const json = await response.json();
        const data = json.data as ScheduledReport;
        return data;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError],
  );

  const loadScheduledReports = useCallback(async (): Promise<ScheduledReport[] | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/reports/scheduled`, {
        headers: getAuthHeader(),
      });
      if (!response.ok) throw new Error("Failed to load scheduled reports");
      const json = await response.json();
      const data = json.data as ScheduledReport[];
      return data;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const deleteScheduledReport = useCallback(
    async (reportId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/reports/scheduled/${reportId}`, {
          method: "DELETE",
          headers: getAuthHeader(),
        });
        if (!response.ok) throw new Error("Failed to delete scheduled report");
        return true;
      } catch (err) {
        handleError(err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError],
  );

  return {
    generateReport,
    exportReport,
    scheduleReport,
    loadScheduledReports,
    deleteScheduledReport,
    isLoading,
    error,
  };
}