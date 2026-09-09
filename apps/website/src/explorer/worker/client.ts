import type {LoadProgress} from "@gb-transit/gtfs-loader";
import type {FeedManifest} from "../model/FeedIndex.js";
import type {Finding} from "../checks/Check.js";
import type {OpenSource, Request, Response, Slot} from "./protocol.js";

/**
 * The page's half of the conversation.
 *
 * Requests are numbered and their answers matched back, so a query typed over the top of a slower
 * one cannot render the wrong result: only the newest id is still being waited on.
 */

/**
 * A request with its id left off, for the caller to fill in.
 *
 * Written as a distributive conditional rather than as Omit, because Omit over a union produces the
 * intersection of its keys - which for these is `type` and `slot` and nothing else, so every actual
 * request would be rejected as having unknown properties.
 */
type Asked = Extract<Request, {id: number}> extends infer R
  ? R extends {id: number} ? Omit<R, "id"> : never
  : never;

export interface Listeners {
  onProgress(progress: LoadProgress): void;
  onOpened(feed: Opened): void;
  onFailed(message: string): void;
}

export interface Opened {
  manifest: FeedManifest;
  window?: {from: number, to: number};
  calls: number;
  /** Whether each trip's calls were one contiguous run, which is worth telling a reader when not. */
  contiguous: boolean;
}

export class Explorer {

  private readonly worker: Worker;
  private readonly pending = new Map<number, {
    resolve(value: unknown): void,
    reject(error: Error): void,
    findings: Finding[]
  }>();

  private next = 1;

  constructor(worker: Worker, private readonly listeners: Listeners) {
    this.worker = worker;
    this.worker.onmessage = event => this.receive(event.data as Response);
    this.worker.onerror = event => this.listeners.onFailed(
      event.message || "The explorer stopped unexpectedly.");
  }

  public open(source: OpenSource, slot: Slot = "a"): void {
    this.worker.postMessage({type: "open", slot, source} satisfies Request);
  }

  /**
   * Ask something and wait for the answer.
   *
   * `findings` come back on the same id as they are found, and are handed over with the result, so a
   * caller that wants them streaming can pass onFinding and one that does not gets them at the end
   * either way.
   */
  public ask<T>(
    request: Asked,
    onFinding?: (finding: Finding) => void
  ): Promise<{value: T, findings: Finding[]}> {
    const id = this.next++;

    return new Promise((resolve, reject) => {
      // The findings are handed to resolve rather than looked up when it runs. Reading them back off
      // this map was a bug: the entry is deleted before the promise settles, so every answer arrived
      // with an empty list and the checks all reported finding nothing.
      const findings: Finding[] = [];

      this.pending.set(id, {
        resolve: value => resolve({value: value as T, findings}),
        reject,
        findings
      });

      if (onFinding !== undefined) {
        this.streaming.set(id, onFinding);
      }

      this.worker.postMessage({...request, id} as Request);
    });
  }

  private readonly streaming = new Map<number, (finding: Finding) => void>();

  private receive(message: Response): void {
    switch (message.type) {
      case "progress":
        return this.listeners.onProgress(message.progress);

      case "opened":
        return this.listeners.onOpened(message);

      case "finding": {
        this.pending.get(message.id)?.findings.push(message.finding);
        this.streaming.get(message.id)?.(message.finding);

        return;
      }

      case "result": {
        this.results.set(message.id, message.value);

        return;
      }

      case "done": {
        const pending = this.pending.get(message.id);

        this.pending.delete(message.id);
        this.streaming.delete(message.id);
        pending?.resolve(this.results.get(message.id));
        this.results.delete(message.id);

        return;
      }

      case "failed": {
        if (message.id === null) {
          return this.listeners.onFailed(message.message);
        }

        const pending = this.pending.get(message.id);

        this.pending.delete(message.id);
        this.streaming.delete(message.id);
        pending?.reject(new Error(message.message));

        return;
      }
    }
  }

  private readonly results = new Map<number, unknown>();

}

/**
 * Start the worker.
 *
 * The URL is resolved against this module rather than written as a path, which is what lets the
 * bundler emit it as its own chunk with the site's base path on it. It has to be here, in a real
 * module, rather than in the page's inline script, where import.meta.url points at the page.
 */
export function startWorker(): Worker {
  return new Worker(new URL("./explorer.worker.ts", import.meta.url), {type: "module"});
}

/** Whether this browser can run the worker at all. Safari before 15 and Firefox before 114 cannot. */
export function workersSupported(): boolean {
  return typeof Worker === "function";
}
