import {
  defineEntity,
  defineVocabulary,
  rdf,
  stringValue,
  uri,
  type EntityDefinition,
} from "lofipod";
import type { ItemKind, ItemSummary } from "../core/index.js";

const vocabulary = defineVocabulary({
  base: "",
  terms: {
    Task: "https://michalporeba.com/ns/lifegraph#Task",
    Note: "https://michalporeba.com/ns/lifegraph#Note",
    title: "http://purl.org/dc/terms/title",
    created: "http://purl.org/dc/terms/created",
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

    return [
      [subject, rdf.type, kindToRdfType(item.kind)],
      [subject, vocabulary.title, item.title],
      [subject, vocabulary.created, item.createdAt],
    ];
  },
  project(graph, helpers) {
    const subject = helpers.uri();
    const id = subject.value.split("/").at(-1) ?? "";

    return {
      id,
      kind: rdfTypeToKind(graph, subject),
      title: stringValue(graph, subject, vocabulary.title),
      createdAt: stringValue(graph, subject, vocabulary.created),
    };
  },
});

export function createDefaultItem(input: {
  readonly id: string;
  readonly kind?: ItemKind;
  readonly title: string;
  readonly createdAt?: string;
}): ItemSummary {
  return {
    id: input.id,
    kind: input.kind ?? "task",
    title: input.title,
    createdAt: input.createdAt ?? new Date().toISOString(),
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

export { vocabulary as itemVocabulary, uri as rdfUri };
