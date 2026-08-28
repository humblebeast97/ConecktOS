/**
 * Time-of-day greeting: matches how a person would actually speak at that
 * hour. Late-night bucket says "Working late" instead of "Good night" so it
 * reads right on an ops app someone is using at 2am, not tucking in for bed.
 */
export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Working late";
}

export function currentGreeting(now: Date = new Date()): string {
  return greetingForHour(now.getHours());
}
