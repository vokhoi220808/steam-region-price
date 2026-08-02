import test from 'node:test';
import assert from 'node:assert/strict';
import { runCloudAlertChecks, syncCloudAlerts } from '../server/cloud-alerts.js';

test('cloud alert sync rejects unsafe notification destinations before database access', async () => {
  await assert.rejects(
    () => syncCloudAlerts({
      channels: { discordWebhook: 'https://example.com/api/webhooks/not-discord' },
      games: [{ appId: 1245620, targetAmount: 800000, targetCurrency: 'VND', regionCode: 'vn' }]
    }),
    /Discord Webhook URL không hợp lệ/
  );
});

test('cloud alert sync creates a protected client and upserts target games', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const calls = [];
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET', body: options.body });
    if (String(url).includes('/rest/v1/alert_clients?public_id=')) return Response.json([]);
    if (String(url).endsWith('/rest/v1/alert_clients') && options.method === 'POST') {
      const input = JSON.parse(options.body);
      return Response.json([{ id: 'client-internal-1', public_id: input.public_id }], { status: 201 });
    }
    if (String(url).includes('/rest/v1/price_alerts?client_id=eq.client-internal-1')) {
      return new Response(null, { status: 204 });
    }
    if (String(url).includes('/rest/v1/price_alerts?on_conflict=')) {
      return new Response(null, { status: 201 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const result = await syncCloudAlerts({
      channels: { discordWebhook: 'https://discord.com/api/webhooks/1/token' },
      games: [{ appId: 1245620, name: 'ELDEN RING', targetAmount: 800000, targetCurrency: 'VND', regionCode: 'vn' }]
    });
    assert.match(result.clientId, /^[0-9a-f-]{36}$/i);
    assert.ok(result.clientSecret.length >= 32);
    assert.equal(result.synced, 1);
    const alertInsert = calls.find((call) => call.url.includes('price_alerts?on_conflict='));
    const alertRows = JSON.parse(alertInsert.body);
    assert.equal(alertRows[0].app_id, 1245620);
    assert.equal(alertRows[0].client_id, 'client-internal-1');
    assert.equal(alertRows[0].enabled, true);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});

test('cron sends once when a price crosses the target and records the result', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const calls = [];
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';

  const alert = {
    id: 'alert-1',
    client_id: 'client-1',
    app_id: 1245620,
    product_type: 'app',
    game_name: 'ELDEN RING',
    target_amount: 800000,
    target_currency: 'VND',
    region_code: 'vn',
    current_amount: null,
    last_alerted_at: null,
    last_alerted_price: null
  };

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET', body: options.body });
    if (String(url).includes('/rest/v1/price_alerts?enabled=eq.true')) {
      return Response.json([alert]);
    }
    if (String(url).includes('/rest/v1/alert_clients?enabled=eq.true')) {
      return Response.json([{ id: 'client-1', discord_webhook: 'https://discord.com/api/webhooks/1/token' }]);
    }
    if (String(url).startsWith('https://discord.com/api/webhooks/')) {
      return new Response(null, { status: 204 });
    }
    if (String(url).includes('/rest/v1/alert_events')) {
      return new Response(null, { status: 201 });
    }
    if (String(url).includes('/rest/v1/price_alerts?id=eq.alert-1')) {
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const result = await runCloudAlertChecks({
      getQuote: async () => ({ available: true, amount: 790000, discountPercent: 34 }),
      concurrency: 2
    });
    assert.equal(result.checked, 1);
    assert.equal(result.triggered, 1);
    assert.equal(result.sent, 1);
    assert.equal(result.failed, 0);
    assert.equal(calls.filter((call) => call.url.startsWith('https://discord.com/')).length, 1);
    const update = calls.find((call) => call.url.includes('price_alerts?id=eq.alert-1'));
    assert.match(update.body, /"last_alerted_price":790000/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});
