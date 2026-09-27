# ──────────────────────────────────────────────
# Stage 1: Build the React / Vite dashboard
# ──────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app/dashboard

COPY dashboard/package*.json ./
RUN npm install

COPY dashboard/ ./
RUN npm run build   # outputs to /app/dashboard/dist

# ──────────────────────────────────────────────
# Stage 1b: Build the v2 dashboard (dashboard-v2, served at /v2)
# Its own stage because its toolchain (react-router 8, jsdom) needs
# Node >= 22.22; the v1 build and the runtime image stay on Node 20.
# ──────────────────────────────────────────────
FROM node:24-slim AS builder-v2

WORKDIR /app/dashboard-v2

COPY dashboard-v2/package.json dashboard-v2/package-lock.json dashboard-v2/.npmrc ./
RUN npm ci

COPY dashboard-v2/ ./
RUN npm run build   # outputs to /app/dashboard-v2/dist

# ──────────────────────────────────────────────
# Stage 2: Production server with Playwright
# ──────────────────────────────────────────────
FROM node:20-slim

# Install OS-level deps required by Playwright/Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 \
    wget ca-certificates fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install root-level dependencies (playwright, etc.)
COPY package*.json ./
RUN npm install --omit=dev

# Install Chromium browser for Playwright
RUN npx playwright install chromium

# Copy scraper scripts and shared helpers
COPY rappi_scraper.js ./
COPY mcdonalds_scraper.js ./
COPY pedidosya_scraper.js ./
COPY scrape_pedidosya_session.js ./
COPY scrape_pedidosya_batch.js ./
COPY scrape_scheduled_batch.js ./
COPY scheduled_stores.js ./
COPY pizzahut_scraper.js ./
COPY burgerking_scraper.js ./
COPY kfc_scraper.js ./
COPY yopo_scraper.js ./
COPY littlecaesars_scraper.js ./
COPY digifood_scraper.js ./
COPY starbucks_scraper.js ./
COPY rokys_scraper.js ./
COPY kernel_browser.js ./
COPY magento_scraper.js ./
COPY price_utils.js ./
COPY scrape_meta.js ./
COPY history_store.js ./
COPY pedidosya_stores.js ./

# Price comparison / AI matching engine
COPY brand_config.js ./
COPY product_matcher.js ./
COPY match_snapshots.js ./
COPY match_daily_batch.js ./
COPY recalculate_all_matches.js ./
COPY check_mcd.js ./
COPY dump_mcd.js ./
COPY extract_nuxt.js ./
COPY intercept_mcd.js ./

# Baseline products live in data/ — GCS sync writes here too.
# Fresh scrapes still land in /app (cwd) and override via findProductFiles.
COPY data/ ./data/

# Set up dashboard directory
RUN mkdir -p dashboard

# Install dashboard's runtime dependencies (express, cors)
COPY dashboard/package*.json ./dashboard/
RUN cd dashboard && npm install --omit=dev

# Copy Express backend
COPY dashboard/server.cjs ./dashboard/server.cjs

# Copy compiled React app from Stage 1
COPY --from=builder /app/dashboard/dist ./dashboard/dist

# Copy compiled v2 from Stage 1b (server.cjs serves it at /v2)
COPY --from=builder-v2 /app/dashboard-v2/dist ./dashboard-v2/dist

# Cloud Run injects PORT (default 8080)
ENV PORT=8080
# Required for Playwright to run without a sandbox in containers
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

EXPOSE 8080

CMD ["node", "dashboard/server.cjs"]
