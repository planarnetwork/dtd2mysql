export function toGTFSDate(date: Date): string {
  return (
    date.getFullYear() +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0")
  );
}

export function getDateFromGTFSString(i: string): Date {
  // Zero out the time portion of the date to avoid timezone issues
  return new Date(
    i.substr(0, 4) + "-" + i.substr(4, 2) + "-" + i.substr(6, 2) + "T00:00:00"
  );
}
