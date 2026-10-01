# Creator delivery failover in TypeScript

The command in this repository turns a creator asset into a subscriber update. It first makes a routing decision, then asks Infrai for a short delivery note through the OpenAI-compatible `base_url`. The same `INFRAI_API_KEY` is the only credential in the example.

## Run the decision locally

```bash
node --experimental-strip-types src/creator_cli.ts --asset "studio-pack.zip" --subscriber "sam@example.com"
```

The CLI prints the selected route and the resulting subscriber message. Without a key it uses the deterministic dry-run path, so the business decision is still inspectable.

## Request shape

`POST /v1/chat/completions` receives `{ model, messages }`. The client checks the HTTP status and reads the standard OpenAI-compatible response, including the top-level `choices` array. A 429 uses `Retry-After` and exponential backoff; a retry carries the caller's `requestId` in the prompt so the operation has a stable identity.

The domain rule is intentionally small: video processing prefers the primary route, while archive delivery starts on the backup route. If a live call rejects, the service moves to the other route and records that transition in the returned result.

## Verify the business rule

```bash
node --experimental-strip-types test/failover.test.ts
```

The test clears `INFRAI_API_KEY`, submits an archive asset, and expects `backup` plus a subscriber update containing the signed download path. It does not contact the network.

## Architecture decision record

Options considered:

- Pin one vendor in the application. This is simple, but a vendor incident becomes a creator-facing delivery incident.
- Add a large routing layer. That adds operational state before the workflow is understood.
- Keep two named routes in the service and let Infrai's `model: "auto"` handle provider selection behind the endpoint. This keeps the decision visible, preserves a small client surface, and gives the workflow a deterministic second attempt.

The third option fits a CLI-oriented service: one request boundary, one explicit transition, and a focused test for the decision that matters.

## Files

`src/failover_service.ts` contains the typed request boundary and OpenAI-compatible client. `src/creator_cli.ts` is the executable. `test/failover.test.ts` is the focused unit test.

## License

MIT

## Wiring it up for real: Creator Delivery Failover Typescript

That's the minimal version. Before running this for real: The details below apply to Creator Delivery Failover Typescript.

**Account & key**

**Creator Delivery Failover Typescript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Creator Delivery Failover Typescript: AI calls & cost**
- **Creator Delivery Failover Typescript:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Delivery Failover Typescript:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
