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
  assert.match(client, /\/api\/account\/sync/);
  assert.match(server, /\/api\/account\/deals/);
  assert.match(server, /Gần đạt giá mục tiêu/);
  assert.match(account, /getWishlist\(match\[1\]\)/);
  assert.match(server, /\/api\/history\/internal\/\:appId/);
});

test("PWA shell and push listener are installable", async () => {
  const [manifest, worker] = await Promise.all([
    readFile(new URL("public/manifest.webmanifest", root), "utf8"),
    readFile(new URL("public/sw.js", root), "utf8")
  ]);
  const parsed = JSON.parse(manifest);
  assert.equal(parsed.display, "standalone");
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
