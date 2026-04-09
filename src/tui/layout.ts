export type ShellLayoutOptions = {
  readonly columns: number;
  readonly rows: number;
  readonly showTopBar: boolean;
  readonly showBottomBar: boolean;
};

export type ShellLayout = {
  readonly columns: number;
  readonly rows: number;
  readonly topBarHeight: number;
  readonly bottomBarHeight: number;
  readonly mainHeight: number;
};

export function resolveShellLayout(
  options: ShellLayoutOptions,
): ShellLayout {
  const topBarHeight = options.showTopBar ? 1 : 0;
  const bottomBarHeight = options.showBottomBar ? 1 : 0;
  const mainHeight = Math.max(
    1,
    options.rows - topBarHeight - bottomBarHeight,
  );

  return {
    columns: Math.max(1, options.columns),
    rows: Math.max(1, options.rows),
    topBarHeight,
    bottomBarHeight,
    mainHeight,
  };
}
