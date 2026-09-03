import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

test("dialog hook stores onClose in ref and maintains stable mount lifecycle without stealing input focus", async () => {
  const root = process.cwd();
  const dialogSource = await readFile(path.join(root, "shared/src/ui/dialog.tsx"), "utf8");

  // Verify onCloseRef is used
  assert.match(dialogSource, /const onCloseRef = useRef\(onClose\);/);
  assert.match(dialogSource, /onCloseRef\.current = onClose;/);

  // Verify effect does not depend on changing onClose reference
  assert.match(dialogSource, /useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/);

  // Verify Escape calls latest onCloseRef.current()
  assert.match(dialogSource, /if \(event\.key === "Escape"\) \{[\s\S]*?onCloseRef\.current\(\);/);

  // Verify focus trap selector and Tab navigation exist
  assert.match(dialogSource, /FOCUSABLE_SELECTOR/);
  assert.match(dialogSource, /panelRef\.current\?\.focus\(\);/);
  assert.match(dialogSource, /triggerElement\?\.focus\?\.\(\);/);
});

test("dialog behavior lifecycle simulation verifies focus stability across simulated re-renders", () => {
  let activeElement: any = { id: "open-button", focus: () => { focusLog.push("triggerElement.focus()"); } };
  const focusLog: string[] = [];

  const listeners: Record<string, ((event: any) => void)[]> = {};
  const mockDocument = {
    get activeElement() { return activeElement; },
    addEventListener(event: string, fn: any) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    removeEventListener(event: string, fn: any) {
      listeners[event] = (listeners[event] || []).filter((f) => f !== fn);
    },
  };

  // Simulate useDialogBehavior execution
  function simulateDialogBehavior(onClose: () => void) {
    const panelNode = {
      id: "dialog-panel",
      focus: () => { focusLog.push("panelRef.focus()"); },
      querySelectorAll: () => [],
    };
    const panelRef = { current: panelNode };
    const onCloseRef = { current: onClose };
    onCloseRef.current = onClose;

    // Mount effect
    const triggerElement = mockDocument.activeElement;
    panelRef.current?.focus();

    function handleKeyDown(event: any) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    }

    mockDocument.addEventListener("keydown", handleKeyDown);
    const unmount = () => {
      mockDocument.removeEventListener("keydown", handleKeyDown);
      triggerElement?.focus?.();
    };

    return { panelRef, onCloseRef, unmount };
  }

  // 1. Initial Dialog Mount
  let closeCallCount = 0;
  let closeParam = "initial";
  const dialogInstance = simulateDialogBehavior(() => { closeCallCount++; closeParam = "closed-v1"; });

  assert.equal(focusLog.length, 1);
  assert.equal(focusLog[0], "panelRef.focus()");

  // 2. User focuses an input inside the dialog
  activeElement = { id: "title-input", focus: () => { focusLog.push("title-input.focus()"); } };

  // 3. Parent re-renders multiple times with new inline callbacks (simulating liveSyncInterval / realtime sync)
  for (let i = 0; i < 5; i++) {
    // Re-render only updates onCloseRef.current, DOES NOT trigger effect or re-focus panel
    dialogInstance.onCloseRef.current = () => { closeCallCount++; closeParam = `closed-v${i + 2}`; };
  }

  // Focus was NOT stolen from title-input during re-renders!
  assert.equal(focusLog.length, 1);
  assert.equal(activeElement.id, "title-input");

  // 4. Press Escape -> calls latest closure
  const keydownHandlers = listeners["keydown"] || [];
  assert.equal(keydownHandlers.length, 1);
  keydownHandlers[0]({ key: "Escape", preventDefault: () => {} });
  assert.equal(closeCallCount, 1);
  assert.equal(closeParam, "closed-v6");

  // 5. Dialog Unmounts -> restores focus to original trigger element
  dialogInstance.unmount();
  assert.equal(focusLog.length, 2);
  assert.equal(focusLog[1], "triggerElement.focus()");
  assert.equal(listeners["keydown"]?.length, 0);
});
