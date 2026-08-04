const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Computes and formats Day (1-31) and Month (1-12) integers into a human-readable date.
 * Example: day=15, month=8 -> "Saturday, 15th August"
 */
export function formatDayAndMonth(
  day?: number | null,
  month?: number | null,
  includeWeekday = true
): string {
  if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) {
    return "—";
  }

  const monthName = MONTH_NAMES[month - 1];
  const dayOrdinal = `${day}${getOrdinalSuffix(day)}`;

  if (!includeWeekday) {
    return `${dayOrdinal} ${monthName}`;
  }

  const currentYear = new Date().getFullYear();
  const dateObj = new Date(currentYear, month - 1, day);
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });

  return `${weekday}, ${dayOrdinal} ${monthName}`;
}
