#!/usr/bin/env bash
# Mengunduh semua library CDN ke folder lokal agar aplikasi jalan OFFLINE.
# Jalankan dari folder yang berisi index.html (mis. folder www/).
set -euo pipefail
mkdir -p libs/fonts libs/fontawesome/css libs/fontawesome/webfonts

# Tailwind (runtime Play CDN)
curl -fsSL https://cdn.tailwindcss.com -o libs/tailwind.js

# html5-qrcode & lucide
curl -fsSL https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js -o libs/html5-qrcode.min.js
curl -fsSL https://unpkg.com/lucide@latest/dist/umd/lucide.min.js -o libs/lucide.min.js || echo "" > libs/lucide.min.js

# Font Awesome 6.5.0 (css + webfonts)
FA=https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0
curl -fsSL $FA/css/all.min.css -o libs/fontawesome/css/all.min.css
for f in fa-solid-900 fa-regular-400 fa-brands-400 fa-v4compatibility; do
  curl -fsSL $FA/webfonts/$f.woff2 -o libs/fontawesome/webfonts/$f.woff2
done

# Google Fonts (Inter & Playfair Display) -> woff2 lokal
UA="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"
CSS=$(curl -fsSL -A "$UA" "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap")
i=0
OUT=""
while IFS= read -r line; do
  if [[ "$line" =~ url\((https://[^\)]+)\) ]]; then
    i=$((i+1)); url="${BASH_REMATCH[1]}"
    curl -fsSL "$url" -o "libs/fonts/f$i.woff2"
    line="${line//$url/f$i.woff2}"
  fi
  OUT+="$line"$'\n'
done <<< "$CSS"
printf "%s" "$OUT" > libs/fonts/fonts.css
echo "Selesai: library tersimpan di ./libs"
