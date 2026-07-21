import { env } from "../config/env.js";
import { connectDatabase, disconnectDatabase } from "./mongo.js";
import { UserModel } from "../models/user.model.js";
import { ProjectModel } from "../models/project.model.js";
import { hashPassword } from "../utils/password.js";
import { logger } from "../utils/logger.js";
import type { UserRole } from "../constants/roles.js";

type SeedUser = {
  fullName: string;
  companyName: string;
  email: string;
  role: UserRole;
};

const seedUsers: SeedUser[] = [
  {
    fullName: "System Admin",
    companyName: "AI Business Operating System",
    email: "admin@aibos.company",
    role: "Admin",
  },
  {
    fullName: "Chief Executive",
    companyName: "AI Business Operating System",
    email: "ceo@aibos.company",
    role: "CEO",
  },
  {
    fullName: "Operations Manager",
    companyName: "AI Business Operating System",
    email: "manager@aibos.company",
    role: "Manager",
  },
  {
    fullName: "HR Lead",
    companyName: "AI Business Operating System",
    email: "hr@aibos.company",
    role: "HR",
  },
  {
    fullName: "Team Employee",
    companyName: "AI Business Operating System",
    email: "employee@aibos.company",
    role: "Employee",
  },
];

const seedProjects = [
  {
    projectName: "AI Sales Copilot",
    projectCode: "PRJ-2026-SALES",
    description: "AI assistant workflow for CRM follow-ups and pipeline summaries.",
    category: "Automation",
    priority: "High",
    status: "Active",
    progress: 82,
    startDate: new Date("2026-07-01"),
    endDate: new Date("2026-08-12"),
    budget: 120000,
    estimatedHours: 640,
    client: "Internal",
    teamMembers: ["Sofia Alvarez", "Noah Brooks"],
    projectManager: "Operations Manager",
    attachments: [],
    notes: "Focus on CRM integration and executive summary prompts.",
    tags: ["ai", "crm", "automation"],
    isArchived: false,
  },
  {
    projectName: "Finance Automation",
    projectCode: "PRJ-2026-FIN",
    description: "Approval workflows for expenses, invoices, and operating reports.",
    category: "Operations",
    priority: "Critical",
    status: "Delayed",
    progress: 64,
    startDate: new Date("2026-06-20"),
    endDate: new Date("2026-08-18"),
    budget: 185000,
    estimatedHours: 920,
    client: "Internal",
    teamMembers: ["Maya Chen", "Arjun Mehta"],
    projectManager: "Chief Executive",
    attachments: [],
    notes: "Review vendor reconciliation rules.",
    tags: ["finance", "workflow"],
    isArchived: false,
  },
] as const;

async function seedDatabase() {
  await connectDatabase();

  const passwordHash = await hashPassword("Admin@12345");

  for (const user of seedUsers) {
    await UserModel.updateOne(
      { email: user.email },
      {
        $setOnInsert: {
          ...user,
          passwordHash,
          isEmailVerified: true,
          isActive: true,
        },
      },
      { upsert: true },
    );
  }

  for (const project of seedProjects) {
    await ProjectModel.updateOne(
      { projectCode: project.projectCode },
      { $setOnInsert: project },
      { upsert: true },
    );
  }

  logger.info(`Seeded ${seedUsers.length} users and ${seedProjects.length} projects into ${env.MONGODB_URI}`);
  await disconnectDatabase();
}

void seedDatabase()
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger.error(error);
    await disconnectDatabase();
    process.exit(1);
  });
