import { nanoid } from "nanoid";

export function generateProjectCode() {
  const year = new Date().getFullYear();
  return `PRJ-${year}-${nanoid(6).toUpperCase()}`;
}
