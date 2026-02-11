Review the code changes for quality, security, and performance issues.

## Checklist
- Check for security vulnerabilities (XSS, injection, etc.)
- Verify error handling is complete
- Ensure tests cover edge cases
- Check for performance bottlenecks

```typescript
// Example patterns to watch for
const unsafeInput = req.query.search; // Must sanitize
```

When reviewing, consider both the immediate changes and their impact on the broader system architecture.
