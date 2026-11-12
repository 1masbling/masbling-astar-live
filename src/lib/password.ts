export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES = [
  { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p: string) => p.length >= PASSWORD_MIN_LENGTH },
  { id: 'upper', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
  { id: 'symbol', label: 'One special symbol', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordRuleResults(password: string) {
  return PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(password) }));
}

export function isPasswordStrong(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
