from datetime import datetime, timedelta
from typing import Any

from app.utils.logger import get_logger
from app.utils.responses import ApiResponse, success_response

logger = get_logger(__name__)


class AnalyticsService:
    async def predict(self, section: str, date_range: str = "12m", department: str | None = None, metric: str | None = None) -> dict[str, Any]:
        logger.info("Analytics prediction requested section=%s date_range=%s", section, date_range)

        months = 12 if date_range == "all" else int(date_range.replace("m", ""))
        now = datetime.utcnow()

        if section == "health-score":
            return {
                "section": "health-score",
                "data": {
                    "overall": 74,
                    "category": "good",
                    "summary": "Business health is stable with strong revenue growth. Watch expenses and project delivery risks.",
                    "subScores": [
                        {"label": "Revenue Growth", "score": 88, "maxScore": 100, "trend": "up", "severity": "success"},
                        {"label": "Expense Control", "score": 62, "maxScore": 100, "trend": "down", "severity": "warning"},
                        {"label": "Customer Retention", "score": 91, "maxScore": 100, "trend": "up", "severity": "success"},
                        {"label": "Employee Productivity", "score": 76, "maxScore": 100, "trend": "up", "severity": "success"},
                        {"label": "Project Delivery", "score": 68, "maxScore": 100, "trend": "down", "severity": "warning"},
                        {"label": "Cash Flow", "score": 72, "maxScore": 100, "trend": "stable", "severity": "warning"},
                        {"label": "Sales Pipeline", "score": 85, "maxScore": 100, "trend": "up", "severity": "success"},
                        {"label": "Profit Margin", "score": 70, "maxScore": 100, "trend": "stable", "severity": "warning"},
                    ],
                },
            }

        if section == "revenue":
            predictions = self._generate_prediction_data(months, 124000, 0.12, 0.04)
            current = predictions[-1]
            previous = predictions[-2] if len(predictions) > 1 else predictions[0]
            return {
                "section": "revenue",
                "data": {
                    "currentMonth": current.get("actual") or current.get("predicted") or 0,
                    "lastMonth": previous.get("actual") or previous.get("predicted") or 0,
                    "change": self._safe_change(current, previous),
                    "nextMonth": (current.get("predicted") or 0) * 1.08,
                    "quarterlyForecast": (current.get("predicted") or 0) * 3,
                    "predictions": predictions,
                },
            }

        if section == "expenses":
            predictions = self._generate_prediction_data(months, 112000, 0.08, 0.03)
            current = predictions[-1]
            previous = predictions[-2] if len(predictions) > 1 else predictions[0]
            return {
                "section": "expenses",
                "data": {
                    "currentMonth": current.get("actual") or current.get("predicted") or 0,
                    "lastMonth": previous.get("actual") or previous.get("predicted") or 0,
                    "change": self._safe_change(current, previous),
                    "projectedNextMonth": (current.get("predicted") or 0) * 1.07,
                    "topCategories": [
                        {"category": "Payroll", "amount": 98000, "percentage": 50.5},
                        {"category": "Infrastructure", "amount": 32000, "percentage": 16.5},
                        {"category": "Marketing", "amount": 28000, "percentage": 14.4},
                        {"category": "Operations", "amount": 22000, "percentage": 11.3},
                        {"category": "R&D", "amount": 14000, "percentage": 7.2},
                    ],
                    "predictions": predictions,
                },
            }

        if section == "sales":
            return {
                "section": "sales",
                "data": {
                    "pipeline": 1240000,
                    "won": 520000,
                    "expected": 890000,
                    "stages": [
                        {"stage": "Discovery", "value": 340000, "count": 18},
                        {"stage": "Qualified", "value": 480000, "count": 12},
                        {"stage": "Proposal", "value": 260000, "count": 8},
                        {"stage": "Negotiation", "value": 160000, "count": 5},
                    ],
                    "monthlyForecast": [
                        {"month": "Aug", "forecast": 267000, "lower": 210000, "upper": 320000},
                        {"month": "Sep", "forecast": 295000, "lower": 235000, "upper": 355000},
                        {"month": "Oct", "forecast": 320000, "lower": 255000, "upper": 385000},
                        {"month": "Nov", "forecast": 348000, "lower": 278000, "upper": 418000},
                        {"month": "Dec", "forecast": 380000, "lower": 305000, "upper": 455000},
                    ],
                },
            }

        if section == "productivity":
            departments = [
                {"department": "Engineering", "score": 82, "tasksCompleted": 142, "tasksAssigned": 168, "completionRate": 84.5, "trend": "up"},
                {"department": "Sales", "score": 79, "tasksCompleted": 98, "tasksAssigned": 124, "completionRate": 79.0, "trend": "up"},
                {"department": "Marketing", "score": 71, "tasksCompleted": 76, "tasksAssigned": 108, "completionRate": 70.4, "trend": "stable"},
                {"department": "Operations", "score": 74, "tasksCompleted": 64, "tasksAssigned": 86, "completionRate": 74.4, "trend": "up"},
                {"department": "Finance", "score": 68, "tasksCompleted": 48, "tasksAssigned": 70, "completionRate": 68.6, "trend": "down"},
                {"department": "HR", "score": 77, "tasksCompleted": 52, "tasksAssigned": 66, "completionRate": 78.8, "trend": "stable"},
            ]
            filtered = [d for d in departments if not department or department == "all" or d["department"] == department]
            overall = round(sum(d["score"] for d in filtered) / len(filtered)) if filtered else 0
            return {
                "section": "productivity",
                "data": {
                    "overall": overall,
                    "departments": filtered,
                    "monthlyData": [
                        {"month": "Jan", "departments": {"Engineering": 72, "Sales": 68, "Marketing": 65, "Operations": 70, "Finance": 64, "HR": 71}},
                        {"month": "Feb", "departments": {"Engineering": 74, "Sales": 70, "Marketing": 66, "Operations": 71, "Finance": 65, "HR": 72}},
                        {"month": "Mar", "departments": {"Engineering": 76, "Sales": 72, "Marketing": 68, "Operations": 72, "Finance": 66, "HR": 73}},
                        {"month": "Apr", "departments": {"Engineering": 78, "Sales": 74, "Marketing": 69, "Operations": 72, "Finance": 67, "HR": 74}},
                        {"month": "May", "departments": {"Engineering": 80, "Sales": 76, "Marketing": 70, "Operations": 73, "Finance": 68, "HR": 75}},
                        {"month": "Jun", "departments": {"Engineering": 81, "Sales": 78, "Marketing": 71, "Operations": 74, "Finance": 68, "HR": 76}},
                        {"month": "Jul", "departments": {"Engineering": 82, "Sales": 79, "Marketing": 71, "Operations": 74, "Finance": 68, "HR": 77}},
                    ],
                },
            }

        if section == "risks":
            return {
                "section": "risks",
                "data": [
                    {"projectId": "p-1", "projectName": "AI Sales Copilot", "riskScore": 42, "impact": 3, "likelihood": 2, "category": "technical", "status": "low", "description": "Core AI integration is progressing well with minor API latency issues."},
                    {"projectId": "p-2", "projectName": "Finance Automation", "riskScore": 58, "impact": 4, "likelihood": 3, "category": "schedule", "status": "medium", "description": "Integration with external banking APIs is behind schedule by 2 weeks."},
                    {"projectId": "p-3", "projectName": "Mobile Dashboard", "riskScore": 72, "impact": 4, "likelihood": 4, "category": "resource", "status": "high", "description": "Key mobile developer is leaving mid-sprint. Need replacement urgently."},
                    {"projectId": "p-4", "projectName": "Data Migration", "riskScore": 65, "impact": 5, "likelihood": 3, "category": "technical", "status": "high", "description": "Legacy data format incompatibility causing data loss in 3% of records."},
                    {"projectId": "p-5", "projectName": "Customer Portal", "riskScore": 35, "impact": 2, "likelihood": 3, "category": "external", "status": "low", "description": "Third-party design agency deliverables on track."},
                    {"projectId": "p-6", "projectName": "Compliance Update", "riskScore": 80, "impact": 5, "likelihood": 4, "category": "external", "status": "critical", "description": "New GDPR requirements may require architectural changes by Q1 deadline."},
                    {"projectId": "p-7", "projectName": "Marketing Site Redesign", "riskScore": 28, "impact": 2, "likelihood": 2, "category": "budget", "status": "low", "description": "Within budget and ahead of schedule."},
                    {"projectId": "p-8", "projectName": "API Gateway Migration", "riskScore": 55, "impact": 3, "likelihood": 4, "category": "technical", "status": "medium", "description": "Dependency on upstream team's timeline poses moderate risk."},
                ],
            }

        if section == "customers":
            return {
                "section": "customers",
                "data": {
                    "total": 1284,
                    "newThisMonth": 42,
                    "churned": 8,
                    "growthRate": 3.3,
                    "predictedNextMonth": 1320,
                    "monthlyData": [
                        {"month": "Jan", "total": 820, "new": 38, "churned": 6},
                        {"month": "Feb", "total": 870, "new": 56, "churned": 6},
                        {"month": "Mar", "total": 936, "new": 72, "churned": 6},
                        {"month": "Apr", "total": 1004, "new": 74, "churned": 6},
                        {"month": "May", "total": 1108, "new": 112, "churned": 8},
                        {"month": "Jun", "total": 1190, "new": 90, "churned": 8},
                        {"month": "Jul", "total": 1284, "new": 102, "churned": 8},
                    ],
                    "predictions": [
                        {"month": "Aug", "actual": None, "predicted": 1320, "upperBound": 1360, "lowerBound": 1280},
                        {"month": "Sep", "actual": None, "predicted": 1360, "upperBound": 1410, "lowerBound": 1310},
                        {"month": "Oct", "actual": None, "predicted": 1405, "upperBound": 1465, "lowerBound": 1345},
                        {"month": "Nov", "actual": None, "predicted": 1450, "upperBound": 1520, "lowerBound": 1380},
                        {"month": "Dec", "actual": None, "predicted": 1500, "upperBound": 1580, "lowerBound": 1420},
                    ],
                },
            }

        if section == "financial":
            return {
                "section": "financial",
                "data": {
                    "grossMargin": 72.4,
                    "netMargin": 18.2,
                    "burnRate": 194000,
                    "runwayMonths": 14,
                    "monthlyData": [
                        {"month": "Jan", "revenue": 124000, "expenses": 112000, "grossMargin": 68.2, "operatingExpenses": 32000, "netIncome": 12000},
                        {"month": "Feb", "revenue": 138000, "expenses": 121000, "grossMargin": 69.5, "operatingExpenses": 34000, "netIncome": 17000},
                        {"month": "Mar", "revenue": 152000, "expenses": 129000, "grossMargin": 70.1, "operatingExpenses": 35000, "netIncome": 23000},
                        {"month": "Apr", "revenue": 171000, "expenses": 138000, "grossMargin": 70.8, "operatingExpenses": 36000, "netIncome": 33000},
                        {"month": "May", "revenue": 188000, "expenses": 152000, "grossMargin": 71.5, "operatingExpenses": 38000, "netIncome": 36000},
                        {"month": "Jun", "revenue": 206000, "expenses": 176000, "grossMargin": 72.0, "operatingExpenses": 39000, "netIncome": 30000},
                        {"month": "Jul", "revenue": 267000, "expenses": 194000, "grossMargin": 72.4, "operatingExpenses": 42000, "netIncome": 73000},
                    ],
                },
            }

        return {
            "section": section,
            "data": {},
        }

    def _generate_prediction_data(self, months: int, base_value: int, growth_rate: float, noise: float):
        data = []
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        current_month = datetime.utcnow().month

        for i in range(months):
            month_index = (current_month - months + i + 12) % 12
            month_name = month_names[month_index]
            trend_factor = 1 + growth_rate * (i / months)
            seasonal_factor = 1 + 0.05 * ((i / months) * 2 * 3.14159)
            value = round(base_value * trend_factor * seasonal_factor)

            if i < months - 3:
                data.append({"month": month_name, "actual": value, "predicted": None})
            else:
                upper = round(value * (1 + noise))
                lower = round(value * (1 - noise))
                data.append({"month": month_name, "actual": None, "predicted": value, "upperBound": upper, "lowerBound": lower})

        return data

    def _safe_change(self, current: dict, previous: dict) -> float:
        current_value = current.get("actual") or current.get("predicted") or 0
        previous_value = previous.get("actual") or previous.get("predicted") or 0
        if previous_value == 0:
            return 0.0
        return round(((current_value / previous_value) - 1) * 100, 1)


analytics_service = AnalyticsService()