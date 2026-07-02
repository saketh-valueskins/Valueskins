// Validate all required environment variables at startup

const REQUIRED_ENV_VARS = {
  NODE_ENV: ['development', 'production', 'test'],
  DATABASE_URL: null, // Just check it exists
  ADMIN_EMAILS: null,
  ADMIN_PASSWORD_HASH: null,
  ADMIN_PASSWORD_SALT: null,
};

const OPTIONAL_ENV_VARS = {
  REDIS_URL: null,
  GOOGLE_CLIENT_ID: null,
  GOOGLE_CLIENT_SECRET: null,
  RAZORPAY_KEY_ID: null,
  RAZORPAY_KEY_SECRET: null,
};

export function validateEnvironment() {
  const errors: string[] = [];

  // Check required vars
  for (const [key, allowedValues] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key];

    if (!value) {
      errors.push(`Missing required env var: ${key}`);
      continue;
    }

    if (Array.isArray(allowedValues) && !allowedValues.includes(value)) {
      errors.push(`Invalid ${key}: must be one of ${allowedValues.join(', ')}`);
    }

    // Warn if secret is too short
    if (key.includes('SECRET') && value.length < 32) {
      errors.push(`${key} is too short (min 32 characters)`);
    }
  }

  // Warn about optional vars
  for (const key of Object.keys(OPTIONAL_ENV_VARS)) {
    if (!process.env[key]) {
      console.warn(`Optional env var not set: ${key}`);
    }
  }

  if (errors.length > 0) {
    console.error('Environment validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    throw new Error('Invalid environment configuration');
  }

  console.log('✓ Environment validation passed');
}

export function getRequiredEnv(key: keyof typeof REQUIRED_ENV_VARS): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export function getOptionalEnv(key: keyof typeof OPTIONAL_ENV_VARS): string | undefined {
  return process.env[key];
}
