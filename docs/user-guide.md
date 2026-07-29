# User Guide

## Portal Selection

AI BOS has separate portals by responsibility:

- Employee, HR, Sales: main frontend portal.
- Manager/Admin: admin portal.
- CEO: CEO portal.

Your role determines what dashboards, modules, actions, and records are visible.

## Login

1. Open the portal assigned to your role.
2. Enter email, password, and role.
3. Use the CEO portal for CEO login only.
4. Admin and manager login pages do not show CEO as a selectable role.

## Dashboards

Dashboards provide:

- KPIs and business health cards.
- Navigation to modules.
- Priority queues.
- Recent activity.
- AI suggestions and quick actions.

Different roles see different dashboards and permissions.

## Common Modules

- Dashboard: operational overview.
- Profile: personal and role-aware profile data.
- Tasks: task tracking and follow-up.
- Documents/Knowledge: document and RAG workflows where enabled.
- Meetings: meeting records, AI summaries, action items.
- Copilot: AI assistance.

## HR Modules

- Employees: employee records, status, departments, and HR workflows.

## Sales Modules

- CRM: customers, leads, opportunities.
- Finance: revenue, invoices, payments.
- Products: sales/product catalog.

## Manager Modules

- Projects: project lifecycle and details.
- Workflows: automation templates and execution.
- Tasks: team task management.
- Meetings: team meetings and AI outputs.
- Employees: team visibility.

## CEO Modules

- Executive dashboard.
- Business intelligence.
- Analytics.
- Consultant reports.
- Finance.
- Projects and workflows.
- Multi-agent AI.
- Memory.
- Executive access to admin/CRM/documents/employees/integrations/knowledge/products/settings/tasks.

## AI Assistant

The AI assistant can:

- Summarize priorities.
- Review business context.
- Generate plans and reports.
- Use permitted backend and RAG context when authenticated.

Do not paste secrets, passwords, private API keys, or regulated data unless your company policy allows it.

## Accessibility

The UI includes:

- Keyboard focus states.
- Dialog semantics.
- ARIA labels for key controls.
- Reduced-motion support.
- Responsive layouts.

## Troubleshooting

- If access is denied, confirm you are in the correct portal and selected the correct role.
- If data does not load, confirm the backend is running and your session is valid.
- If AI does not respond, confirm the AI service is running and provider keys are configured.
