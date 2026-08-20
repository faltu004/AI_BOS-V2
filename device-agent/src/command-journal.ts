import {
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";

import * as path from "node:path";

export type CommandJournalStatus =
  | "running"
  | "completed"
  | "failed";

export type CommandJournalEntry = {
  commandId: string;
  deviceId: string;
  type: string;

  status: CommandJournalStatus;

  result: unknown;
  errorMessage: string | null;

  updatedAt: string;
};

function getJournalRoot(): string {
  const programData =
    process.env.ProgramData
      ?.trim() ||
    "C:\\ProgramData";

  return path.join(
    programData,
    "AI-BOS",
    "DeviceAgent",
    "command-journal",
  );
}

function safeCommandId(
  commandId: string,
): string {
  return commandId.replace(
    /[^A-Za-z0-9._-]/g,
    "_",
  );
}

function getJournalPath(
  commandId: string,
): string {
  return path.join(
    getJournalRoot(),
    safeCommandId(
      commandId,
    ) + ".json",
  );
}

function isJournalStatus(
  value: unknown,
): value is CommandJournalStatus {
  return (
    value === "running" ||
    value === "completed" ||
    value === "failed"
  );
}

function parseJournalEntry(
  value: unknown,
): CommandJournalEntry | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;

  if (
    typeof record.commandId !== "string" ||
    typeof record.deviceId !== "string" ||
    typeof record.type !== "string" ||
    !isJournalStatus(
      record.status,
    ) ||
    typeof record.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    commandId:
      record.commandId,

    deviceId:
      record.deviceId,

    type:
      record.type,

    status:
      record.status,

    result:
      record.result ?? null,

    errorMessage:
      typeof record.errorMessage ===
      "string"
        ? record.errorMessage
        : null,

    updatedAt:
      record.updatedAt,
  };
}

export async function writeCommandJournal(
  entry: CommandJournalEntry,
): Promise<void> {
  const root =
    getJournalRoot();

  await mkdir(
    root,
    {
      recursive: true,
    },
  );

  await writeFile(
    getJournalPath(
      entry.commandId,
    ),
    JSON.stringify(
      entry,
      null,
      2,
    ),
    {
      encoding: "utf8",
    },
  );
}

export async function readCommandJournalEntries():
  Promise<CommandJournalEntry[]> {
  const root =
    getJournalRoot();

  await mkdir(
    root,
    {
      recursive: true,
    },
  );

  const files =
    await readdir(
      root,
      {
        withFileTypes: true,
      },
    );

  const entries:
    CommandJournalEntry[] = [];

  for (
    const file of files
  ) {
    if (
      !file.isFile() ||
      !file.name.endsWith(
        ".json",
      )
    ) {
      continue;
    }

    const filePath =
      path.join(
        root,
        file.name,
      );

    try {
      const content =
        await readFile(
          filePath,
          "utf8",
        );

      const parsed =
        parseJournalEntry(
          JSON.parse(
            content,
          ),
        );

      if (parsed) {
        entries.push(
          parsed,
        );
      }
    } catch (
      error
    ) {
      console.error(
        "[Command] Unable to read journal file:",
        filePath,
        error,
      );
    }
  }

  return entries;
}

export async function deleteCommandJournal(
  commandId: string,
): Promise<void> {
  await rm(
    getJournalPath(
      commandId,
    ),
    {
      force: true,
    },
  );
}
