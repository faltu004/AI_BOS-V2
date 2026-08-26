# AI BOS — Cloudflare Zero Trust Tunnel Setup Guide (Hybrid LAN & Remote Work)

This guide provides step-by-step instructions to configure Cloudflare Zero Trust Tunnel (`cloudflared`) on the Main PC server. This allows remote employees to securely access the AI BOS backend and web apps from outside the office without opening router ports or exposing static public IP addresses.

---

## 1. Prerequisites

- **Main PC Server**: Windows PC running AI BOS backend (port 5000), Admin App (port 8081), and Employee App (port 8080).
- **Domain Name**: Any domain configured on Cloudflare DNS (e.g. `yourcompany.com`).
- **Cloudflare Account**: Free Cloudflare Zero Trust account.

---

## 2. Install `cloudflared` on Main PC

1. Download the latest `cloudflared` Windows binary from Cloudflare:
   [https://github.com/cloudflare/cloudflared/releases](https://github.com/cloudflare/cloudflared/releases)
2. Place `cloudflared.exe` in `C:\Program Files\cloudflared\` (or add to System PATH).

---

## 3. Create & Configure Tunnel

### Step A: Login to Cloudflare
Open PowerShell as Administrator on the Main PC:
```powershell
cloudflared tunnel login
```
A browser window will open. Select your domain to authorize.

### Step B: Create Tunnel
```powershell
cloudflared tunnel create aibos-tunnel
```
Note the generated **Tunnel ID** (UUID format: `xxxx-xxxx-xxxx-xxxx`).

### Step C: Configure Ingress Rules
Create a configuration file at `C:\Users\<YourUser>\.cloudflared\config.yml`:

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: C:\Users\<YourUser>\.cloudflared\<YOUR_TUNNEL_ID>.json

ingress:
  # AI BOS Backend API
  - hostname: api-aibos.yourcompany.com
    service: http://127.0.0.1:5000

  # AI BOS Admin App
  - hostname: admin-aibos.yourcompany.com
    service: http://127.0.0.1:8081

  # AI BOS Employee App
  - hostname: app-aibos.yourcompany.com
    service: http://127.0.0.1:8080

  # Catch-all rule
  - service: http_status:404
```

### Step D: Route DNS Records
Run the following commands to route subdomains to your tunnel:
```powershell
cloudflared tunnel route dns aibos-tunnel api-aibos.yourcompany.com
cloudflared tunnel route dns aibos-tunnel admin-aibos.yourcompany.com
cloudflared tunnel route dns aibos-tunnel app-aibos.yourcompany.com
```

---

## 4. Install `cloudflared` as a Windows Service

To keep the tunnel running automatically in the background even after reboot:
```powershell
cloudflared service install
Start-Service cloudflared
```

---

## 5. Environment Settings in AI BOS

In `backend/.env`, add your tunnel origins to `CLIENT_ORIGIN`:
```env
CLIENT_ORIGIN=http://127.0.0.1:8080,http://127.0.0.1:8081,http://192.168.1.66:8080,http://192.168.1.66:8081,https://app-aibos.yourcompany.com,https://admin-aibos.yourcompany.com
ALLOW_TUNNEL_ORIGINS=true
```

---

## 6. Verification & Troubleshooting

1. **Test Remote Access**: Open `https://app-aibos.yourcompany.com` on a remote phone or laptop outside office Wi-Fi.
2. **Check Tunnel Status**:
   ```powershell
   Get-Service cloudflared
   ```
3. **CORS Validation**: AI BOS dynamically permits both local LAN IP addresses (`192.168.x.x`) and Cloudflare Tunnel origins (`https://*.yourcompany.com`).
