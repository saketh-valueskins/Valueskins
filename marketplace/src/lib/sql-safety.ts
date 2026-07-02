// SQL injection prevention — verify all queries use parameterized statements

const DANGEROUS_PATTERNS = [
  /SELECT.*\$\{/i,      // String interpolation in SELECT
  /FROM.*\$\{/i,        // String interpolation in FROM
  /WHERE.*\+.*\'/,      // String concatenation with quotes
  /UPDATE.*\$\{/i,      // String interpolation in UPDATE
  /DELETE.*\$\{/i,      // String interpolation in DELETE
  /INSERT.*\$\{/i,      // String interpolation in INSERT
  /[`'"]\s*\+\s*[`'"]/,  // Concatenation in strings
];

export function validateSqlQuery(query: string): { safe: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(query)) {
      issues.push(`Potential SQL injection detected: ${pattern.source}`);
    }
  }

  // Verify parameterized format ($1, $2, etc.)
  const placeholders = query.match(/\$\d+/g) || [];
  const uniquePlaceholders = new Set(placeholders);

  // Check that all params are numbered sequentially
  for (let i = 1; i <= uniquePlaceholders.size; i++) {
    if (!placeholders.includes(`$${i}`)) {
      issues.push(`Missing parameter: $${i}`);
    }
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}

export function assertSafeSql(query: string, params?: any[]) {
  const validation = validateSqlQuery(query);

  if (!validation.safe) {
    console.error('UNSAFE SQL DETECTED:', query);
    console.error('Issues:', validation.issues);
    throw new Error(`SQL safety check failed: ${validation.issues.join('; ')}`);
  }

  // Verify param count matches placeholders
  const placeholderCount = (query.match(/\$\d+/g) || []).length;
  const uniqueCount = new Set(query.match(/\$\d+/g) || []).size;

  if (uniqueCount > 0 && params && params.length !== uniqueCount) {
    throw new Error(
      `Parameter count mismatch: query expects ${uniqueCount}, got ${params.length}`
    );
  }
}
