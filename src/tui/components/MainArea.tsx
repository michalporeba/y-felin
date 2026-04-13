import { Box, Text } from "ink";
import { getPerspective } from "../../core/index.js";
import { defaultTuiTheme } from "../theme.js";
import type { CompiledKeymap } from "../keymap.js";
import type { ComposerState, HelpMode, InboxItemsState } from "../state.js";
import { PerspectiveBody } from "./PerspectiveBody.js";

type PerspectiveResult = ReturnType<typeof getPerspective>;

type MainAreaProps = {
  readonly columns: number;
  readonly height: number;
  readonly perspectiveResult: PerspectiveResult;
  readonly itemsState: InboxItemsState;
  readonly selectedIndex: number;
  readonly composer: ComposerState;
  readonly helpMode: HelpMode;
  readonly activeKeymap: CompiledKeymap;
};

export function MainArea({
  columns,
  height,
  perspectiveResult,
  itemsState,
  selectedIndex,
  composer,
  helpMode,
  activeKeymap,
}: MainAreaProps) {
  return (
    <Box flexDirection="column" width={columns} height={height}>
      <Box marginTop={1} marginBottom={1} paddingX={1}>
        <Text {...defaultTuiTheme.accent} wrap="truncate-end">
          [{renderPaneHeading(perspectiveResult, helpMode)}] main pane | rows {height}
        </Text>
      </Box>
      <FullWidthRule columns={columns} />
      <PerspectiveBody
        perspectiveResult={perspectiveResult}
        itemsState={itemsState}
        selectedIndex={selectedIndex}
        composer={composer}
        helpMode={helpMode}
        activeKeymap={activeKeymap}
      />
    </Box>
  );
}

function renderPerspectiveHeading(perspectiveResult: PerspectiveResult): string {
  if (!perspectiveResult.ok) {
    return "Perspective error";
  }

  return perspectiveResult.value.title;
}

function renderPaneHeading(
  perspectiveResult: PerspectiveResult,
  helpMode: HelpMode,
): string {
  if (helpMode === "context") {
    return `${renderPerspectiveHeading(perspectiveResult)} Help`;
  }

  if (helpMode === "global") {
    return "Help";
  }

  return renderPerspectiveHeading(perspectiveResult);
}

function FullWidthRule({ columns }: { readonly columns: number }) {
  return (
    <Text dimColor wrap="truncate-end">
      {"-".repeat(Math.max(1, columns))}
    </Text>
  );
}
