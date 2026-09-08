/**
 * Calculate exact age in years from a date of birth string (YYYY-MM-DD or ISO).
 * Returns number of years (e.g. 24) or empty string if invalid/empty.
 */
export function calculateAge(dobString) {
  if (!dobString) return '';
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return '';
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 0 ? age : 0;
}
