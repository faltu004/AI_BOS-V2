import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, Check, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";

type AuthLayoutProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function AuthLayout({ children, eyebrow, title, subtitle }: AuthLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-enterprise">
      <div className="absolute inset-0 animated-gradient animate-gradient" />
      <div className="absolute left-[8%] top-24 h-20 w-20 rotate-12 rounded-lg border border-white/30 bg-white/20 backdrop-blur-xl" />
      <div className="absolute bottom-16 right-[9%] h-16 w-16 -rotate-12 rounded-lg border border-primary/20 bg-primary/10 backdrop-blur-xl" />

      <div className="container relative grid min-h-screen gap-8 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="flex items-center justify-between lg:absolute lg:left-4 lg:right-4 lg:top-6">
          <Button asChild variant="ghost">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> AI BOS
            </Link>
          </Button>
          <ThemeToggle />
        </div>

        <motion.section
          animate={{ opacity: 1, x: 0 }}
          className="hidden max-w-xl space-y-8 pt-20 lg:block"
          initial={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Secure access
          </span>
          <div className="space-y-5">
            <h1 className="text-balance text-5xl font-bold leading-tight">
              Business identity for every operating role.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Role-aware authentication screens prepared for JWT access tokens,
              refresh tokens, and enterprise permission models.
            </p>
          </div>

          <div className="glass grid gap-4 rounded-lg p-5">
            {[
              "Admin, CEO, Manager, and Employee role flows",
              "Remembered sessions ready for refresh-token storage",
              "Email verification and password recovery journeys",
            ].map((item) => (
              <div className="flex items-start gap-3" key={item}>
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm leading-6 text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-soft rounded-lg p-5">
              <ShieldCheck className="mb-4 h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">JWT Ready</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                API payloads are structured for token-based authentication.
              </p>
            </div>
            <div className="glass-soft rounded-lg p-5">
              <BarChart3 className="mb-4 h-5 w-5 text-accent" />
              <p className="text-sm font-semibold">Enterprise UI</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Responsive glass surfaces, motion, and theme-aware controls.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[calc(100vh-5rem)] items-center justify-center pt-12 lg:min-h-screen lg:pt-0"
          initial={{ opacity: 0, y: 26 }}
          transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
        >
          <div className="w-full max-w-md">
            <div className="mb-6 text-center lg:hidden">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                {eyebrow}
              </span>
            </div>
            <div className="glass rounded-lg p-6 sm:p-7">
              <div className="mb-7 space-y-3 text-center">
                <span className="hidden items-center justify-center rounded-full text-xs font-semibold uppercase text-primary lg:inline-flex">
                  {eyebrow}
                </span>
                <h2 className="text-balance text-3xl font-bold">{title}</h2>
                <p className="text-sm leading-7 text-muted-foreground">{subtitle}</p>
              </div>
              {children}
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
