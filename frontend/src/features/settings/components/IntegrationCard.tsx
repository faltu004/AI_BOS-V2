import { KeyRound, RefreshCw, Trash2, ToggleLeft, ToggleRight, Clock, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Integration, IntegrationLog } from "../settings.types";

type IntegrationCardProps = {
  integration: Integration;
  onConnect: (id: string, apiKey: string) => void;
  onDisconnect: (id: string) => void;
  onSync: (id: string) => void;
  onHealthCheck: (id: string) => void;
  logs?: IntegrationLog[];
  className?: string;
};

const statusColors = {
  connected: "text-emerald-600 dark:text-emerald-400",
  disconnected: "text-muted-foreground",
  error: "text-rose-600 dark:text-rose-400",
  connecting: "text-amber-600 dark:text-amber-400",
};

export function IntegrationCard({ integration, onConnect, onDisconnect, onSync, onHealthCheck, logs, className }: IntegrationCardProps) {
  const [apiKey, setApiKey] = useState("");
  const [showLogs, setShowLogs] = useState(false);

  const handleConnect = () => {
    if (apiKey) {
      onConnect(integration.id, apiKey);
    }
  };

  const handleDisconnect = () => {
    onDisconnect(integration.id);
  };

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{integration.icon}</span>
          <div>
            <CardTitle className="text-base">{integration.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{integration.description}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold capitalize ${statusColors[integration.status as keyof typeof statusColors]}`}>
          {integration.status}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {integration.status === "disconnected" && (
          <div className="space-y-2">
            <Label htmlFor={`apikey-${integration.id}`}>API Key</Label>
            <Input
              id={`apikey-${integration.id}`}
              type="password"
              placeholder="Enter API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Sync:</span>
          <select className="h-8 rounded-md border bg-background px-2 text-xs">
            <option value="realtime">Realtime</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-1">
          {integration.permissions.map((perm) => (
            <span key={perm} className="rounded-full border bg-background/65 px-2 py-0.5 text-xs">
              {perm}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          {integration.status === "disconnected" ? (
            <Button onClick={handleConnect} size="sm" type="button">
              Connect
            </Button>
          ) : (
            <Button onClick={handleDisconnect} size="sm" type="button" variant="outline">
              Disconnect
            </Button>
          )}
          <Button onClick={() => onSync(integration.id)} size="sm" type="button" variant="outline">
            <RefreshCw className="h-3 w-3" />
            Sync
          </Button>
          <Button onClick={() => onHealthCheck(integration.id)} size="sm" type="button" variant="outline">
            Health
          </Button>
        </div>

        {logs && logs.length > 0 && (
          <div>
            <button
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => setShowLogs(!showLogs)}
              type="button"
            >
              {showLogs ? "Hide" : "Show"} Logs ({logs.length})
            </button>
            {showLogs && (
              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border bg-background/65 p-2">
                {logs.map((log) => (
                  <div key={log.id} className="text-xs">
                    <span className="font-semibold">{log.action}</span>
                    <span className="text-muted-foreground"> - {log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}