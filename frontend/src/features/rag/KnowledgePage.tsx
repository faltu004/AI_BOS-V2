import {
  ArrowLeft,
  BookOpenText,
  BrainCircuit,
  FileSearch,
  FileText,
  LockKeyhole,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog-context";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-context";
import { getStoredAuthSession } from "@/features/auth/auth-service";
import { cn } from "@/lib/utils";
import {
  askKnowledge,
  deleteKnowledgeFile,
  listKnowledgeFiles,
  semanticSearch,
  uploadKnowledgeFile,
} from "./rag.api";
import type { KnowledgeFile, KnowledgePermissions, RagAskResponse, RagSource } from "./rag.types";

const supportedFiles = "PDF, DOCX, PPTX, XLSX";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function SourceCard({ source }: { source: RagSource }) {
  return (
    <div className="rounded-2xl border bg-background/65 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{source.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{source.reference ?? source.source}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          {Math.round(source.score * 100)}%
        </span>
      </div>
      <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{source.content}</p>
    </div>
  );
}

export function KnowledgePage() {
  const session = useMemo(() => getStoredAuthSession(), []);
  const isAdmin = session?.user.role === "Admin";
  const token = session?.accessToken;
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RagSource[]>([]);
  const [answer, setAnswer] = useState<RagAskResponse | null>(null);
  const [visibility, setVisibility] = useState<KnowledgePermissions["visibility"]>("workspace");
  const [allowedRoles, setAllowedRoles] = useState("Admin,CEO,Manager");
  const [allowedUsers, setAllowedUsers] = useState("");

  const selectedFiles = files.filter((file) => selectedIds.includes(file.id));

  const refreshFiles = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const result = await listKnowledgeFiles(token);
      setFiles(result);
      setSelectedIds((current) => current.filter((id) => result.some((file) => file.id === id)));
    } catch (error) {
      toast({
        title: "Unable to load knowledge files",
        description: error instanceof Error ? error.message : "AI service is unavailable.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, token]);

  useEffect(() => {
    void refreshFiles();
  }, [refreshFiles]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length || !token) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        await uploadKnowledgeFile(
          file,
          {
            visibility,
            allowed_roles: parseCsv(allowedRoles),
            allowed_user_ids: parseCsv(allowedUsers),
          },
          token,
        );
      }
      toast({ title: "Knowledge uploaded", description: "Documents were chunked, embedded, and stored.", type: "success" });
      await refreshFiles();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Document could not be processed.",
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    const accepted = await confirm({
      title: "Delete knowledge file?",
      description: "Its chunks and embeddings will be removed from the RAG index.",
      confirmLabel: "Delete File",
      tone: "danger",
    });
    if (!accepted || !token) return;
    await deleteKnowledgeFile(documentId, token);
    toast({ title: "Knowledge file deleted", type: "warning" });
    await refreshFiles();
  };

  const runSearch = async () => {
    if (!query.trim() || !token) return;
    setAsking(true);
    setAnswer(null);
    try {
      const results = await semanticSearch(query, selectedIds, token);
      setSearchResults(results);
      toast({ title: "Semantic search complete", description: `${results.length} source references found.`, type: "success" });
    } catch (error) {
      toast({ title: "Search failed", description: error instanceof Error ? error.message : "AI service unavailable.", type: "error" });
    } finally {
      setAsking(false);
    }
  };

  const runAsk = async (mode: "answer" | "summarize" | "explain") => {
    if (!query.trim() || !token) return;
    setAsking(true);
    setSearchResults([]);
    try {
      const result = await askKnowledge(query, mode, selectedIds, token);
      setAnswer(result);
      toast({ title: mode === "answer" ? "Answer generated" : `${mode} complete`, type: "success" });
    } catch (error) {
      toast({ title: "RAG generation failed", description: error instanceof Error ? error.message : "Configure AI provider and try again.", type: "error" });
    } finally {
      setAsking(false);
    }
  };

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-enterprise p-4">
        <EmptyState
          action={{ label: "Login", onClick: () => window.location.assign("/login") }}
          description="Knowledge search and document Q&A require a signed-in AI BOS user."
          icon={LockKeyhole}
          title="Authentication required"
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
              <Link aria-label="Back to dashboard" to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <p className="text-sm font-semibold text-primary">AI / Knowledge</p>
              <h1 className="text-2xl font-bold">RAG Knowledge Base</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAdmin && (
              <Button disabled={uploading} onClick={() => fileInputRef.current?.click()} type="button">
                <UploadCloud className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Knowledge"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <section className="grid gap-4 lg:grid-cols-4">
          {[
            { label: "Knowledge Files", value: files.length, icon: FileText },
            { label: "Embeddings", value: files.reduce((sum, file) => sum + file.chunk_count, 0), icon: BrainCircuit },
            { label: "Selected Sources", value: selectedIds.length || "All", icon: FileSearch },
            { label: "Access Mode", value: isAdmin ? "Admin" : "User", icon: ShieldCheck },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Card className="glass h-full" key={card.label}>
                <CardContent className="p-5">
                  <Icon className="mb-4 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold">{card.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {isAdmin && (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Admin Knowledge Upload</CardTitle>
              <p className="text-sm text-muted-foreground">Upload {supportedFiles}. Files are parsed, chunked, embedded, stored, and permission-scoped.</p>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[180px_1fr_1fr_auto]">
              <div className="space-y-2">
                <Label>Visibility</Label>
                <select className="h-11 w-full rounded-xl border bg-background/75 px-3 text-sm" value={visibility} onChange={(event) => setVisibility(event.target.value as KnowledgePermissions["visibility"])}>
                  <option value="workspace">Workspace</option>
                  <option value="restricted">Restricted</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowedRoles">Allowed Roles</Label>
                <Input id="allowedRoles" placeholder="Admin,CEO,Manager" value={allowedRoles} onChange={(event) => setAllowedRoles(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowedUsers">Allowed User IDs</Label>
                <Input id="allowedUsers" placeholder="Optional comma separated user IDs" value={allowedUsers} onChange={(event) => setAllowedUsers(event.target.value)} />
              </div>
              <div className="flex items-end">
                <Button className="w-full" disabled={uploading} onClick={() => fileInputRef.current?.click()} type="button">
                  <UploadCloud className="h-4 w-4" />
                  Select Files
                </Button>
              </div>
              <input
                accept=".pdf,.docx,.pptx,.xlsx,.xls,.xlsm"
                className="hidden"
                multiple
                onChange={(event) => void handleUpload(event.target.files)}
                ref={fileInputRef}
                type="file"
              />
            </CardContent>
          </Card>
        )}

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Knowledge Files</CardTitle>
              <p className="text-sm text-muted-foreground">Users only see files permitted by ownership, role, user ID, or workspace visibility.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <SkeletonCard />
              ) : files.length === 0 ? (
                <EmptyState
                  action={isAdmin ? { label: "Upload Files", onClick: () => fileInputRef.current?.click() } : undefined}
                  description={isAdmin ? "Upload documents to create the first knowledge index." : "No permitted knowledge files are available yet."}
                  icon={BookOpenText}
                  title="No knowledge files"
                />
              ) : (
                files.map((file) => (
                  <div className="rounded-2xl border bg-background/65 p-4" key={file.id}>
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex min-w-0 cursor-pointer items-start gap-3">
                        <input
                          checked={selectedIds.includes(file.id)}
                          className="mt-1 h-4 w-4 accent-primary"
                          onChange={(event) =>
                            setSelectedIds((current) =>
                              event.target.checked ? [...current, file.id] : current.filter((id) => id !== file.id),
                            )
                          }
                          type="checkbox"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{file.filename}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {file.chunk_count} chunks - {formatBytes(file.size)} - {file.permissions.visibility}
                          </span>
                        </span>
                      </label>
                      {isAdmin && (
                        <Button onClick={() => void handleDelete(file.id)} size="icon" type="button" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", file.status === "Ready" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/10 text-amber-600")}>
                        {file.status}
                      </span>
                      {file.permissions.allowed_roles.map((role) => (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary" key={role}>{role}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Ask Knowledge</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedFiles.length ? `Using ${selectedFiles.length} selected file(s).` : "Using all permitted knowledge files."}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <textarea
                    className="min-h-28 w-full rounded-2xl border bg-background/75 px-10 py-3 text-sm outline-none focus:border-primary"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ask, summarize, explain, or search your knowledge base..."
                    value={query}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={asking || !query.trim()} onClick={() => void runAsk("answer")} type="button">
                    Ask Question
                  </Button>
                  <Button disabled={asking || !query.trim()} onClick={() => void runAsk("summarize")} type="button" variant="outline">
                    Summarize Documents
                  </Button>
                  <Button disabled={asking || !query.trim()} onClick={() => void runAsk("explain")} type="button" variant="outline">
                    Explain Documents
                  </Button>
                  <Button disabled={asking || !query.trim()} onClick={() => void runSearch()} type="button" variant="outline">
                    Semantic Search
                  </Button>
                </div>
              </CardContent>
            </Card>

            {answer && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Answer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border bg-background/65 p-4 text-sm leading-7 whitespace-pre-wrap">{answer.answer}</div>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Source References</p>
                    {answer.sources.map((source) => <SourceCard key={source.id} source={source} />)}
                  </div>
                </CardContent>
              </Card>
            )}

            {searchResults.length > 0 && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Semantic Search Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {searchResults.map((source) => <SourceCard key={source.id} source={source} />)}
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
