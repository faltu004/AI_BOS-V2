import type { AuthRole } from "@shared/auth/types";

export type ProfileIdentity = {
 name: string;
 initials: string;
 title: string;
};

export const profileDirectory: Record<AuthRole, ProfileIdentity> = {
 Owner: {
 name: "Rajeev Khanna",
 initials: "RK",
 title: "Founder and Owner",
 },
 Administrator: {
 name: "Priya Sharma",
 initials: "PS",
 title: "Platform Administrator",
 },
 Manager: {
 name: "Rohan Kapoor",
 initials: "RK",
 title: "Delivery and Team Manager",
 },
 HR: {
 name: "Ananya Iyer",
 initials: "AI",
 title: "People Operations Lead",
 },
 Finance: {
 name: "Vikram Nair",
 initials: "VN",
 title: "Financial Planning and Analysis Lead",
 },
 Sales: {
 name: "Neha Reddy",
 initials: "NR",
 title: "Revenue Operations Lead",
 },
 Support: {
 name: "Karan Malhotra",
 initials: "KM",
 title: "Customer Success Lead",
 },
 Developer: {
 name: "Sneha Joshi",
 initials: "SJ",
 title: "Engineering and AI Systems Lead",
 },
 Employee: {
 name: "Aditya Rao",
 initials: "AR",
 title: "Employee Workspace User",
 },
 Guest: {
 name: "Meera Pillai",
 initials: "MP",
 title: "Restricted Access User",
 },
};

export function getProfileRole(role?: AuthRole): AuthRole {
 return role ?? "Employee";
}
