# Server Agen GCP - berjalan 24/7 (Cloud Run / container apa pun).
# Seluruh pemrosesan (skill + Gemini) di cloud, bukan di perangkat.
FROM node:20-slim

WORKDIR /app

# Salin package & instal dependensi agen
COPY agen/package.json agen/package-lock.json ./agen/
RUN cd agen && npm install --omit=dev --no-audit --no-fund

# Salin kode server dan skills
COPY agen ./agen
COPY skills ./skills

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

WORKDIR /app/agen
CMD ["node", "server.js"]
