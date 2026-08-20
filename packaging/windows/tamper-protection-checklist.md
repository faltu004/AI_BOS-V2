# AI BOS Endpoint Tamper Protection Checklist

Production installer hardening should implement these controls before Phase 26:

- Install Employee endpoint components under an elevated, protected location.
- Run `AIBOSDeviceAgent` and `AIBOSDeviceUpdater` as LocalSystem services.
- Apply filesystem ACLs so ordinary users cannot modify service binaries, agent payload, updater payload, update data, or rollback state.
- Keep mutable update data under `C:\ProgramData\AI-BOS\DeviceAgent\UpdateData`.
- Keep updater service files under a persistent updater location such as `C:\ProgramData\AI-BOS\DeviceAgentUpdater` or a protected application install root.
- Require AI BOS authorization for sensitive stop, uninstall, decommission, credential rotation, and power actions.
- Record uninstall/decommission requests in audit history.
- Revoke per-device credentials during authorized decommission.
- Use a short-lived uninstall authorization token or equivalent admin approval flow.
- Do not attempt hidden persistence, security bypasses, antivirus exclusions, or claims that a Local Administrator cannot remove software.

Normal Windows UAC elevation is acceptable for installer and uninstaller flows.
