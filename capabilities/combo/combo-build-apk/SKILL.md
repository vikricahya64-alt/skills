---
name: combo-build-apk
metadata:
  version: 3.0.0
  category: Build
description: >-
  Fusi total membangun APK Android end-to-end: restrukturisasi semua logika kode build
  Android menjadi satu kemampuan — struktur project Gradle lengkap (settings.gradle,
  build.gradle root & app, gradle.properties, AndroidManifest.xml, res/values,
  MainActivity.kt), arsitektur bersih (clean architecture + MVVM), pola
  Kotlin/Compose/material design, sampai pipeline menghasilkan APK
  (assembleDebug/assembleRelease), signing (keystore/signingConfig), R8/ProGuard minify,
  dan distribusi AAB/APK — setiap file ditulis ke workspace memakai tool write agar source
  project bisa diunduh lalu di-build di Android Studio cabang operasional dari PRIME
  `Software & Product Evolution`; dapat dijalankan lewat perintah seperti `Buat APK
  aplikasi editor foto`, `Compile aplikasi android saya jadi APK`, `Buat project Android
  lengkap lalu build APK debug`; punya jalur eksekusi nyata via alur `apkBuild` di agen.
  Ini adalah kemampuan COMBO operasional pada tier ADVANCED-CAP dari arsitektur kemampuan
  v3. Gunakan ketika diminta Buat APK aplikasi editor foto, Compile aplikasi android saya
  jadi APK, Buat project Android lengkap lalu build APK debug, Susun pipeline build APK
  release dengan signing. Hindari menggunakannya untuk pekerjaan di luar bidang Build.
---
# Android APK Build Pipeline 🧱

Fusi total membangun APK Android end-to-end: restrukturisasi semua logika kode build Android menjadi satu kemampuan — struktur project Gradle lengkap (settings.gradle, build.gradle root & app, gradle.properties, AndroidManifest.xml, res/values, MainActivity.kt), arsitektur bersih (clean architecture + MVVM), pola Kotlin/Compose/material design, sampai pipeline menghasilkan APK (assembleDebug/assembleRelease), signing (keystore/signingConfig), R8/ProGuard minify, dan distribusi AAB/APK — setiap file ditulis ke workspace memakai tool write agar source project bisa diunduh lalu di-build di Android Studio.

| | |
|---|---|
| **Layer** | combo |
| **Group** | DevOps & Delivery |
| **Tier** | ADVANCED-CAP |
| **Family** | prime-software-product |
| **Runnable** | Ya |
| **Recipe** | apkBuild |
| **Version** | 3.0.0 |
| **Category** | Build |

## Perintah

- `Buat APK aplikasi editor foto`
- `Compile aplikasi android saya jadi APK`
- `Buat project Android lengkap lalu build APK debug`
- `Susun pipeline build APK release dengan signing`
- `Buat aplikasi android editor video dan compile menjadi apk`

## Hasil yang dapat dieksekusi

- Fusi total membangun APK Android end-to-end: restrukturisasi semua logika kode build Android menjadi satu kemampuan — struktur project Gradle lengkap (settings.gradle, build.gradle root & app, gradle.properties, AndroidManifest.xml, res/values, MainActivity.kt), arsitektur bersih (clean architecture + MVVM), pola Kotlin/Compose/material design, sampai pipeline menghasilkan APK (assembleDebug/assembleRelease), signing (keystore/signingConfig), R8/ProGuard minify, dan distribusi AAB/APK — setiap file ditulis ke workspace memakai tool write agar source project bisa diunduh lalu di-build di Android Studio.
- Terbukti dapat dieksekusi nyata: membangun artefak konkret via alur `apkBuild` di agen.

## Skill / domain dasar

`android-clean-architecture`, `compose-multiplatform-patterns`, `mobile-android-design`, `Mobile App Builder`, `Mobile Release Engineer`, `kotlin-patterns`, `kotlin-coroutines-flows`, `kotlin-testing`, `kotlin-exposed-patterns`, `kotlin-ktor-patterns`, `java-coding-standards`, `dart-flutter-patterns`, `react-native-architecture`, `react-native-patterns`, `dependency-upgrade`, `web-artifacts-builder`, `before-you-build`, `Rapid Prototyper`

## Tag

`apk`, `android`, `gradle`, `signing`
