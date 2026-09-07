/**
 * The build, as a function.
 *
 * `main` points here rather than at index.ts, which runs the CLI on import - so
 * `require("cif2gtfs")` used to run a build.
 */
export {build} from "./build";
