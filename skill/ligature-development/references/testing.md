# Testing sequence

From `/home/dkinkead/agent-tags-prototype` run:

```bash
npm test
npm run test:playwright
npm run test:a11y
node src/cli.js check
npm run release:check
```

Run the smallest focused test while iterating, then run the complete applicable gate before reporting completion. Test success paths, validation failures, authorization failures, browser lifecycle, persistence, and rollback-sensitive behavior. Report skipped optional checks explicitly.
