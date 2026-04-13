import { Box, Text } from "ink";
import { fillLine, defaultTuiTheme } from "../theme.js";

type TopBarProps = {
  readonly columns: number;
  readonly itemCount: number;
};

export function TopBar({ columns, itemCount }: TopBarProps) {
  const line = fillLine(` MELIN | inbox | items ${itemCount} | cols ${columns}`, columns);

  return (
    <Box width={columns}>
      <Text {...defaultTuiTheme.topBar} wrap="truncate-end">
        {line}
      </Text>
    </Box>
  );
}
