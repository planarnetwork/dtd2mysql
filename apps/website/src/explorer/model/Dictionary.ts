/**
 * Strings held once, referred to by number.
 *
 * A feed's columns repeat themselves enormously: 278,794 trips carry 865 distinct headsigns between
 * them, and 2.9 million calls name 2,797 stops. Holding an index rather than a string turns a column
 * into an Int32Array, which is ten times smaller than the array of strings it replaces and can be
 * scanned without touching the heap.
 *
 * A column that does not repeat - a trip id - costs the strings it would have cost anyway, plus the
 * Map. That is the price of not having to know in advance which columns repeat.
 */
export class Dictionary {

  /** Index 0 is the empty string, so that a column of mostly-empty values interns to mostly zero. */
  private readonly values: string[] = [""];
  private readonly indexes = new Map<string, number>([["", 0]]);

  /**
   * The index of a value, adding it if this is the first time it has been seen.
   *
   * `undefined` is -1 rather than an index, because a field the file left empty and a field the file
   * has no column for are different things and the row a caller renders has to be able to say so.
   */
  public intern(value: string | undefined): number {
    if (value === undefined) {
      return -1;
    }

    const existing = this.indexes.get(value);

    if (existing !== undefined) {
      return existing;
    }

    const index = this.values.length;

    this.values.push(value);
    this.indexes.set(value, index);

    return index;
  }

  /** The value at an index, or undefined for -1. */
  public valueOf(index: number): string | undefined {
    return index === -1 ? undefined : this.values[index];
  }

  /**
   * The index a value already has, or -1 if it has never been interned.
   *
   * What an equality filter uses: resolving the term once against the dictionary turns the scan that
   * follows into integer comparisons, and a term nothing has ever held is answered without scanning
   * at all.
   */
  public lookup(value: string): number {
    return this.indexes.get(value) ?? -1;
  }

  /**
   * The indexes whose value satisfies `matches`.
   *
   * The other half of the same trick: a substring filter tests the few thousand distinct values
   * rather than the few million rows, and the scan over the rows is then a lookup in the returned
   * set. See Filter.ts, which is the only caller that matters.
   */
  public search(matches: (value: string) => boolean): Uint8Array {
    const mask = new Uint8Array(this.values.length);

    for (let index = 0; index < this.values.length; index++) {
      if (matches(this.values[index])) {
        mask[index] = 1;
      }
    }

    return mask;
  }

  /** How many distinct values there are, including the empty string. */
  public get size(): number {
    return this.values.length;
  }

}
