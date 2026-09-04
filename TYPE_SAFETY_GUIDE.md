# ✅ Type Safety & TypeScript Guide

## TypeScript Configuration

Current setting: **`strict: true`** ✅

This enables:
- `noImplicitAny`: No implicit `any` types
- `strictNullChecks`: Null/undefined explicitly typed
- `strictFunctionTypes`: Strict function parameter types
- `strictBindCallApply`: Strict `bind()`, `call()`, `apply()`
- `strictPropertyInitialization`: Properties must be initialized
- `noImplicitThis`: No implicit `this` without type

## Type Definitions

### ✅ DO: Explicit Types

```tsx
// ✅ Explicit return type
function getUserName(id: string): string {
  return getUserById(id).name;
}

// ✅ Explicit parameter types
function calculate(a: number, b: number): number {
  return a + b;
}

// ✅ Use interfaces for objects
interface User {
  id: string;
  name: string;
  email?: string; // Optional
}

// ✅ Use discriminated unions for variants
type Result<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

### ❌ DON'T: Implicit `any`

```tsx
// ❌ Implicit any
function process(data) { // ERROR: missing type
  return data.value;
}

// ❌ Weak typing
function handle(e: any) { // Avoid if possible
  console.log(e.message);
}

// ❌ Unknown used carelessly
function parse(str: unknown) {
  return str.toUpperCase(); // ERROR: unknown has no methods
}
```

## React Component Types

```tsx
// ✅ Proper props type
interface MyComponentProps {
  title: string;
  isLoading?: boolean;
  onSubmit?: (data: FormData) => Promise<void>;
  children?: React.ReactNode;
}

export function MyComponent(props: MyComponentProps) {
  // ...
}

// ✅ Typed event handlers
function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
  console.log(e.currentTarget.value);
}

// ✅ Form submission
function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
}

// ✅ Input change
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  const value = e.target.value;
}
```

## Async/Promise Types

```tsx
// ✅ Explicit return type
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('Not found');
  return response.json();
}

// ✅ Type generic promises
const promise: Promise<User> = fetchUser('123');
const promise2: Promise<User[]> = fetchUsers();

// ✅ Async callback
const handleAsync = async (e: React.FormEvent): Promise<void> => {
  try {
    const user = await fetchUser('123');
    setUser(user);
  } catch (err) {
    if (err instanceof Error) {
      setError(err.message);
    }
  }
};
```

## Error Handling

```tsx
// ✅ Typed error catch
try {
  await riskyOperation();
} catch (err) {
  // Type guard
  if (err instanceof Error) {
    console.error(err.message);
  } else if (typeof err === 'string') {
    console.error(err);
  } else {
    console.error('Unknown error');
  }
}

// ✅ Use custom error types
class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

try {
  validate(data);
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(`Invalid field: ${err.field}`);
  }
}
```

## Type Assertions (Use Sparingly)

```tsx
// ✅ Type guard (preferred)
if (data instanceof User) {
  console.log(data.name);
}

// ⚠️ Type assertion (last resort, can hide bugs)
const user = data as User; // May not actually be User!

// ✅ Better: Use type predicate
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    'email' in data
  );
}

if (isUser(data)) {
  console.log(data.name); // Safe!
}
```

## Generic Types

```tsx
// ✅ Generic functions
function identity<T>(value: T): T {
  return value;
}

// ✅ Generic components
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map(renderItem)}</ul>;
}

// ✅ Generic hooks
function useAsync<T>(fn: () => Promise<T>): {
  data: T | null;
  loading: boolean;
} {
  // ...
}
```

## Common Types to Define

```tsx
// ✅ API Response
interface ApiResponse<T> {
  data: T;
  error?: string;
  status: number;
}

// ✅ Async State
interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

// ✅ Form State
interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  isDirty: boolean;
  isSubmitting: boolean;
}

// ✅ Pagination
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

## Type Validation Checklist

- [ ] No `any` types used in production code
- [ ] All function parameters have types
- [ ] All function return types explicit (not inferred)
- [ ] Props interfaces defined for all components
- [ ] Error handling uses proper type guards
- [ ] Generic types used when applicable
- [ ] React events properly typed
- [ ] Async/Promise return types explicit
- [ ] All imports use `type` keyword when appropriate (`import type { User } from '...'`)
- [ ] No circular type dependencies

## Type Coverage Tools

```bash
# Check type coverage (if installed)
npm install --save-dev type-coverage
npx type-coverage --at-least 95

# TypeScript strict check
npx tsc --strict --noEmit

# Find implicit any
npx tsc --strict --noImplicitAny
```

## Best Practices

1. **Prefer `unknown` over `any`**: When you don't know the type, use `unknown` instead of `any`
2. **Use `type` for unions**: `type Status = 'pending' | 'success' | 'error'`
3. **Use `interface` for objects**: `interface User { ... }`
4. **Extend types for variants**: Use `extends` for conditional types
5. **Use `Readonly` for immutability**: `interface ImmutableUser extends Readonly<User> { }`
6. **Use utility types**: `Partial<T>`, `Pick<T>`, `Omit<T>`, `Record<K, V>`

## Compiler Options Quick Reference

```json
{
  "strict": true,                      // Enable all strict checks
  "noImplicitAny": true,               // Error on implicit any
  "strictNullChecks": true,            // Null/undefined explicit
  "strictFunctionTypes": true,         // Strict function compatibility
  "noUnusedLocals": true,              // Error on unused vars
  "noUnusedParameters": true,          // Error on unused params
  "noImplicitReturns": true,           // Error on missing returns
  "noFallthroughCasesInSwitch": true,  // Error on switch fallthrough
  "esModuleInterop": true,             // CommonJS/ES module compat
  "allowSyntheticDefaultImports": true // Allow default imports
}
```
