import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { EmptyState } from "@shared/ui/empty-state";

export function MeetingsPage() {
 return (
 <main className="min-h-screen bg-enterprise">
 <header className="sticky top-0 z-40 border-b bg-background">
 <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
 <div>
 <p className="text-sm font-semibold text-primary">Meetings</p>
 <h1 className="text-2xl font-bold">Meeting Management</h1>
 </div>
 <div className="flex items-center gap-2">
 <Button asChild type="button" variant="outline">
 <Link to="/dashboard">Dashboard</Link>
 </Button>
 <ThemeToggle />
 </div>
 </div>
 </header>

 <div className="container py-10">
 <EmptyState
 description="No meeting data service is configured for this portal. Connect a supported meeting backend before scheduling or managing meetings."
 icon={CalendarDays}
 title="Meetings are not configured"
 />
 </div>
 </main>
 );
}
