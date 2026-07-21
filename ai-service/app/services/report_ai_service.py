from datetime import datetime
from typing import Any

from app.models.report_ai import (
    ReportFormat,
    ReportRequest,
    ReportResponse,
    ReportSection,
    ReportSectionType,
    ReportType,
    ScheduledReport,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ReportAIService:
    async def generate_report(self, request: ReportRequest) -> ReportResponse:
        logger.info("Generating %s report in %s format", request.report_type, request.format)
        
        sections = await self._build_sections(request.report_type, request.sections)
        ai_summary = await self._generate_ai_summary(request.report_type)
        recommendations = await self._generate_recommendations(request.report_type)
        insights = await self._generate_insights(request.report_type)
        
        report_id = f"report_{request.report_type.value}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        return ReportResponse(
            id=report_id,
            report_type=request.report_type.value,
            format=request.format.value,
            sections=sections,
            ai_summary=ai_summary,
            recommendations=recommendations,
            insights=insights,
            download_url=f"/reports/download/{report_id}",
        )

    async def _build_sections(self, report_type: ReportType, requested_sections: list[str]) -> list[ReportSection]:
        sections: list[ReportSection] = []
        
        if report_type == ReportType.finance:
            sections.extend(self._build_finance_sections(requested_sections))
        elif report_type == ReportType.projects:
            sections.extend(self._build_projects_sections(requested_sections))
        elif report_type == ReportType.crm:
            sections.extend(self._build_crm_sections(requested_sections))
        elif report_type == ReportType.employees:
            sections.extend(self._build_employees_sections(requested_sections))
        elif report_type == ReportType.meetings:
            sections.extend(self._build_meetings_sections(requested_sections))
        elif report_type == ReportType.customers:
            sections.extend(self._build_customers_sections(requested_sections))
        elif report_type == ReportType.business_performance:
            sections.extend(self._build_business_performance_sections(requested_sections))
        
        return sections

    def _build_finance_sections(self, requested_sections: list[str]) -> list[ReportSection]:
        sections: list[ReportSection] = []
        
        if not requested_sections or "revenue" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.chart,
                title="Revenue vs Expenses",
                data={
                    "type": "line",
                    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                    "datasets": [
                        {"label": "Revenue", "data": [45000, 52000, 48000, 61000, 55000, 67000]},
                        {"label": "Expenses", "data": [32000, 35000, 33000, 38000, 36000, 41000]},
                    ],
                },
                ai_insights="Revenue increased 15% QoQ with expenses growing at 8%. Profit margin improved from 28% to 32%.",
            ))
        
        if not requested_sections or "invoices" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.table,
                title="Invoice Status",
                data={
                    "headers": ["Invoice", "Customer", "Amount", "Status", "Due Date"],
                    "rows": [
                        ["INV-001", "Acme Corp", "$12,500", "Paid", "2026-07-15"],
                        ["INV-002", "TechStart Inc", "$8,200", "Pending", "2026-07-20"],
                        ["INV-003", "Global Ltd", "$15,800", "Overdue", "2026-07-10"],
                    ],
                },
                ai_insights="3 invoices overdue totaling $15,800. Follow up with Global Ltd immediately.",
            ))
        
        if not requested_sections or "budget" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.chart,
                title="Budget vs Actual",
                data={
                    "type": "bar",
                    "labels": ["Marketing", "Engineering", "Sales", "Operations"],
                    "datasets": [
                        {"label": "Allocated", "data": [50000, 120000, 80000, 60000]},
                        {"label": "Spent", "data": [45000, 115000, 72000, 58000]},
                    ],
                },
                ai_insights="Marketing underspent by 10%. Engineering is at 96% utilization.",
            ))
        
        return sections

    def _build_projects_sections(self, requested_sections: list[str]) -> list[ReportSection]:
        sections: list[ReportSection] = []
        
        if not requested_sections or "overview" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.chart,
                title="Project Status Overview",
                data={
                    "type": "pie",
                    "labels": ["Active", "Completed", "On Hold", "Delayed"],
                    "datasets": [{"data": [8, 12, 2, 1]}],
                },
                ai_insights="13 active projects, 12 completed this quarter. 1 project delayed due to resource constraints.",
            ))
        
        if not requested_sections or "budget" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.table,
                title="Project Budget Utilization",
                data={
                    "headers": ["Project", "Budget", "Spent", "Remaining", "Status"],
                    "rows": [
                        ["Website Redesign", "$50,000", "$45,000", "$5,000", "On Track"],
                        ["Mobile App", "$80,000", "$72,000", "$8,000", "At Risk"],
                        ["API Integration", "$30,000", "$28,000", "$2,000", "On Track"],
                    ],
                },
                ai_insights="Mobile App project at 90% utilization. Consider budget increase or scope reduction.",
            ))
        
        return sections

    def _build_crm_sections(self, requested_sections: list[str]) -> list[ReportSection]:
        sections: list[ReportSection] = []
        
        if not requested_sections or "pipeline" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.chart,
                title="Sales Pipeline",
                data={
                    "type": "bar",
                    "labels": ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won"],
                    "datasets": [{"label": "Leads", "data": [45, 32, 28, 15, 8, 12]}],
                },
                ai_insights="Conversion rate from Qualified to Won is 18%. Focus on proposal stage to improve closure.",
            ))
        
        if not requested_sections or "deals" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.table,
                title="Top Deals",
                data={
                    "headers": ["Deal", "Company", "Value", "Stage", "Close Date"],
                    "rows": [
                        ["Enterprise License", "Acme Corp", "$125,000", "Negotiation", "2026-08-15"],
                        ["Platform Upgrade", "TechStart", "$85,000", "Proposal", "2026-08-30"],
                        ["Annual Contract", "Global Ltd", "$200,000", "Won", "2026-07-01"],
                    ],
                },
                ai_insights="Pipeline value: $410K. Expected closure in Q3: $285K.",
            ))
        
        return sections

    def _build_employees_sections(self, requested_sections: list[str]) -> list[ReportSection]:
        sections: list[ReportSection] = []
        
        if not requested_sections or "headcount" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.chart,
                title="Headcount by Department",
                data={
                    "type": "bar",
                    "labels": ["Engineering", "Sales", "Marketing", "Operations", "HR"],
                    "datasets": [{"label": "Employees", "data": [45, 28, 15, 22, 8]}],
                },
                ai_insights="Engineering team grew 20% this quarter. Sales team at full capacity.",
            ))
        
        if not requested_sections or "attendance" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.table,
                title="Attendance Summary",
                data={
                    "headers": ["Department", "Present", "Absent", "On Leave", "Rate"],
                    "rows": [
                        ["Engineering", "42", "2", "1", "93.3%"],
                        ["Sales", "26", "1", "1", "92.8%"],
                        ["Marketing", "14", "0", "1", "93.3%"],
                    ],
                },
                ai_insights="Overall attendance rate: 93.2%. 5 employees on leave this week.",
            ))
        
        return sections

    def _build_meetings_sections(self, requested_sections: list[str]) -> list[ReportSection]:
        sections: list[ReportSection] = []
        
        if not requested_sections or "frequency" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.chart,
                title="Meeting Frequency",
                data={
                    "type": "bar",
                    "labels": ["Mon", "Tue", "Wed", "Thu", "Fri"],
                    "datasets": [{"label": "Meetings", "data": [8, 12, 10, 9, 6]}],
                },
                ai_insights="Peak meeting day: Tuesday (12 meetings). Consider reducing Wednesday meetings.",
            ))
        
        if not requested_sections or "action_items" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.table,
                title="Action Items Completion",
                data={
                    "headers": ["Meeting", "Action Items", "Completed", "Pending", "Rate"],
                    "rows": [
                        ["Q2 Review", "8", "7", "1", "87.5%"],
                        ["Product Sync", "5", "5", "0", "100%"],
                        ["Client Call", "3", "2", "1", "66.7%"],
                    ],
                },
                ai_insights="Overall action item completion rate: 85%. 3 items overdue.",
            ))
        
        return sections

    def _build_customers_sections(self, requested_sections: list[str]) -> list[ReportSection]:
        sections: list[ReportSection] = []
        
        if not requested_sections or "growth" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.chart,
                title="Customer Growth",
                data={
                    "type": "line",
                    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                    "datasets": [{"label": "Total Customers", "data": [120, 135, 148, 162, 178, 195]}],
                },
                ai_insights="Net growth: 75 customers (62.5% increase). Churn rate: 2.1%.",
            ))
        
        if not requested_sections or "revenue" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.table,
                title="Top Customers by Revenue",
                data={
                    "headers": ["Customer", "Revenue", "Health", "Trend"],
                    "rows": [
                        ["Acme Corp", "$125,000", "Excellent", "↑"],
                        ["TechStart Inc", "$95,000", "Good", "↑"],
                        ["Global Ltd", "$180,000", "Excellent", "→"],
                    ],
                },
                ai_insights="Top 3 customers contribute 45% of total revenue. Focus on retention.",
            ))
        
        return sections

    def _build_business_performance_sections(self, requested_sections: list[str]) -> list[ReportSection]:
        sections: list[ReportSection] = []
        
        if not requested_sections or "health" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.chart,
                title="Business Health Score",
                data={
                    "type": "gauge",
                    "value": 74,
                    "max": 100,
                    "label": "Overall Health",
                },
                ai_insights="Business health: Good (74/100). Strong revenue growth, needs expense control improvement.",
            ))
        
        if not requested_sections or "productivity" in requested_sections:
            sections.append(ReportSection(
                type=ReportSectionType.chart,
                title="Productivity Metrics",
                data={
                    "type": "radar",
                    "labels": ["Revenue", "Customer Satisfaction", "Employee Performance", "Project Delivery", "Innovation"],
                    "datasets": [{"label": "Current", "data": [85, 78, 82, 75, 70]}],
                },
                ai_insights="Revenue and employee performance are strong. Innovation and project delivery need attention.",
            ))
        
        return sections

    async def _generate_ai_summary(self, report_type: ReportType) -> str:
        summaries = {
            ReportType.finance: "Financial performance remains strong with 15% revenue growth. Expenses are well-controlled at 8% increase. Profit margins improved to 32%. 3 invoices overdue requiring immediate attention.",
            ReportType.projects: "13 active projects with 12 completed this quarter. Overall project health is good with 85% on-time delivery. Mobile App project needs attention at 90% budget utilization.",
            ReportType.crm: "Sales pipeline healthy with $410K value. Conversion rate improved to 18%. 12 deals won this quarter. Focus on proposal stage to improve closure rate.",
            ReportType.employees: "Total headcount: 118 employees across 5 departments. Attendance rate: 93.2%. Engineering team grew 20%. 5 employees on leave this week.",
            ReportType.meetings: "52 meetings this month with 85% action item completion. Tuesday is peak meeting day. Average meeting duration: 45 minutes. 3 action items overdue.",
            ReportType.customers: "195 total customers with 62.5% growth this quarter. Churn rate: 2.1%. Top 3 customers contribute 45% of revenue. Customer health: 78% Excellent/Good.",
            ReportType.business_performance: "Overall business health: Good (74/100). Strong revenue growth and employee performance. Areas for improvement: expense control, project delivery, and innovation.",
        }
        return summaries.get(report_type, "Report generated successfully.")

    async def _generate_recommendations(self, report_type: ReportType) -> list[str]:
        recommendations = {
            ReportType.finance: [
                "Follow up with Global Ltd on overdue invoice ($15,800)",
                "Reduce marketing spend by 10% and reallocate to engineering",
                "Implement automated invoice reminders to reduce overdue payments",
            ],
            ReportType.projects: [
                "Reallocate resources to Mobile App project to meet deadline",
                "Review and approve budget increase for delayed projects",
                "Implement weekly status reviews for at-risk projects",
            ],
            ReportType.crm: [
                "Focus on qualified leads in proposal stage to improve conversion",
                "Schedule follow-up with 8 leads in negotiation stage",
                "Implement lead scoring to prioritize high-value prospects",
            ],
            ReportType.employees: [
                "Review leave policy for Q4 to prevent burnout",
                "Consider hiring 2 additional engineers for growing team",
                "Implement flexible work hours to improve work-life balance",
            ],
            ReportType.meetings: [
                "Reduce meeting duration by 15% to improve productivity",
                "Schedule important meetings on Tuesday 10am for best attendance",
                "Implement meeting-free Wednesdays to focus on deep work",
            ],
            ReportType.customers: [
                "Focus on at-risk customers to reduce churn",
                "Implement customer success program for top 20 accounts",
                "Create referral program to leverage satisfied customers",
            ],
            ReportType.business_performance: [
                "Improve expense control to increase profit margins",
                "Invest in project management tools to improve delivery",
                "Allocate 10% of budget to R&D for innovation",
            ],
        }
        return recommendations.get(report_type, [])

    async def _generate_insights(self, report_type: ReportType) -> list[str]:
        insights = {
            ReportType.finance: [
                "Best performing month: March ($61K revenue)",
                "Marketing ROI: 3.2x (highest among departments)",
                "Tax liability estimated at $45K for Q2",
            ],
            ReportType.projects: [
                "Average project duration: 45 days",
                "Engineering projects have 92% on-time delivery rate",
                "Client projects average 15% over budget",
            ],
            ReportType.crm: [
                "Best performing channel: Referrals (28% conversion)",
                "Average deal size: $68K",
                "Sales cycle length: 45 days",
            ],
            ReportType.employees: [
                "Engineering has highest overtime: 12 hours/week average",
                "Employee satisfaction score: 4.2/5.0",
                "Average tenure: 2.5 years",
            ],
            ReportType.meetings: [
                "Best meeting time: Tuesday 10am (94% attendance)",
                "Average action items per meeting: 4.2",
                "Meeting satisfaction score: 3.8/5.0",
            ],
            ReportType.customers: [
                "Top customer: Acme Corp ($125K revenue)",
                "Customer acquisition cost: $1,250",
                "Customer lifetime value: $45,000",
            ],
            ReportType.business_performance: [
                "Strong growth projected for Q3: 20% revenue increase",
                "Employee productivity up 12% year-over-year",
                "Customer satisfaction at all-time high: 4.5/5.0",
            ],
        }
        return insights.get(report_type, [])

    async def export_report(self, report_id: str, format: ReportFormat) -> bytes:
        logger.info("Exporting report %s in %s format", report_id, format)
        
        if format == ReportFormat.pdf:
            return await self._export_pdf(report_id)
        elif format == ReportFormat.excel:
            return await self._export_excel(report_id)
        elif format == ReportFormat.word:
            return await self._export_word(report_id)
        else:
            raise ValueError(f"Unsupported format: {format}")

    async def _export_pdf(self, report_id: str) -> bytes:
        return b"PDF_PLACEHOLDER"

    async def _export_excel(self, report_id: str) -> bytes:
        return b"EXCEL_PLACEHOLDER"

    async def _export_word(self, report_id: str) -> bytes:
        return b"WORD_PLACEHOLDER"

    async def schedule_report(self, report_request: ReportRequest) -> ScheduledReport:
        logger.info("Scheduling %s report", report_request.report_type)
        
        report_id = f"sched_{report_request.report_type.value}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        return ScheduledReport(
            id=report_id,
            report_type=report_request.report_type,
            format=report_request.format,
            frequency=report_request.schedule or "weekly",
            recipients=report_request.recipients or [],
        )


report_ai_service = ReportAIService()