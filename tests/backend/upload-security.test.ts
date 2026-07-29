import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

test("upload service accepts matching PNG magic bytes", async () => {
  const { uploadService } = await import("../../backend/src/services/upload.service.ts");
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

  const file = uploadService.prepareSingleFile({
    fieldname: "file",
    originalname: "profile image.png",
    mimetype: "image/png",
    size: png.length,
    buffer: png,
  } as Express.Multer.File);

  assert.equal(file.originalName, "profile_image.png");
  assert.equal(file.mimeType, "image/png");
});

test("upload service rejects MIME spoofing", async () => {
  const { uploadService } = await import("../../backend/src/services/upload.service.ts");

  assert.throws(
    () =>
      uploadService.prepareSingleFile({
        fieldname: "file",
        originalname: "invoice.pdf",
        mimetype: "application/pdf",
        size: 11,
        buffer: Buffer.from("not-a-pdf"),
      } as Express.Multer.File),
    /does not match/,
  );
});
