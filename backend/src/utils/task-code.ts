import { nanoid } from "nanoid";

export function generateTaskCode() {
  const year = new Date().getFullYear();
  return `TSK-${year}-${nanoid(6).toUpperCase()}`;
}
