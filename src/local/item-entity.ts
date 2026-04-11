import {
  defineEntity,
  defineVocabulary,
  rdf,
  stringValue,
  uri,
  type EntityDefinition,
  type Triple,
} from "lofipod";
import type {
  ItemKind,
  ItemSummary,
  WorkflowState,
} from "../core/index.js";

const vocabulary = defineVocabulary({
  base: "",
  terms: {
    Task: "https://michalporeba.com/ns/lifegraph#Task",
    Note: "https://michalporeba.com/ns/lifegraph#Note",
    title: "http://purl.org/dc/terms/title",
    created: "http://purl.org/dc/terms/created",
    workflowState: "https://michalporeba.com/ns/lifegraph#workflowState",
    Open: "https://michalporeba.com/ns/lifegraph#Open",
    Active: "https://michalporeba.com/ns/lifegraph#Active",
    Done: "https://michalporeba.com/ns/lifegraph#Done",
  },
  uri({ entityName, id }) {
    return `https://melin.app/id/${entityName}/${id}`;
  },
});

export const ItemEntity: EntityDefinition<ItemSummary> = defineEntity<ItemSummary>({
  name: "item",
  pod: {
    basePath: "items/",
  },
  rdfType: vocabulary.Task,
  id(item) {
    return item.id;
  },
  uri(item) {
    return vocabulary.uri({
      entityName: "item",
      id: item.id,
    });
  },
  toRdf(item, helpers) {
    const subject = helpers.uri(item);
    const triples: Triple[] = [
      [subject, rdf.type, kindToRdfType(item.kind)],
      [subject, vocabulary.title, item.title],
      [subject, vocabulary.created, item.createdAt],
    ];

    if (item.kind === "task" && item.workflowState) {
      triples.push([
        subject,
        vocabulary.workflowState,
        workflowStateToRdf(item.workflowState),
      ]);
    }

    return triples;
  },
  project(graph, helpers) {
    const subject = helpers.uri();
    const id = subject.value.split("/").at(-1) ?? "";

    return {
      id,
      kind: rdfTypeToKind(graph, subject),
      title: stringValue(graph, subject, vocabulary.title),
      createdAt: stringValue(graph, subject, vocabulary.created),
      workflowState: projectWorkflowState(graph, subject),
    };
  },
});

export function createDefaultItem(input: {
  readonly id: string;
  readonly kind?: ItemKind;
  readonly title: string;
  readonly createdAt?: string;
  readonly workflowState?: WorkflowState;
}): ItemSummary {
  return {
    id: input.id,
    kind: input.kind ?? "task",
    title: input.title,
    createdAt: input.createdAt ?? new Date().toISOString(),
    workflowState:
      (input.kind ?? "task") === "task" ? input.workflowState ?? "open" : undefined,
  };
}

function kindToRdfType(kind: ItemKind) {
  return kind === "note" ? vocabulary.Note : vocabulary.Task;
}

function rdfTypeToKind(
  graph: Parameters<NonNullable<typeof ItemEntity.project>>[0],
  subject: ReturnType<typeof uri>,
): ItemKind {
  const typeValue = stringValue(graph, subject, rdf.type);
  return typeValue === vocabulary.Note.value ? "note" : "task";
}

function workflowStateToRdf(workflowState: WorkflowState) {
  switch (workflowState) {
    case "active":
      return vocabulary.Active;
    case "done":
      return vocabulary.Done;
    case "open":
    default:
      return vocabulary.Open;
  }
}

function projectWorkflowState(
  graph: Parameters<NonNullable<typeof ItemEntity.project>>[0],
  subject: ReturnType<typeof uri>,
): WorkflowState | undefined {
  const kind = rdfTypeToKind(graph, subject);
  if (kind !== "task") {
    return undefined;
  }

  const value = stringValue(graph, subject, vocabulary.workflowState);
  if (value === vocabulary.Active.value) {
    return "active";
  }
  if (value === vocabulary.Done.value) {
    return "done";
  }

  return "open";
}

export { vocabulary as itemVocabulary, uri as rdfUri };
