import { Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
          <thead className="border-b bg-muted/40 text-left">
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
            {records.map((record) => (
              <tr className="border-b" key={record.id}>
                {module.fields.map((field, index) => (
                  <td className={index === 0 ? "p-4 font-semibold" : "p-4 text-muted-foreground"} key={field.key}>
                    {formatAdminValue(record[field.key])}
                  </td>
                ))}
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => onEdit(record)} size="sm" type="button" variant="outline">
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button onClick={() => onDelete(record)} size="sm" type="button" variant="outline">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
