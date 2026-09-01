export function normalizeValidationErrors(errors: Record<string, unknown> = {}): Record<string, string> {
  const normalized: Record<string, string> = {};

  Object.entries(errors).forEach(([key, error]) => {
    const message = Array.isArray(error)
      ? error[0]
      : (typeof error === 'string' ? error : (error as { message?: string } | null)?.message);

    const text = typeof message === 'string' ? message.trim() : '';
    if (!text || /^(field|this field)\s+is\s+required\.?$/i.test(text)) {
      return;
    }

    normalized[key] = text;
  });

  return normalized;
}
