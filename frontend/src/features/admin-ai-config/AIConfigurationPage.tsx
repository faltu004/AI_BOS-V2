import {
  ArrowLeft,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mic,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-context";
import { getStoredAuthSession } from "@/features/auth/auth-service";
import { cn } from "@/lib/utils";
import { fetchAIConfig, readNonSecretFallback, saveAIConfig, saveNonSecretFallback } from "./ai-config.api";
import {
  aiConfigSchema,
  aiProviderMeta,
  aiProviders,
  defaultAIConfig,
  type AIConfigForm,
  type AIConfigResponse,
  type AIProvider,
} from "./ai-config.schema";

const featureCards = [
  { key: "streaming", label: "Streaming", description: "Token-by-token responses for chat and assistants.", icon: RefreshCw },
  { key: "memory", label: "Memory", description: "Conversation continuity across business workflows.", icon: BrainCircuit },
  { key: "rag", label: "RAG", description: "Ground answers in company documents and module data.", icon: Workflow },
  { key: "ocr", label: "OCR", description: "Extract text from PDFs, images, receipts, and scans.", icon: Eye },
  { key: "voice", label: "Voice", description: "Enable speech workflows for assistants and meetings.", icon: Mic },
] as const;

function responseToForm(response: AIConfigResponse): AIConfigForm {
  return {
    provider: response.provider,
    apiKeys: {},
    defaultModel: response.defaultModel,
    embeddingModel: response.embeddingModel,
    temperature: response.temperature,
    maxTokens: response.maxTokens,
    contextWindow: response.contextWindow,
    features: response.features,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-semibold text-destructive">{message}</p>;
}

function Toggle({
  checked,
  description,
  icon: Icon,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  icon: typeof Sparkles;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      className={cn(
        "flex h-full items-start gap-4 rounded-2xl border bg-background/65 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40",
        checked && "border-primary/45 bg-primary/5",
      )}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="font-semibold">{label}</span>
          <span className={cn("h-5 w-9 rounded-full border p-0.5 transition-colors", checked ? "bg-primary" : "bg-muted")}>
            <span className={cn("block h-3.5 w-3.5 rounded-full bg-white transition-transform", checked && "translate-x-4")} />
          </span>
        </span>
        <span className="mt-2 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

export function AIConfigurationPage() {
  const { toast } = useToast();
  const session = useMemo(() => getStoredAuthSession(), []);
  const isAdmin = session?.user.role === "Admin";
  const [form, setForm] = useState<AIConfigForm>(defaultAIConfig);
  const [keyStatus, setKeyStatus] = useState<Record<AIProvider, boolean>>(
    Object.fromEntries(aiProviders.map((provider) => [provider, false])) as Record<AIProvider, boolean>,
  );
  const [showKeys, setShowKeys] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [storageMode, setStorageMode] = useState<"backend" | "local" | "unknown">("unknown");

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const loadConfig = async () => {
      try {
        const secureConfig = await fetchAIConfig(session?.accessToken);
        setForm(responseToForm(secureConfig));
        setKeyStatus(secureConfig.keyStatus);
        setStorageMode("backend");
      } catch {
        const fallback = readNonSecretFallback();
        if (fallback) {
          setForm(responseToForm(fallback));
          setKeyStatus(fallback.keyStatus);
          setStorageMode("local");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadConfig();
  }, [isAdmin, session?.accessToken]);

  const providerMeta = aiProviderMeta[form.provider];

  const updateField = <K extends keyof AIConfigForm>(field: K, value: AIConfigForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateFeature = (key: keyof AIConfigForm["features"], value: boolean) => {
    setForm((current) => ({
      ...current,
      features: { ...current.features, [key]: value },
    }));
  };

  const handleSave = async () => {
    const parsed = aiConfigSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path.join(".")] = issue.message;
      });
      setErrors(fieldErrors);
      toast({ title: "Validation failed", description: "Please review highlighted AI settings.", type: "error" });
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const saved = await saveAIConfig(parsed.data, session?.accessToken);
      setKeyStatus(saved.keyStatus);
      setForm(responseToForm(saved));
      setStorageMode("backend");
      toast({ title: "AI configuration saved", description: "API keys were encrypted on the backend.", type: "success" });
    } catch {
      const fallback = saveNonSecretFallback(parsed.data);
      setKeyStatus(fallback.keyStatus);
      setForm(responseToForm(fallback));
      setStorageMode("local");
      toast({
        title: "Backend unavailable",
        description: "Non-secret settings were saved locally. API key values were not stored in the browser.",
        type: "warning",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-enterprise p-4">
        <EmptyState
          action={{ label: "Back to Dashboard", onClick: () => window.location.assign("/dashboard") }}
          description="Only Admin users can access AI provider keys, model settings, memory, RAG, OCR, and voice controls."
          icon={ShieldAlert}
          title="Admin access required"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <Button asChild size="icon" type="button" variant="outline">
              <Link to="/admin" aria-label="Back to Admin">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <p className="text-sm font-semibold text-primary">Admin / AI Configuration</p>
              <h1 className="text-2xl font-bold">AI Control Plane</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button disabled={saving} onClick={handleSave} type="button">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Securely"}
            </Button>
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <Card className="glass overflow-hidden">
                <CardContent className="p-0">
                  <div className="animated-gradient p-6">
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                      <div>
                        <span className="inline-flex items-center gap-2 rounded-full border bg-background/65 px-3 py-1 text-xs font-bold text-primary">
                          <LockKeyhole className="h-3.5 w-3.5" />
                          {storageMode === "backend" ? "Encrypted backend storage" : "Local non-secret fallback"}
                        </span>
                        <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight lg:text-5xl">Configure every AI capability from one secure admin surface.</h2>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                          Select providers, manage model defaults, tune generation settings, and enable AI platform capabilities for your business workspace.
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-background/70 p-4">
                        <p className="text-sm font-semibold">Active Provider</p>
                        <p className="mt-2 text-3xl font-bold">{form.provider}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{providerMeta.models[0]} ready</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    Key Security
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Secrets are written only to protected backend storage when the API is reachable.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiProviders.map((provider) => (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background/65 p-3" key={provider}>
                      <span className="text-sm font-semibold">{provider}</span>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", keyStatus[provider] ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                        {keyStatus[provider] ? "Configured" : "Missing"}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[340px_1fr]">
              <Card className="glass h-fit">
                <CardHeader>
                  <CardTitle>AI Provider</CardTitle>
                  <p className="text-sm text-muted-foreground">Choose the primary AI provider for AI BOS assistants.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiProviders.map((provider) => (
                    <button
                      className={cn(
                        "w-full rounded-2xl border bg-background/65 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40",
                        form.provider === provider && "border-primary/50 bg-primary/5 shadow-sm",
                      )}
                      key={provider}
                      onClick={() => {
                        const meta = aiProviderMeta[provider];
                        setForm((current) => ({
                          ...current,
                          provider,
                          defaultModel: meta.models[0],
                          embeddingModel: meta.embeddingModels[0],
                        }));
                      }}
                      type="button"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{provider}</span>
                        {form.provider === provider && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-muted-foreground">{aiProviderMeta[provider].description}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="glass">
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle>API Keys</CardTitle>
                      <p className="text-sm text-muted-foreground">Paste only keys you want to rotate or add. Blank fields keep existing encrypted keys.</p>
                    </div>
                    <Button onClick={() => setShowKeys((value) => !value)} type="button" variant="outline">
                      {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showKeys ? "Hide" : "Show"}
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {aiProviders.map((provider) => (
                      <div className="space-y-2" key={provider}>
                        <Label htmlFor={`${provider}-key`}>{provider} API Key</Label>
                        <Input
                          id={`${provider}-key`}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              apiKeys: { ...current.apiKeys, [provider]: event.target.value },
                            }))
                          }
                          placeholder={keyStatus[provider] ? "Configured - enter new key to rotate" : "Enter API key"}
                          type={showKeys ? "text" : "password"}
                          value={form.apiKeys[provider] ?? ""}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle>Model Settings</CardTitle>
                    <p className="text-sm text-muted-foreground">Tune default generation, embedding, and context settings.</p>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="defaultModel">Default Model</Label>
                      <select className="h-11 w-full rounded-xl border bg-background/75 px-3 text-sm" id="defaultModel" value={form.defaultModel} onChange={(event) => updateField("defaultModel", event.target.value)}>
                        {providerMeta.models.map((model) => (
                          <option key={model}>{model}</option>
                        ))}
                      </select>
                      <FieldError message={errors.defaultModel} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="embeddingModel">Embedding Model</Label>
                      <select className="h-11 w-full rounded-xl border bg-background/75 px-3 text-sm" id="embeddingModel" value={form.embeddingModel} onChange={(event) => updateField("embeddingModel", event.target.value)}>
                        {providerMeta.embeddingModels.map((model) => (
                          <option key={model}>{model}</option>
                        ))}
                      </select>
                      <FieldError message={errors.embeddingModel} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temperature">Temperature: {form.temperature}</Label>
                      <input className="w-full accent-primary" id="temperature" max={2} min={0} onChange={(event) => updateField("temperature", Number(event.target.value))} step={0.1} type="range" value={form.temperature} />
                      <FieldError message={errors.temperature} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxTokens">Max Tokens</Label>
                      <Input id="maxTokens" min={256} onChange={(event) => updateField("maxTokens", Number(event.target.value))} type="number" value={form.maxTokens} />
                      <FieldError message={errors.maxTokens} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="contextWindow">Context Window</Label>
                      <Input id="contextWindow" min={1024} onChange={(event) => updateField("contextWindow", Number(event.target.value))} type="number" value={form.contextWindow} />
                      <FieldError message={errors.contextWindow} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle>AI Capabilities</CardTitle>
                    <p className="text-sm text-muted-foreground">Enable platform capabilities for assistants, automation, search, documents, and meetings.</p>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {featureCards.map((feature) => (
                      <Toggle
                        checked={form.features[feature.key]}
                        description={feature.description}
                        icon={feature.icon}
                        key={feature.key}
                        label={feature.label}
                        onChange={(checked) => updateFeature(feature.key, checked)}
                      />
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl bg-foreground text-background dark:bg-white dark:text-slate-950">
                  <CardContent className="grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                      <Bot className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">Production security note</p>
                      <p className="mt-1 text-sm opacity-75">Backend storage encrypts API keys using AES-256-GCM and returns only provider key status to the UI.</p>
                    </div>
                    <Button className="bg-white text-slate-950 hover:bg-white/90" disabled={saving} onClick={handleSave} type="button">
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
