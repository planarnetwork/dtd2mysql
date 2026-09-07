import {defineConfig, fontProviders} from "astro/config";
import mdx from "@astrojs/mdx";
import {satteri} from "@astrojs/markdown-satteri";
import {headingAnchors, scrollableTables} from "./src/markdown.mjs";

/**
 * The site is served from a project page, so it lives under a path rather than
 * at the root of the origin. Every absolute link has to carry that path, which
 * is what `base` makes Astro do to the ones it generates - and why the prose
 * pages link relatively, so they do not have to know about it at all.
 *
 * The repository was renamed from dtd2mysql to gb-transit, so this is also the
 * one place the old name would keep the site alive at the wrong URL.
 */
export default defineConfig({
  site: "https://planarnetwork.github.io",
  base: "/gb-transit",
  trailingSlash: "always",
  build: {
    format: "directory"
  },
  integrations: [mdx()],

  // Fetched at build time and served from this origin, rather than linked to
  // Google's. A download page that reports what the feed contains should not
  // make its readers announce themselves to a third party to read it.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Archivo",
      cssVariable: "--font-display",
      weights: [500, 600, 700],
      fallbacks: ["system-ui", "sans-serif"]
    },
    {
      provider: fontProviders.google(),
      name: "Public Sans",
      cssVariable: "--font-body",
      weights: [400, 500, 600],
      styles: ["normal", "italic"],
      fallbacks: ["system-ui", "sans-serif"]
    },
    {
      provider: fontProviders.google(),
      name: "IBM Plex Mono",
      cssVariable: "--font-mono",
      weights: [400, 500],
      fallbacks: ["ui-monospace", "monospace"]
    }
  ],

  markdown: {
    // Astro's own pipeline rather than remark and rehype, which is the default
    // in 7 and one fewer dependency here.
    processor: satteri({hastPlugins: [scrollableTables, headingAnchors]}),
    shikiConfig: {
      // The page is a warm paper light theme throughout, so the code on it is
      // lit the same way rather than being a dark rectangle in the middle of
      // it. The terminal blocks are dark because a terminal is.
      theme: "github-light",
      wrap: false
    }
  }
});
