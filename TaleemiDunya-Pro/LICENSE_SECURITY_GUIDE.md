# 🛡️ TaleemiDunya Pro — Anti-Piracy & Hardware License Security System

Yeh document wazahat karta hai ke **TaleemiDunya Pro** ka licensing aur anti-theft setup kis tarah kaam karta hai aur yeh source code chori hone ke bawajood software ko misuse hone se kaisay mehfooz rakhta hai.

---

## 🔒 1. Source Code Chori Hone Par Bhi Use Kyun Nahi Ho Sakta? (The Security Architecture)

Is system me **Asymmetric Cryptography (RSA-2048 Digital Signatures)** use ki gayi hai:

1. **Master Private Key (Sirf Aap Ke Paas Hai):**
   - Yeh key `master-license-keys/taleemidunya_master_private.pem` me mehfooz hai.
   - Yeh file `.gitignore` me shamil hai, is liye yeh **kisi bhi git repo, build ya client PC par nahi jaati**.
   - **Sirf is Private Key se hi working license keys generate ho sakti hain.**

2. **Public Key (Application Ke Andar Embedded Hai):**
   - Application ke code (`src/services/licenseCrypto.js`) me sirf **Public Key** hoti hai.
   - Cryptography ke mutabiq, Public Key sirf signature verify kar sakti hai, **kabhi bhi naya license create nahi kar sakti**.
   - **Nateeja:** Agar koi chor aap ka poora source code ya GitHub repo bhi chura le, tab bhi wo kisi computer ya school ke liye valid license generate **NAHI** kar sakta! Jab tak aap apni private key se usay license sign kar ke na dain, software lock screen se aagay nahi barhe ga.

---

## 💻 2. Desktop (.exe) Machine Lock (Hardware-ID / HWID)

Desktop application (`electron.cjs`) computer ke physical hardware components ko scan kar ke unique Machine ID banati hai:
- **Motherboard UUID** (`Win32_ComputerSystemProduct`)
- **BIOS Serial Number** (`Win32_BaseBoard`)
- **Machine GUID**

Yeh hash ban kar client ko is format me nazar aata hai:
`TD-0588-ADCC-A54B-32C0`

### Chori aur Copying se Tahaffuz:
- Jab aap client ke liye license banate hain, to license ke andar unka **HWID** cryptographically pack aur sign hota hai.
- Agar koi school admin ya employee poori `.exe` ya install shuda folder kisi doosre computer me copy kare ga:
  - Doosra computer apna alag HWID generate kare ga.
  - Software foran detect kare ga: `HWID_MISMATCH (Unauthorized Computer)`.
  - Screen foran **Hard Lock** ho jaye gi aur software open nahi hoga.

---

## 🌐 3. Online + Offline Dual-Mode Verification

| Mode | Kaise Kaam Karta Hai? |
| :--- | :--- |
| **Offline (No Internet)** | Software local RSA cryptographic signature check karta hai aur verify karta hai ke signature authentic hai, HWID match ho raha hai, aur expiry date baqi hai. **Internet na hone par bhi legitimate client ka kaam rukta nahi hai.** |
| **Online (Internet Connected)** | Software Firebase Firestore (`licenses/{hwid}`) se sync karta hai. Agar Super Admin ne kisi school ka license revoke ya block kar diya ho, to **Remote Kill-Switch** foran trigger ho kar unka software block kar deta hai. |

### ⏰ Anti-Clock Rollback (Date Peeche Karne Se Tahaffuz):
Agar koi school license expiry se bachne ke liye computer ki date 2 saal peeche kar de, to software ka anti-tampering engine detects kar leta hai (`CLOCK_TAMPERED`) aur foran software block kar deta hai.

---

## 🚀 4. Super Admin Panel Se License Kaise Generate Karain?

### Tareeqa A: Super Admin Web / Desktop UI (Recommended)
1. Super Admin login karain aur Sidebar me **"Hardware License & DRM"** (`/super-admin/licenses`) par click karain.
2. Pehli martaba **"Configure Master Key"** par click kar ke apni Private Key paste kar dain (jo `master-license-keys/taleemidunya_master_private.pem` me mojood hai). Yeh aap ke browser me save ho jaye gi.
3. Client ka **School Name** aur **Machine ID (HWID)** enter karain (jo unke lock screen par show ho raha hoga).
4. Duration select karain (1 Month, 3 Months, 1 Year, ya Lifetime).
5. **"Generate & Sign License Key"** par click karain.
6. Aap ko 3 options milain gay:
   - **Copy Key:** Direct key copy kar ke client ko paste karwayen.
   - **Download:** `.tdlic` file download kar ke unko send karain (wo direct file upload kar sakain gay).
   - **WhatsApp:** 1-click button se WhatsApp par pre-filled message ke sath send karain!

### Tareeqa B: Terminal / CLI Se (Quick Developer Command)
Terminal me command chalayen:

```bash
npm run license:gen -- --hwid "TD-0588-ADCC-A54B-32C0" --school "The Smart School" --schoolId "SCH-1001" --days 365 --plan enterprise
```

Lifetime license ke liye:
```bash
npm run license:gen -- --hwid "TD-0588-ADCC-A54B-32C0" --school "The Smart School" --days lifetime
```

Apna HWID check karne ke liye:
```bash
npm run license:hwid
```

---

## 🛑 5. Remote Kill-Switch (Agar Koi Fees Na De To Software Block Karna)

Super Admin panel (`/super-admin/licenses`) me tamam active machines ki list aati hai:
- Kisi bhi school ke aagay **"Revoke"** button dabane se unka software online hote hi foran lock ho jaye ga.
- Fees milne par **"Unblock"** ya **"+30 Days"** dabane se unki access foran restore ho jaye gi.

---

## 🌐 6. Web Anti-Piracy (Domain Lock)

Web deployment (Vercel / Firebase Hosting) ke liye:
- Code ke andar **Domain Whitelist Lock** active hai.
- Code sirf authorized domains (`*.web.app`, `*.firebaseapp.com`, `*.vercel.app`, aur aap ki custom domain) par run ho sakta hai.
- Agar koi chor web ka code download kar ke kisi unauthorized domain ya server par upload kare ga, to domain lock screen a jaye gi: `UNAUTHORIZED_DOMAIN (Pirated Deployment Detected)`.

---

## 📁 7. Zaroori Files Ki Tafseel

| File Path | Maqsad |
| :--- | :--- |
| `src/services/licenseCrypto.js` | Cryptographic Verification, RSA Public Key, HWID validation, anti-clock tamper |
| `src/services/licenseGenerator.js` | WebCrypto RSA Signing engine for Super Admin |
| `src/context/LicenseContext.jsx` | Online/Offline sync, Firebase cloud status, State management |
| `src/components/licensing/LicenseLockModal.jsx` | Full-screen unclosable modern security shield & activation screen |
| `src/pages/super-admin/LicenseManager.jsx` | Super Admin UI for license generation, fleet control & kill switch |
| `electron.cjs` & `electron-preload.cjs` | Native Windows Hardware ID extraction & license file storage |
| `scripts/license-cli.cjs` | Terminal CLI tool to generate licenses anytime |
| `master-license-keys/` | Master Private & Public key storage (Ignored by Git for 100% security) |
