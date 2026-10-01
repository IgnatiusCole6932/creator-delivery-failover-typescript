import { deliver, type AssetKind } from "./failover_service.ts";

function value(flag: string): string {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

const assetId = value("--asset") || "creator-pack.zip";
const subscriber = value("--subscriber") || "subscriber@example.com";
const kind: AssetKind = assetId.endsWith(".mp4") ? "video" : "archive";

const result = await deliver({
  assetId,
  assetKind: kind,
  subscriber,
  signedDownloadPath: `/downloads/${assetId}`,
  requestId: `delivery-${assetId}`,
});

console.log(JSON.stringify(result, null, 2));
