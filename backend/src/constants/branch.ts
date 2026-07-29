export const branchTypes = ["Head Office", "Branch", "Warehouse", "Remote"] as const;

export type BranchType = (typeof branchTypes)[number];
