"use client";

import JSZip from "jszip";
import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type TimerKind = "preparation" | "animation";
type ViewMode = "board" | "timeline";
type WorkStatus =
  | "planning"
  | "animation"
  | "approval"
  | "delivered";

type TimerSession = {
  id: string;
  kind: TimerKind;
  startedAt: string;
  endedAt: string;
  seconds: number;
};

type Task = {
  id: string;
  title: string;
  projectType: "ANIM" | "INFO" | "KARTE";
  abbreviation: string;
  source: "Formular" | "Mail" | "Mundlich" | "Teams" | "Sonstiges";
  requester: string;
  description: string;
  sendSlot: string;
  productionDeadline: string;
  workStatus: WorkStatus;
  activeTimer: null | { kind: TimerKind; startedAt: string };
  sessions: TimerSession[];
  createdAt: string;
  completedAt: string | null;
};

type Draft = {
  title: string;
  projectType: Task["projectType"];
  abbreviation: string;
  source: Task["source"];
  requester: string;
  description: string;
  sendSlot: string;
  deadlineDate: string;
  deadlineTime: string;
};

const STORAGE_KEY = "zeitmanagement-tool-v3";
const SEND_SLOTS = ["17:45", "19:30", "21:45"];
const DAY_START_HOUR = 12;
const DAY_END_HOUR = 22;
const TIMER_LABELS: Record<TimerKind, string> = {
  preparation: "Vorbereitung",
  animation: "in Arbeit",
};
const BOARD_COLUMNS: Array<{ key: WorkStatus; title: string }> = [
  { key: "planning", title: "in Planung" },
  { key: "animation", title: "in Arbeit" },
  { key: "approval", title: "Abnahme" },
  { key: "delivered", title: "Fertig" },
];

const initialDraft = (): Draft => {
  const deadline = new Date();
  deadline.setHours(17, 15, 0, 0);

  return {
    title: "Animation",
    projectType: "ANIM",
    abbreviation: "",
    source: "Formular",
    requester: "",
    description: "",
    sendSlot: "17:45",
    deadlineDate: toLocalDate(deadline),
    deadlineTime: "17:15",
  };
};

function toLocalDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function combineDeadline(date: string, time: string) {
  return `${date}T${time || "17:15"}`;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function secondsBetween(start: string, end = new Date().toISOString()) {
  return Math.max(
    0,
    Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000),
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function sanitizeFolderName(name: string) {
  return name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80) || "Animationsprojekt";
}

function formatFolderDate(value: string) {
  return value || toLocalDate(new Date());
}

function getProjectFolderName(task: Task) {
  return sanitizeFolderName(
    `AKT ${formatFolderDate(task.productionDeadline.slice(0, 10))} ${task.projectType} ${task.abbreviation || task.title}`,
  );
}

function sumSessions(task: Task, kind?: TimerKind, at = new Date()) {
  const logged = task.sessions
    .filter((session) => !kind || session.kind === kind)
    .reduce((sum, session) => sum + session.seconds, 0);

  if (!task.activeTimer || (kind && task.activeTimer.kind !== kind)) return logged;
  return logged + secondsBetween(task.activeTimer.startedAt, at.toISOString());
}

function getRisk(task: Task, now: Date) {
  if (task.completedAt || task.workStatus === "delivered") return "done";
  const remainingSeconds = Math.floor(
    (new Date(task.productionDeadline).getTime() - now.getTime()) / 1000,
  );

  if (remainingSeconds <= 0) return "late";
  if (remainingSeconds <= 15 * 60) return "critical";
  if (remainingSeconds <= 30 * 60) return "tight";
  return "ok";
}

function riskLabel(risk: string) {
  if (risk === "done") return "Fertig";
  if (risk === "late") return "Ueberfaellig";
  if (risk === "critical") return "Kritisch";
  if (risk === "tight") return "Knapp";
  return "Im Plan";
}

function normalizeWorkStatus(status: string | undefined): WorkStatus {
  if (status === "briefing" || status === "preparation") return "planning";
  if (status === "correction" || status === "render") return "approval";
  if (status === "planning" || status === "animation" || status === "approval" || status === "delivered") {
    return status;
  }
  return "planning";
}

function closeActiveTimer(task: Task, endedAt = new Date().toISOString()) {
  if (!task.activeTimer) return { sessions: task.sessions, activeTimer: null };

  const session: TimerSession = {
    id: uid(),
    kind: task.activeTimer.kind,
    startedAt: task.activeTimer.startedAt,
    endedAt,
    seconds: secondsBetween(task.activeTimer.startedAt, endedAt),
  };

  return {
    activeTimer: null,
    sessions: [...task.sessions, session],
  };
}

function normalizeTasks(raw: string | null): Task[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<Partial<Task>>;
    return parsed.map((task) => ({
      id: task.id ?? uid(),
      title: task.title ?? "Animation",
      projectType: task.projectType ?? "ANIM",
      abbreviation: task.abbreviation ?? "",
      source: task.source ?? "Formular",
      requester: task.requester ?? "",
      description: task.description ?? "",
      sendSlot: task.sendSlot ?? "17:45",
      productionDeadline: task.productionDeadline ?? combineDeadline(toLocalDate(new Date()), "17:15"),
      workStatus: normalizeWorkStatus(task.workStatus),
      activeTimer: task.activeTimer ?? null,
      sessions: task.sessions ?? [],
      createdAt: task.createdAt ?? new Date().toISOString(),
      completedAt: task.completedAt ?? null,
    }));
  } catch {
    return [];
  }
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasLoadedLocalTasks, setHasLoadedLocalTasks] = useState(false);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [now, setNow] = useState(new Date());
  const [view, setView] = useState<ViewMode>("board");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [noticePermission, setNoticePermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "default";
    return Notification.permission;
  });
  const warnedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTasks(
        normalizeTasks(
          window.localStorage.getItem(STORAGE_KEY) ??
            window.localStorage.getItem("zeitmanagement-tool-v2") ??
            window.localStorage.getItem("zeitmanagement-tool-v1"),
        ),
      );
      setHasLoadedLocalTasks(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalTasks) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [hasLoadedLocalTasks, tasks]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (noticePermission !== "granted") return;
    tasks.forEach((task) => {
      const risk = getRisk(task, now);
      const minutesLeft = Math.floor(
        (new Date(task.productionDeadline).getTime() - now.getTime()) / 60000,
      );
      const key = `${task.id}-${risk}-${minutesLeft}`;
      const shouldWarn =
        !task.completedAt &&
        (risk === "critical" || minutesLeft === 30 || minutesLeft === 15 || minutesLeft === 5);

      if (!shouldWarn || warnedRef.current.has(key)) return;
      warnedRef.current.add(key);
      new Notification(`Zeitkritisch: ${task.title}`, {
        body: `${riskLabel(risk)}. Deadline ${formatClock(task.productionDeadline)}, Sendung ${task.sendSlot}.`,
      });
    });
  }, [noticePermission, now, tasks]);

  const activeTasks = tasks
    .filter((task) => !task.completedAt && task.workStatus !== "delivered")
    .sort((a, b) => new Date(a.productionDeadline).getTime() - new Date(b.productionDeadline).getTime());
  const completedTasks = tasks.filter((task) => task.completedAt || task.workStatus === "delivered");

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todaysTasks = tasks.filter((task) => task.createdAt.slice(0, 10) === today);
    const worked = todaysTasks.reduce((sum, task) => sum + sumSessions(task, undefined, now), 0);
    const prep = todaysTasks.reduce((sum, task) => sum + sumSessions(task, "preparation", now), 0);
    const animation = todaysTasks.reduce((sum, task) => sum + sumSessions(task, "animation", now), 0);
    return { worked, prep, animation };
  }, [tasks, now]);

  function addTask() {
    const task: Task = {
      id: uid(),
      title: draft.title,
      projectType: draft.projectType,
      abbreviation: draft.abbreviation,
      source: draft.source,
      requester: draft.requester,
      description: draft.description,
      sendSlot: draft.sendSlot,
      productionDeadline: combineDeadline(draft.deadlineDate, draft.deadlineTime),
      workStatus: "planning",
      activeTimer: null,
      sessions: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    setTasks((current) => [task, ...current]);
    setDraft(initialDraft());
    setIsComposerOpen(false);
  }

  function patchTask(id: string, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  function moveTask(id: string, workStatus: WorkStatus) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id) return task;
        const timerPatch =
          workStatus === "approval" || workStatus === "delivered"
            ? closeActiveTimer(task)
            : {};

        return {
          ...task,
          ...timerPatch,
          workStatus,
          completedAt: workStatus === "delivered" ? new Date().toISOString() : null,
        };
      }),
    );
  }

  function startTimer(task: Task, kind: TimerKind) {
    if (task.activeTimer) stopTimer(task);
    patchTask(task.id, {
      activeTimer: { kind, startedAt: new Date().toISOString() },
      workStatus: kind === "preparation" ? "planning" : "animation",
    });
  }

  function stopTimer(task: Task) {
    if (!task.activeTimer) return;
    patchTask(task.id, {
      ...closeActiveTimer(task),
    });
  }

  async function downloadProjectFolder(task: Task) {
    const folderName = getProjectFolderName(task);
    const zip = new JSZip();
    const root = zip.folder(folderName);
    root?.folder("_MAT");
    root?.folder("_ERG");

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${folderName}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNoticePermission(permission);
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1d2525]">
      <section className="border-b border-[#d7d2c6] bg-[#fffdf8]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-5 py-5 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#69716d]">
                Zeitmanagement fuer Animationen
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#14201e] md:text-4xl">
                Produktions-Timeline
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Aktive Jobs" value={String(activeTasks.length)} />
              <Metric label="Heute erfasst" value={formatDuration(summary.worked)} />
              <Metric label="Vorbereitung" value={formatDuration(summary.prep)} />
              <Metric label="in Arbeit" value={formatDuration(summary.animation)} />
            </div>
          </div>

          <div className="top-actions">
            <button className="add-task-button" onClick={() => setIsComposerOpen(true)}>
              <span>+</span>
              Aufgabe hinzufuegen
            </button>
            <div className="view-switch" aria-label="Ansicht wechseln">
              <button className={view === "board" ? "active" : ""} onClick={() => setView("board")}>
                Kanban
              </button>
              <button className={view === "timeline" ? "active" : ""} onClick={() => setView("timeline")}>
                Produktions-Timeline
              </button>
            </div>
            <button className="control-button" onClick={enableNotifications}>
              Benachrichtigungen {noticePermission === "granted" ? "aktiv" : "aktivieren"}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-5 lg:px-8">
        <section className="space-y-4">
          <div className="learning-strip">
            <LearningRow label="Durchschnitt Vorbereitung" value={average(completedTasks, "preparation")} />
            <LearningRow label="Durchschnitt in Arbeit" value={average(completedTasks, "animation")} />
            <LearningRow label="Abgeschlossene Jobs" value={`${completedTasks.length}`} />
          </div>
          {view === "timeline" ? (
            <ProductionOverview tasks={activeTasks} now={now} />
          ) : (
            <KanbanBoard
              tasks={tasks}
              now={now}
              onMove={moveTask}
              onStart={startTimer}
              onStop={stopTimer}
              onDownload={downloadProjectFolder}
            />
          )}
        </section>
      </section>

      {isComposerOpen && (
        <TaskComposerDialog
          draft={draft}
          onDraftChange={setDraft}
          onAdd={addTask}
          onClose={() => setIsComposerOpen(false)}
        />
      )}
    </main>
  );
}

function TaskComposerDialog({
  draft,
  onDraftChange,
  onAdd,
  onClose,
}: {
  draft: Draft;
  onDraftChange: (draft: Draft) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Aufgabe hinzufuegen">
      <div className="task-modal">
        <div className="modal-head">
          <h2>Aufgabe hinzufuegen</h2>
          <button onClick={onClose} aria-label="Schliessen">x</button>
        </div>
        <div className="form-grid">
          <label>
            Aufgabe
            <input value={draft.title} onChange={(e) => onDraftChange({ ...draft, title: e.target.value })} />
          </label>
          <div className="composer-row">
            <label>
              Typ
              <select value={draft.projectType} onChange={(e) => onDraftChange({ ...draft, projectType: e.target.value as Task["projectType"] })}>
                <option>ANIM</option>
                <option>INFO</option>
                <option>KARTE</option>
              </select>
            </label>
            <label>
              Kuerzel
              <input value={draft.abbreviation} onChange={(e) => onDraftChange({ ...draft, abbreviation: e.target.value.toUpperCase() })} />
            </label>
          </div>
          <div className="composer-row">
            <label>
              Auftrag von
              <input value={draft.requester} onChange={(e) => onDraftChange({ ...draft, requester: e.target.value })} />
            </label>
            <label>
              Quelle
              <select value={draft.source} onChange={(e) => onDraftChange({ ...draft, source: e.target.value as Task["source"] })}>
                <option>Formular</option>
                <option>Mail</option>
                <option>Mundlich</option>
                <option>Teams</option>
                <option>Sonstiges</option>
              </select>
            </label>
          </div>
          <label>
            Sendezeit
            <div className="slot-row">
              {SEND_SLOTS.map((slot) => (
                <button
                  key={slot}
                  className={draft.sendSlot === slot ? "slot active" : "slot"}
                  onClick={() => onDraftChange({ ...draft, sendSlot: slot })}
                  type="button"
                >
                  {slot}
                </button>
              ))}
            </div>
          </label>
          <div className="deadline-row">
            <label>
              Deadline-Datum
              <input
                type="date"
                value={draft.deadlineDate}
                onChange={(e) => onDraftChange({ ...draft, deadlineDate: e.target.value })}
              />
            </label>
            <label>
              Deadline-Zeit
              <input
                type="time"
                value={draft.deadlineTime}
                onChange={(e) => onDraftChange({ ...draft, deadlineTime: e.target.value })}
              />
            </label>
          </div>
          <label>
            Notiz
            <textarea
              rows={4}
              value={draft.description}
              onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
            />
          </label>
        </div>
        <div className="modal-actions">
          <button className="control-button" onClick={onClose}>Abbrechen</button>
          <button className="primary-button" onClick={onAdd}>Animation anlegen</button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LearningRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#e3ded2] pb-2 last:border-0">
      <span className="text-[#66706b]">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function average(tasks: Task[], kind: TimerKind) {
  if (tasks.length === 0) return "-";
  const values = tasks.map((task) => sumSessions(task, kind)).filter(Boolean);
  if (values.length === 0) return "-";
  return formatDuration(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function KanbanBoard({
  tasks,
  now,
  onMove,
  onStart,
  onStop,
  onDownload,
}: {
  tasks: Task[];
  now: Date;
  onMove: (id: string, status: WorkStatus) => void;
  onStart: (task: Task, kind: TimerKind) => void;
  onStop: (task: Task) => void;
  onDownload: (task: Task) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div className="kanban-board">
      {BOARD_COLUMNS.map((column) => {
        const columnTasks = tasks
          .filter((task) => task.workStatus === column.key)
          .sort((a, b) => new Date(a.productionDeadline).getTime() - new Date(b.productionDeadline).getTime());

        return (
          <section
            className={draggingId ? "kanban-column dragging" : "kanban-column"}
            key={column.key}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/task-id") || draggingId;
              if (id) onMove(id, column.key);
              setDraggingId(null);
            }}
          >
            <div className="kanban-head">
              <h2>{column.title}</h2>
              <span>{columnTasks.length}</span>
            </div>
            <div className="kanban-stack">
              {columnTasks.length === 0 ? (
                <div className="kanban-empty">Leer</div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    now={now}
                    onStart={onStart}
                    onStop={onStop}
                    onDownload={onDownload}
                    onDragStart={(id, event) => {
                      event.dataTransfer.setData("text/task-id", id);
                      setDraggingId(id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ProductionOverview({ tasks, now }: { tasks: Task[]; now: Date }) {
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, index) => DAY_START_HOUR + index,
  );
  const totalMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowPosition = ((nowMinutes - DAY_START_HOUR * 60) / totalMinutes) * 100;

  return (
    <div className="overview-panel">
      <div className="overview-head">
        <h2>Produktions-Timeline</h2>
        <div className="legend">
          <span className="legend-ok">Im Plan</span>
          <span className="legend-tight">Knapp</span>
          <span className="legend-critical">Kritisch</span>
        </div>
      </div>
      <div className="time-grid">
        <div className="time-label blank" />
        <div className="time-scale">
          {hours.map((hour) => (
            <span key={hour}>{hour}:00</span>
          ))}
        </div>

        {tasks.length === 0 ? (
          <div className="timeline-empty">Keine aktiven Animationen.</div>
        ) : (
          tasks.map((task) => {
            const deadline = new Date(task.productionDeadline);
            const deadlineMinutes = deadline.getHours() * 60 + deadline.getMinutes();
            const created = new Date(task.createdAt);
            const createdMinutes = created.getHours() * 60 + created.getMinutes();
            const startMinutes = Math.max(DAY_START_HOUR * 60, Math.min(createdMinutes, deadlineMinutes));
            const left = ((startMinutes - DAY_START_HOUR * 60) / totalMinutes) * 100;
            const width = ((deadlineMinutes - startMinutes) / totalMinutes) * 100;
            const deadlineLeft = ((deadlineMinutes - DAY_START_HOUR * 60) / totalMinutes) * 100;
            const [sendHour, sendMinute] = task.sendSlot.split(":").map(Number);
            const sendLeft = (((sendHour * 60 + sendMinute) - DAY_START_HOUR * 60) / totalMinutes) * 100;
            const risk = getRisk(task, now);

            return (
              <div className="timeline-row" key={task.id}>
                <div className="time-label">
                  <strong>{task.title}</strong>
                  <span>{formatDuration(sumSessions(task, undefined, now))} erfasst</span>
                </div>
                <div className="time-track">
                  <div className={`overview-bar ${risk}`} style={{ left: `${left}%`, width: `${Math.max(width, 8)}%` }}>
                    {riskLabel(risk)}
                  </div>
                  <span className="deadline-pin" style={{ left: `${deadlineLeft}%` }}>
                    Deadline {formatClock(task.productionDeadline)}
                  </span>
                  <span className="send-pin" style={{ left: `${sendLeft}%` }}>
                    Sendung {task.sendSlot}
                  </span>
                  {nowPosition >= 0 && nowPosition <= 100 && (
                    <span className="track-now" style={{ left: `${nowPosition}%` }} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  now,
  onStart,
  onStop,
  onDownload,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  now: Date;
  onStart: (task: Task, kind: TimerKind) => void;
  onStop: (task: Task) => void;
  onDownload: (task: Task) => void;
  onDragStart: (id: string, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
  const risk = getRisk(task, now);
  const remaining = Math.floor((new Date(task.productionDeadline).getTime() - now.getTime()) / 1000);
  const worked = sumSessions(task, undefined, now);

  return (
    <article
      className={`task-card ${risk}`}
      draggable
      onDragStart={(event) => onDragStart(task.id, event)}
      onDragEnd={onDragEnd}
    >
      <div className="task-top">
        <div>
          <div className="task-kicker">
            <span>{task.source}</span>
            <span>{task.projectType}</span>
            {task.abbreviation && <span>{task.abbreviation}</span>}
            <span>Sendung {task.sendSlot}</span>
            <span>Deadline {formatClock(task.productionDeadline)}</span>
          </div>
          <h3>{task.title}</h3>
          {task.requester && <p>{task.requester}</p>}
        </div>
        <div className="status-box">
          <span>{riskLabel(risk)}</span>
          <strong>{remaining > 0 ? formatDuration(remaining) : "0m"}</strong>
        </div>
      </div>

      <div className="risk-row compact">
        <div>
          <span>Verbleibend</span>
          <strong>{remaining > 0 ? formatDuration(remaining) : "0m"}</strong>
        </div>
        <div>
          <span>Erfasst</span>
          <strong>{formatDuration(worked)}</strong>
        </div>
      </div>

      <div className="timer-row">
        {(["preparation", "animation"] as TimerKind[]).map((kind) => {
          const active = task.activeTimer?.kind === kind;
          return (
            <button
              key={kind}
              className={active ? "timer active" : "timer"}
              onClick={() => (active ? onStop(task) : onStart(task, kind))}
            >
              <span>{TIMER_LABELS[kind]}</span>
              <strong>{formatDuration(sumSessions(task, kind, now))}</strong>
            </button>
          );
        })}
      </div>

      {task.activeTimer && (
        <button className="stop-button full" onClick={() => onStop(task)}>
          Timer stoppen
        </button>
      )}

      <button className="folder-button" onClick={() => onDownload(task)}>
        Projektordner herunterladen
      </button>

      {task.description && <p className="task-note">{task.description}</p>}
    </article>
  );
}
