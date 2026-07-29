import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import type { AdminModule, AdminRecord } from "../admin.types";
import { formatAdminValue, parseAdminFieldValue } from "../admin.utils";

export function AdminRecordModal({
  module,
  onClose,
  onSubmit,
  record,
}: {
  module: AdminModule;
  onClose: () => void;
  onSubmit: (record: AdminRecord) => void;
  record: AdminRecord;
}) {
  const [form, setForm] = useState(record);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm">
      <motion.form
        animate={{ opacity: 1, scale: 1 }}
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border bg-background p-5 shadow-glass"
        initial={{ opacity: 0, scale: 0.96 }}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Manage {module.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
          </div>
          <Button onClick={onClose} type="button" variant="outline">
            Close
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {module.fields.map((field) => (
            <div className={field.type === "textarea" ? "space-y-2 md:col-span-2" : "space-y-2"} key={field.key}>
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.type === "select" ? (
                <select
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  id={field.key}
                  required={field.required}
                  value={String(form[field.key] ?? "")}
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                >
                  {field.options?.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  id={field.key}
                  required={field.required}
                  value={formatAdminValue(form[field.key])}
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                />
              ) : (
                <Input
                  id={field.key}
                  required={field.required}
                  type={field.type === "tags" ? "text" : field.type}
                  value={formatAdminValue(form[field.key])}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field.key]: parseAdminFieldValue(event.target.value, field.type),
                    }))
                  }
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </motion.form>
    </div>
  );
}
