# Optimisasi & shrink default untuk release (R8). Aturan khusus agen GCP ditambah di bawah.

# Menjaga antarmuka WebView tetap berfungsi jika anotasi @JavascriptInterface dipakai.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Compose sudah punya aturan R8 bawaan; tambahan jika perlu.
