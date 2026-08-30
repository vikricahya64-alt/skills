# Distribusi APK & Publikasi ke Play Console

Dokumen ini menjelaskan bagaimana output pipeline (AAB + APK + checksum) dipakai,
termasuk langkah publikasi ke **Google Play Console** melalui GitHub Actions.

## Artefak yang dihasilkan pipeline (`Build APK`)

| Artefak | Kegunaan |
|---|---|
| `app-release.apk` | Universal (gabung semua ABI). Siap install langsung di perangkat. |
| `app-release.aab` | **Bundle** siap-Play (diperlukan untuk upload Play Console). |
| `app-release-universal-from-aab.apk` | APK universal **hasil bundletool dari AAB** (bukti AAB valid & berfungsi). |
| `checksums.txt` | SHA-256 untuk verifikasi integritas semua artefak. |

Verifikasi integritas:
```bash
sha256sum -c checksums.txt
```

## Menjalankan pipeline

- Setiap push ke `main` memicu: `quality-gate` (Lint + compile) → `device-smoke`
  (app dibuka di emulator cloud) & `release` (APK + AAB + checksum + Release resmi `v1.0.<n>`).
- Bisa dipicu manual via **Actions → Build APK → Run workflow**.

## Publikasi ke Play Console (otomatis via GitHub Actions)

Pipeline sudah menyertakan job `play-publish` yang **otomatis aktif** begitu Anda
menyediakan kredensial. Langkahnya:

### 1. Buat project Play Console
1. Buka [Play Console](https://play.google.com/console) → buat aplikasi (atau pilih yang ada).
2. Catat **nama paket** — wajib cocok dengan aplikasi ini: `com.vikri.gcpagent`.
   (Bila nama paket berbeda, sesuaikan `applicationId` di `android/app/build.gradle`
   **dan** `package_name` di `.github/workflows/android.yml`.)

### 2. Buat service account Play
1. Play Console → **Setup → API access** → **Link existing service account** / **Create service account**.
2. Ikuti link ke Google Cloud Console, buat service account, lalu unduh **JSON key**.
3. Beri role **"Pengguna rilis" (Release manager)** di halaman API access Play.
4. Terima syarat & kondisi API Play Developer.

### 3. Simpan kredensial sebagai GitHub secret
Repo: **Settings → Secrets and variables → Actions → New repository secret**
- Nama: `PLAY_SERVICE_ACCOUNT_JSON`
- Nilai: isi penuh (isi JSON) dari file service account key.

### 4. Jalankan
Push ke `main` (atau **Run workflow**). Setelah `release` selesai, job `play-publish`
otomatis mengunggah AAB ke **track `alpha`** dengan status `completed`.

> Job `play-publish` hanya berjalan bila secret `PLAY_SERVICE_ACCOUNT_JSON` ada.
> Tanpa secret, pipeline tetap memproduksi APK/AAB seperti biasa.

## Publikasi manual (alternatif, tanpa GitHub Actions)

Prasyarat: [Java 17](https://adoptium.net) & file `keystore.p12` + password
(jika Anda mengekspor keystore dari secret, atau gunakan hasil CI).

```bash
# 1. Bangun AAB release (dari folder repo)
cd android
gradle bundleRelease -PversionCodeOverride=1 -PversionNameOverride=1.0.0

# 2. (Opsional) Bangun APK universal dari AAB via bundletool
curl -L -o bundletool.jar https://github.com/google/bundletool/releases/latest/download/bundletool-all.jar
java -jar bundletool.jar build-apks \
  --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=dist.apks \
  --ks=keystore.p12 --ks-pass=pass:<password> \
  --ks-key-alias=gcpagent --key-pass=pass:<password> \
  --mode=universal
unzip -o dist.apks -d dist
# hasil: dist/universal.apk

# 3. Upload AAB ke Play Console via web (atau pakai job play-publish di atas)
#    Play Console → Aplikasi → Rilis produksi/alpha → Buat rilis → Upload app-release.aab
```

## Ringkasan alur

```
push main
  └─ quality-gate (Lint + assembleDebug)        [wajib lolos]
       ├─ device-smoke (emulator cloud: app dibuka) [paralel]
       └─ release (assembleRelease + bundleRelease
            → apksigner/jarsigner ok
            → bundletool → universal-from-aab
            → checksum + Release v1.0.<n>)          [wajib lolos]
            └─ play-publish (jika secret ada) → Play Console ALPHA
```
