import React from "react";
import { render } from "ink";
import { TuiShell } from "./tui/shell.js";

export function TuiApp() {
  return <TuiShell />;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  render(<TuiApp />, {
    alternateScreen: true,
  });
}
