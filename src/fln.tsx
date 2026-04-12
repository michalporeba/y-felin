#!/usr/bin/env node

import { render } from "ink";
import React from "react";
import { parseTuiArgs, TuiApp } from "./tui.js";

const { dataDir } = parseTuiArgs(process.argv.slice(2));
render(<TuiApp dataDir={dataDir} />, {
  alternateScreen: true,
});
