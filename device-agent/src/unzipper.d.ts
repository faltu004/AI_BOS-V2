declare module "unzipper" {
  import type {
    Readable,
    Transform,
  } from "node:stream";

  export interface Entry
    extends Readable {
    path: string;

    type:
      | "File"
      | "Directory";

    vars: {
      uncompressedSize?: number;
      compressedSize?: number;
      externalFileAttributes?: number;
    };

    autodrain():
      Readable;
  }

  export function Parse(
    options?: {
      forceStream?: boolean;
    },
  ):
    Transform &
    AsyncIterable<Entry>;
}
