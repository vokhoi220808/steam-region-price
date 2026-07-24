import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('tracker runtime element ids exist in the document', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const requiredIds = [
    'trackerView', 'tpOverview', 'tpSummary', 'tpToolbar', 'tpCollections',
    'tpContent', 'tpSheet', 'tpSheetHeader', 'tpSheetBody', 'tpSheetFooter',
    'tpDrawer', 'tpDrawerHeader', 'tpDrawerTabs', 'tpDrawerContent',
    'tpDataModal', 'tpDialog', 'tpDialogConfirmBtn', 'tpDialogCancelBtn'
  ];

  requiredIds.forEach((id) => assert.match(html, new RegExp(`id=["']${id}["']`)));
  assert.doesNotMatch(html, /toast|notification center|drawer-alerts|wizardModal/i);
});

test('top-level views are hidden before the requested view is activated', () => {
  const source = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const switchStart = source.indexOf('function switchView(viewName)');
  const switchEnd = source.indexOf('function setupEvents()', switchStart);
  const switchViewSource = source.slice(switchStart, switchEnd);
  const firstBranch = switchViewSource.indexOf('if (viewName === "deals")');
  const dealsReset = switchViewSource.indexOf(
    'if (dealsView) dealsView.classList.add("hidden");'
  );
  const trackerReset = switchViewSource.indexOf(
    'if (trackerView) trackerView.classList.add("hidden");'
  );

  assert.ok(switchStart >= 0 && switchEnd > switchStart);
  assert.ok(dealsReset >= 0 && dealsReset < firstBranch);
  assert.ok(trackerReset >= 0 && trackerReset < firstBranch);
});

test('price history dialog removes hidden state before showing', () => {
  const source = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const handlerStart = source.indexOf(
    'if (viewHistoryBtn && historyModal && historyModalOverlay)'
  );
  const handlerEnd = source.indexOf('if (closeHistoryBtn)', handlerStart);
  const handlerSource = source.slice(handlerStart, handlerEnd);
  const removeHidden = handlerSource.indexOf(
    'historyModal.classList.remove("hidden");'
  );
  const addShow = handlerSource.indexOf(
    'historyModal.classList.add("show");'
  );

  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
  assert.ok(removeHidden >= 0 && removeHidden < addShow);
});

test('tracker reset control cannot collapse into vertical text', () => {
  const css = fs.readFileSync(new URL('../public/tracker.css', import.meta.url), 'utf8');
  const ruleStart = css.indexOf('.tp-reset-filter {');
  const ruleEnd = css.indexOf('}', ruleStart);
  const rule = css.slice(ruleStart, ruleEnd);

  assert.ok(ruleStart >= 0 && ruleEnd > ruleStart);
  assert.match(rule, /flex:\s*0 0 auto/);
  assert.match(rule, /white-space:\s*nowrap/);
});

test('tracker toolbar wraps before intermediate-width controls can overflow', () => {
  const css = fs.readFileSync(new URL('../public/tracker.css', import.meta.url), 'utf8');
  const mediaStart = css.indexOf('@media (max-width: 1440px)');
  const mediaEnd = css.indexOf('@media (max-width: 1180px)', mediaStart);
  const mediaRule = css.slice(mediaStart, mediaEnd);

  assert.ok(mediaStart >= 0 && mediaEnd > mediaStart);
  assert.match(mediaRule, /\.tp-toolbar-main\s*{[^}]*flex-wrap:\s*wrap/s);
  assert.match(mediaRule, /\.tp-result-count\s*{[^}]*display:\s*none/s);
});

test('tracker search stays compact on desktop and expands on mobile', () => {
  const css = fs.readFileSync(new URL('../public/tracker.css', import.meta.url), 'utf8');
  const searchStart = css.indexOf('.tp-search {');
  const searchEnd = css.indexOf('}', searchStart);
  const desktopRule = css.slice(searchStart, searchEnd);
  const mobileStart = css.indexOf('@media (max-width: 980px)');
  const mobileRule = css.slice(mobileStart, css.indexOf('@media (max-width: 640px)', mobileStart));

  assert.match(desktopRule, /max-width:\s*360px/);
  assert.match(desktopRule, /flex:\s*0 1 360px/);
  assert.match(mobileRule, /\.tp-search\s*{[^}]*max-width:\s*none/s);
});
