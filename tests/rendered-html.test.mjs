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
  assert.match(standaloneApp, /<input type="hidden" id="abbreviation" value="PMY">/);
  assert.match(standaloneApp, /Aufgabe anlegen/);
  assert.match(standaloneApp, /BOARD_COLORS/);
  assert.match(standaloneApp, /BOARD_PREFERENCES_KEY/);
  assert.doesNotMatch(standaloneApp, /Animation anlegen/);
  assert.doesNotMatch(standaloneApp, /id="broadcastSwitch"/);
  assert.doesNotMatch(standaloneApp, /id="deleteBoard"/);
  assert.doesNotMatch(standaloneApp, /function deleteActiveBoard\(\)/);
});

test("supports server-backed file uploads and cropped title images", async () => {
  const [standaloneApp, api, manifest, serviceWorker] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../api.php", import.meta.url), "utf8"),
    readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../sw.js", import.meta.url), "utf8"),
  ]);

  assert.match(standaloneApp, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(standaloneApp, /navigator\.serviceWorker\.register\("\.\/sw\.js"\)/);
  assert.match(standaloneApp, /id="chooseExistingCover"/);
  assert.match(standaloneApp, /id="imagePickerModal"/);
  assert.match(standaloneApp, /function openImagePicker\(\)/);
  assert.match(standaloneApp, /function pickExistingCover\(index\)/);
  assert.match(standaloneApp, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(standaloneApp, /id="attachmentInput" type="file" multiple/);
  assert.match(standaloneApp, /id="coverInput" type="file" accept="image\/\*"/);
  assert.match(standaloneApp, /<canvas class="crop-canvas" id="cropCanvas" width="1470" height="630"><\/canvas>/);
  assert.match(standaloneApp, /aspect-ratio:\s*21 \/ 9/);
  assert.match(standaloneApp, /attachments:\s*normalizeFileList\(task\.attachments\)/);
  assert.match(standaloneApp, /coverImage:\s*normalizeFileMeta\(task\.coverImage\)/);
  assert.match(standaloneApp, /action=upload/);
  assert.match(standaloneApp, /data-action="attach"/);
  assert.match(standaloneApp, /isInspectingCard = Boolean\(document\.querySelector\("\.card:hover"\)\)/);
  assert.match(standaloneApp, /id="galleryModal"/);
  assert.match(standaloneApp, /id="galleryPrev"/);
  assert.match(standaloneApp, /id="galleryNext"/);
  assert.match(standaloneApp, /function boardImages\(\)/);
  assert.match(standaloneApp, /function stepGallery\(direction\)/);
  assert.match(standaloneApp, /event\.key === "ArrowLeft"/);
  assert.match(standaloneApp, /event\.key === "ArrowRight"/);
  assert.match(standaloneApp, /data-action="view-file"/);
  assert.match(standaloneApp, /data-action="delete-file"/);
  assert.match(standaloneApp, /grid-auto-columns:\s*minmax\(390px, 1fr\)/);
  assert.match(standaloneApp, /grid-auto-columns:\s*minmax\(0, calc\(100vw - 28px\)\)/);
  assert.match(standaloneApp, /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(74px, auto\)/);
  assert.match(standaloneApp, /download="\$\{escapeHtml\(file\.name\)\}"/);
  assert.match(standaloneApp, /async function deleteTaskFile/);
  assert.match(api, /CREATE TABLE IF NOT EXISTS uploaded_files/);
  assert.match(api, /function handleUpload\(\): never/);
  assert.match(api, /function streamFile\(\): never/);
  assert.match(api, /function deleteUploadedFile\(string \$id\): void/);
  assert.match(api, /move_uploaded_file/);
  assert.match(api, /unlink\(\$path\)/);
  assert.match(api, /\$action === 'upload'/);
  assert.match(api, /\$action === 'file'/);
  assert.match(api, /\$action === 'deleteFile'/);
  assert.match(manifest, /"display": "standalone"/);
  assert.match(manifest, /"start_url": "\.\/"/);
  assert.match(serviceWorker, /CACHE_NAME/);
  assert.match(serviceWorker, /api\.php/);
});
