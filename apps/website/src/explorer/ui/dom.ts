/**
 * The small amount of DOM this needs.
 *
 * Every view is a function from state to a string of HTML, and the container's innerHTML is replaced
 * on navigation. That is why `escape` is not optional and not a convenience: every value on these
 * pages comes out of a file somebody else wrote, and a stop_name is as good a place to put a script
 * tag as any.
 */

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
};

/** Text for putting in HTML. Never interpolate a feed's own value without this. */
export function escape(value: unknown): string {
  return value === undefined || value === null
    ? ""
    : String(value).replace(/[&<>"']/g, character => ENTITIES[character]);
}

/**
 * A value as a cell, showing an absent one as absent.
 *
 * The difference between a field the file left empty and one it has no column for matters enough in
 * this data to be visible: an empty pickup_type means a call can be boarded, and a missing
 * pickup_type column means the same thing for a different reason.
 */
export function cell(value: string | undefined): string {
  return value === undefined
    ? "<span class=\"x-absent\" title=\"the file has no value here\">—</span>"
    : value === ""
      ? "<span class=\"x-absent\" title=\"the file has an empty value here\">empty</span>"
      : escape(value);
}

export function attr(value: unknown): string {
  return escape(value);
}

/** A class attribute from a list, skipping the ones that are off. */
export function classes(...names: (string | false | undefined)[]): string {
  const on = names.filter((name): name is string => typeof name === "string" && name.length > 0);

  return on.length === 0 ? "" : ` class="${on.join(" ")}"`;
}

export function element(id: string): HTMLElement {
  const found = document.getElementById(id);

  if (found === null) {
    throw new Error(`The page has no #${id}, so the explorer cannot start.`);
  }

  return found;
}

/**
 * Move focus to the heading of the view just rendered.
 *
 * Without it a keyboard user who followed a link is left where the link was, on a page whose whole
 * content has been replaced underneath them.
 */
export function focusHeading(container: HTMLElement): void {
  container.querySelector<HTMLElement>("[data-heading]")?.focus();
}
