# AI BOS Production Packaging Preparation

This folder contains reviewable packaging configuration for the final Windows installers:

- `AI-BOS-Admin-Setup.exe`
- `AI-BOS-Employee-Setup.exe`

These files are preparation only. Do not treat a local build as Phase 26 release until Phase 25 runtime testing, signing, deployment validation, rollback validation, and installer testing are complete.

## Admin Installer

Config: `packaging/admin/electron-builder.json`

The Admin desktop app uses `electron/admin-main.cjs` and packages `admin/dist`. Owner and Administrator use this same Admin application; authorization differences remain controlled by backend RBAC after login. The Admin package does not include the Employee device agent service.

Build preparation command:

```bash
npm run package:admin:prepare
```

## Employee Installer

Config: `packaging/employee/electron-builder.json`

The Employee desktop app uses `electron/employee-main.cjs` and packages:

- `frontend/dist`
- `device-agent/dist`
- `device-agent/node_modules`
- `packaging/runtime/node.exe`
- `device-agent/service/AIBOSDeviceAgent.xml`
- `device-agent/service/AIBOSDeviceAgent.exe`
- `device-agent/service/AIBOSDeviceUpdater.xml`
- `device-agent/service/AIBOSDeviceUpdater.exe`
- `packaging/windows/session-helper-task.ps1`

The Employee package must not contain production `.env` files, `DEVICE_TOKEN`, `DEVICE_ENROLLMENT_KEY`, `SERVICE_API_KEY`, JWTs, or raw `aibos_device_*` credentials. Enrollment must happen through the existing secure device enrollment flow.

Fresh-device enrollment is supported without Employee UI login by staging a one-time bootstrap artifact at:

```text
C:\ProgramData\AI BOS\DeviceAgent\.bootstrap-enrollment.env
```

The file must contain `DEVICE_ENROLLMENT_KEY=<one-time-or-time-limited-bootstrap-key>`. The installer protects this file with SYSTEM and Administrators full control only, the Device Agent exchanges it for a unique `aibos_device_*` credential, stores that permanent credential in `C:\ProgramData\AI BOS\DeviceAgent\.env`, and deletes the bootstrap artifact after success. Do not place this bootstrap file under the application install directory or any normal-user-readable location.

The bundled Node runtime is launched with `--use-system-ca` for service and interactive Session Helper API calls. Production endpoints such as `https://ADMIN-WORKNAI:5443` must chain to a CA trusted by Windows LocalMachine/CurrentUser trust policy on target machines, or to a public CA.

### One-Time Device Enrollment Provisioning

The production provisioning flow is:

1. On the trusted Admin/Main PC, authenticate in the Admin app and save an Admin/Owner bearer token to a protected local file.
2. Generate a short-lived one-time enrollment package:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\packaging\windows\provisioning\New-AiBosDeviceEnrollmentPackage.ps1 `
  -ApiBaseUrl "https://ADMIN-WORKNAI:5443/api/v1" `
  -AccessTokenFile ".\admin-access-token.txt" `
  -OutputPath ".\aibos-device-enrollment-package.json" `
  -TtlMinutes 15
```

3. Transfer `aibos-device-enrollment-package.json` securely to the target Employee PC.
4. On the target Employee PC, run elevated PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-AiBosDeviceEnrollmentPackage.ps1 `
  -PackagePath ".\aibos-device-enrollment-package.json"
```

The target helper writes `C:\ProgramData\AI BOS\DeviceAgent\.bootstrap-enrollment.env`, removes inheritance, grants only SYSTEM and Administrators full control, and restarts/starts `AIBOSDeviceAgent` if it is installed. The Agent consumes the one-time bootstrap credential through `/api/v1/devices/enroll`, receives a unique permanent device credential, writes `C:\ProgramData\AI BOS\DeviceAgent\.env`, deletes the bootstrap artifact, registers, and starts heartbeats.

The package contains a one-time, short-lived enrollment credential, not a reusable service key. Do not email or chat the package; transfer it through an administrator-controlled channel and delete it after use or expiry.

Build preparation command:

```bash
npm run package:employee:prepare
```

## Signing

`electron-builder` signing is intentionally not enabled here. SHA-256 package integrity is not the same as publisher authenticity. Before release, wire a real code-signing certificate through CI/secret storage and sign:

- desktop EXEs
- service binaries
- installers
- update packages where applicable

Do not claim the software is signed until a real certificate is configured and verified.

## Updater Runtime Limits

Phase 22 automatic updates are scoped to the Device Agent mutable application payload. Major replacement of the bundled Node runtime or WinSW wrapper should remain installer-managed until a dedicated safe handoff is implemented and tested.

## Installer Notes

`packaging/windows/session-helper-task.ps1` contains the corrected elevated admin-role check and the required Session Helper task settings:

- `DisallowStartIfOnBatteries = False`
- `StopIfGoingOnBatteries = False`
- `StartWhenAvailable = True`
- `ExecutionTimeLimit = PT0S`

The production installer may require normal Windows UAC elevation. Do not add execution-policy bypasses, hidden persistence, arbitrary command execution, or security-tool exclusions.
