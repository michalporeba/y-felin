import { defineEntity, type EntityDefinition } from "lofipod";
import type { Note } from "../core/items.js";
import {
  baseItemTriples,
  rdf,
  rdfUri,
  stringValue,
  vocabulary,
} from "./vocabulary.js";

export const NoteEntity: EntityDefinition<Note> = defineEntity<Note>({
  name: "note",
  pod: {
    basePath: "notes/",
  },
  rdfType: vocabulary.Note,
  id(note) {
    return note.id;
  },
  uri(note) {
    return vocabulary.uri({
      entityName: "note",
      id: note.id,
    });
  },
  toRdf(note, helpers) {
    const subject = helpers.uri(note);
    return [
      [subject, rdf.type, vocabulary.Note],
      ...baseItemTriples(subject, note),
    ];
  },
  project(graph, helpers) {
    const subject = helpers.uri();
    const id = subject.value.split("/").at(-1) ?? "";

    return {
      id,
      kind: "note",
      title: stringValue(graph, subject, vocabulary.title),
      createdAt: stringValue(graph, subject, vocabulary.created),
    };
  },
});

export function createDefaultNote(input: {
  readonly id: string;
  readonly title: string;
  readonly createdAt?: string;
}): Note {
  return {
    id: input.id,
    kind: "note",
    title: input.title,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
