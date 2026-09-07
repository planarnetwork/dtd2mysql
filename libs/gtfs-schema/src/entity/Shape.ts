/**
 * A point on the path a trip takes, as `shapes.txt` holds it.
 *
 * A rail feed writes none of these: the DTD says which timing points a train
 * passes, not where the track goes between them, and a straight line between
 * stations would be a worse answer than no answer. A TransXChange feed does
 * carry the track, so a bus feed has them.
 */
export interface Shape {
  shape_id: ShapeID;
  /**
   * Kept as text where the source gave text. A coordinate that arrived as
   * `51.50740` re-serialises from a number as `51.5074`, which silently drops a
   * digit of the precision the source published.
   */
  shape_pt_lat: number | string;
  shape_pt_lon: number | string;
  shape_pt_sequence: number;
  /**
   * Distance along the shape at this point, in whatever unit the producer also
   * uses in stop_times.txt. Text for the same reason as the coordinates: a
   * producer writing five decimal places means the trailing zeros.
   */
  shape_dist_traveled: number | string | null;
}

export type ShapeID = string;

/**
 * shapes.txt, as it is written. Every field of Shape is a column of it.
 */
export type ShapeRow = Shape;
