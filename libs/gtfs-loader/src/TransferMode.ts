/**
 * The tags of a transfer's mode, which the feed writes pipe separated and sorted - `BUS|WALK`.
 */
export function transferModes(mode: string | undefined): string[] {
  if (mode === undefined || mode === "") {
    return [];
  }

  return mode.split("|").filter(tag => tag !== "");
}
