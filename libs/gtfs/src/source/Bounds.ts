/**
 * The box every stop in this feed should fall inside.
 *
 * Wide enough for the whole timetable rather than for Great Britain alone: the
 * MSN describes Irish stations served by CIE, and the west of Ireland reaches
 * -10.5. Hoek van Holland is in the feed too and sits outside the box, which is
 * correct - it is a real place the timetable reaches by ferry and it has to be
 * named explicitly rather than widen the box across the North Sea.
 *
 * The point of the box is to catch coordinates that cannot be right: a
 * transposed latitude and longitude, an unprojected easting, or a sentinel that
 * was parsed as a number. It is not a claim about where the network runs.
 */
export const BOUNDS = {
  south: 49.0,
  north: 61.2,
  west: -10.8,
  east: 2.1
};

export function inBounds(lat: number, lon: number): boolean {
  return lat >= BOUNDS.south && lat <= BOUNDS.north
    && lon >= BOUNDS.west && lon <= BOUNDS.east;
}
