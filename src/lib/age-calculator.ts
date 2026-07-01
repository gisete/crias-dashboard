export function calculateAge(dateOfBirth: string): string {
  // Parse "YYYY-MM-DD" directly — new Date() would read it as UTC midnight,
  // which shifts to the previous day (and possibly month) in timezones west
  // of UTC once read back through local getters.
  const [dobYear, dobMonth] = dateOfBirth.split('-').map(Number);
  const now = new Date();
  let years = now.getFullYear() - dobYear;
  let months = now.getMonth() + 1 - dobMonth;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years === 0) return `${months}m`;
  if (months === 0) return `${years}a`;
  return `${years}a ${months}m`;
}
