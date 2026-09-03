AI BOS V2 - MAIN PC RELEASE INSTRUCTIONS
========================================

This archive contains:
  backend-dist\
  AI-BOS-Admin-Setup-<version>.exe
  AI-BOS-Employee-Setup-<version>.exe
  setup-main-pc-from-zip.ps1
  README_INSTRUCTIONS.txt

IMPORTANT
---------
1. Extract the entire ZIP to a local folder on the Main PC.
2. Open Windows PowerShell as Administrator.
3. Run:
     Set-ExecutionPolicy -Scope Process Bypass
     .\setup-main-pc-from-zip.ps1
4. Do not run the script directly from inside the ZIP viewer.

The setup script stages the new backend, stops the "AI BOS Backend Server"
scheduled task, preserves the prior backend dist in a timestamped rollback
folder, activates the new dist, restarts the task, and retries the HTTPS health
check. It restores the prior backend automatically if activation, health check,
or the Admin installer fails.

The production D:\AI-BOS-Server\backend\.env file is never copied or replaced.
The script verifies that its SHA256 is unchanged when the file already exists.

The Admin installer is applied silently after the backend is healthy. The
Employee installer is included for distribution to employee PCs and is not
installed automatically on the Main PC.

Default health URL:
  https://ADMIN-WORKNAI:5443/health

If the production paths, task name, or health URL differ, inspect the script
parameters and pass the correct values explicitly before running it.
