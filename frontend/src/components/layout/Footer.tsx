import { ArrowRight, Linkedin, Twitter } from "lucide-react";
import { Button } from "@shared/ui/button";
import { CompanyLogo } from "@shared/ui/company-logo";
import { footerLinks } from "@/data/landing";

export function Footer() {
 return (
 <footer id="contact" className="border-t bg-card/40">
 <div className="container grid gap-10 py-14 lg:grid-cols-[1.2fr_2fr_1.1fr]">
 <div className="space-y-5">
 <div className="flex items-center gap-2">
 <CompanyLogo subtitle="Software development" />
 </div>
 <p className="max-w-sm text-sm leading-7 text-muted-foreground">
 The AI operating foundation for modern businesses, built for teams,
 leaders, and future automation.
 </p>
 <div className="flex gap-2">
 <Button aria-label="LinkedIn" size="icon" variant="outline">
 <Linkedin className="h-4 w-4" />
 </Button>
 <Button aria-label="Twitter" size="icon" variant="outline">
 <Twitter className="h-4 w-4" />
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
 {Object.entries(footerLinks).map(([group, links]) => (
 <div key={group} className="space-y-4">
 <h3 className="text-sm font-semibold">{group}</h3>
 <ul className="space-y-3 text-sm text-muted-foreground">
 {links.map((link) => (
 <li key={link}>
 <a className="transition-colors hover:text-foreground" href="#home">
 {link}
 </a>
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>

 <div className="space-y-4">
 <h3 className="text-sm font-semibold">Newsletter</h3>
 <p className="text-sm leading-7 text-muted-foreground">
 Monthly product notes, operating templates, and AI workflow ideas.
 </p>
 <form className="flex gap-2">
 <input
 aria-label="Email address"
 className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
 placeholder="you@company.com"
 type="email"
 />
 <Button aria-label="Subscribe" size="icon" type="submit">
 <ArrowRight className="h-4 w-4" />
 </Button>
 </form>
 </div>
 </div>
 <div className="border-t py-5">
 <div className="container flex flex-col justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
 <span>© 2026 Nexora Softworks Pvt. Ltd. All rights reserved.</span>
 <span>Built for Phase 1 Foundation.</span>
 </div>
 </div>
 </footer>
 );
}
