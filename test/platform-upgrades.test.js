import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("account, personalized deals and internal history entry points are present", async () => {
  const [html, client, server, account] = await Promise.all([
    readFile(new URL("public/index.html", root), "utf8"),
    readFile(new URL("public/modules/account/account-manager.js", root), "utf8"),
    readFile(new URL("server.js", root), "utf8"),
    readFile(new URL("server/account.js", root), "utf8")
  ]);
  assert.match(html, /id="steamAccountBtn"/);
  assert.match(html, /data-category="personalized"/);
  assert.match(html, /id="dealBudgetFilter"/);
  assert.match(html, /data-history-source="internal"/);
  assert.match(html, /id="themeToggleBtn"/);
  assert.match(client, /\/api\/account\/sync/);
  assert.match(server, /\/api\/account\/deals/);
  assert.match(server, /Gần đạt giá mục tiêu/);
  assert.match(server, /\/api\/cron\/weekly-digest/);
  assert.match(account, /getWishlist\(match\[1\]\)/);
  assert.match(server, /\/api\/history\/internal\/\:appId/);
});

test("PWA shell, iOS metadata and push listener are installable", async () => {
  const [html, manifest, worker] = await Promise.all([
    readFile(new URL("public/index.html", root), "utf8"),
    readFile(new URL("public/manifest.webmanifest", root), "utf8"),
    readFile(new URL("public/sw.js", root), "utf8")
  ]);
  const parsed = JSON.parse(manifest);
  assert.equal(parsed.display, "standalone");
  assert.match(html, /apple-touch-icon/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(worker, /addEventListener\("push"/);
  assert.match(worker, /addEventListener\("fetch"/);
});

test("cloud migration keeps public access locked and adds reliability tables", async () => {
  const migration = await readFile(new URL("supabase/migrations/002_accounts_pwa_history_reliability.sql", root), "utf8");
  for (const table of ["user_accounts", "cloud_tracker", "user_wishlist", "push_subscriptions", "price_snapshots", "cron_runs", "retry_jobs", "service_health"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.doesNotMatch(migration, /create\s+policy/i);
});

test("comparison validation, progressive rendering and share previews are wired", async () => {
  const [server, client, steamService, gameSheet, vercel] = await Promise.all([
    readFile(new URL("server.js", root), "utf8"),
    readFile(new URL("public/app.js", root), "utf8"),
    readFile(new URL("public/modules/services/steam-service.js", root), "utf8"),
    readFile(new URL("public/modules/components/game-sheet.js", root), "utf8"),
    readFile(new URL("vercel.json", root), "utf8")
  ]);
  assert.match(server, /\/api\/compare-stream\/\:appId/);
  assert.match(server, /App ID không tồn tại trên Steam Store/);
  assert.match(server, /app\.get\("\/game\/\:appId"/);
  assert.match(server, /property="og:title"/);
  assert.match(client, /fetchComparisonStream/);
  assert.match(client, /steamVerified/);
  assert.match(client, /url\.pathname = `\/game\/\$\{appId\}`/);
  assert.match(steamService, /if \(!payload\?\.gameName\)/);
  assert.match(gameSheet, /Game chưa được Steam xác thực/);
  assert.equal(JSON.parse(vercel).rewrites.some((rule) => rule.source === "/game/:path*"), true);
});

test("production readiness reports missing mandatory configuration without leaking secrets", async () => {
  const { getProductionReadiness } = await import(new URL("server/reliability.js", root));
  const previous = Object.fromEntries([
    "PUBLIC_BASE_URL", "SESSION_SECRET", "STEAM_API_KEY", "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET"
  ].map((name) => [name, process.env[name]]));
  try {
    process.env.PUBLIC_BASE_URL = "https://steam.example.com";
    process.env.SESSION_SECRET = "a".repeat(32);
    process.env.STEAM_API_KEY = "steam-key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    process.env.CRON_SECRET = "c".repeat(24);
    const readiness = getProductionReadiness();
    assert.equal(readiness.ready, true);
    assert.deepEqual(readiness.missing, []);
    assert.equal(JSON.stringify(readiness).includes("steam-key"), false);
    assert.equal(JSON.stringify(readiness).includes("service-key"), false);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("cyber glass UX exposes smart search, price intelligence and watchlist drawer", async () => {
  const [html, styles, client, server, schema, alertSettings] = await Promise.all([
    readFile(new URL("public/index.html", root), "utf8"),
    readFile(new URL("public/style.css", root), "utf8"),
    readFile(new URL("public/app.js", root), "utf8"),
    readFile(new URL("server.js", root), "utf8"),
    readFile(new URL("public/modules/storage/storage-schema.js", root), "utf8"),
    readFile(new URL("public/modules/components/alert-settings.js", root), "utf8")
  ]);
  assert.match(html, /id="headerMiniSearch"/);
  assert.match(html, /id="gameReviewBadge"/);
  assert.match(html, /id="watchlistDrawer"/);
  assert.match(html, /id="openHistoryDiscoveryBtn"/);
  assert.match(styles, /CYBER GLASS 2026/);
  assert.match(styles, /scroll-snap-type:\s*x mandatory/);
  assert.match(styles, /cubic-bezier\(\.16,1,\.3,1\)/);
  assert.match(client, /updateSpotlightIntelligence/);
  assert.match(client, /renderWatchlistDrawer/);
  assert.match(server, /reviewPercent/);
  assert.match(schema, /alertEnabled:\s*true/);
  assert.match(alertSettings, /game\.alertEnabled !== false/);
});
