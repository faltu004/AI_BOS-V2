import { Menu, X, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@shared/ui/button";
import { navItems } from "@/data/landing";
import { cn } from "@shared/lib/utils";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { CompanyLogo } from "@shared/ui/company-logo";

function NavLink({
  label,
  href,
  external,
  onNavigate,
}: {
  label: string;
  href: string;
  external: boolean;
  onNavigate: (label: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (external) return;
      e.preventDefault();
      setLoading(true);
      onNavigate(label);
      const target = document.getElementById(href.replace("#", ""));
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth" });
          setLoading(false);
        }, 150);
      } else {
        setLoading(false);
      }
    },
    [external, href, label, onNavigate],
  );

  return (
    <a
      className={cn(
        "relative flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        loading && "pointer-events-none opacity-60",
      )}
      href={href}
      key={label}
      onClick={handleClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {loading && (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      )}
      {label}
      {external && (
        <svg
          className="ml-0.5 h-3 w-3 opacity-50"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 3h6v6M10 14L21 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </a>
  );
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const handleNavigate = useCallback((label: string) => {
    setNavigating(true);
    setTimeout(() => {
      setNavigating(false);
      setIsOpen(false);
    }, 400);
  }, []);

  return (
    <motion.header
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl"
      initial={{ y: -18, opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link className="flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" to="/">
          <CompanyLogo subtitle="Software development" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <NavLink
              external={item.external}
              href={item.href}
              key={item.label}
              label={item.label}
              onNavigate={handleNavigate}
            />
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <Button
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((value) => !value)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {navigating && (
        <div className="h-0.5 bg-primary/60" aria-hidden="true">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          />
        </div>
      )}

      <div
        className={cn(
          "grid border-t border-border/60 transition-[grid-template-rows] duration-300 lg:hidden",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <nav className="container flex flex-col gap-1 py-4">
            {navItems.map((item) => (
              <NavLink
                external={item.external}
                href={item.href}
                key={item.label}
                label={item.label}
                onNavigate={handleNavigate}
              />
            ))}
            <div className="mt-2">
              <Button asChild className="w-full">
                <Link onClick={() => setIsOpen(false)} to="/login">
                  Login
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </motion.header>
  );
}
