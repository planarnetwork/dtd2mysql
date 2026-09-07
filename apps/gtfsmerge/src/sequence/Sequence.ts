
/**
 * Returns a sequence of numbers
 */
export class Sequence {

  constructor(
    private currentId: number = 1
  ) {}

  /**
   * Return the current ID then increment it
   */
  public next(): number {
    return this.currentId++;
  }

}
