import test from "node:test";
import assert from "node:assert/strict";
import { cn } from "../../shared/src/lib/utils.ts";

test("cn merges conditional classes and resolves tailwind conflicts", () => {
  const className = cn("px-2", false && "hidden", "px-4", ["text-sm"]);

  assert.ok(className.includes("px-4"));
  assert.ok(className.includes("text-sm"));
  assert.equal(className.includes("px-2"), false);
});
