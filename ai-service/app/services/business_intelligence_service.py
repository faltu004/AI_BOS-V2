from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import UTC, date, datetime, timedelta
from statistics import mean
from typing import Any

from fastapi import status

from app.models.business_intelligence import (
    BIChart,
    BIChartSeries,
    BIInsight,
    BIMetric,
    BIQueryRequest,
    BIQueryResponse,
    BISource,
)
from app.services.backend_client import backend_client
from app.services.llm_gateway import llm_gateway
from app.utils.errors import AppError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class BusinessIntelligenceService:
    async def query(
        self,
        request: BIQueryRequest,
        authorization: str | None,
    ) -> BIQueryResponse:
        if not authorization:
            raise AppError(
                "Authorization is required",
                status.HTTP_401_UNAUTHORIZED,
                "AUTH_REQUIRED",
            )

        backend_snapshot = await self._load_backend_snapshot(
            authorization,
            request.include_backend_context,
        )
        snapshot = self._merge_snapshot(request.client_context, backend_snapshot)
        intent = self._detect_intent(request.question)
        analysis = self._analyze(intent, snapshot)
        answer = await self._build_answer(request.question, intent, analysis)

        return BIQueryResponse(
            answer=answer,
            intent=intent,
            metrics=analysis["metrics"],
            insights=analysis["insights"],
            charts=analysis["charts"],
            actions=analysis["actions"],
            sources=analysis["sources"],
            generated_at=datetime.now(UTC).isoformat(),
        )

    async def _load_backend_snapshot(self, authorization: str, enabled: bool) -> dict[str, Any]:
        if not enabled:
            return {}

        snapshot: dict[str, Any] = {}
        for key, loader in {
            "currentUser": backend_client.get_current_user,
            "projects": backend_client.get_projects,
            "projectStats": backend_client.get_project_stats,
            "users": backend_client.get_users,
        }.items():
            try:
                snapshot[key] = await loader(authorization)
            except Exception as exc:
                logger.warning("BI backend context unavailable key=%s error=%s", key, exc)
        return snapshot

    def _merge_snapshot(
        self,
        client_context: dict[str, Any],
        backend_snapshot: dict[str, Any],
    ) -> dict[str, Any]:
        snapshot = dict(client_context)
        backend_projects = self._response_items(backend_snapshot.get("projects"))
        backend_users = self._response_items(backend_snapshot.get("users"))
        project_stats = self._response_data(backend_snapshot.get("projectStats"))

        if backend_projects:
            snapshot["projects"] = backend_projects
        if backend_users:
            employees = self._module_dict(snapshot, "employees")
            employees["users"] = backend_users
            snapshot["employees"] = employees
        if project_stats:
            snapshot["projectStats"] = project_stats

        snapshot["backendConnected"] = bool(backend_snapshot)
        return snapshot

    def _analyze(self, intent: str, snapshot: dict[str, Any]) -> dict[str, Any]:
        builders = {
            "revenue_analysis": self._revenue_analysis,
            "expense_analysis": self._expense_analysis,
            "customer_insights": self._customer_insights,
            "project_health": self._project_health,
            "employee_productivity": self._employee_productivity,
            "sales_trends": self._sales_trends,
            "pending_work": self._pending_work,
            "upcoming_deadlines": self._upcoming_deadlines,
            "weekly_summary": self._weekly_summary,
        }
        return builders.get(intent, self._weekly_summary)(snapshot)

    def _revenue_analysis(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        finance = self._module_dict(snapshot, "finance")
        chart_data = self._module_list(finance, "chart")
        current = self._current_chart_point(chart_data)
        previous = self._previous_chart_point(chart_data, current)
        income = self._module_list(finance, "income")
        invoices = self._module_list(finance, "invoices")
        payments = self._module_list(finance, "payments")
        revenue = self._number(current.get("revenue")) if current else self._sum(income)
        prev_revenue = self._number(previous.get("revenue")) if previous else 0
        change = self._pct_change(revenue, prev_revenue)
        pending_revenue = self._sum(
            item for item in invoices if str(item.get("status")) in {"Sent", "Draft", "Overdue"}
        )
        completed_payments = self._sum(
            item for item in payments if str(item.get("status")) == "Completed"
        )

        return self._payload(
            metrics=[
                BIMetric(
                    label="This Month Revenue",
                    value=self._money(revenue),
                    change=change,
                    tone="success",
                    source="Finance",
                ),
                BIMetric(
                    label="Completed Payments",
                    value=self._money(completed_payments),
                    source="Payments",
                ),
                BIMetric(
                    label="Open Invoice Value",
                    value=self._money(pending_revenue),
                    tone="warning",
                    source="Invoices",
                ),
            ],
            insights=[
                BIInsight(
                    title="Revenue momentum",
                    detail=f"Current month revenue is {self._money(revenue)} with {change}.",
                    severity="success" if revenue >= prev_revenue else "warning",
                ),
                BIInsight(
                    title="Collection focus",
                    detail=f"{self._money(pending_revenue)} remains in sent or draft invoices.",
                    severity="warning" if pending_revenue else "success",
                ),
            ],
            charts=[
                self._finance_chart(chart_data, "Revenue Trend", ["revenue"]),
                self._record_bar_chart(income, "Income By Source", "title", "amount"),
            ],
            actions=[
                "Follow up on open invoices with Sent, Draft, or Overdue status.",
                "Compare top revenue sources against delivery capacity before forecasting.",
            ],
            sources=self._sources(snapshot, finance_count=len(income) + len(invoices)),
        )

    def _expense_analysis(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        finance = self._module_dict(snapshot, "finance")
        chart_data = self._module_list(finance, "chart")
        current = self._current_chart_point(chart_data)
        expenses = self._module_list(finance, "expenses")
        budgets = self._module_list(finance, "budgets")
        expense_total = self._number(current.get("expenses")) if current else self._sum(expenses)
        profit = self._number(current.get("profit")) if current else 0
        budget_spend = self._sum_value(budgets, "spent")
        budget_allocated = self._sum_value(budgets, "allocated")
        utilization = f"{self._percent(budget_spend, budget_allocated)}%"

        return self._payload(
            metrics=[
                BIMetric(
                    label="Monthly Expenses",
                    value=self._money(expense_total),
                    source="Finance",
                ),
                BIMetric(label="Monthly Profit", value=self._money(profit), tone="success"),
                BIMetric(label="Budget Utilization", value=utilization, tone="warning"),
            ],
            insights=[
                BIInsight(
                    title="Expense pressure",
                    detail=f"Expenses are {self._money(expense_total)} this month.",
                    severity="info",
                ),
                BIInsight(
                    title="Budget control",
                    detail=f"Teams have consumed {utilization} of allocated budgets.",
                    severity=(
                        "warning"
                        if self._percent(budget_spend, budget_allocated) > 75
                        else "success"
                    ),
                ),
            ],
            charts=[
                self._finance_chart(chart_data, "Revenue, Expenses And Profit", [
                    "revenue",
                    "expenses",
                    "profit",
                ]),
                self._record_bar_chart(budgets, "Budget Utilization", "department", "spent"),
            ],
            actions=[
                "Review departments above 75% budget utilization.",
                "Audit pending expense records before the next finance close.",
            ],
            sources=self._sources(snapshot, finance_count=len(expenses) + len(budgets)),
        )

    def _customer_insights(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        crm = self._module_dict(snapshot, "crm")
        customers = self._module_list(crm, "customers")
        leads = self._module_list(crm, "leads")
        deals = self._module_list(crm, "deals")
        at_risk = [item for item in customers if item.get("health") == "At Risk"]
        pipeline = self._sum_value(deals or leads, "value")
        won = len([item for item in leads if item.get("stage") == "Won"])
        conversion = self._percent(won, len(leads))
        stage_counts = Counter(str(item.get("stage", "Unknown")) for item in leads)

        return self._payload(
            metrics=[
                BIMetric(label="Customers", value=str(len(customers)), source="CRM"),
                BIMetric(label="Pipeline Value", value=self._money(pipeline), tone="success"),
                BIMetric(label="Conversion Rate", value=f"{conversion}%", tone="info"),
                BIMetric(label="At Risk Customers", value=str(len(at_risk)), tone="warning"),
            ],
            insights=[
                BIInsight(
                    title="Customer risk",
                    detail=self._names(at_risk, "company") or "No customers are marked At Risk.",
                    severity="warning" if at_risk else "success",
                ),
                BIInsight(
                    title="Pipeline concentration",
                    detail=f"Open pipeline is {self._money(pipeline)} across {len(deals)} deals.",
                    severity="info",
                ),
            ],
            charts=[
                self._counter_chart(stage_counts, "Lead Stage Distribution"),
                self._record_bar_chart(deals, "Deal Pipeline", "company", "value"),
            ],
            actions=[
                "Prioritize at-risk customers for executive check-ins.",
                "Move qualified and proposal-stage leads into scheduled follow-ups.",
            ],
            sources=self._sources(snapshot, crm_count=len(customers) + len(leads) + len(deals)),
        )

    def _project_health(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        projects = self._project_records(snapshot)
        delayed = self._delayed_projects(projects)
        active = [item for item in projects if item.get("status") == "Active"]
        completed = [item for item in projects if item.get("status") == "Completed"]
        avg_progress = int(mean([self._number(item.get("progress")) for item in projects] or [0]))
        status_counts = Counter(str(item.get("status", "Unknown")) for item in projects)

        return self._payload(
            metrics=[
                BIMetric(label="Total Projects", value=str(len(projects)), source="Projects"),
                BIMetric(label="Active Projects", value=str(len(active)), tone="info"),
                BIMetric(label="Delayed Projects", value=str(len(delayed)), tone="danger"),
                BIMetric(label="Avg Progress", value=f"{avg_progress}%", tone="success"),
            ],
            insights=[
                BIInsight(
                    title="Delayed work",
                    detail=self._names(delayed, "projectName") or "No delayed projects found.",
                    severity="danger" if delayed else "success",
                ),
                BIInsight(
                    title="Completion health",
                    detail=(
                        f"{len(completed)} projects are completed with "
                        f"{avg_progress}% average progress."
                    ),
                    severity="info",
                ),
            ],
            charts=[
                self._counter_chart(status_counts, "Project Status"),
                self._record_bar_chart(projects, "Project Progress", "projectName", "progress"),
            ],
            actions=[
                "Run a risk review for delayed or critical projects.",
                "Update deadlines for projects with low progress and near end dates.",
            ],
            sources=self._sources(snapshot, project_count=len(projects)),
        )

    def _employee_productivity(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        employees = self._module_dict(snapshot, "employees")
        people = (
            self._module_list(employees, "items")
            or self._module_list(employees, "employees")
            or self._module_list(employees, "users")
        )
        attendance = self._module_list(employees, "attendance")
        leave = self._module_list(employees, "leaveRequests")
        tasks = self._module_list(snapshot, "tasks")
        pending_by_user: dict[str, int] = defaultdict(int)
        for task in tasks:
            if task.get("status") != "Completed":
                pending_by_user[str(task.get("assignee", "Unassigned"))] += 1
        score = int(mean([self._number(item.get("performanceScore")) for item in people] or [0]))
        present = len([item for item in attendance if item.get("status") == "Present"])
        on_leave = len([item for item in leave if item.get("status") == "Approved"])

        return self._payload(
            metrics=[
                BIMetric(label="Employees", value=str(len(people)), source="Employees"),
                BIMetric(label="Avg Performance", value=f"{score}%", tone="success"),
                BIMetric(label="Present Today", value=str(present), tone="success"),
                BIMetric(label="Approved Leave", value=str(on_leave), tone="warning"),
            ],
            insights=[
                BIInsight(
                    title="Task load",
                    detail=self._format_counter(pending_by_user) or "No pending task load found.",
                    severity="info",
                ),
                BIInsight(
                    title="Performance baseline",
                    detail=f"Average employee performance score is {score}%.",
                    severity="success" if score >= 85 else "warning",
                ),
            ],
            charts=[
                self._record_bar_chart(people, "Employee Performance", "name", "performanceScore"),
                self._counter_chart(Counter(pending_by_user), "Pending Tasks By Assignee"),
            ],
            actions=[
                "Balance pending work for overloaded assignees.",
                "Review pending leave requests before weekly capacity planning.",
            ],
            sources=self._sources(snapshot, employee_count=len(people), task_count=len(tasks)),
        )

    def _sales_trends(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        analytics = self._module_list(snapshot, "analytics")
        crm = self._module_dict(snapshot, "crm")
        deals = self._module_list(crm, "deals")
        leads = self._module_list(crm, "leads")
        latest = analytics[-1] if analytics else {}
        previous = analytics[-2] if len(analytics) > 1 else {}
        sales = self._number(latest.get("sales"))
        previous_sales = self._number(previous.get("sales"))
        pipeline = self._sum_value(deals, "value")

        return self._payload(
            metrics=[
                BIMetric(
                    label="Monthly Sales",
                    value=str(int(sales)),
                    change=self._pct_change(sales, previous_sales),
                    tone="success",
                ),
                BIMetric(label="Pipeline", value=self._money(pipeline), source="CRM"),
                BIMetric(label="Open Leads", value=str(len(leads)), source="CRM"),
            ],
            insights=[
                BIInsight(
                    title="Sales trend",
                    detail=f"Sales moved from {int(previous_sales)} to {int(sales)} this month.",
                    severity="success" if sales >= previous_sales else "warning",
                )
            ],
            charts=[
                self._analytics_chart(analytics, "Sales Trend", ["sales", "customers"]),
                self._record_bar_chart(deals, "Deal Value By Account", "company", "value"),
            ],
            actions=[
                "Advance proposal and negotiation deals before month end.",
                "Schedule follow-ups for qualified leads with high deal value.",
            ],
            sources=self._sources(snapshot, crm_count=len(deals) + len(leads)),
        )

    def _pending_work(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        tasks = self._module_list(snapshot, "tasks")
        finance = self._module_dict(snapshot, "finance")
        employees = self._module_dict(snapshot, "employees")
        meetings = self._module_list(snapshot, "meetings")
        pending_tasks = [item for item in tasks if item.get("status") != "Completed"]
        review_tasks = [item for item in tasks if item.get("status") == "Review"]
        pending_leaves = [
            item for item in self._module_list(employees, "leaveRequests")
            if item.get("status") == "Pending"
        ]
        open_invoices = [
            item for item in self._module_list(finance, "invoices")
            if item.get("status") in {"Draft", "Sent", "Overdue"}
        ]
        action_items = self._open_meeting_actions(meetings)
        owners = Counter(
            [
                *[str(item.get("assignee", "Unassigned")) for item in review_tasks],
                *[str(item.get("approver", "Unassigned")) for item in pending_leaves],
                *[str(item.get("owner", "Unassigned")) for item in action_items],
            ]
        )

        return self._payload(
            metrics=[
                BIMetric(label="Pending Tasks", value=str(len(pending_tasks)), source="Tasks"),
                BIMetric(label="Review Tasks", value=str(len(review_tasks)), tone="warning"),
                BIMetric(label="Pending Leaves", value=str(len(pending_leaves)), tone="warning"),
                BIMetric(label="Open Invoices", value=str(len(open_invoices)), tone="warning"),
            ],
            insights=[
                BIInsight(
                    title="Pending approvals",
                    detail=self._format_counter(owners) or "No pending approval owners found.",
                    severity="warning" if owners else "success",
                ),
                BIInsight(
                    title="Open action items",
                    detail=f"{len(action_items)} meeting action items remain open.",
                    severity="warning" if action_items else "success",
                ),
            ],
            charts=[
                self._counter_chart(
                    Counter(str(item.get("status", "Unknown")) for item in pending_tasks),
                    "Pending Work By Status",
                ),
                self._counter_chart(owners, "Pending Approvals By Owner"),
            ],
            actions=[
                "Clear review-stage tasks before accepting new finance changes.",
                "Ask approvers with multiple pending items for same-day decisions.",
            ],
            sources=self._sources(
                snapshot,
                finance_count=len(open_invoices),
                task_count=len(tasks),
                employee_count=len(pending_leaves),
            ),
        )

    def _upcoming_deadlines(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        deadlines = self._deadline_items(snapshot)
        by_module = Counter(str(item["module"]) for item in deadlines)
        soon = deadlines[:8]

        return self._payload(
            metrics=[
                BIMetric(label="Upcoming Deadlines", value=str(len(deadlines)), tone="warning"),
                BIMetric(
                    label="Next 7 Days",
                    value=str(len([item for item in deadlines if item["days"] <= 7])),
                ),
            ],
            insights=[
                BIInsight(
                    title="Nearest deadlines",
                    detail="; ".join(f"{item['title']} ({item['date']})" for item in soon)
                    or "No deadlines in the next 30 days.",
                    severity="warning" if soon else "success",
                )
            ],
            charts=[
                self._counter_chart(by_module, "Deadlines By Module"),
                BIChart(
                    id="deadline-timeline",
                    title="Upcoming Deadline Timeline",
                    type="bar",
                    x_key="title",
                    data=[
                        {"title": item["title"], "days": item["days"], "module": item["module"]}
                        for item in soon
                    ],
                    series=[BIChartSeries(name="Days Away", data_key="days", color="warning")],
                ),
            ],
            actions=[
                "Move the nearest deadlines into the daily operating review.",
                "Assign explicit owners for every deadline inside the next 7 days.",
            ],
            sources=self._sources(snapshot, project_count=len(self._project_records(snapshot))),
        )

    def _weekly_summary(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        revenue = self._revenue_analysis(snapshot)
        expenses = self._expense_analysis(snapshot)
        projects = self._project_health(snapshot)
        pending = self._pending_work(snapshot)
        customers = self._customer_insights(snapshot)
        deadlines = self._upcoming_deadlines(snapshot)
        metrics = [
            revenue["metrics"][0],
            expenses["metrics"][0],
            projects["metrics"][2],
            pending["metrics"][0],
            customers["metrics"][1],
            deadlines["metrics"][0],
        ]
        insights = [
            revenue["insights"][0],
            projects["insights"][0],
            pending["insights"][0],
            customers["insights"][0],
        ]

        return self._payload(
            metrics=metrics,
            insights=insights,
            charts=[revenue["charts"][0], projects["charts"][0], pending["charts"][0]],
            actions=[
                "Resolve delayed project blockers before the next leadership meeting.",
                "Follow up on open invoices and high-value proposal-stage deals.",
                "Clear pending approvals owned by overloaded approvers.",
                "Publish a concise weekly summary to leadership and managers.",
            ],
            sources=self._sources(snapshot),
        )

    async def _build_answer(
        self,
        question: str,
        intent: str,
        analysis: dict[str, Any],
    ) -> str:
        evidence = {
            "intent": intent,
            "metrics": [item.model_dump() for item in analysis["metrics"]],
            "insights": [item.model_dump() for item in analysis["insights"]],
            "actions": analysis["actions"],
            "charts": [item.title for item in analysis["charts"]],
            "sources": [item.model_dump() for item in analysis["sources"]],
        }
        try:
            return await llm_gateway.complete(
                [
                    {
                        "role": "system",
                        "content": (
                            "You are the AI BOS Business Intelligence AI. "
                            "Answer as an executive analyst using only the provided evidence. "
                            "Be concise, mention chart availability, and avoid inventing data."
                        ),
                    },
                    {"role": "system", "content": json.dumps(evidence, default=str)},
                    {"role": "user", "content": question},
                ]
            )
        except Exception as exc:
            logger.warning("BI LLM narrative unavailable: %s", exc)
            return self._deterministic_answer(intent, analysis)

    def _deterministic_answer(self, intent: str, analysis: dict[str, Any]) -> str:
        metric_lines = [
            f"{metric.label}: {metric.value}{f' ({metric.change})' if metric.change else ''}"
            for metric in analysis["metrics"]
        ]
        insight_lines = [f"{item.title}: {item.detail}" for item in analysis["insights"]]
        action_lines = [f"Next: {action}" for action in analysis["actions"][:3]]
        chart_titles = ", ".join(chart.title for chart in analysis["charts"])
        return "\n".join(
            [
                f"Business intelligence result for {intent.replace('_', ' ')}.",
                "Key metrics: " + "; ".join(metric_lines),
                "Insights: " + "; ".join(insight_lines),
                "Charts: " + chart_titles,
                *action_lines,
            ]
        )

    def _detect_intent(self, question: str) -> str:
        text = question.lower()
        if "weekly" in text or "summary" in text or "summarize" in text:
            return "weekly_summary"
        if "expense" in text or "cost" in text or "profit" in text or "budget" in text:
            return "expense_analysis"
        if "customer" in text or "lead" in text or "deal" in text or "pipeline" in text:
            return "customer_insights"
        if "project" in text or "delayed" in text or "health" in text:
            return "project_health"
        if "employee" in text or "productivity" in text or "performance" in text:
            return "employee_productivity"
        if "sales" in text or "trend" in text:
            return "sales_trends"
        if "pending" in text or "approval" in text or "approver" in text:
            return "pending_work"
        if "deadline" in text or "upcoming" in text or "due" in text:
            return "upcoming_deadlines"
        if "revenue" in text or "month" in text:
            return "revenue_analysis"
        return "weekly_summary"

    def _project_records(self, snapshot: dict[str, Any]) -> list[dict[str, Any]]:
        return self._module_list(snapshot, "projects")

    def _delayed_projects(self, projects: list[dict[str, Any]]) -> list[dict[str, Any]]:
        today = self._today()
        delayed = []
        for project in projects:
            status_value = str(project.get("status", ""))
            end_date = self._date(project.get("endDate"))
            if status_value == "Delayed":
                delayed.append(project)
            elif end_date and end_date < today and status_value not in {"Completed", "Archived"}:
                delayed.append(project)
        return delayed

    def _deadline_items(self, snapshot: dict[str, Any]) -> list[dict[str, Any]]:
        today = self._today()
        limit = today + timedelta(days=30)
        items: list[dict[str, Any]] = []

        for project in self._project_records(snapshot):
            self._append_deadline(
                items,
                project,
                "Projects",
                "projectName",
                "endDate",
                today,
                limit,
            )
        for task in self._module_list(snapshot, "tasks"):
            if task.get("status") != "Completed":
                self._append_deadline(items, task, "Tasks", "title", "dueDate", today, limit)
        for meeting in self._module_list(snapshot, "meetings"):
            if meeting.get("status") != "Completed":
                self._append_deadline(items, meeting, "Meetings", "title", "date", today, limit)

        crm = self._module_dict(snapshot, "crm")
        for follow_up in self._module_list(crm, "followUps"):
            self._append_deadline(items, follow_up, "CRM", "leadName", "date", today, limit)
        finance = self._module_dict(snapshot, "finance")
        for invoice in self._module_list(finance, "invoices"):
            if invoice.get("status") != "Paid":
                self._append_deadline(
                    items,
                    invoice,
                    "Finance",
                    "invoiceNo",
                    "dueDate",
                    today,
                    limit,
                )

        return sorted(items, key=lambda item: item["days"])

    def _append_deadline(
        self,
        items: list[dict[str, Any]],
        record: dict[str, Any],
        module: str,
        title_key: str,
        date_key: str,
        today: date,
        limit: date,
    ) -> None:
        due = self._date(record.get(date_key))
        if due and today <= due <= limit:
            items.append(
                {
                    "title": str(record.get(title_key, "Untitled")),
                    "date": due.isoformat(),
                    "days": (due - today).days,
                    "module": module,
                }
            )

    def _open_meeting_actions(self, meetings: list[dict[str, Any]]) -> list[dict[str, Any]]:
        actions = []
        for meeting in meetings:
            for item in meeting.get("actionItems", []):
                if isinstance(item, dict) and not item.get("done"):
                    actions.append(item)
        return actions

    def _payload(
        self,
        metrics: list[BIMetric],
        insights: list[BIInsight],
        charts: list[BIChart],
        actions: list[str],
        sources: list[BISource],
    ) -> dict[str, Any]:
        return {
            "metrics": metrics,
            "insights": insights,
            "charts": [chart for chart in charts if chart.data],
            "actions": actions,
            "sources": sources,
        }

    def _finance_chart(
        self,
        data: list[dict[str, Any]],
        title: str,
        keys: list[str],
    ) -> BIChart:
        return BIChart(
            id=title.lower().replace(" ", "-"),
            title=title,
            type="area" if len(keys) == 1 else "line",
            x_key="label",
            data=data,
            series=[
                BIChartSeries(name=key.title(), data_key=key, color=self._color_for(key))
                for key in keys
            ],
        )

    def _analytics_chart(
        self,
        data: list[dict[str, Any]],
        title: str,
        keys: list[str],
    ) -> BIChart:
        return BIChart(
            id=title.lower().replace(" ", "-"),
            title=title,
            type="line",
            x_key="month",
            data=data,
            series=[
                BIChartSeries(name=key.title(), data_key=key, color=self._color_for(key))
                for key in keys
            ],
        )

    def _record_bar_chart(
        self,
        records: list[dict[str, Any]],
        title: str,
        label_key: str,
        value_key: str,
    ) -> BIChart:
        data = [
            {
                "label": str(item.get(label_key, "Unknown"))[:28],
                "value": self._number(item.get(value_key)),
            }
            for item in records[:8]
        ]
        return BIChart(
            id=title.lower().replace(" ", "-"),
            title=title,
            type="bar",
            x_key="label",
            data=data,
            series=[BIChartSeries(name=value_key.title(), data_key="value", color="primary")],
        )

    def _counter_chart(self, counter: Counter, title: str) -> BIChart:
        data = [{"label": key, "value": value} for key, value in counter.items()]
        return BIChart(
            id=title.lower().replace(" ", "-"),
            title=title,
            type="pie" if len(data) <= 5 else "bar",
            x_key="label",
            data=data,
            series=[BIChartSeries(name="Count", data_key="value", color="primary")],
        )

    def _sources(
        self,
        snapshot: dict[str, Any],
        finance_count: int | None = None,
        crm_count: int | None = None,
        project_count: int | None = None,
        employee_count: int | None = None,
        task_count: int | None = None,
    ) -> list[BISource]:
        finance = self._module_dict(snapshot, "finance")
        crm = self._module_dict(snapshot, "crm")
        employees = self._module_dict(snapshot, "employees")
        finance_default = sum(
            len(self._module_list(finance, key))
            for key in ["income", "expenses", "invoices", "payments", "budgets"]
        )
        crm_default = sum(
            len(self._module_list(crm, key))
            for key in ["leads", "customers", "companies", "deals", "followUps"]
        )
        employee_default = sum(
            len(self._module_list(employees, key))
            for key in ["employees", "users", "attendance", "leaveRequests"]
        )
        sources = [
            BISource(
                module="Finance",
                label="Finance records",
                record_count=finance_count if finance_count is not None else finance_default,
            ),
            BISource(
                module="CRM",
                label="Customer and pipeline records",
                record_count=crm_count if crm_count is not None else crm_default,
            ),
            BISource(
                module="Projects",
                label="Project records",
                record_count=(
                    project_count
                    if project_count is not None
                    else len(self._project_records(snapshot))
                ),
            ),
            BISource(
                module="Employees",
                label="Employee and attendance records",
                record_count=employee_count if employee_count is not None else employee_default,
            ),
            BISource(
                module="Tasks",
                label="Task records",
                record_count=(
                    task_count
                    if task_count is not None
                    else len(self._module_list(snapshot, "tasks"))
                ),
            ),
        ]
        return [source for source in sources if source.record_count > 0]

    def _current_chart_point(self, data: list[dict[str, Any]]) -> dict[str, Any]:
        if not data:
            return {}
        current_label = self._today().strftime("%b")
        return next((item for item in data if item.get("label") == current_label), data[-1])

    def _previous_chart_point(
        self,
        data: list[dict[str, Any]],
        current: dict[str, Any],
    ) -> dict[str, Any]:
        if not data or not current:
            return {}
        index = data.index(current)
        return data[index - 1] if index > 0 else {}

    def _response_data(self, response: Any) -> Any:
        if not isinstance(response, dict):
            return None
        return response.get("data", response)

    def _response_items(self, response: Any) -> list[dict[str, Any]]:
        data = self._response_data(response)
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        if isinstance(data, dict) and isinstance(data.get("items"), list):
            return [item for item in data["items"] if isinstance(item, dict)]
        return []

    def _module_dict(self, snapshot: dict[str, Any], key: str) -> dict[str, Any]:
        value = snapshot.get(key)
        return value if isinstance(value, dict) else {}

    def _module_list(self, source: dict[str, Any], key: str) -> list[dict[str, Any]]:
        value = source.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
        if isinstance(value, dict):
            return self._response_items(value)
        return []

    def _sum(self, records: Any) -> float:
        return sum(self._number(item.get("amount", item.get("total"))) for item in records)

    def _sum_value(self, records: list[dict[str, Any]], key: str) -> float:
        return sum(self._number(item.get(key)) for item in records)

    @staticmethod
    def _number(value: Any) -> float:
        try:
            return float(value or 0)
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _money(value: float) -> str:
        return f"${value:,.0f}"

    def _pct_change(self, current: float, previous: float) -> str:
        if previous <= 0:
            return "no previous baseline"
        change = ((current - previous) / previous) * 100
        prefix = "+" if change >= 0 else ""
        return f"{prefix}{change:.1f}% vs previous period"

    def _percent(self, numerator: float, denominator: float) -> int:
        if denominator <= 0:
            return 0
        return int(round((numerator / denominator) * 100))

    def _date(self, value: Any) -> date | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
        except ValueError:
            return None

    @staticmethod
    def _today() -> date:
        return datetime.now(UTC).date()

    @staticmethod
    def _names(records: list[dict[str, Any]], key: str) -> str:
        names = [str(item.get(key, "Unknown")) for item in records[:6]]
        return ", ".join(names)

    @staticmethod
    def _format_counter(counter: dict[str, int]) -> str:
        return ", ".join(f"{key}: {value}" for key, value in counter.items())

    @staticmethod
    def _color_for(key: str) -> str:
        return {
            "revenue": "primary",
            "expenses": "danger",
            "profit": "success",
            "sales": "warning",
            "customers": "primary",
        }.get(key, "primary")


business_intelligence_service = BusinessIntelligenceService()
