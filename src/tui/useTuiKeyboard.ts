import { useState } from "react";
import { useInput } from "ink";
import type { CompiledKeymap, TuiActionId } from "./keymap.js";
import { strokeFromInput } from "./keymap.js";
import type { ComposerState, HelpMode, TuiInputKey } from "./state.js";

type UseTuiKeyboardOptions = {
  readonly composer: ComposerState;
  readonly handleComposerInput: (input: string, key: TuiInputKey) => Promise<void>;
  readonly helpMode: HelpMode;
  readonly setHelpMode: React.Dispatch<React.SetStateAction<HelpMode>>;
  readonly activeKeymap: CompiledKeymap;
  readonly dispatchAction: (actionId: TuiActionId) => void;
};

export function useTuiKeyboard({
  composer,
  handleComposerInput,
  helpMode,
  setHelpMode,
  activeKeymap,
  dispatchAction,
}: UseTuiKeyboardOptions) {
  const [pendingSequence, setPendingSequence] = useState("");

  useInput((input, key) => {
    if (composer.mode !== "idle") {
      void handleComposerInput(input, key);
      return;
    }

    if (key.escape || input === "\u001B") {
      setPendingSequence("");
      if (helpMode !== "none") {
        setHelpMode("none");
      }
      return;
    }

    const stroke = strokeFromInput(input, key);
    if (!stroke) {
      return;
    }

    const matchedAction = resolveActionFromStroke(
      stroke,
      pendingSequence,
      activeKeymap,
    );

    if (matchedAction.state === "pending") {
      setPendingSequence(matchedAction.sequence);
      return;
    }

    setPendingSequence(matchedAction.nextPendingSequence);
    if (!matchedAction.actionId) {
      return;
    }

    dispatchAction(matchedAction.actionId);
  });
}

function resolveActionFromStroke(
  stroke: string,
  pendingSequence: string,
  keymap: CompiledKeymap,
): {
  readonly state: "matched" | "pending" | "unmatched";
  readonly actionId?: TuiActionId;
  readonly sequence: string;
  readonly nextPendingSequence: string;
} {
  const attempt = pendingSequence ? `${pendingSequence} ${stroke}` : stroke;

  if (keymap.bindings.has(attempt)) {
    return {
      state: "matched",
      actionId: keymap.bindings.get(attempt),
      sequence: attempt,
      nextPendingSequence: "",
    };
  }

  if (keymap.prefixes.has(attempt)) {
    return {
      state: "pending",
      sequence: attempt,
      nextPendingSequence: attempt,
    };
  }

  if (pendingSequence && keymap.bindings.has(stroke)) {
    return {
      state: "matched",
      actionId: keymap.bindings.get(stroke),
      sequence: stroke,
      nextPendingSequence: "",
    };
  }

  if (pendingSequence && keymap.prefixes.has(stroke)) {
    return {
      state: "pending",
      sequence: stroke,
      nextPendingSequence: stroke,
    };
  }

  return {
    state: "unmatched",
    sequence: attempt,
    nextPendingSequence: "",
  };
}
