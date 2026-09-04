# ✅ Code Structure & Maintainability Guide

## Directory Organization

```
src/
├── app/                 # Next.js 14 App Router
│   ├── (auth)/         # Auth routes (public)
│   ├── (login)/        # Login route (public, custom styling)
│   ├── dashboard/      # Protected routes
│   └── api/            # API routes
├── components/
│   ├── ui/             # Reusable UI components (btn, card, modal, etc)
│   ├── dashboard/      # Dashboard-specific components
│   ├── examples/       # Reference implementations
│   └── ErrorBoundary.tsx
├── hooks/              # Custom React hooks (useAsync, useFormState, etc)
├── lib/
│   ├── supabase/       # Supabase client/server
│   ├── mercadoPago.ts  # Integration: Mercado Pago
│   ├── mercadoLivre.ts # Integration: Mercado Livre
│   ├── errors.ts       # Error types & handling
│   ├── logger.ts       # Centralized logging
│   ├── types.ts        # TypeScript types
│   └── cleanup-patterns.ts # Memory management utilities
├── scripts/            # Build/utility scripts
└── styles/             # Global styles
```

## Naming Conventions

### Files
- **Components**: PascalCase (e.g., `ErrorBoundary.tsx`, `Modal.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAsync.ts`, `useFormState.ts`)
- **Utils/Libs**: camelCase (e.g., `logger.ts`, `errors.ts`)
- **Types**: camelCase or PascalCase depending on usage

### Functions/Variables
- **Components**: PascalCase (e.g., `function ErrorBoundary() {}`)
- **Hooks**: camelCase with `use` prefix (e.g., `function useAsync() {}`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES = 3`)
- **Private**: `_leadingUnderscore` (e.g., `_handleInternal()`)

### React Props
- **Spread props**: Use discriminated unions, not `{...rest}`
- **Callbacks**: Prefix with `on` (e.g., `onSubmit`, `onError`)
- **Booleans**: Use `is` or `has` prefix (e.g., `isLoading`, `hasError`)

## Import Organization

```tsx
// 1. React/Next.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { formatDate } from 'date-fns';

// 3. Local: absolute imports (use @/)
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { logger } from '@/lib/logger';
import type { User } from '@/lib/types';

// 4. Styles (if not in CSS)
import styles from './Component.module.css';
```

## Component Structure

```tsx
/**
 * ✅ Component documentation block
 * Brief description of what it does
 * 
 * @example
 * <MyComponent isLoading={false} onSubmit={(data) => console.log(data)} />
 */

import { memo } from 'react';
import type { ReactNode } from 'react';

// Props definition (always extract to interface)
interface MyComponentProps {
  title: string;
  isLoading?: boolean;
  onSubmit?: (data: any) => void;
  children?: ReactNode;
}

// Component (keep as single export)
export const MyComponent = memo(function MyComponent({
  title,
  isLoading = false,
  onSubmit,
  children,
}: MyComponentProps) {
  // Hooks first
  const [state, setState] = useState(null);

  // Effects
  useEffect(() => {
    // ...
    return () => { /* cleanup */ };
  }, []);

  // Handlers (define once, not inline)
  const handleClick = () => { /* ... */ };

  // Render
  return (
    <div>
      <h1>{title}</h1>
      {isLoading && <Spinner />}
      {children}
      <button onClick={handleClick}>Submit</button>
    </div>
  );
});

MyComponent.displayName = 'MyComponent'; // For debugging
```

## Hook Usage Rules

✅ DO:
- Use hooks to extract repeated patterns (useAsync, useFormState, useEventListener)
- Name hooks with `use` prefix
- Keep hooks focused on single responsibility
- Include proper cleanup in useEffect

❌ DON'T:
- Call hooks conditionally or in loops
- Mix logic that should be separate hooks
- Forget cleanup functions
- Use "rules of hooks" violations

## Custom Hooks Template

```tsx
/**
 * ✅ Hook: useMyHook
 * Handles X, Y, Z
 */
export function useMyHook(param: string) {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Setup
    const handler = () => { /* ... */ };
    window.addEventListener('event', handler);

    // Cleanup
    return () => {
      window.removeEventListener('event', handler);
    };
  }, [param]); // Dependencies!

  return { state, /* ... */ };
}
```

## Error Handling Pattern

```tsx
import { AppError, tryCatch } from '@/lib/errors';
import { logger } from '@/lib/logger';

async function fetchData() {
  try {
    const result = await tryCatch(
      async () => {
        return await fetch('/api/data').then(r => r.json());
      },
      { operation: 'fetchData', userId: 'abc123' }
    );
    return result;
  } catch (err) {
    if (err instanceof AppError) {
      // Handle known error types
      logger.error('App error:', err);
    } else {
      // Handle unexpected errors
      logger.error('Unexpected error:', err instanceof Error ? err : new Error(String(err)));
    }
    throw err;
  }
}
```

## Type Safety

```tsx
// ✅ Explicit types (no `any`)
import type { User, Quote } from '@/lib/types';

interface MyProps {
  user: User;
  quotes: Quote[];
  onSelect: (quote: Quote) => void;
}

// ✅ Discriminated unions for variants
type ButtonVariant = 'primary' | 'secondary' | 'danger';

// ❌ Avoid: Too general types
// type MyProps = { data: any; onAction: (e: any) => void };
```

## Testing Patterns

```tsx
// For components: useTestable pattern
export function useTestableData() {
  // Keep fetching logic in hook so it's testable separately
  const { data, error, isLoading } = useAsync(fetchFn);
  return { data, error, isLoading };
}

// Component just renders (testable UI separately)
export function MyComponent() {
  const { data, error, isLoading } = useTestableData();
  // Render...
}
```

## Performance Guidelines

- ✅ Use `memo` for expensive components
- ✅ Use `useCallback` for callbacks passed to memoized children
- ✅ Lazy load routes with `dynamic()` (Next.js)
- ✅ Split large components into smaller, memoized ones
- ❌ Don't memoize everything (measure first)
- ❌ Don't use index as React key

## Refactoring Checklist

- [ ] Extract repeated state logic → custom hook
- [ ] Extract repeated markup → component or utility
- [ ] Extract repeated error handling → centralized function
- [ ] Validate prop drilling (>3 levels) → context or custom hook
- [ ] Check for dead code (unused imports, functions)
- [ ] Verify cleanup functions in useEffect
- [ ] Add JSDoc comments to exported functions
- [ ] Ensure TypeScript strictness
