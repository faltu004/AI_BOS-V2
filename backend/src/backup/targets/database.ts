import mongoose from "mongoose";

/**
 * Mongoose excludes `select: false` fields (passwordHash, encrypted tokens,
 * etc.) from query results by default. A backup that silently drops those
 * required-but-hidden fields corrupts the collection on restore (insertMany
 * fails schema validation for the missing required field). Re-select every
 * hidden path explicitly, generically, per model — no hardcoded field names,
 * so this stays correct as new models/fields are added.
 */
export function selectHiddenFields(model: mongoose.Model<unknown>): string {
  const hiddenPaths: string[] = [];
  model.schema.eachPath((pathName, schemaType) => {
    if (schemaType.options?.select === false) hiddenPaths.push(`+${pathName}`);
  });
  return hiddenPaths.join(" ");
}

export const databaseBackupTarget = {
  key: "database" as const,
  label: "Database",

  async run(): Promise<Buffer> {
    const bundle: Record<string, unknown[]> = {};

    for (const modelName of mongoose.connection.modelNames()) {
      const model = mongoose.connection.models[modelName];
      const hiddenSelect = selectHiddenFields(model);
      bundle[modelName] = hiddenSelect ? await model.find({}).select(hiddenSelect).lean() : await model.find({}).lean();
    }

    return Buffer.from(JSON.stringify(bundle));
  },

  async restore(buffer: Buffer): Promise<{ summary: string }> {
    const bundle = JSON.parse(buffer.toString("utf8")) as Record<string, unknown[]>;
    const failures: string[] = [];
    let collectionsRestored = 0;
    let documentsRestored = 0;

    for (const [modelName, documents] of Object.entries(bundle)) {
      const model = mongoose.connection.models[modelName];
      if (!model) continue;

      await model.deleteMany({});
      if (documents.length === 0) {
        collectionsRestored += 1;
        continue;
      }

      try {
        const inserted = await model.insertMany(documents, { ordered: false });
        documentsRestored += inserted.length;
        if (inserted.length < documents.length) {
          failures.push(`${modelName}: only ${inserted.length}/${documents.length} restored`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "insert failed";
        failures.push(`${modelName}: ${message}`);
      }
      collectionsRestored += 1;
    }

    const summary = `Restored ${documentsRestored} documents across ${collectionsRestored} collections${
      failures.length ? ` (issues: ${failures.join("; ")})` : ""
    }`;
    return { summary };
  },
};
