export type LeadStage = "New" | "Contacted" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";
export type CrmModule =
 | "leads"
 | "customers"
 | "companies"
 | "contacts"
 | "deals"
 | "opportunities"
 | "quotes"
 | "followUps"
 | "meetings";

export type CrmAttachment = {
 name: string;
 type: string;
 size: string;
};

export type CrmActivity = {
 id: string;
 title: string;
 detail: string;
 time: string;
};

export type Lead = {
 id: string;
 leadCode: string;
 name: string;
 company: string;
 email: string;
 phone: string;
 source: string;
 stage: LeadStage;
 value: number;
 salesperson: string;
 notes: string[];
 attachments: CrmAttachment[];
 activityTimeline: CrmActivity[];
 createdAt: string;
 nextFollowUp: string;
};

export type Customer = {
 id: string;
 name: string;
 company: string;
 email: string;
 revenue: number;
 owner: string;
 health: "Excellent" | "Good" | "At Risk";
};

export type Company = {
 id: string;
 name: string;
 industry: string;
 employees: number;
 revenue: number;
 owner: string;
};

export type Contact = {
 id: string;
 name: string;
 role: string;
 company: string;
 email: string;
 phone: string;
};

export type Deal = {
 id: string;
 name: string;
 company: string;
 stage: LeadStage;
 value: number;
 closeDate: string;
 owner: string;
};

export type Quote = {
 id: string;
 quoteNo: string;
 customer: string;
 amount: number;
 status: "Draft" | "Sent" | "Accepted" | "Rejected";
 validUntil: string;
};

export type FollowUp = {
 id: string;
 leadName: string;
 owner: string;
 date: string;
 channel: string;
 status: "Open" | "Done" | "Overdue";
};

export type CrmMeeting = {
 id: string;
 title: string;
 account: string;
 owner: string;
 time: string;
 date: string;
};

export type LeadFormInput = Pick<
 Lead,
 "name" | "company" | "email" | "phone" | "source" | "stage" | "value" | "salesperson" | "nextFollowUp"
> & {
 notes: string[];
 attachments: CrmAttachment[];
};
