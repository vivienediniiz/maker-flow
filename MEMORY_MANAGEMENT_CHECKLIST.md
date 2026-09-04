# ✅ Memory Management Checklist

Use este checklist ao revisar componentes para vazamento de memória.

## EventListeners
- [ ] `addEventListener` has corresponding `removeEventListener` in cleanup
- [ ] Listener cleanup is in useEffect return function
- [ ] Event handler is memoized or wrapped in useCallback if needed

Example:
```tsx
useEffect(() => {
  const handler = (e) => { /* ... */ };
  window.addEventListener('scroll', handler);
  return () => window.removeEventListener('scroll', handler); // ✅ CLEANUP
}, []);
```

## Timers
- [ ] `setTimeout` has corresponding `clearTimeout` in cleanup
- [ ] `setInterval` has corresponding `clearInterval` in cleanup
- [ ] Cleanup function clears the timeout/interval

Example:
```tsx
useEffect(() => {
  const timer = setTimeout(() => { /* ... */ }, 1000);
  return () => clearTimeout(timer); // ✅ CLEANUP
}, []);
```

## Subscriptions (Supabase, etc)
- [ ] Subscription has `unsubscribe()` or `.off()` in cleanup
- [ ] Cleanup function is called in useEffect return

Example:
```tsx
useEffect(() => {
  const sub = supabase.from('table').on('*', (payload) => { /* ... */ }).subscribe();
  return () => sub.unsubscribe(); // ✅ CLEANUP
}, []);
```

## Fetch Requests
- [ ] AbortController is created for fetch
- [ ] controller.abort() is called in cleanup
- [ ] State updates check if component is mounted (isMountedRef.current)

Example:
```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal })
    .then(r => r.json())
    .then(data => { if (isMountedRef.current) setData(data); });
  return () => controller.abort(); // ✅ CLEANUP
}, []);
```

## State Updates After Unmount
- [ ] Use `isMountedRef` to prevent state updates after unmount
- [ ] All setState calls are guarded with `if (isMountedRef.current)`

Example:
```tsx
const isMountedRef = useRef(true);

useEffect(() => {
  // ... async work ...
  if (isMountedRef.current) setData(result); // ✅ Guard state update
  return () => { isMountedRef.current = false; };
}, []);
```

## DOM References
- [ ] useRef cleanup clears references
- [ ] No circular references between components

## Observers (IntersectionObserver, ResizeObserver, etc)
- [ ] Observer has disconnect() in cleanup
- [ ] disconnect() is called before unmount

Example:
```tsx
useEffect(() => {
  const observer = new IntersectionObserver((entries) => { /* ... */ });
  observer.observe(element);
  return () => observer.disconnect(); // ✅ CLEANUP
}, []);
```

## Custom Hooks
- [ ] All cleanup patterns above are applied in custom hooks
- [ ] Dependencies array is correct (no missing or extra deps)

## CI/CD Integration
- [ ] Run memory profiler in dev: Chrome DevTools → Memory tab
- [ ] Check for detached DOM nodes and growing heap size
- [ ] Monitor for memory leaks in automated tests

## Tools
- Chrome DevTools Memory Profiler: Monitor heap size over time
- React DevTools Profiler: Check render counts
- useEffect Cleanup Inspector (VSCode extension): Validate cleanup
