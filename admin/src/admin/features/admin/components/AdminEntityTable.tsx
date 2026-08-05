import { Edit3, LockKeyhole, Trash2 } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import type { AdminModule, AdminRecord } from "../admin.types";
import { formatAdminValue } from "../admin.utils";

export function AdminEntityTable({
 module,
 onDelete,
 onEdit,
 records,
}: {
 module: AdminModule;
 onDelete: (record: AdminRecord) => void;
 onEdit: (record: AdminRecord) => void;
 records: AdminRecord[];
}) {
 return (
 <Card className="glass overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full min-w-[900px] text-sm">
 <thead className="border-b bg-muted text-left">
 <tr>
 {module.fields.map((field) => (
 <th className="p-4" key={field.key}>
 {field.label}
 </th>
 ))}
 <th className="p-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody>
 {records.map((record) => {
 const isProtectedEmployeeAccount = module.id === "employees" && record.isSystemAccount === true;
 return (
 <tr className="border-b" key={record.id}>
 {module.fields.map((field, index) => {
 const value = record[field.key];
 const isPasswordField = field.key === "password";
 const displayValue = isPasswordField && typeof value === "string" && value.length > 0 ? "••••••••" : value;
 return (
 <td className={index === 0 ? "p-4 font-semibold" : "p-4 text-muted-foreground"} key={field.key}>
 {isPasswordField && typeof value === "string" && value !== "••••••••" && value.length > 0 ? (
 <span className="flex items-center gap-1 text-amber-600 dark:text-amber-300">
 <LockKeyhole className="h-3 w-3" />
 {formatAdminValue(displayValue)}
 </span>
 ) : (
 formatAdminValue(displayValue)
 )}
 </td>
 );
 })}
 <td className="p-4">
 <div className="flex justify-end gap-2">
 {module.id !== "employees" && !isProtectedEmployeeAccount && (
 <Button onClick={() => onEdit(record)} size="sm" type="button" variant="outline">
 <Edit3 className="h-4 w-4" />
 Edit
 </Button>
 )}
 {!isProtectedEmployeeAccount && (
 <Button onClick={() => onDelete(record)} size="sm" type="button" variant="outline">
 <Trash2 className="h-4 w-4" />
 Delete
 </Button>
 )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </Card>
 );
}
