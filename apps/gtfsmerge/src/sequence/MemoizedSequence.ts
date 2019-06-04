
/**
 * Generates a sequence number for each unique hash
 */
export class MemoizedSequence {
  private cache = {};
  private current = 1;

  /**
   * If the hash has already been seen return the ID that was given for it, if not
   * return a the next number in the sequence.
   */
  public get(hash: string): number {
    if (!this.haveSeen(hash)) {
      this.cache[hash] = this.current++;
    }

    return this.cache[hash];
  }

  /**
   * Check whether we've seen the given hash
   */
  public haveSeen(hash: string): boolean {
    return this.cache.hasOwnProperty(hash);
  }

}
