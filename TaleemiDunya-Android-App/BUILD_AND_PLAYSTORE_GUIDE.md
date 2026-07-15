# 📱 TaleemiDunya Pro — Official Google Play Store & Android App Guide

Yeh folder (`TaleemiDunya-Android-App/`) aap ke **TaleemiDunya Mini Pocket App** ka standalone source folder hai jise aap **Google Play Store** par upload karne ke liye **`.apk` ya `.aab` (Signed Android App Bundle)** bana sakte hain!

---

## 🛠️ Option 1: Capacitor ke zariye Android Studio Project & Play Store App banana (Recommended)

Agar aap ke PC par **Node.js** aur **Android Studio** install hai, toh niche diye gaye 3 aasan commands se poora Native Android Studio Project taiyar ho jayega:

### Step 1: Initialize & Sync Android Platform
Terminal (Cmd ya Powershell) me is folder me ayen aur run karein:
```powershell
cd "g:\taleem dithub\TaleemiDunya-Pro\TaleemiDunya-Android-App"
npm install
npx cap add android
npx cap sync android
```

### Step 2: Open in Android Studio
Jab upar wala step pura ho jaye, toh yeh command chalayein:
```powershell
npx cap open android
```
*Note: Yeh command aap ke PC par **Android Studio** ko auto-launch kar dega aur `android/` project open kar dega.*

### Step 3: Generate Signed `.apk` or `.aab` for Play Store
1. Android Studio ke upar menu me **`Build -> Generate Signed Bundle / APK...`** par click karein.
2. **`Android App Bundle (.aab)`** select karein (Google Play Store ke liye yeh mandatory hai).
3. Apni **KeyStore (App Signing Key)** banayein aur save karein (is key ka password sambhaal kar rakhein).
4. **`Release`** build select kar ke **Finish** dabayein!
5. 1-2 minute me `app-release.aab` file `android/app/release/` folder me generate ho jayegi!

---

## 🌐 Google Play Console me Upload Karne ka Tarika (`play.google.com/console`)

1. **Google Play Console** par apna developer account log in karein (`$25 one-time fee` agar pehle nahi di).
2. **`Create App`** par click karein:
   - **App Name:** `TaleemiDunya Pro - School SaaS`
   - **Default Language:** `English / Urdu`
   - **App or Game:** `App`
   - **Free or Paid:** `Free`
3. Left menu se **`Production -> Create New Release`** me jayen.
4. Upar bani hui **`app-release.aab`** file wahan drag-and-drop kar ke upload kar dein!
5. **Release Notes** me likhein:
   ```text
   🌟 TaleemiDunya Pro v2.5.0 Official Mobile Pocket Release!
   - Role-Secured 3-in-1 Pocket Dashboard (Principal, Teacher & Student Modes)
   - 1-Click Classroom Attendance & Daily Homework Diary Broadcast
   - Instant Fee Challan & Overdue Recovery Scanner
   - Live Timed MCQ Online Quizzes & Auto-Grading Engine
   ```
6. **Submit for Review** dabayein! Google 24-48 ghante me approve kar ke Play Store par live kar dega! 🚀💯

---

## ⚡ Option 2: Direct WebView APK Wrapper (Bina Capacitor ke)
Agar aap kisi online APK builder (jaise `Website2APK`, `AppGyver` ya `Cordova`) se APK banwana chahte hain toh bas is folder ka **`www/`** folder unko feed kar dein.
`www/index.html` ke andar native Splash Screen, Offline Check, aur Live Role-Secured App Wrapper pehle se coded hai!
