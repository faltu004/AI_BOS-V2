import {
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";

import {
  createWriteStream,
  type WriteStream,
} from "node:fs";

import path from "node:path";
import { Writable } from "node:stream";

export type RotatingLogWriterOptions = {
  directory: string;
  fileName: string;
  maxSizeBytes: number;
  maxFiles: number;
};

/*
 * Size-based rotating writer with no external dependency. When the
 * active log file reaches maxSizeBytes, it is renamed to
 * "<fileName>.1", the previous "<fileName>.1" becomes "<fileName>.2",
 * and so on. Files beyond maxFiles are deleted. This never blocks
 * pino's write path on a rotation check that requires an async stat;
 * size is tracked in-memory and only reconciled against disk at
 * startup, so rotation itself is a synchronous, best-effort operation
 * that never throws into the logging path.
 */
export class RotatingLogWriter extends Writable {
  private readonly filePath: string;
  private readonly options: RotatingLogWriterOptions;
  private stream: WriteStream;
  private currentSizeBytes: number;

  constructor(options: RotatingLogWriterOptions) {
    super();

    this.options = options;

    if (!existsSync(options.directory)) {
      mkdirSync(options.directory, { recursive: true });
    }

    this.filePath = path.join(options.directory, options.fileName);

    this.currentSizeBytes = existsSync(this.filePath)
      ? statSync(this.filePath).size
      : 0;

    this.stream = createWriteStream(this.filePath, { flags: "a" });
  }

  private rotatedPath(index: number): string {
    return this.filePath + "." + index;
  }

  private rotateIfNeeded(): void {
    if (this.currentSizeBytes < this.options.maxSizeBytes) {
      return;
    }

    try {
      this.stream.end();

      for (
        let index = this.options.maxFiles - 1;
        index >= 1;
        index -= 1
      ) {
        const source = this.rotatedPath(index);
        const destination = this.rotatedPath(index + 1);

        if (existsSync(source)) {
          if (index + 1 > this.options.maxFiles) {
            unlinkSync(source);
          } else {
            renameSync(source, destination);
          }
        }
      }

      if (existsSync(this.filePath)) {
        renameSync(this.filePath, this.rotatedPath(1));
      }

      this.stream = createWriteStream(this.filePath, {
        flags: "a",
      });

      this.currentSizeBytes = 0;
    } catch (error) {
      /*
       * Rotation failure must never crash the process or stop
       * logging. Fall back to continuing to write to the existing
       * stream/file.
       */
      console.error(
        "[logging] Rotation failed, continuing without rotation:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    const bytes = Buffer.isBuffer(chunk)
      ? chunk.length
      : Buffer.byteLength(chunk);

    this.stream.write(chunk, (error) => {
      if (error) {
        callback(error);
        return;
      }

      this.currentSizeBytes += bytes;
      this.rotateIfNeeded();
      callback();
    });
  }

  override _final(callback: (error?: Error | null) => void): void {
    this.stream.end(callback);
  }
}

export function createRotatingLogWriter(
  options: RotatingLogWriterOptions,
): RotatingLogWriter {
  return new RotatingLogWriter(options);
}
