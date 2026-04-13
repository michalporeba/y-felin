import { Box, Text } from "ink";
import {
  getPerspectiveHelp,
  type PerspectiveHelpEntry,
  type PerspectiveId,
} from "../../core/index.js";
import {
  getGlobalHelpEntries,
  getPerspectiveActionHelp,
  primaryBindingForAction,
  type ActionHelpEntry,
  type CompiledKeymap,
} from "../keymap.js";

type HelpPanelProps = {
  readonly mode: "context" | "global";
  readonly perspectiveId: PerspectiveId;
  readonly keymap: CompiledKeymap;
};

export function HelpPanel({ mode, perspectiveId, keymap }: HelpPanelProps) {
  if (mode === "context") {
    const helpResult = getPerspectiveHelp(perspectiveId);
    if (!helpResult.ok) {
      return <Text>{helpResult.error.message}</Text>;
    }

    return (
      <Box flexDirection="column" paddingX={2}>
        <Text bold>Actions</Text>
        <Text />
        {renderActionHelpEntries(
          getPerspectiveActionHelp(perspectiveId),
          keymap,
        ).map((entry) => (
          <Text key={`action-${entry.label}`} wrap="truncate-end">
            {entry.label.padEnd(10, " ")} {entry.description}
          </Text>
        ))}
        <Text />
        <Text bold>Symbols</Text>
        <Text />
        {helpResult.value.symbols.map((entry) => (
          <Text key={`symbol-${entry.label}`} wrap="truncate-end">
            {entry.label.padEnd(6, " ")} {entry.description}
          </Text>
        ))}
      </Box>
    );
  }

  const globalEntries = renderActionHelpEntries(getGlobalHelpEntries(), keymap);
  const perspectiveEntries = renderActionHelpEntries(
    getPerspectiveActionHelp(perspectiveId),
    keymap,
  );

  return (
    <Box flexDirection="column" paddingX={2}>
      <Text bold>Help Levels</Text>
      <Text />
      {globalEntries.map((entry) => (
        <Text key={`global-${entry.label}`} wrap="truncate-end">
          {entry.label.padEnd(10, " ")} {entry.description}
        </Text>
      ))}
      <Text wrap="truncate-end">
        Esc    Close help and return to the previous perspective.
      </Text>
      <Text />
      <Text bold>{perspectiveId[0]!.toUpperCase() + perspectiveId.slice(1)}</Text>
      <Text />
      {perspectiveEntries.map((entry) => (
        <Text key={`perspective-${entry.label}`} wrap="truncate-end">
          {entry.label.padEnd(10, " ")} {entry.description}
        </Text>
      ))}
    </Box>
  );
}

function renderActionHelpEntries(
  entries: readonly ActionHelpEntry[],
  keymap: CompiledKeymap,
): PerspectiveHelpEntry[] {
  return entries.flatMap((entry) => {
    const label = primaryBindingForAction(keymap, entry.actionId);
    if (!label) {
      return [];
    }

    return [{ label, description: entry.description }];
  });
}
