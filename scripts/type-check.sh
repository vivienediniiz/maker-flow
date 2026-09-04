#!/bin/bash

# ✅ TypeScript Validation Script
# Runs comprehensive type checking

echo "🔍 Running TypeScript strict checks..."
npx tsc --strict --noEmit

if [ $? -ne 0 ]; then
  echo "❌ Type check failed"
  exit 1
fi

echo "✅ All type checks passed"

# Optional: type-coverage check (if installed)
if command -v type-coverage &> /dev/null; then
  echo "📊 Checking type coverage..."
  npx type-coverage --at-least 90 --strict
else
  echo "⚠️  type-coverage not installed. Install with: npm install --save-dev type-coverage"
fi

echo "✅ Type validation complete"
