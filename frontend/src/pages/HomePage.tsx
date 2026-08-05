import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useInView } from "framer-motion";
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
 Sparkles,
 Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "@/components/animation/Reveal";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Accordion } from "@shared/ui/accordion";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
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
import { cn } from "@shared/lib/utils";

function useCounter(end: number, duration = 3500, start = 0) {
 const [count, setCount] = useState(start);
 const ref = useRef<HTMLDivElement>(null);
 const isInView = useInView(ref, { once: true, margin: "-100px" });

 useEffect(() => {
 if (!isInView) return;
 let startTime: number | null = null;
 let raf: number;

 function tick(now: number) {
 if (startTime === null) startTime = now;
 const elapsed = now - startTime;
 const progress = Math.min(elapsed / duration, 1);
 const eased = 1 - Math.pow(1 - progress, 3);
 setCount(Math.round(start + (end - start) * eased));
 if (progress < 1) {
 raf = requestAnimationFrame(tick);
 }
 return;
 }

 raf = requestAnimationFrame(tick);
 return () => {
 if (raf) cancelAnimationFrame(raf);
 };
 }, [end, duration, start, isInView]);

 return { count, ref };
}

function LoadingOverlay({ active }: { active: boolean }) {
 if (!active) return null;

 return (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background " aria-live="polite" aria-label="Loading">
 <motion.div
 className="flex flex-col items-center gap-3"
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.35 }}
 >
 <div className="relative h-12 w-12">
 <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
 <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" style={{ animationDuration: '1s' }} />
 <div className="absolute inset-1.5 rounded-full border-2 border-accent border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
 </div>
 <p className="text-xs font-medium text-muted-foreground tracking-wide">Loading</p>
 </motion.div>
 </div>
 );
}

function ParticleBackground() {
 const [particles, setParticles] = useState<Array<{ x: number; y: number; size: number; opacity: number; vx: number; vy: number; id: number }>>([]);

 useEffect(() => {
 const count = 30;
 const newParticles = Array.from({ length: count }, (_, i) => ({
 x: Math.random() * 100,
 y: Math.random() * 100,
 size: Math.random() * 3 + 1,
 opacity: Math.random() * 0.4 + 0.1,
 vx: (Math.random() - 0.5) * 0.3,
 vy: (Math.random() - 0.5) * 0.3,
 id: i,
 }));
 setParticles(newParticles);
 }, []);

 useEffect(() => {
 if (particles.length === 0) return;
 let raf: number;

 function animate() {
 setParticles((prev) =>
 prev.map((p) => {
 let nx = p.x + p.vx * 0.01;
 let ny = p.y + p.vy * 0.01;
 if (nx < 0 || nx > 100) nx = Math.random() * 100;
 if (ny < 0 || ny > 100) ny = Math.random() * 100;
 return { ...p, x: nx, y: ny };
 }),
 );
 raf = requestAnimationFrame(animate);
 }

 raf = requestAnimationFrame(animate);
 return () => {
 if (raf) cancelAnimationFrame(raf);
 };
 }, [particles.length]);

 return (
 <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
 {particles.map((p) => (
 <motion.div
 key={p.id}
 className="absolute rounded-full bg-primary/30"
 style={{
 left: `${p.x}%`,
 top: `${p.y}%`,
 width: p.size,
 height: p.size,
 opacity: p.opacity,
 }}
 animate={{
 x: [0, p.vx * 40],
 y: [0, p.vy * 40],
 opacity: [p.opacity, p.opacity * 0.3, p.opacity],
 }}
 transition={{
 duration: 4 + Math.random() * 6,
 repeat: Infinity,
 repeatType: "reverse",
 ease: "easeInOut",
 }}
 />
 ))}
 </div>
 );
}

function TypingText({ text, speed = 90 }: { text: string; speed?: number }) {
 const [displayed, setDisplayed] = useState("");
 const ref = useRef<HTMLDivElement>(null);
 const isInView = useInView(ref, { once: true, margin: "-50px" });

 useEffect(() => {
 if (!isInView) return;
 let i = 0;
 let timer: number;

 function type() {
 if (i <= text.length) {
 setDisplayed(text.slice(0, i));
 i++;
 timer = window.setTimeout(type, speed);
 }
 }

 timer = window.setTimeout(type, 800);
 return () => {
 if (timer) clearTimeout(timer);
 };
 }, [text, speed, isInView]);

 return (
 <div ref={ref} className="min-h-[1.2em]">
 {displayed}
 <motion.span
 className="inline-block h-6 w-0.5 bg-primary ml-0.5"
 animate={{ opacity: [1, 0] }}
 transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
 />
 </div>
 );
}

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
 const ref = useRef<HTMLDivElement>(null);
 const isInView = useInView(ref, { once: true, margin: "-80px" });

 return (
 <motion.div
 ref={ref}
 initial={{ opacity: 0, y: 36 }}
 animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
 transition={{ duration: 0.9, ease: "easeOut" }}
 className={className}
 >
 {children}
 </motion.div>
 );
}

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
 <motion.div
 initial={{ opacity: 0, y: 20, scale: 0.97 }}
 whileInView={{ opacity: 1, y: 0, scale: 1 }}
 viewport={{ once: true, margin: "-60px" }}
 transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
 className="group h-full cursor-pointer overflow-hidden rounded-lg border bg-card hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass hover:shadow-primary/5"
 >
 <div className="p-6">
 <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:rotate-3">
 <Icon className="h-5 w-5" />
 </div>
 <h3 className="mb-2 text-base font-semibold">{item.title}</h3>
 <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
 </div>
 <div className="h-1 w-full bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
 </motion.div>
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
 <div className="absolute -left-6 top-16 hidden animate-float rounded-lg border border-white/50 bg-white/80 p-4 shadow-glass dark:border-white/10 dark:bg-white sm:block">
 <div className="flex items-center gap-3">
 <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
 <UsersRound className="h-5 w-5" />
 </span>
 <div>
 <p className="text-xs text-muted-foreground">Employees</p>
 <motion.p
 className="text-lg font-bold"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 1 }}
 >
 50,240
 </motion.p>
 </div>
 </div>
 </div>

 <div className="absolute -right-3 bottom-16 hidden animate-float rounded-lg border border-white/50 bg-white/80 p-4 shadow-glass dark:border-white/10 dark:bg-white sm:block" style={{ animationDelay: '1s' }}>
 <div className="flex items-center gap-3">
 <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300">
 <Bot className="h-5 w-5" />
 </span>
 <div>
 <p className="text-xs text-muted-foreground">AI Chat</p>
 <motion.p
 className="text-lg font-bold"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 1.2 }}
 >
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
 </span>
 {" "}Live
 </motion.p>
 </div>
 </div>
 </div>

 <div className="relative overflow-hidden rounded-lg border border-white/50 bg-white/75 shadow-glass dark:border-white/10 dark:bg-white">
 <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
 <div className="flex gap-2">
 <span className="h-3 w-3 rounded-full bg-rose-400" />
 <span className="h-3 w-3 rounded-full bg-amber-400" />
 <span className="h-3 w-3 rounded-full bg-emerald-400" />
 </div>
 <div className="h-2 w-24 rounded-full bg-muted" />
 </div>

 <div className="grid gap-4 p-4 sm:grid-cols-[0.8fr_1.2fr] sm:p-5">
 <aside className="rounded-md border bg-background p-4">
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
 <motion.div
 className={cn(
 "flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer transition-all duration-200 hover:scale-[1.02]",
 index === 0 ? "bg-primary text-primary-foreground" : "bg-muted",
 )}
 key={label}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 >
 <span>{label}</span>
 <ChevronRight className="h-4 w-4" />
 </motion.div>
 ))}
 </div>
 </aside>

 <div className="space-y-4">
 <div className="grid gap-3 sm:grid-cols-3">
 {[
 { label: "Revenue", value: "$2.4M", icon: CircleDollarSign, color: "text-emerald-600" },
 { label: "Projects", value: "128", icon: CalendarCheck, color: "text-blue-600" },
 { label: "Growth", value: "32%", icon: TrendingUp, color: "text-amber-600" },
 ].map((item, index) => {
 const Icon = item.icon;
 return (
 <motion.div
 className="rounded-md border bg-background p-3 cursor-pointer"
 key={item.label}
 whileHover={{ y: -4, scale: 1.03, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.3 + index * 0.1 }}
 >
 <div className="mb-3 flex items-center justify-between">
 <p className="text-xs text-muted-foreground">{item.label}</p>
 <Icon className={cn("h-4 w-4", item.color)} />
 </div>
 <motion.p
 className="text-xl font-bold"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.5 + index * 0.1 }}
 >
 {item.value}
 </motion.p>
 </motion.div>
 );
 })}
 </div>

 <div className="rounded-md border bg-background p-4">
 <div className="mb-5 flex items-center justify-between">
 <div>
 <p className="text-sm font-semibold">Analytics</p>
 <p className="text-xs text-muted-foreground">Operating performance</p>
 </div>
 <motion.span
 className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300"
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ type: "spring", stiffness: 200 }}
 >
 +18.4%
 </motion.span>
 </div>
 <div className="flex h-36 items-end gap-2">
 {bars.map((height, index) => (
 <motion.div
 animate={{ height: `${height}%` }}
 className="flex-1 rounded-t-md bg-gradient-to-b from-primary to-emerald-400"
 initial={{ height: "16%" }}
 key={height + index}
 transition={{ duration: 0.8, delay: 0.25 + index * 0.05 }}
 whileHover={{ opacity: 0.8, scaleY: 1.02 }}
 />
 ))}
 </div>
 </div>

 <motion.div
 className="rounded-md border bg-background p-4 cursor-pointer"
 whileHover={{ y: -2 }}
 transition={{ type: "spring", stiffness: 300 }}
 >
 <div className="flex items-start gap-3">
 <motion.span
 className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent"
 animate={{ scale: [1, 1.05, 1] }}
 transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
 >
 <MessageSquareText className="h-4 w-4" />
 </motion.span>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-semibold">AI Assistant</p>
 <p className="mt-1 text-xs leading-6 text-muted-foreground">
 Drafted 8 follow-ups, flagged 3 delayed milestones, and prepared
 the weekly finance summary.
 </p>
 </div>
 </div>
 </motion.div>
 </div>
 </div>
 </div>
 </motion.div>
 );
}

function HeroSection() {
 const [loading, setLoading] = useState(false);

 return (
 <section id="home" className="relative overflow-hidden bg-enterprise pt-28">
 <ParticleBackground />
 <div className="absolute inset-0 animated-gradient animate-gradient" />
 <div className="absolute left-[7%] top-36 h-20 w-20 rotate-12 rounded-lg border border-white/50 bg-white/25 dark:border-white/10 dark:bg-white" />
 <div className="absolute bottom-20 right-[9%] h-16 w-16 -rotate-12 rounded-lg border border-primary/20 bg-primary/10 " />

 <LoadingOverlay active={loading} />

 <div className="container relative grid min-h-[calc(100vh-2rem)] items-center gap-12 pb-20 lg:grid-cols-[0.95fr_1.05fr]">
 <div className="max-w-3xl space-y-8">
 <motion.div
 animate={{ opacity: 1, y: 0 }}
 className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/60 px-3 py-1 text-sm font-medium shadow-sm dark:border-white/10 dark:bg-white"
 initial={{ opacity: 0, y: 18 }}
 transition={{ duration: 0.8, ease: "easeOut" }}
 >
 <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
 Phase 1 Foundation
 </motion.div>

 <motion.div
 animate={{ opacity: 1, y: 0 }}
 className="space-y-6"
 initial={{ opacity: 0, y: 28 }}
 transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
 >
 <TypingText text="The AI Operating System For Modern Businesses" speed={90} />
 <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
 Manage your employees, customers, projects, finance, meetings and
 AI assistants from one intelligent platform.
 </p>
 </motion.div>

 <motion.div
 animate={{ opacity: 1, y: 0 }}
 className="flex flex-col gap-3 sm:flex-row"
 initial={{ opacity: 0, y: 24 }}
 transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
 >
 <Button
 asChild
 size="lg"
 variant="glass"
 onClick={() => setLoading(true)}
 >
 <a href="#contact">
 <Play className="h-4 w-4" /> Book Demo
 </a>
 </Button>
 <Button asChild size="lg" variant="outline" onClick={() => setLoading(true)}>
 <Link to="/login">Explore Platform</Link>
 </Button>
 </motion.div>

 <motion.div
 animate={{ opacity: 1, y: 0 }}
 className="grid max-w-lg grid-cols-3 gap-3 text-sm"
 initial={{ opacity: 0, y: 24 }}
 transition={{ duration: 0.9, delay: 0.55, ease: "easeOut" }}
 >
 {securityItems.map((item) => {
 const Icon = item.icon;
 return (
 <div className="glass-soft rounded-md px-3 py-3 transition-all duration-300 hover:scale-105 hover:shadow-lg" key={item.label}>
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
 const [loaded, setLoaded] = useState(false);

 useEffect(() => {
 const timer = setTimeout(() => setLoaded(true), 150);
 return () => clearTimeout(timer);
 }, []);

 return (
 <section className="border-y bg-card py-8">
 <div className="container">
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={loaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
 transition={{ duration: 0.7, ease: "easeOut" }}
 className="text-center"
 >
 <p className="text-sm font-medium text-muted-foreground">
 Trusted by teams building the next generation of operations
 </p>
 </motion.div>
 <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
 {trustedCompanies.map((company, index) => (
 <motion.div
 key={company}
 initial={{ opacity: 0, y: 16, scale: 0.95 }}
 animate={loaded ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.95 }}
 transition={{ duration: 0.5, delay: index * 0.06 }}
 className="flex h-16 items-center justify-center rounded-md border bg-background px-4 text-sm font-semibold text-muted-foreground transition-all duration-300 hover:border-primary/40 hover:text-foreground hover:shadow-sm"
 >
 {company}
 </motion.div>
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
 <section id="solutions" className="section-pad bg-card">
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
 const [loaded, setLoaded] = useState(false);

 useEffect(() => {
 const timer = setTimeout(() => setLoaded(true), 200);
 return () => clearTimeout(timer);
 }, []);

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
 <motion.div
 key={module.title}
 initial={{ opacity: 0, y: 28, scale: 0.96 }}
 animate={loaded ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.96 }}
 transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
 className="group h-full cursor-pointer rounded-lg border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass hover:shadow-primary/5"
 >
 <motion.div
 className="mb-5 h-11 w-11 rounded-md bg-primary/10 text-primary flex items-center justify-center"
 whileHover={{ scale: 1.12, rotate: -4 }}
 transition={{ type: "spring", stiffness: 300 }}
 >
 <Icon className="h-5 w-5" />
 </motion.div>
 <h3 className="mb-2 text-base font-semibold">{module.title}</h3>
 <p className="text-sm leading-6 text-muted-foreground">{module.description}</p>
 </motion.div>
 );
 })}
 </div>
 </div>
 </section>
 );
}

function StatsSection() {
 const [visible, setVisible] = useState(false);
 const ref = useRef<HTMLDivElement>(null);
 const isInView = useInView(ref, { once: true, margin: "-100px" });

 useEffect(() => {
 if (isInView) setVisible(true);
 }, [isInView]);

 return (
 <section id="about" className="section-pad bg-foreground text-background dark:bg-white dark:text-slate-950">
 <div className="container grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
 {stats.map((stat, index) => {
 const { count, ref: counterRef } = useCounter(
 parseInt(stat.value.replace(/[^0-9]/g, "")),
 3000,
 0,
 );
 const prefix = stat.value.match(/^[^+-]*/)?.[0] ?? "";
 const suffix = stat.value.replace(/^[^+-]*/, "").replace(/[0-9]/g, "") ?? "";

 return (
 <motion.div
 key={stat.label}
 ref={index === 0 ? counterRef : undefined}
 initial={{ opacity: 0, y: 24, scale: 0.92 }}
 animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.92 }}
 transition={{ duration: 0.8, delay: index * 0.15, ease: "easeOut" }}
 className="rounded-lg border border-background/15 bg-background/10 p-7 text-center dark:border-slate-200 dark:bg-slate-50"
 >
 <p className="text-4xl font-bold sm:text-5xl">
 {visible ? `${prefix}${count.toLocaleString()}${suffix}` : "0"}
 </p>
 <motion.p
 initial={{ opacity: 0 }}
 animate={visible ? { opacity: 1 } : { opacity: 0 }}
 transition={{ delay: 0.6 + index * 0.12 }}
 className="mt-3 text-sm font-medium opacity-75"
 >
 {stat.label}
 </motion.p>
 </motion.div>
 );
 })}
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
 <motion.div
 key={testimonial.name}
 initial={{ opacity: 0, y: 24, rotateX: 5 }}
 whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
 viewport={{ once: true, margin: "-60px" }}
 transition={{ duration: 0.7, delay: index * 0.12 }}
 whileHover={{ y: -6, scale: 1.02, rotateX: 0 }}
 className="h-full"
 >
 <Card className="h-full bg-card hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass transition-all duration-300">
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
 </motion.div>
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
 <Accordion className="bg-card" items={faqs} />
 </Reveal>
 </div>
 </section>
 );
}

function CtaSection() {
 return (
 <section id="cta" className="px-4 pb-20">
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.6 }}
 >
 <div className="container overflow-hidden rounded-lg border bg-foreground px-6 py-14 text-center text-background shadow-glass dark:bg-white dark:text-slate-950 sm:px-10">
 <motion.div
 className="mx-auto max-w-3xl space-y-6"
 initial={{ scale: 0.95 }}
 whileInView={{ scale: 1 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5, delay: 0.1 }}
 >
 <motion.h2
 className="text-balance text-3xl font-bold sm:text-5xl"
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5, delay: 0.2 }}
 >
 Ready to Transform Your Business?
 </motion.h2>
 <motion.p
 className="text-base leading-8 opacity-78 sm:text-lg"
 initial={{ opacity: 0, y: 12 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5, delay: 0.3 }}
 >
 Bring your team into a premium AI-ready operating foundation and
 extend it module by module as your company grows.
 </motion.p>
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5, delay: 0.4 }}
 >
 <Button asChild className="bg-background text-foreground hover:bg-background" size="lg">
 <Link to="/login">
 Access AI BOS <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 </motion.div>
 </motion.div>
 </div>
 </motion.div>
 </section>
 );
}

export function HomePage() {
 const [loading, setLoading] = useState(false);

 return (
 <div className="min-h-screen overflow-x-hidden">
 <Navbar />
 <LoadingOverlay active={loading} />
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
