import type { Company, Contact, CrmMeeting, Customer, Deal, FollowUp, Lead, LeadStage, Quote } from "./crm.types";

export const leadStages: LeadStage[] = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
export const salespeople = ["Aman Verma", "Sofia Alvarez", "Maya Chen", "Noah Brooks", "Arjun Mehta"];
export const leadSources = ["Website", "Referral", "LinkedIn", "Event", "Partner", "Outbound"];

export const seedLeads: Lead[] = [
  {
    id: "lead-1",
    leadCode: "LEAD-2026-001",
    name: "Priya Sharma",
    company: "Nova Retail",
    email: "priya@novaretail.com",
    phone: "+91 98765 12000",
    source: "Website",
    stage: "Qualified",
    value: 85000,
    salesperson: "Maya Chen",
    notes: ["Interested in CRM automation", "Needs approval workflow demo"],
    attachments: [{ name: "requirements.pdf", type: "PDF", size: "920 KB" }],
    activityTimeline: [
      { id: "act-1", title: "Discovery call completed", detail: "Pain points mapped for sales team", time: "Today" },
      { id: "act-2", title: "Lead qualified", detail: "Budget and timeline confirmed", time: "Yesterday" },
    ],
    createdAt: "2026-07-12",
    nextFollowUp: "2026-07-21",
  },
  {
    id: "lead-2",
    leadCode: "LEAD-2026-002",
    name: "Daniel Brooks",
    company: "Orbit Finance",
    email: "daniel@orbitfinance.com",
    phone: "+1 212 555 0198",
    source: "LinkedIn",
    stage: "Proposal",
    value: 140000,
    salesperson: "Aman Verma",
    notes: ["Proposal sent for Enterprise plan", "Security review pending"],
    attachments: [{ name: "enterprise-proposal.pdf", type: "Proposal", size: "1.4 MB" }],
    activityTimeline: [
      { id: "act-3", title: "Proposal sent", detail: "Enterprise CRM + Finance bundle", time: "2 hr ago" },
      { id: "act-4", title: "Security questionnaire received", detail: "Assigned to operations", time: "Jul 17" },
    ],
    createdAt: "2026-07-08",
    nextFollowUp: "2026-07-22",
  },
  {
    id: "lead-3",
    leadCode: "LEAD-2026-003",
    name: "Meera Iyer",
    company: "Zenith Health",
    email: "meera@zenithhealth.com",
    phone: "+91 98989 33445",
    source: "Referral",
    stage: "Negotiation",
    value: 220000,
    salesperson: "Sofia Alvarez",
    notes: ["Negotiating annual contract", "Wants custom onboarding"],
    attachments: [],
    activityTimeline: [{ id: "act-5", title: "Pricing call", detail: "Discussed 18 month term", time: "Today" }],
    createdAt: "2026-06-29",
    nextFollowUp: "2026-07-19",
  },
  {
    id: "lead-4",
    leadCode: "LEAD-2026-004",
    name: "Liam Carter",
    company: "Atlas Logistics",
    email: "liam@atlaslogistics.com",
    phone: "+44 20 5555 0190",
    source: "Event",
    stage: "New",
    value: 60000,
    salesperson: "Noah Brooks",
    notes: ["Met at SaaS operations summit"],
    attachments: [],
    activityTimeline: [{ id: "act-6", title: "Lead captured", detail: "Imported from event scan", time: "Jul 16" }],
    createdAt: "2026-07-16",
    nextFollowUp: "2026-07-23",
  },
];

export const seedCustomers: Customer[] = [
  { id: "cust-1", name: "Rohan Gupta", company: "Acme Cloud", email: "rohan@acmecloud.com", revenue: 180000, owner: "Aman Verma", health: "Excellent" },
  { id: "cust-2", name: "Emma Stone", company: "Northstar Labs", email: "emma@northstar.com", revenue: 96000, owner: "Maya Chen", health: "Good" },
  { id: "cust-3", name: "Kenji Tanaka", company: "BrightOps", email: "kenji@brightops.com", revenue: 132000, owner: "Sofia Alvarez", health: "At Risk" },
];

export const companies: Company[] = [
  { id: "co-1", name: "Nova Retail", industry: "Retail", employees: 420, revenue: 85000, owner: "Maya Chen" },
  { id: "co-2", name: "Orbit Finance", industry: "Fintech", employees: 680, revenue: 140000, owner: "Aman Verma" },
  { id: "co-3", name: "Zenith Health", industry: "Healthcare", employees: 940, revenue: 220000, owner: "Sofia Alvarez" },
  { id: "co-4", name: "Atlas Logistics", industry: "Logistics", employees: 310, revenue: 60000, owner: "Noah Brooks" },
];

export const contacts: Contact[] = [
  { id: "ct-1", name: "Priya Sharma", role: "VP Sales", company: "Nova Retail", email: "priya@novaretail.com", phone: "+91 98765 12000" },
  { id: "ct-2", name: "Daniel Brooks", role: "CFO", company: "Orbit Finance", email: "daniel@orbitfinance.com", phone: "+1 212 555 0198" },
  { id: "ct-3", name: "Meera Iyer", role: "COO", company: "Zenith Health", email: "meera@zenithhealth.com", phone: "+91 98989 33445" },
];

export const deals: Deal[] = [
  { id: "deal-1", name: "Nova Retail CRM Automation", company: "Nova Retail", stage: "Qualified", value: 85000, closeDate: "2026-08-10", owner: "Maya Chen" },
  { id: "deal-2", name: "Orbit Enterprise Platform", company: "Orbit Finance", stage: "Proposal", value: 140000, closeDate: "2026-08-18", owner: "Aman Verma" },
  { id: "deal-3", name: "Zenith AI BOS Rollout", company: "Zenith Health", stage: "Negotiation", value: 220000, closeDate: "2026-07-30", owner: "Sofia Alvarez" },
];

export const opportunities = deals.map((deal) => ({
  ...deal,
  id: deal.id.replace("deal", "opp"),
  name: deal.name.replace("Platform", "Expansion"),
}));

export const quotes: Quote[] = [
  { id: "quote-1", quoteNo: "QT-2026-118", customer: "Orbit Finance", amount: 140000, status: "Sent", validUntil: "2026-08-01" },
  { id: "quote-2", quoteNo: "QT-2026-119", customer: "Zenith Health", amount: 220000, status: "Draft", validUntil: "2026-08-05" },
  { id: "quote-3", quoteNo: "QT-2026-120", customer: "Acme Cloud", amount: 48000, status: "Accepted", validUntil: "2026-07-28" },
];

export const followUps: FollowUp[] = [
  { id: "fu-1", leadName: "Priya Sharma", owner: "Maya Chen", date: "2026-07-21", channel: "Email", status: "Open" },
  { id: "fu-2", leadName: "Daniel Brooks", owner: "Aman Verma", date: "2026-07-22", channel: "Call", status: "Open" },
  { id: "fu-3", leadName: "Meera Iyer", owner: "Sofia Alvarez", date: "2026-07-19", channel: "Demo", status: "Overdue" },
];

export const meetings: CrmMeeting[] = [
  { id: "mtg-1", title: "Nova workflow demo", account: "Nova Retail", owner: "Maya Chen", date: "2026-07-21", time: "11:00 AM" },
  { id: "mtg-2", title: "Orbit security review", account: "Orbit Finance", owner: "Aman Verma", date: "2026-07-22", time: "04:00 PM" },
  { id: "mtg-3", title: "Zenith negotiation sync", account: "Zenith Health", owner: "Sofia Alvarez", date: "2026-07-19", time: "02:30 PM" },
];
