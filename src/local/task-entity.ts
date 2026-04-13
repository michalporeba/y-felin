import { defineEntity, type EntityDefinition } from "lofipod";
import type { Task } from "../core/items.js";
import {
  baseItemTriples,
  priorityTriple,
  projectPriority,
  projectWorkflowState,
  rdf,
  rdfUri,
  stringValue,
  vocabulary,
  workflowStateTriple,
} from "./vocabulary.js";

export const TaskEntity: EntityDefinition<Task> = defineEntity<Task>({
  name: "task",
  pod: {
    basePath: "tasks/",
  },
  rdfType: vocabulary.Task,
  id(task) {
    return task.id;
  },
  uri(task) {
    return vocabulary.uri({
      entityName: "task",
      id: task.id,
    });
  },
  toRdf(task, helpers) {
    const subject = helpers.uri(task);
    return [
      [subject, rdf.type, vocabulary.Task],
      ...baseItemTriples(subject, task),
      priorityTriple(subject, task.priority),
      workflowStateTriple(subject, task.workflowState),
    ];
  },
  project(graph, helpers) {
    const subject = helpers.uri();
    const id = subject.value.split("/").at(-1) ?? "";

    return {
      id,
      kind: "task",
      title: stringValue(graph, subject, vocabulary.title),
      createdAt: stringValue(graph, subject, vocabulary.created),
      priority: projectPriority(graph, subject),
      workflowState: projectWorkflowState(graph, subject),
    };
  },
});

export function createDefaultTask(input: {
  readonly id: string;
  readonly title: string;
  readonly createdAt?: string;
  readonly priority?: Task["priority"];
  readonly workflowState?: Task["workflowState"];
}): Task {
  return {
    id: input.id,
    kind: "task",
    title: input.title,
    createdAt: input.createdAt ?? new Date().toISOString(),
    priority: input.priority ?? "normal",
    workflowState: input.workflowState ?? "open",
  };
}
