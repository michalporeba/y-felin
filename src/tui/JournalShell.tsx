import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import type { ActionId, ActionMap, AppServices, AppStore, JournalBlock, JournalEntry, JournalKind, JournalParagraph, Placement } from "../core/index.js";
import { compareOrder, createAppStore, ordered, validJournalDate } from "../core/index.js";
import { defaultJournalKeymap, journalCommandId, resolveJournalStroke, type JournalCommand, type JournalKeymap, type JournalKeymapOverrides } from "./journal-keymap.js";
import { strokeFromInput } from "./keymap.js";

type Row = { key: string; date: string; entry?: JournalEntry };
type CaptureTarget = { kind: JournalKind; placement: Placement; journalDate: string; parentId?: string; anchorId?: string; keepPosition: boolean };
type Draft = { token: number; type: "entry" | "paragraph"; id?: string; target?: CaptureTarget; parentId?: string; text: string; cursor: number; savedText: string; error?: string; saving?: boolean };
type DetailItem = { type: "heading"; value: JournalEntry } | JournalBlock;

export type JournalShellProps = {
  services: AppServices;
  store?: AppStore;
  columns?: number;
  rows?: number;
  showTopBar: boolean;
  showBottomBar: boolean;
  dayOrder?: "oldest-first" | "newest-first";
  keymapOverrides?: JournalKeymapOverrides;
};

const icons: Record<JournalKind, string> = { note: "-", idea: "✧", task: "□", event: "◦", checklist: "☷", appointment: "◇" };
const asciiIcons: Record<JournalKind, string> = { note: "-", idea: "!", task: "t", event: "o", checklist: "#", appointment: "@" };
const ascii = process.env.Y_FELIN_ASCII_ICONS === "1";
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const graphemes = (value: string) => [...segmenter.segment(value)].map((part) => part.segment);

function entryIcon(entry: JournalEntry): string {
  if (entry.kind === "task") return ascii
    ? entry.workflowState === "done" ? "x" : entry.workflowState === "active" ? "T" : "t"
    : entry.workflowState === "done" ? "■" : entry.workflowState === "active" ? "◩" : "□";
  return ascii ? asciiIcons[entry.kind] : icons[entry.kind];
}

function currentRows(entries: JournalEntry[], today: string, visitedDay: string, dayOrder: "oldest-first" | "newest-first"): Row[] {
  const days = new Set(entries.filter((entry) => !entry.parentId).map((entry) => entry.journalDate));
  days.add(today);
  days.add(visitedDay);
  const orderedDays = [...days].sort((a, b) => dayOrder === "oldest-first" ? a.localeCompare(b) : b.localeCompare(a));
  return orderedDays.flatMap((date) => [
    { key: `day:${date}`, date },
    ...ordered(entries.filter((entry) => !entry.parentId && entry.journalDate === date)).map((entry) => ({ key: `entry:${entry.id}`, date, entry })),
  ]);
}

function visibleSlice<T>(rows: T[], selected: number, height: number): T[] {
  if (height <= 0) return [];
  const start = Math.max(0, Math.min(Math.max(0, selected - Math.floor(height / 2)), rows.length - height));
  return rows.slice(start, start + height);
}

function inlineMarkup(source: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(source.slice(cursor, index));
    parts.push(match[1] ? <Text key={index} bold>{match[1]}</Text> : <Text key={index} italic>{match[2]}</Text>);
    cursor = index + match[0].length;
  }
  if (cursor < source.length) parts.push(source.slice(cursor));
  return parts;
}

type StyledCharacter = { readonly char: string; readonly bold: boolean; readonly italic: boolean };
function wrappedMarkup(source: string, width: number): StyledCharacter[][] {
  const chars: StyledCharacter[] = [];
  const pattern = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  let cursor = 0;
  const add = (text: string, bold: boolean, italic: boolean) => {
    for (const char of graphemes(text)) chars.push({ char, bold, italic });
  };
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    add(source.slice(cursor, index), false, false);
    add(match[1] ?? match[2] ?? "", Boolean(match[1]), Boolean(match[2]));
    cursor = index + match[0].length;
  }
  add(source.slice(cursor), false, false);
  const lines: StyledCharacter[][] = [[]];
  for (const char of chars) {
    if (char.char === "\n") { lines.push([]); continue; }
    if (lines[lines.length - 1]!.length >= Math.max(1, width)) lines.push([]);
    lines[lines.length - 1]!.push(char);
  }
  return lines;
}

function styledRow(chars: readonly StyledCharacter[]): React.ReactNode[] {
  const runs: { text: string; bold: boolean; italic: boolean }[] = [];
  for (const char of chars) {
    const last = runs.at(-1);
    if (last && last.bold === char.bold && last.italic === char.italic) last.text += char.char;
    else runs.push({ text: char.char, bold: char.bold, italic: char.italic });
  }
  return runs.map((run, index) => <Text key={index} bold={run.bold} italic={run.italic}>{run.text}</Text>);
}

function displayEditor(text: string, cursor: number, width: number): string {
  const chars = graphemes(text.replaceAll("\n", "↵"));
  const safeCursor = Math.max(0, Math.min(cursor, chars.length));
  const space = Math.max(4, width - 2);
  const start = Math.max(0, safeCursor - Math.floor(space / 2));
  return `${start ? "‹" : ""}${chars.slice(start, start + space).join("")}│${chars.length > start + space ? "›" : ""}`;
}

function journalHelpLines(map: JournalKeymap): string[] {
  const compact = (keys: string) => keys.replaceAll(" ", "");
  const labels = new Map<string, string[]>();
  for (const [keys, command] of map) {
    const id = journalCommandId(command);
    labels.set(id, [...(labels.get(id) ?? []), compact(keys)]);
  }
  return [
    "Journal commands (normal mode)",
    "Prefix keys show their continuations below the journal.",
    ...[...labels.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, keys]) => `${keys.join(", ").padEnd(13)} ${id}`),
    "Journal append targets today; details append targets the focused entry.",
    ascii ? "- note · ! idea · o event · # checklist · @ appointment" : "- note · ✧ idea · ◦ event · ☷ checklist · ◇ appointment",
    ascii ? "t open · T active · x done · * priority · + extra content" : "□ open · ◩ active · ■ done · * priority · + extra content",
    "Text mode: arrows/Home/End move caret; Ctrl+n adds a paragraph line break.",
    "Text autosaves locally. Esc leaves insertion; failed drafts remain editable.",
    "Esc or ? closes help.",
  ];
}

export function JournalShell({ services, store, columns: columnsProp, rows: rowsProp, showTopBar, showBottomBar, dayOrder: orderProp, keymapOverrides }: JournalShellProps) {
  const { exit } = useApp();
  const [appStore] = useState(() => store ?? createAppStore(services));
  const dispatch = async <T extends ActionId>(actionId: T, input: ActionMap[T]["input"]): Promise<ActionMap[T]["output"]> => {
    const result = await appStore.dispatch(actionId, input);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  };
  const size = useWindowSize();
  const columns = Math.max(1, columnsProp ?? size.columns);
  const rows = Math.max(1, rowsProp ?? size.rows);
  const topVisible = showTopBar && rows >= 2;
  const bottomVisible = showBottomBar && rows >= 3;
  const height = Math.max(1, rows - Number(topVisible) - Number(bottomVisible));
  const narrow = columns < 70;
  const leftWidth = narrow ? columns : Math.floor(columns / 2);
  const rightWidth = columns - leftWidth;
  const keymap = useMemo(() => defaultJournalKeymap(keymapOverrides), [keymapOverrides]);
  const helpLines = useMemo(() => journalHelpLines(keymap), [keymap]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [paragraphs, setParagraphs] = useState<JournalParagraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(() => services.journal.today());
  const [visitedDay, setVisitedDay] = useState(() => services.journal.today());
  const [selectedKey, setSelectedKey] = useState(() => `day:${services.journal.today()}`);
  const [dayOrder, setDayOrder] = useState<"oldest-first" | "newest-first">(orderProp ?? (process.env.Y_FELIN_JOURNAL_ORDER === "newest-first" ? "newest-first" : "oldest-first"));
  const [focus, setFocus] = useState<"journal" | "details">("journal");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailParentId, setDetailParentId] = useState<string>();
  const [detailIndex, setDetailIndex] = useState(0);
  const [detailScroll, setDetailScroll] = useState(0);
  const [pending, setPending] = useState("");
  const [continuations, setContinuations] = useState<string[]>([]);
  const [modal, setModal] = useState<"none" | "help" | "date" | "views" | "quit-warning">("none");
  const [helpIndex, setHelpIndex] = useState(0);
  const [dateText, setDateText] = useState("");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<Draft>();
  const draftRef = useRef<Draft | undefined>(undefined);
  const saveLock = useRef<Promise<boolean> | undefined>(undefined);
  const tokenCounter = useRef(0);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [syncConfigured, setSyncConfigured] = useState(false);

  const refresh = async () => {
    try {
      const [nextEntries, nextParagraphs, sync] = await Promise.all([dispatch("journal.list", undefined), dispatch("journal.paragraphs", undefined), dispatch("sync.state", undefined)]);
      setEntries(nextEntries);
      setParagraphs(nextParagraphs);
      setPendingChanges(sync.pendingChanges);
      setSyncConfigured(sync.configured);
      setLoading(false);
      return { nextEntries, nextParagraphs };
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load journal.");
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, [services]);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => { if (orderProp) setDayOrder(orderProp); }, [orderProp]);

  const topLevelRows = currentRows(entries, today, visitedDay, dayOrder);
  const selectedIndex = Math.max(0, topLevelRows.findIndex((row) => row.key === selectedKey));
  const selectedRow = topLevelRows[selectedIndex];
  const activeParentId = focus === "journal" ? selectedRow?.entry?.id : detailParentId;
  const parent = entries.find((entry) => entry.id === activeParentId);
  const detailBlocks: JournalBlock[] = parent ? [
    ...entries.filter((entry) => entry.parentId === parent.id).map((value): JournalBlock => ({ type: "entry", value })),
    ...paragraphs.filter((paragraph) => paragraph.parentId === parent.id).map((value): JournalBlock => ({ type: "paragraph", value })),
  ].sort((a, b) => compareOrder(a.value.order, b.value.order) || a.value.id.localeCompare(b.value.id)) : [];
  const detailItems: DetailItem[] = parent ? [{ type: "heading", value: parent }, ...detailBlocks] : [];
  const safeDetailIndex = Math.min(detailIndex, Math.max(0, detailItems.length - 1));
  const activeDetail = detailItems[safeDetailIndex];
  const hasDetails = (entry: JournalEntry) => entries.some((other) => other.parentId === entry.id) || paragraphs.some((paragraph) => paragraph.parentId === entry.id);

  const updateDraft = (change: (current: Draft) => Draft) => {
    if (!draftRef.current) return;
    const next = change(draftRef.current);
    draftRef.current = next;
    setDraft(next);
  };
  const beginDraft = (next: Omit<Draft, "token" | "savedText">) => {
    const created = { ...next, token: ++tokenCounter.current, savedText: next.id ? next.text : "" };
    draftRef.current = created;
    setDraft(created);
    setMessage("");
  };

  const saveDraft = async (): Promise<boolean> => {
    if (saveLock.current) return saveLock.current;
    const snapshot = draftRef.current;
    if (!snapshot) return true;
    if (!snapshot.text.trim() && !snapshot.id) return true;
    if (snapshot.id && snapshot.text === snapshot.savedText) return true;
    const task = (async () => {
      updateDraft((current) => current.token === snapshot.token ? { ...current, saving: true, error: undefined } : current);
      try {
        let savedId = snapshot.id;
        if (snapshot.type === "entry") {
          if (snapshot.id) await dispatch("journal.updateTitle", { id: snapshot.id, title: snapshot.text });
          else if (snapshot.target) savedId = (await dispatch("journal.create", { ...snapshot.target, title: snapshot.text })).id;
        } else {
          if (snapshot.id) await dispatch("journal.updateParagraph", { id: snapshot.id, text: snapshot.text });
          else if (snapshot.parentId && snapshot.target) savedId = (await dispatch("journal.paragraph", { parentId: snapshot.parentId, text: snapshot.text, placement: snapshot.target.placement, anchorId: snapshot.target.anchorId })).id;
        }
        updateDraft((current) => current.token === snapshot.token ? { ...current, id: savedId, savedText: snapshot.text, saving: false, error: undefined } : current);
        const refreshed = await refresh();
        if (savedId && snapshot.target && !snapshot.target.keepPosition) {
          if (!snapshot.target.parentId) { setSelectedKey(`entry:${savedId}`); setVisitedDay(snapshot.target.journalDate); }
          else if (refreshed) {
            const siblings = ordered([
              ...refreshed.nextEntries.filter((entry) => entry.parentId === snapshot.target?.parentId),
              ...refreshed.nextParagraphs.filter((paragraph) => paragraph.parentId === snapshot.target?.parentId),
            ]);
            const index = siblings.findIndex((item) => item.id === savedId);
            if (index >= 0) setDetailIndex(index + 1);
          }
        }
        setMessage("Saved locally");
        return true;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Save failed";
        updateDraft((current) => current.token === snapshot.token ? { ...current, saving: false, error: reason } : current);
        setMessage(`Unsaved: ${reason}`);
        return false;
      }
    })();
    saveLock.current = task;
    try { return await task; } finally { saveLock.current = undefined; }
  };

  useEffect(() => {
    if (!draft || !draft.text.trim() || (draft.id && draft.text === draft.savedText)) return;
    const timer = setTimeout(() => { void saveDraft(); }, 450);
    return () => clearTimeout(timer);
  }, [draft?.text, draft?.id, draft?.savedText]);

  const leaveText = async () => {
    const current = draftRef.current;
    if (!current) return;
    if (!current.text.trim() && !current.id) { draftRef.current = undefined; setDraft(undefined); return; }
    const saved = await saveDraft();
    if (!saved) return;
    // A later keystroke may have arrived while the save was in flight.
    const latest = draftRef.current;
    if (latest && latest.token === current.token && latest.text !== latest.savedText) {
      const again = await saveDraft();
      if (!again) return;
    }
    draftRef.current = undefined;
    setDraft(undefined);
  };

  const handleText = (input: string, key: { escape?: boolean; return?: boolean; leftArrow?: boolean; rightArrow?: boolean; backspace?: boolean; delete?: boolean; ctrl?: boolean; meta?: boolean; home?: boolean; end?: boolean }) => {
    if (key.escape || input === "\u001b") { void leaveText(); return; }
    if (key.return) {
      if (draftRef.current?.type === "paragraph") {
        // Enter confirms a paragraph; Ctrl+n inserts a soft line break.
        void leaveText();
      } else void leaveText();
      return;
    }
    if (key.ctrl && input === "n" && draftRef.current?.type === "paragraph") {
      updateDraft((current) => { const chars = graphemes(current.text); chars.splice(current.cursor, 0, "\n"); return { ...current, text: chars.join(""), cursor: current.cursor + 1 }; });
      return;
    }
    if (key.leftArrow || key.rightArrow || key.home || key.end) {
      updateDraft((current) => ({ ...current, cursor: key.home ? 0 : key.end ? graphemes(current.text).length : Math.max(0, Math.min(graphemes(current.text).length, current.cursor + (key.leftArrow ? -1 : 1))) }));
      return;
    }
    if (key.backspace || key.delete) {
      updateDraft((current) => {
        const chars = graphemes(current.text);
        const index = key.backspace ? current.cursor - 1 : current.cursor;
        if (index >= 0 && index < chars.length) chars.splice(index, 1);
        return { ...current, text: chars.join(""), cursor: key.backspace ? Math.max(0, current.cursor - 1) : current.cursor };
      });
      return;
    }
    if (input && !key.ctrl && !key.meta) updateDraft((current) => {
      const chars = graphemes(current.text);
      const insertion = current.type === "entry" ? input.replaceAll(/[\r\n]+/g, " ") : input;
      const added = graphemes(insertion);
      chars.splice(current.cursor, 0, ...added);
      return { ...current, text: chars.join(""), cursor: current.cursor + added.length };
    });
  };

  const runCommand = async (command: JournalCommand) => {
    const day = selectedRow?.date ?? visitedDay;
    if (command.type === "help") { setModal("help"); setHelpIndex(0); return; }
    if (command.type === "quit") {
      if (draftRef.current?.error) { setModal("quit-warning"); return; }
      if (draftRef.current) { const saved = await saveDraft(); if (!saved) { setModal("quit-warning"); return; } }
      exit(); return;
    }
    if (command.type === "toggle-order") { setDayOrder((order) => order === "oldest-first" ? "newest-first" : "oldest-first"); return; }
    if (command.type === "view") { setModal("views"); return; }
    if (command.type === "day") {
      if (command.target === "choose") { setDateText(day); setModal("date"); return; }
      if (command.target === "today") {
        const nextToday = services.journal.today(); setToday(nextToday); setVisitedDay(nextToday); setSelectedKey(`day:${nextToday}`); setFocus("journal"); return;
      }
      const populated = [...new Set(entries.filter((entry) => !entry.parentId).map((entry) => entry.journalDate))].sort();
      const candidates = command.target === "previous" ? populated.filter((date) => date < day) : populated.filter((date) => date > day);
      const target = command.target === "previous" ? candidates.at(-1) : candidates[0];
      if (target) { setVisitedDay(target); setSelectedKey(`day:${target}`); setFocus("journal"); }
      return;
    }
    if (command.type === "pane") {
      if (command.target === "close") { setDetailsOpen(false); setFocus("journal"); setDetailParentId(undefined); setDetailScroll(0); }
      else if (command.target === "journal") setFocus("journal");
      else if (detailsOpen && activeParentId) { setFocus("details"); setDetailParentId(activeParentId); }
      return;
    }
    if (command.type === "preview") {
      if (focus === "details" && activeDetail?.type === "entry") { setDetailParentId(activeDetail.value.id); setDetailIndex(0); return; }
      if (!selectedRow?.entry) { setMessage("Select an entry to preview."); return; }
      setDetailsOpen((open) => !open); setFocus("journal"); setDetailParentId(selectedRow.entry.id); setDetailIndex(0); setDetailScroll(0); return;
    }
    if (command.type === "edit") {
      if (focus === "details" && activeDetail?.type === "entry") { setDetailParentId(activeDetail.value.id); setDetailIndex(0); return; }
      if (!selectedRow?.entry) { setMessage("Select an entry to open."); return; }
      setDetailsOpen(true); setFocus("details"); setDetailParentId(selectedRow.entry.id); setDetailIndex(0); setDetailScroll(0); return;
    }
    if (command.type === "move" || command.type === "edge" || command.type === "page") {
      const move = command.type === "move" ? command.direction : command.type === "page" ? command.direction * Math.max(1, Math.floor(height / 2)) : 0;
      if (focus === "details" && detailsOpen) {
        if (command.type === "page") {
          const nextScroll = Math.max(0, Math.min(Math.max(0, detailDisplay.length - contentHeight), detailScroll + move));
          setDetailScroll(nextScroll);
          setDetailIndex(detailDisplay[nextScroll]?.index ?? 0);
        } else setDetailIndex((index) => command.type === "edge" ? (command.edge === "first" ? 0 : Math.max(0, detailItems.length - 1)) : Math.max(0, Math.min(detailItems.length - 1, index + move)));
      } else {
        const index = command.type === "edge" ? (command.edge === "first" ? 0 : topLevelRows.length - 1) : Math.max(0, Math.min(topLevelRows.length - 1, selectedIndex + move));
        const row = topLevelRows[index];
        if (row) { setSelectedKey(row.key); setVisitedDay(row.date); }
      }
      return;
    }
    if (command.type === "capture") {
      if (command.today) setToday(services.journal.today());
      if (focus === "details" && detailsOpen) {
        if (!parent) { setMessage("Select an entry for details capture."); return; }
        if (parent.parentId && command.kind !== "note") { setMessage("Child entries can only contain paragraphs."); return; }
        const anchorId = command.placement === "before" || command.placement === "after" ? (activeDetail?.type === "heading" ? undefined : activeDetail?.value.id) : undefined;
        const placement = anchorId ? command.placement : command.placement === "before" || command.placement === "after" ? "first" : command.placement;
        const target: CaptureTarget = { kind: command.kind, placement, journalDate: parent.journalDate, parentId: parent.id, anchorId, keepPosition: false };
        beginDraft({ type: command.kind === "note" ? "paragraph" : "entry", target, parentId: parent.id, text: "", cursor: 0 });
      } else {
        const targetDate = command.today ? services.journal.today() : day;
        const anchorId = !command.today && (command.placement === "before" || command.placement === "after") ? selectedRow?.entry?.id : undefined;
        const placement = anchorId ? command.placement : command.placement === "before" || command.placement === "after" ? "first" : command.placement;
        beginDraft({ type: "entry", target: { kind: command.kind, placement, journalDate: targetDate, anchorId, keepPosition: command.today && targetDate !== day }, text: "", cursor: 0 });
      }
      return;
    }
    if (command.type === "heading") {
      const target = focus === "details" ? activeDetail?.value : selectedRow?.entry;
      if (!target) return;
      if ("text" in target) beginDraft({ type: "paragraph", id: target.id, text: target.text, cursor: graphemes(target.text).length });
      else beginDraft({ type: "entry", id: target.id, text: target.title, cursor: graphemes(target.title).length });
      return;
    }
    if (command.type === "workflow" || command.type === "priority") {
      const target = focus === "details" ? activeDetail?.value : selectedRow?.entry;
      if (!target || !("kind" in target) || target.kind !== "task") return;
      try {
        if (command.type === "workflow") await dispatch("journal.workflow", { id: target.id, direction: command.direction });
        else await dispatch("journal.priority", { id: target.id });
        await refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Task update failed."); }
    }
  };

  useInput((input, key) => {
    if (modal === "quit-warning") {
      if (input === "r") { setModal("none"); void saveDraft(); }
      else if (key.escape) setModal("none");
      return;
    }
    if (draftRef.current) {
      if (key.ctrl && input === "q") { setModal("quit-warning"); return; }
      handleText(input, key); return;
    }
    if (modal === "date") {
      if (key.escape) { setModal("none"); return; }
      if (key.return) {
        if (validJournalDate(dateText)) { setVisitedDay(dateText); setSelectedKey(`day:${dateText}`); setFocus("journal"); setModal("none"); }
        else setMessage("Enter a valid date as YYYY-MM-DD.");
        return;
      }
      if (key.backspace || key.delete) setDateText((value) => value.slice(0, -1));
      else if (input && !key.ctrl && !key.meta) setDateText((value) => value + input);
      return;
    }
    if (modal === "help") {
      if (key.escape || input === "?" || input === "q") setModal("none");
      else if (input === "j" || key.downArrow) setHelpIndex((value) => Math.min(helpLines.length - 1, value + 1));
      else if (input === "k" || key.upArrow) setHelpIndex((value) => Math.max(0, value - 1));
      return;
    }
    if (modal === "views") { if (key.escape || key.return || input === "q") setModal("none"); return; }
    if (key.escape || input === "\u001b") {
      if (pending) { setPending(""); setContinuations([]); return; }
      if (focus === "details") {
        if (parent?.parentId) { setDetailParentId(parent.parentId); setDetailIndex(0); }
        else setFocus("journal");
      } else if (detailsOpen) setDetailsOpen(false);
      return;
    }
    const stroke = strokeFromInput(input, key);
    if (!stroke) return;
    const resolution = resolveJournalStroke(keymap, pending, stroke);
    if (resolution.state === "pending") { setPending(resolution.sequence); setContinuations(resolution.continuations); return; }
    setPending(""); setContinuations([]);
    if (resolution.state === "command") void runCommand(resolution.command);
  });

  const leftRows = loading ? [{ key: "loading", date: today }] : topLevelRows;
  const leftSelected = loading ? 0 : selectedIndex;
  const paneHeaderVisible = height >= 2;
  const contentHeight = height - Number(paneHeaderVisible);
  const detailDisplay = detailItems.flatMap((item, index) => {
    const value = item.value;
    const source = "title" in value ? value.title : value.text;
    const prefix = item.type === "heading" ? "# " : "kind" in value ? `${entryIcon(value)} ` : "  ";
    const lines = wrappedMarkup(source, (narrow ? columns : rightWidth) - 6);
    return lines.map((chars, lineIndex) => ({ index, key: `${value.id}:${lineIndex}`, prefix: lineIndex ? "  " : prefix, chars, editing: draft?.id === value.id && lineIndex === 0 }));
  });
  const selectedDetailDisplay = Math.max(0, detailDisplay.findIndex((row) => row.index === safeDetailIndex));
  useEffect(() => {
    if (selectedDetailDisplay < detailScroll) setDetailScroll(selectedDetailDisplay);
    else if (selectedDetailDisplay >= detailScroll + contentHeight) setDetailScroll(Math.max(0, selectedDetailDisplay - contentHeight + 1));
  }, [selectedDetailDisplay, contentHeight, activeParentId]);
  const status = draft?.error ? `UNSAVED: ${draft.error}` : draft?.saving ? "Saving…" : draft ? "Editing · autosave" : message || (syncConfigured ? `Saved locally · ${pendingChanges} pending sync` : "Saved locally");
  const paneLabel = focus === "details" ? "Details" : "Journal";
  const binding = (id: string) => [...keymap.entries()].find(([, command]) => journalCommandId(command) === id)?.[0].replaceAll(" ", "") ?? "";
  const footer = modal === "date" ? `Date YYYY-MM-DD: ${dateText}_  Enter go · Esc cancel`
    : modal === "quit-warning" ? `Unsaved draft · r retry · Esc return`
    : draft?.error ? `${status} · Esc retry · Ctrl+q exit warning`
    : draft ? `${draft.id ? "Edit" : `New ${draft.type === "paragraph" ? "paragraph" : draft.target?.kind ?? "entry"}`} · ${draft.target?.parentId ? "details" : draft.target?.journalDate ?? paneLabel}> ${displayEditor(draft.text, draft.cursor, columns - 42)}  Esc finish`
    : pending ? `${pending.replaceAll(" ", "")} → ${continuations.join(" · ")} · Esc cancel`
    : `${paneLabel} · ${binding("help")} help · ${binding("capture.before.note")}/${binding("capture.today.note")} note · ${binding("preview")} preview · ${binding("edit")} details · ${status}`;

  const journalPane = (
    <Box flexDirection="column" width={detailsOpen && !narrow ? leftWidth : columns} height={height}>
      {paneHeaderVisible ? <Text bold wrap="truncate-end">Journal · {selectedRow?.date ?? today} {focus === "journal" ? "◀" : ""}</Text> : null}
      {visibleSlice(leftRows, leftSelected, contentHeight).map((row) => {
        if (loading) return <Text key={row.key}>Loading journal…</Text>;
        const selected = row.key === selectedKey;
        if (!row.entry) return <Text key={row.key} bold={selected} wrap="truncate-end">{selected ? ">" : " "} {row.date}{row.date === today ? " · today" : ""}{entries.some((entry) => !entry.parentId && entry.journalDate === row.date) ? "" : " · empty (in note · it task)"}</Text>;
        const value = row.entry;
        const marker = hasDetails(value) ? "+" : " ";
        const label = `${selected ? ">" : " "} ${value.priority === "high" ? "*" : " "}${entryIcon(value)} ${marker} `;
        return <Text key={row.key} bold={selected} wrap="truncate-end">{label}{inlineMarkup(value.title)}</Text>;
      })}
    </Box>
  );

  const detailsPane = (
    <Box flexDirection="column" width={narrow ? columns : rightWidth} height={height}>
      {paneHeaderVisible ? <Text bold wrap="truncate-end">Details · {parent?.kind ?? "none"} {focus === "details" ? "◀" : ""}</Text> : null}
      {!parent ? <Text dimColor>No selected entry.</Text> : detailDisplay.length === 0 ? <Text dimColor>No details yet.</Text> : detailDisplay.slice(detailScroll, detailScroll + contentHeight).map((row) => {
        const value = detailItems[row.index]?.value;
        if (!value) return null;
        const selected = focus === "details" && row.index === safeDetailIndex;
        return <Text key={row.key} bold={selected} wrap="truncate-end">{selected ? ">" : " "} {row.editing ? displayEditor(draft?.text ?? "", draft?.cursor ?? 0, rightWidth - 6) : <>{row.prefix}{styledRow(row.chars)}</>}</Text>;
      })}
    </Box>
  );

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {topVisible ? <Text inverse bold wrap="truncate-end">{` y-felin | Journal | ${today} | ${dayOrder === "oldest-first" ? "oldest → newest" : "newest → oldest"}`.padEnd(columns)}</Text> : null}
      {modal === "help" ? <Box flexDirection="column" height={height}>{paneHeaderVisible ? <Text bold>Journal help</Text> : null}{visibleSlice(helpLines, helpIndex, contentHeight).map((line, index) => <Text key={index} wrap="truncate-end">{line}</Text>)}</Box>
        : modal === "views" ? <Box flexDirection="column" height={height}>{paneHeaderVisible ? <Text bold>Views</Text> : null}<Text>Journal (current)</Text></Box>
        : narrow ? (focus === "details" && detailsOpen ? detailsPane : journalPane)
        : <Box flexDirection="row" width={columns} height={height}>{detailsOpen ? <>{journalPane}{detailsPane}</> : <Box width={columns}>{journalPane}</Box>}</Box>}
      {bottomVisible ? <Text dimColor wrap="truncate-end">{footer}</Text> : null}
    </Box>
  );
}
