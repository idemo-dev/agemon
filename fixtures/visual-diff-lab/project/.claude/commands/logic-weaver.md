# Logic Weaver

Design multi-step reasoning with explicit branch control.
If dependencies fail, switch to fallback path.
Unless required data is complete, stop and ask for a missing field.
Otherwise continue with strict validation.

```ts
if (!depsReady) {
  useFallback();
} else if (input.missing.length > 0) {
  throw new Error("Missing required input");
} else {
  runPipeline();
}
```

Include assumptions, constraints, and final verification checklist.
