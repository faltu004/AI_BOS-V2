import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commandPaletteOpenEvent, workspaceSearchItems } from "@/data/workspace";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(["nav-dashboard", "nav-projects", "nav-analytics"]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(commandPaletteOpenEvent, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(commandPaletteOpenEvent, onOpen);
    };
  }, []);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return recent
        .map((id) => workspaceSearchItems.find((item) => item.id === id))
        .filter(Boolean)
        .slice(0, 8);
    }
    return workspaceSearchItems
      .filter((item) => `${item.title} ${item.category} ${item.keywords.join(" ")}`.toLowerCase().includes(normalized))
      .slice(0, 10);
  }, [query, recent]);

  const openItem = (id: string, href: string) => {
    setRecent((current) => [id, ...current.filter((item) => item !== id)].slice(0, 5));
    setOpen(false);
    setQuery("");
    navigate(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[90] bg-foreground/30 p-4 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={() => setOpen(false)}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="mx-auto mt-20 w-full max-w-2xl overflow-hidden rounded-2xl border bg-background/96 shadow-glass backdrop-blur-2xl"
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b p-4">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                autoFocus
                className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                placeholder="Search projects, employees, customers, settings..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Button aria-label="Close command palette" onClick={() => setOpen(false)} size="icon" type="button" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-3">
              <p className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                {query ? "Results" : "Recent searches"}
              </p>
              {results.map((item) => {
                if (!item) return null;
                const Icon = item.icon;
                return (
                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                    key={item.id}
                    onClick={() => openItem(item.id, item.href)}
                    type="button"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{item.category}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
