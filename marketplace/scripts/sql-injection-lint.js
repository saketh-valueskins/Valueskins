#!/usr/bin/env node
/**
 * SQL Injection Prevention Linter
 * Run: node scripts/sql-injection-lint.js
 * CI: node scripts/sql-injection-lint.js --ci
 *
 * Scans all API route files for:
 * 1. Direct `pg` imports (circumvents safe-query)
 * 2. String concatenation or template interpolation in SQL strings
 * 3. Non-parameterized queries
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SRC_DIR = path.join(__dirname, '..', 'src');
const FAIL_FAST = process.argv.includes('--ci');

let errors = [];
let warnings = [];
let filesChecked = 0;

function findFiles(dir, pattern) {
  return glob.sync(`${dir}/**/${pattern}`, { ignore: ['**/node_modules/**', '**/.next/**'] });
}

// Check 1: Direct `pg` imports (should use @/lib/db-pool or @/lib/safe-query)
function checkPgImports(content, filePath) {
  const pgImport = content.match(/from ['"]pg['"]/);
  if (pgImport && !filePath.endsWith('db-pool.ts')) {
    errors.push(`${filePath}: Direct import from 'pg' — use @/lib/db-pool or @/lib/safe-query`);
  }
}

// Check 2: String concat in query calls: query('...' + var + '...')
function checkStringConcat(content, filePath) {
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.includes('query(') && trimmed.includes(' + ')) {
      // Check if the + is concatenating SQL strings (not SQL arithmetic like count + 1)
      const hasSqlQuotes = /query\(\s*["'`]/.test(trimmed);
      const hasValueConcat = /["'`]\s*\+/.test(trimmed) || /\+\s*["'`]/.test(trimmed);
      if (hasSqlQuotes && hasValueConcat) {
        errors.push(`${filePath}:${i + 1}: String concatenation in query() — use $N placeholders`);
      }
    }
  });
}

// Check 3: Template literals interpolating variables in SQL
function checkTemplateLiteralInjection(content, filePath) {
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Match query(\`...${...}\`) where the interpolation is NOT a $1, $2, etc. placeholder
    const matches = trimmed.match(/query\(`[^`]*\$\{[^}]+\}[^`]*`/);
    if (matches) {
      const interpolated = matches[0].match(/\$\{([^}]+)\}/);
      if (interpolated && !interpolated[1].match(/^\d+$/) && !interpolated[1].match(/^\$[a-zA-Z_]/)) {
        errors.push(`${filePath}:${i + 1}: Template literal interpolation in SQL — use $N placeholders`);
      }
    }
  });
}

// Check 4: Dynamic column/table names in SQL (can't parameterize)
function checkDynamicIdentifiers(content, filePath) {
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.includes('query(') && (trimmed.includes('ORDER BY') || trimmed.includes('order by'))) {
      const orderByMatch = trimmed.match(/ORDER BY\s+(\w+)/i);
      if (orderByMatch && orderByMatch[1] && trimmed.includes('$')) {
        // If ORDER BY field comes from a variable, flag it
        const fieldMatch = trimmed.match(/ORDER BY\s+\$\d+/i);
        if (fieldMatch) {
          warnings.push(`${filePath}:${i + 1}: Dynamic ORDER BY column — ensure value is validated against whitelist`);
        }
      }
    }
  });
}

// Check 5: Ensure every query has corresponding params
function checkMissingParams(content, filePath) {
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Match query('...', [params]) pattern — verify $N counts match params array
    const queryMatch = trimmed.match(/query\(\s*['"`]([^'"`]*)['"`]\s*,\s*\[/);
    if (queryMatch) {
      const sql = queryMatch[1];
      const placeholders = sql.match(/\$\d+/g) || [];
      if (placeholders.length > 0) {
        errors.push(`${filePath}:${i + 1}: Query has \$${placeholders.length} placeholders — verify params array matches`);
      }
    }
  });
}

function main() {
  const files = [
    ...findFiles(SRC_DIR, '*.ts'),
    ...findFiles(SRC_DIR, '*.tsx'),
  ];

  files.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    filesChecked++;

    checkPgImports(content, filePath);
    checkStringConcat(content, filePath);
    checkTemplateLiteralInjection(content, filePath);
    checkDynamicIdentifiers(content, filePath);
  });

  console.log(`\n📊 Checked ${filesChecked} files`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Warnings: ${warnings.length}`);

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach((w) => console.log(`  ${w}`));
  }

  if (errors.length > 0) {
    console.log('\n❌ ERRORS (must fix):');
    errors.forEach((e) => console.log(`  ${e}`));
    if (FAIL_FAST) {
      console.log('\n🔴 SQL injection guard: FAILED');
      process.exit(1);
    }
  }

  if (errors.length === 0) {
    console.log('\n✅ SQL injection guard: PASSED');
  }
}

main();
