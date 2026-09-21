# TaleemiDunya CCTV Connector Service

The **TaleemiDunya CCTV Connector** is a secure, lightweight background daemon designed to run on a computer inside the school's Local Area Network (LAN). It acts as an outbound bridge between local Dahua XVR/DVR hardware (`192.168.100.82`) and the cloud-hosted TaleemiDunya platform.

---

## 🔒 Security Architecture

- **No Public Port Forwarding**: The school does **NOT** need to open public IP ports or expose port 37777 to the internet.
- **Outbound Bridge**: The Connector initiates outbound HTTPS/HTTP heartbeats to the TaleemiDunya Cloud API.
- **Encrypted Credentials**: DVR passwords stay inside the school LAN on the Connector PC and are never saved to cloud Firestore or client browser state.

---

## 🚀 Quick Setup & Installation

### Prerequisites
- Node.js v18.0 or higher installed on the school PC.
- PC connected to the same LAN as the Dahua XVR (`192.168.100.82`).

### Step 1: Copy Connector Folder
Copy the `cctv-connector` directory to the target PC on the school LAN.

### Step 2: Configure Environment
Create a `.env` file in the `cctv-connector` directory:
```env
SCHOOL_ID=school-main
CONNECTOR_ID=conn-school-main-pc1
CLOUD_API_URL=http://localhost:5173
DVR_IP=192.168.100.82
DVR_PORT=37777
DVR_HTTP_PORT=80
DVR_RTSP_PORT=554
DVR_USER=admin
DVR_PASS=your_dvr_password
```

### Step 3: Test DVR Connection Locally
Run an immediate network diagnostic check from the school PC:
```bash
npm run test:dvr
```

Expected Terminal Output on Success:
```json
{
  "success": true,
  "diagnosticCode": "CONNECTED",
  "brand": "Dahua Technology",
  "model": "DH-XVR1B16-I/T",
  "totalChannels": 16,
  "message": "Connected successfully to Dahua DVR at 192.168.100.82 over LAN."
}
```

### Step 4: Run Connector Daemon
Start the outbound connector daemon:
```bash
npm start
```

The daemon will deliver continuous health heartbeats to TaleemiDunya Cloud API every 10 seconds.

---

## 🔍 Diagnostic Failure Codes

| Diagnostic Code | Cause | Recommended Fix |
|---|---|---|
| `CONNECTOR_OFFLINE` | Connector daemon not running on school PC | Run `npm start` in `cctv-connector` directory |
| `DVR_UNREACHABLE` | DVR power off or IP `192.168.100.82` disconnected | Check DVR network cable and power switch |
| `TCP_37777_UNAVAILABLE` | TCP Port 37777 blocked or disabled | Verify Dahua XVR TCP port settings in XVR GUI |
| `RTSP_554_UNAVAILABLE` | RTSP Port 554 disabled | Enable RTSP stream port on Dahua XVR |
| `HTTP_80_UNAVAILABLE` | HTTP Port 80 not responding | Verify HTTP web service is enabled on XVR |
| `AUTHENTICATION_FAILURE` | Wrong DVR username or password | Update `DVR_USER` / `DVR_PASS` in `.env` |

---

## 📺 Connecting All 16 Channels

Once the Connector daemon is running:
1. Open TaleemiDunya Web App -> **CCTV Monitoring**.
2. Click **Test Connection** -> Confirm `Connector Online` & `DVR Connected`.
3. Click **Discover Channels** -> Retrieves 16 channels from `DH-XVR1B16-I/T`.
4. Click **Connect All Cameras** -> Probes & registers all 16 channels into live grid layout.
