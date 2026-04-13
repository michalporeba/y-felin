import {
  defineVocabulary,
  rdf,
  stringValue,
  type Triple,
  type uri,
} from "lofipod";
import type { PriorityLevel, WorkflowState } from "../core/items.js";

export const vocabulary = defineVocabulary({
  base: "",
  terms: {
    Task: "https://michalporeba.com/ns/lifegraph#Task",
    Note: "https://michalporeba.com/ns/lifegraph#Note",
    title: "http://purl.org/dc/terms/title",
    created: "http://purl.org/dc/terms/created",
    priority: "https://michalporeba.com/ns/lifegraph#priority",
    workflowState: "https://michalporeba.com/ns/lifegraph#workflowState",
    Open: "https://michalporeba.com/ns/lifegraph#Open",
    Active: "https://michalporeba.com/ns/lifegraph#Active",
    Done: "https://michalporeba.com/ns/lifegraph#Done",
    HighPriority: "https://michalporeba.com/ns/lifegraph#HighPriority",
    NormalPriority: "https://michalporeba.com/ns/lifegraph#NormalPriority",
  },
  uri({ entityName, id }) {
    return `https://y-felin.app/id/${entityName}/${id}`;
  },
});

export function baseItemTriples(
  subject: ReturnType<typeof vocabulary.uri>,
  item: {
    readonly title: string;
    readonly createdAt: string;
  },
): Triple[] {
  return [
    [subject, vocabulary.title, item.title],
    [subject, vocabulary.created, item.createdAt],
  ];
}

export function priorityTriple(
  subject: ReturnType<typeof vocabulary.uri>,
  priority: PriorityLevel,
): Triple {
  return [subject, vocabulary.priority, priorityToRdf(priority)];
}

export function projectPriority(
  graph: Parameters<typeof stringValue>[0],
  subject: ReturnType<typeof vocabulary.uri>,
): PriorityLevel {
  const value = stringValue(graph, subject, vocabulary.priority);
  return value === vocabulary.HighPriority.value ? "high" : "normal";
}

export function projectWorkflowState(
  graph: Parameters<typeof stringValue>[0],
  subject: ReturnType<typeof vocabulary.uri>,
): WorkflowState {
  const value = stringValue(graph, subject, vocabulary.workflowState);
  if (value === vocabulary.Active.value) {
    return "active";
  }
  if (value === vocabulary.Done.value) {
    return "done";
  }

  return "open";
}

export function workflowStateTriple(
  subject: ReturnType<typeof vocabulary.uri>,
  workflowState: WorkflowState,
): Triple {
  return [subject, vocabulary.workflowState, workflowStateToRdf(workflowState)];
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

function priorityToRdf(priority: PriorityLevel) {
  return priority === "high" ? vocabulary.HighPriority : vocabulary.NormalPriority;
}

export { rdf, stringValue, type uri as rdfUri };
