import type { Types } from "mongoose";
import { companyPolicyRepository } from "../repositories/company-policy.repository.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { notificationService } from "./notification.service.js";
import { AppError } from "../utils/app-error.js";
import type {
  CreateCompanyPolicyInput,
  ListCompanyPoliciesQuery,
  UpdateCompanyPolicyInput,
} from "../validation/company-policy.validation.js";

async function resolveOrganizationId(): Promise<Types.ObjectId> {
  const organization = await organizationRepository.getOrCreateDefault();
  return organization._id as Types.ObjectId;
}

export class CompanyPolicyService {
  async create(input: CreateCompanyPolicyInput, userId?: string) {
    const organizationId = await resolveOrganizationId();

    return companyPolicyRepository.create({
      ...input,
      organizationId,
      version: 1,
      createdBy: userId as unknown as Types.ObjectId,
      updatedBy: userId as unknown as Types.ObjectId,
    });
  }

  async list(query: ListCompanyPoliciesQuery) {
    const organizationId = await resolveOrganizationId();
    return companyPolicyRepository.list(organizationId, query);
  }

  async listPublished(query: ListCompanyPoliciesQuery) {
    const organizationId = await resolveOrganizationId();
    return companyPolicyRepository.listPublished(organizationId, query);
  }

  async getById(id: string) {
    const policy = await companyPolicyRepository.findById(id);
    if (!policy) {
      throw new AppError("Company policy not found", 404);
    }
    return policy;
  }

  async update(id: string, input: UpdateCompanyPolicyInput, userId?: string) {
    const existing = await companyPolicyRepository.findById(id);
    if (!existing) {
      throw new AppError("Company policy not found", 404);
    }

    const versionBump =
      input.content && input.content !== existing.content ? existing.version + 1 : existing.version;

    const policy = await companyPolicyRepository.update(id, {
      ...input,
      version: versionBump,
      updatedBy: userId,
    });
    if (!policy) {
      throw new AppError("Company policy not found", 404);
    }
    return policy;
  }

  async publish(id: string, userId?: string) {
    const policy = await companyPolicyRepository.update(id, { status: "Published", updatedBy: userId });
    if (!policy) {
      throw new AppError("Company policy not found", 404);
    }

    const organizationId = await resolveOrganizationId();
    const orgUsers = await userRepository.listByOrganization(organizationId.toString());
    const recipientUserIds = orgUsers
      .map((user) => (user._id as Types.ObjectId).toString())
      .filter((recipientId) => recipientId !== userId);

    if (recipientUserIds.length > 0) {
      void notificationService.dispatch({
        recipientUserIds,
        type: "policy_published",
        category: "approval",
        priority: "Medium",
        title: `Policy published: ${policy.title}`,
        body: policy.acknowledgementRequired
          ? "This policy requires your acknowledgement."
          : "A new company policy is now in effect.",
        actorUserId: userId,
        sourceType: "company_policy",
        sourceId: id,
        actionUrl: "/organization",
      });
    }

    return policy;
  }

  async delete(id: string) {
    const policy = await companyPolicyRepository.delete(id);
    if (!policy) {
      throw new AppError("Company policy not found", 404);
    }
    return { deleted: true };
  }
}

export const companyPolicyService = new CompanyPolicyService();
