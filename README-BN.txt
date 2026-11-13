HORIZON BLUE — Android Source Project v1.0

এই ZIP-এ Android app-এর source code আছে। এখানে APK আগে থেকে compile করা নেই। APK পেতে GitHub Actions ব্যবহার করা যাবে; এতে ফোনেই কাজ শুরু করা সম্ভব, তবে GitHub account এবং internet লাগবে।

ফোন দিয়ে APK build করার ধাপ (Termux + GitHub Actions):
1. Termux ইনস্টল থাকলে খুলে চালাও:
   pkg update && pkg upgrade -y
   pkg install git unzip -y
2. এই ZIP ফোনের Download ফোল্ডারে রাখো এবং Termux-এ চালাও:
   termux-setup-storage
   cd ~/storage/shared/Download
   unzip HORIZON_BLUE_Android_Project_v1.zip
   cd HORIZON_BLUE_Android
3. GitHub-এ নতুন একটি Private বা Public repository তৈরি করো। নাম দিতে পারো HORIZON_BLUE।
4. GitHub repository-র HTTPS URL কপি করে নিচের YOUR_REPOSITORY_URL-এর জায়গায় বসাও:
   git init
   git add .
   git commit -m "HORIZON BLUE Android v1.0"
   git branch -M main
   git remote add origin YOUR_REPOSITORY_URL
   git push -u origin main
   GitHub sign-in চাইলে GitHub-এর অনুমোদিত sign-in/token পদ্ধতি ব্যবহার করো; password এখানে বা কারও সাথে শেয়ার কোরো না।
5. GitHub repository খুলে Actions tab-এ যাও। “Build HORIZON BLUE APK” workflow চলবে। প্রথমবার workflow অনুমোদন চাইলে “I understand my workflows, go ahead and enable them” চাপো।
6. Workflow সবুজ হলে run খুলে Artifacts থেকে HORIZON-BLUE-debug-apk.zip ডাউনলোড করো। ZIP extract করলে app-debug.apk পাবে।
7. APK ইনস্টল করো। Android নিরাপত্তা সতর্কতা এলে কেবল নিজের তৈরি build হওয়া নিশ্চিত করে Install unknown apps অনুমতি দেবে।

সাধারণ Android Studio build:
- Project folder Android Studio-তে Open করো।
- Gradle sync শেষ হলে Build > Build APK(s)।
- APK: app/build/outputs/apk/debug/app-debug.apk

এই সংস্করণের ফিচার:
- Secure random password generator (Android WebView-এর Web Crypto API)
- Clue-based passphrase helper
- Account security checklist
- Browser-exposed network status and connection information
- Permission-based own-device geolocation
- Device/browser information supported by WebView
- Safe demo terminal

সীমাবদ্ধতা ও নিরাপত্তা:
- এটি একটি Android WebView app; পূর্ণ Linux distribution বা root shell নয়।
- Demo terminal বাস্তব shell command চালায় না।
- Network Lab কেবল নিজের ডিভাইসের প্রকাশিত connection তথ্য দেখায়; LAN port scan বা অন্য ডিভাইস scan করে না।
- Location কেবল ব্যবহারকারীর অনুমতি নিয়ে নিজের ডিভাইসের অবস্থান দেখায়।
- কোনো third-party account password সংগ্রহ, credential interception, covert tracking বা unauthorized access নেই।
- Debug APK পরীক্ষামূলক। Public release-এর আগে app signing, privacy policy, accessibility, permission এবং বাস্তব ডিভাইসে security testing প্রয়োজন।
