/**
 * Two things the markdown pipeline does not do, written here rather than pulled
 * in as two more dependencies to keep current.
 *
 * A table wider than the screen has to scroll inside its own box rather than
 * taking the page with it, and a section somebody wants to point at needs
 * something to copy.
 */

export const scrollableTables = {
  name: "gb-transit:scrollable-tables",
  element: {
    filter: ["table"],
    visit(node, ctx) {
      ctx.wrapNode(node, {
        type: "element",
        tagName: "div",
        properties: {className: ["table-scroll"]},
        children: []
      });
    }
  }
};

/**
 * A heading id, the way GitHub writes one - which is what Astro's own heading
 * plugin uses, and therefore what the contents list at the top of a page will
 * link to.
 *
 * This has to assign the id as well as the anchor, because a user plugin runs
 * before Astro's does and so cannot read the id Astro is about to give the
 * heading. Astro keeps an id that is already there, so the two agree.
 */
function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * A factory rather than a definition, because it is called once per document
 * and the set of ids already used has to start empty for each one.
 */
export const headingAnchors = () => {
  const taken = new Set();

  return {
    name: "gb-transit:heading-anchors",
    element: {
      filter: ["h2", "h3"],
      visit(node, ctx) {
        const text = ctx.textContent(node);
        const base = slug(text);

        if (base === "") {
          return;
        }

        // Two headings with the same words each need their own id, and the
        // second is the one that moves - the rule GitHub applies.
        let id = base;

        for (let n = 1; taken.has(id); n++) {
          id = `${base}-${n}`;
        }

        taken.add(id);
        ctx.setProperty(node, "id", id);

        ctx.appendChild(node, {
          type: "element",
          tagName: "a",
          properties: {
            className: ["anchor"],
            href: `#${id}`,
            "aria-label": `Link to ${text}`
          },
          // No text: the character comes from CSS. Astro collects a heading's
          // text for the contents list after this runs, and a "#" child would
          // put one on the end of every entry in it.
          children: []
        });
      }
    }
  };
};
