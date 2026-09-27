import { defineEntity, namedNode, type EntityDefinition, type Triple } from "lofipod";
import type { JournalEntry, JournalParagraph, JournalKind } from "../core/journal.js";
import { vocabulary, rdf, stringValue, priorityTriple, workflowStateTriple, projectPriority, projectWorkflowState } from "./vocabulary.js";

export function extras(graph: Triple[], known: readonly string[], knownTypes: readonly string[]): Triple[] | undefined {
  const result = graph.filter((triple) => {
    if (triple[1].value !== rdf.type.value) return !known.includes(triple[1].value);
    const object = triple[2];
    const value = typeof object === "string" || typeof object === "number" || typeof object === "boolean" ? String(object) : object.value;
    return !knownTypes.includes(value);
  });
  return result.length ? result : undefined;
}

const kindTypes = {
  note: vocabulary.Note, idea: vocabulary.Idea, task: vocabulary.Task,
  event: vocabulary.Event, checklist: vocabulary.Checklist, appointment: vocabulary.Appointment,
} as const;

export const JournalEntryEntity: EntityDefinition<JournalEntry> = defineEntity<JournalEntry>({
  kind: "journal-entry",
  pod: { basePath: "journal-entries/" },
  rdfType: vocabulary.JournalEntry,
  id: (entry) => entry.id,
  uri: (entry) => vocabulary.uri({ entityName: "journal-entry", id: entry.id }),
  toRdf(entry, helpers) {
    const subject = helpers.uri(entry);
    return [
      [subject, rdf.type, vocabulary.JournalEntry],
      [subject, rdf.type, kindTypes[entry.kind]],
      [subject, vocabulary.title, entry.title],
      [subject, vocabulary.created, entry.createdAt],
      [subject, vocabulary.entryKind, entry.kind],
      [subject, vocabulary.journalDate, entry.journalDate],
      [subject, vocabulary.order, entry.order],
      ...(entry.parentId ? [[subject, vocabulary.parent, entry.parentUri ? namedNode(entry.parentUri) : vocabulary.uri({ entityName: "journal-entry", id: entry.parentId })] as Triple] : []),
      ...(entry.kind === "task" ? [priorityTriple(subject, entry.priority ?? "normal"), workflowStateTriple(subject, entry.workflowState ?? "open")] : []),
      ...(entry.extraTriples ?? []),
    ];
  },
  project(graph, helpers) {
    const subject = helpers.uri();
    const kind = stringValue(graph, subject, vocabulary.entryKind) as JournalKind;
    const parent = stringValue(graph, subject, vocabulary.parent);
    return {
      id: subject.value.split("/").at(-1) ?? "",
      kind,
      title: stringValue(graph, subject, vocabulary.title),
      createdAt: stringValue(graph, subject, vocabulary.created),
      journalDate: stringValue(graph, subject, vocabulary.journalDate),
      order: stringValue(graph, subject, vocabulary.order),
      ...(parent ? { parentId: parent.split("/").at(-1) ?? "" } : {}),
      ...(parent && parent !== vocabulary.uri({ entityName: "journal-entry", id: parent.split("/").at(-1) ?? "" }).value ? { parentUri: parent } : {}),
      ...(kind === "task" ? { priority: projectPriority(graph, subject), workflowState: projectWorkflowState(graph, subject) } : {}),
      ...(() => { const extraTriples = extras(graph, [vocabulary.title.value, vocabulary.created.value, vocabulary.entryKind.value, vocabulary.journalDate.value, vocabulary.order.value, vocabulary.parent.value, vocabulary.priority.value, vocabulary.workflowState.value], [vocabulary.JournalEntry.value, kindTypes[kind].value]); return extraTriples ? { extraTriples } : {}; })(),
    };
  },
});

export const JournalParagraphEntity: EntityDefinition<JournalParagraph> = defineEntity<JournalParagraph>({
  kind: "journal-paragraph",
  pod: { basePath: "journal-paragraphs/" },
  rdfType: vocabulary.Paragraph,
  id: (paragraph) => paragraph.id,
  uri: (paragraph) => vocabulary.uri({ entityName: "journal-paragraph", id: paragraph.id }),
  toRdf(paragraph, helpers) {
    const subject = helpers.uri(paragraph);
    return [
      [subject, rdf.type, vocabulary.Paragraph],
      [subject, vocabulary.body, paragraph.text],
      [subject, vocabulary.created, paragraph.createdAt],
      [subject, vocabulary.order, paragraph.order],
      [subject, vocabulary.parent, paragraph.parentUri ? namedNode(paragraph.parentUri) : vocabulary.uri({ entityName: "journal-entry", id: paragraph.parentId })],
      ...(paragraph.extraTriples ?? []),
    ];
  },
  project(graph, helpers) {
    const subject = helpers.uri();
    const parent = stringValue(graph, subject, vocabulary.parent);
    return {
      id: subject.value.split("/").at(-1) ?? "",
      parentId: parent.split("/").at(-1) ?? "",
      ...(parent && parent !== vocabulary.uri({ entityName: "journal-entry", id: parent.split("/").at(-1) ?? "" }).value ? { parentUri: parent } : {}),
      text: stringValue(graph, subject, vocabulary.body),
      createdAt: stringValue(graph, subject, vocabulary.created),
      order: stringValue(graph, subject, vocabulary.order),
      ...(() => { const extraTriples = extras(graph, [vocabulary.body.value, vocabulary.created.value, vocabulary.order.value, vocabulary.parent.value], [vocabulary.Paragraph.value]); return extraTriples ? { extraTriples } : {}; })(),
    };
  },
});
