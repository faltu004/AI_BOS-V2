import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarCheck,
  ChevronRight,
  CircleDollarSign,
  MessageSquareText,
  Play,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "@/components/animation/Reveal";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  faqs,
  features,
  modules,
  securityItems,
  stats,
  testimonials,
  trustedCompanies,
  whyChoose,
  type IconItem,
} from "@/data/landing";
import { cn } from "@/lib/utils";

function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal
      className={cn(
        "mx-auto max-w-3xl space-y-4",
        align === "center" ? "text-center" : "mx-0 text-left",
      )}
    >
      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
        {eyebrow}
      </span>
      <h2 className="text-balance text-3xl font-bold sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="text-base leading-8 text-muted-foreground sm:text-lg">
        {description}
      </p>
    </Reveal>
  );
}

function IconCard({ item, index }: { item: IconItem; index: number }) {
  const Icon = item.icon;

  return (
    <Reveal delay={index * 0.04}>
      <Card className="group h-full overflow-hidden bg-card/70 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass">
        <CardHeader>
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle>{item.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
        </CardContent>
      </Card>
    </Reveal>
  );
}

function HeroDashboard() {
  const bars = [42, 68, 54, 81, 62, 88, 74, 96];

  return (
    <motion.div
      animate={{ opacity: 1, x: 0 }}
      className="relative mx-auto w-full max-w-2xl lg:max-w-none"
      initial={{ opacity: 0, x: 36 }}
      transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
    >
      <div className="absolute -left-6 top-16 hidden animate-float rounded-lg border border-white/50 bg-white/80 p-4 shadow-glass backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:block">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
            <UsersRound className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Employees</p>
            <p className="text-lg font-bold">50,240</p>
          </div>
        </div>
      </div>

      <div className="absolute -right-3 bottom-16 hidden animate-float rounded-lg border border-white/50 bg-white/80 p-4 shadow-glass backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:block">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">AI Chat</p>
            <p className="text-lg font-bold">Live</p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-white/50 bg-white/75 shadow-glass backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="h-2 w-24 rounded-full bg-muted" />
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[0.8fr_1.2fr] sm:p-5">
          <aside className="rounded-md border bg-background/70 p-4">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BarChart3 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Command Center</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
            <div className="space-y-3">
              {["Projects", "CRM", "Finance", "HR"].map((label, index) => (
                <div
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm",
                    index === 0 ? "bg-primary text-primary-foreground" : "bg-muted/60",
                  )}
                  key={label}
                >
                  <span>{label}</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              ))}
            </div>
          </aside>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Revenue", value: "$2.4M", icon: CircleDollarSign, color: "text-emerald-600" },
                { label: "Projects", value: "128", icon: CalendarCheck, color: "text-blue-600" },
                { label: "Growth", value: "32%", icon: TrendingUp, color: "text-amber-600" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div className="rounded-md border bg-background/70 p-3" key={item.label}>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <Icon className={cn("h-4 w-4", item.color)} />
                    </div>
                    <p className="text-xl font-bold">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-md border bg-background/70 p-4">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Analytics</p>
                  <p className="text-xs text-muted-foreground">Operating performance</p>
                </div>
                <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  +18.4%
                </span>
              </div>
              <div className="flex h-36 items-end gap-2">
                {bars.map((height, index) => (
                  <motion.div
                    animate={{ height: `${height}%` }}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-primary to-emerald-400"
                    initial={{ height: "16%" }}
                    key={height + index}
                    transition={{ duration: 0.8, delay: 0.25 + index * 0.05 }}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-md border bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent">
                  <MessageSquareText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">AI Assistant</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    Drafted 8 follow-ups, flagged 3 delayed milestones, and prepared
                    the weekly finance summary.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HeroSection() {
  return (
    <section id="home" className="relative overflow-hidden bg-enterprise pt-28">
      <div className="absolute inset-0 animated-gradient animate-gradient" />
      <div className="absolute left-[7%] top-36 h-20 w-20 rotate-12 rounded-lg border border-white/30 bg-white/25 backdrop-blur-xl" />
      <div className="absolute bottom-20 right-[9%] h-16 w-16 -rotate-12 rounded-lg border border-primary/20 bg-primary/10 backdrop-blur-xl" />

      <div className="container relative grid min-h-[calc(100vh-2rem)] items-center gap-12 pb-20 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="max-w-3xl space-y-8">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/60 px-3 py-1 text-sm font-medium shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            initial={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.5 }}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Phase 1 Foundation
          </motion.div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
            initial={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.65, delay: 0.05 }}
          >
            <h1 className="text-balance text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
              The AI Operating System For Modern Businesses
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Manage your employees, customers, projects, finance, meetings and
              AI assistants from one intelligent platform.
            </p>
          </motion.div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.65, delay: 0.12 }}
          >
            <Button asChild size="lg">
              <Link to="/register">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="glass">
              <a href="#contact">
                <Play className="h-4 w-4" /> Book Demo
              </a>
            </Button>
          </motion.div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="grid max-w-lg grid-cols-3 gap-3 text-sm"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.65, delay: 0.18 }}
          >
            {securityItems.map((item) => {
              const Icon = item.icon;
              return (
                <div className="glass-soft rounded-md px-3 py-3" key={item.label}>
                  <Icon className="mb-2 h-4 w-4 text-primary" />
                  <span className="font-medium">{item.label}</span>
                </div>
              );
            })}
          </motion.div>
        </div>

        <HeroDashboard />
      </div>
    </section>
  );
}

function TrustedSection() {
  return (
    <section className="border-y bg-card/35 py-8">
      <div className="container">
        <Reveal>
          <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
            Trusted by teams building the next generation of operations
          </p>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {trustedCompanies.map((company, index) => (
            <Reveal delay={index * 0.03} key={company}>
              <div className="flex h-16 items-center justify-center rounded-md border bg-background/50 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                {company}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="section-pad">
      <div className="container space-y-12">
        <SectionHeader
          description="A complete operating layer for the workflows every company needs to coordinate, automate, and understand."
          eyebrow="Features"
          title="Everything your business runs on, connected by AI"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <IconCard index={index} item={feature} key={feature.title} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionsSection() {
  return (
    <section id="solutions" className="section-pad bg-card/35">
      <div className="container grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <SectionHeader
          align="left"
          description="AI BOS gives leaders and teams the same operating picture, so strategy, execution, people, customers, and finance stay aligned."
          eyebrow="Why Choose AI BOS"
          title="Enterprise clarity without enterprise heaviness"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {whyChoose.map((item, index) => (
            <IconCard index={index} item={item} key={item.title} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ModulesSection() {
  return (
    <section id="modules" className="section-pad">
      <div className="container space-y-12">
        <SectionHeader
          description="A modular foundation for business operations today and AI-native automation tomorrow."
          eyebrow="Modules"
          title="One workspace for every department"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <Reveal delay={index * 0.03} key={module.title}>
                <div className="group h-full rounded-lg border bg-card/70 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass">
                  <Icon className="mb-5 h-5 w-5 text-primary" />
                  <h3 className="mb-2 text-base font-semibold">{module.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{module.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section id="about" className="section-pad bg-foreground text-background dark:bg-white dark:text-slate-950">
      <div className="container grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Reveal delay={index * 0.05} key={stat.label}>
            <div className="rounded-lg border border-background/15 bg-background/10 p-7 text-center backdrop-blur-xl dark:border-slate-200 dark:bg-slate-50">
              <p className="text-4xl font-bold sm:text-5xl">{stat.value}</p>
              <p className="mt-3 text-sm font-medium opacity-75">{stat.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="section-pad">
      <div className="container space-y-12">
        <SectionHeader
          description="Designed for leaders, operators, and builders who need a calm center for ambitious companies."
          eyebrow="Testimonials"
          title="Teams can feel the operating rhythm improve"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((testimonial, index) => (
            <Reveal delay={index * 0.05} key={testimonial.name}>
              <Card className="h-full bg-card/70 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass">
                <CardContent className="flex h-full flex-col p-6">
                  <p className="mb-8 text-sm leading-7 text-muted-foreground">
                    "{testimonial.quote}"
                  </p>
                  <div className="mt-auto flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                      {testimonial.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="section-pad">
      <div className="container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeader
          align="left"
          description="A practical foundation now, with room for authentication, backend services, AI workflows, and module dashboards later."
          eyebrow="FAQ"
          title="Built for the first phase and ready for the next"
        />
        <Reveal>
          <Accordion className="bg-card/70" items={faqs} />
        </Reveal>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section id="cta" className="px-4 pb-20">
      <Reveal>
        <div className="container overflow-hidden rounded-lg border bg-foreground px-6 py-14 text-center text-background shadow-glass dark:bg-white dark:text-slate-950 sm:px-10">
          <div className="mx-auto max-w-3xl space-y-6">
            <h2 className="text-balance text-3xl font-bold sm:text-5xl">
              Ready to Transform Your Business?
            </h2>
            <p className="text-base leading-8 opacity-78 sm:text-lg">
              Bring your team into a premium AI-ready operating foundation and
              extend it module by module as your company grows.
            </p>
            <Button asChild className="bg-background text-foreground hover:bg-background/90" size="lg">
              <Link to="/register">
                Access AI BOS <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <TrustedSection />
        <FeaturesSection />
        <SolutionsSection />
        <ModulesSection />
        <StatsSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
