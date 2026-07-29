export const businessTypes = [
  "Private Limited",
  "Public Limited",
  "LLP",
  "Partnership",
  "Sole Proprietorship",
  "Non-Profit",
  "Government",
  "Other",
] as const;

export type BusinessType = (typeof businessTypes)[number];

export const organizationScope = "default";
