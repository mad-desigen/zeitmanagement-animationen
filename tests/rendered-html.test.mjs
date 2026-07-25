import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the production timeline app shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Zeitmanagement<\/title>/i);
  assert.match(html, /Zeitmanagement/);
  assert.doesNotMatch(html, /Zeitmanagement für Animationen/);
  assert.doesNotMatch(html, /Zeitmanagement fuer Animationen/);
  assert.doesNotMatch(html, /Produktions-Timeline/);
  assert.doesNotMatch(html, /MDR Aktuell/);
  assert.match(html, /Aufgabe hinzufügen/);
  assert.match(html, /Kanban/);
  assert.match(html, /Timeline/);
  assert.match(html, /Analyse/);
  assert.match(html, /in Planung/);
  assert.match(html, /in Arbeit/);
  assert.match(html, /Abnahme/);
  assert.doesNotMatch(html, /<h2>Neu<\/h2>|<h2>Vorbereitung<\/h2>|Render\/Schnitt|Korrektur/);
  assert.doesNotMatch(html, /JSON exportieren|JSON importieren/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton|codex-preview/i);
});

test("keeps durable local storage and removes starter references", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /localStorage\.setItem\(STORAGE_KEY/);
  assert.doesNotMatch(page + layout + packageJson, /MDR Aktuell|mdr-aktuell|Produktions-Timeline|produktions-timeline/);
  assert.match(page, /JSZip/);
  assert.match(page, /KanbanBoard/);
  assert.match(page, /closeActiveTimer/);
  assert.match(page, /normalizeWorkStatus/);
  assert.match(page, /briefing" \|\| status === "preparation"/);
  assert.match(page, /title: "in Planung"/);
  assert.match(page, /TaskComposerDialog/);
  assert.match(page, /isComposerOpen/);
  assert.match(page, /SEND_SLOTS = \["17:45", "19:30", "21:45"\]/);
  assert.match(page, /ProductionOverview/);
  assert.match(page, /AnalysisView/);
  assert.match(page, /archiveCompletedTasks/);
  assert.match(page, /lastArchiveDateRef/);
  assert.match(page, /archivedAt/);
  assert.match(page, /Archiv und Auswertung/);
  assert.match(page, /Projektordner herunterladen/);
  assert.match(page, /projectType/);
  assert.match(page, /abbreviation/);
  assert.match(page, /AKT \$\{formatFolderDate/);
  assert.match(page, /folder\("_MAT"\)/);
  assert.match(page, /folder\("_ERG"\)/);
  assert.doesNotMatch(page, /folder\("Vorschau"\)/);
  assert.doesNotMatch(page, /Projektinfo\.txt/);
  assert.doesNotMatch(page, /title: "Render\/Schnitt"|title: "Korrektur"/);
  assert.match(page, /Deadline-Zeit/);
  assert.match(page, /Notification\.requestPermission/);
  assert.doesNotMatch(page, /estimatedPreparationMinutes|estimatedAnimationMinutes|Vorbereitung min|Animation min/);
  assert.match(layout, /lang="de"/);
  assert.doesNotMatch(
    page + layout + packageJson,
    /_sites-preview|react-loading-skeleton|codex-preview|JSON exportieren|JSON importieren/,
  );
});

test("keeps deletions durable during server synchronization", async () => {
  const standaloneApp = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(standaloneApp, /deletedAt:\s*task\.deletedAt\s*\|\|\s*null/);
  assert.match(standaloneApp, /const dates = \[task\.deletedAt,/);
  assert.match(standaloneApp, /tasks = tasks\.map\(item => item\.id === id \? \{ \.\.\.item, activeTimer: null, deletedAt, updatedAt: deletedAt \}/);
  assert.match(standaloneApp, /!task\.deletedAt/);
  assert.doesNotMatch(standaloneApp, /tasks = tasks\.filter\(item => item\.id !== id\)/);
});

test("uses one shared board and keeps board styling in settings", async () => {
  const standaloneApp = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(standaloneApp, /Aktuell/);
  assert.match(standaloneApp, /MiMa/);
  assert.match(standaloneApp, /12:00–13:00/);
  assert.match(standaloneApp, /13:05–14:00/);
  assert.match(standaloneApp, /function taskIsInActiveBroadcast\(task\) \{\s*return true;\s*\}/);
  assert.match(standaloneApp, /<h2>Timeline<\/h2>/);
  assert.match(standaloneApp, /data-board-color/);
  assert.match(standaloneApp, /BOARD_COLORS/);
  assert.match(standaloneApp, /BOARD_PREFERENCES_KEY/);
  assert.doesNotMatch(standaloneApp, /id="broadcastSwitch"/);
  assert.doesNotMatch(standaloneApp, /id="deleteBoard"/);
  assert.doesNotMatch(standaloneApp, /function deleteActiveBoard\(\)/);
});
