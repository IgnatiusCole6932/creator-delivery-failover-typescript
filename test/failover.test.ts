import { chooseRoute, deliver } from "../src/failover_service.ts";

if (chooseRoute("video") !== "primary") throw new Error("video should start on primary");
if (chooseRoute("archive") !== "backup") throw new Error("archive should start on backup");
if (chooseRoute("video", "primary") !== "backup") throw new Error("failed primary should fail over");

delete process.env.INFRAI_API_KEY;
const result = await deliver({
  assetId: "studio-pack.zip",
  assetKind: "archive",
  subscriber: "sam@example.com",
  signedDownloadPath: "/downloads/studio-pack.zip",
  requestId: "test-1",
});
if (result.route !== "backup" || !result.message.includes("/downloads/studio-pack.zip")) {
  throw new Error("archive delivery decision was not preserved");
}
console.log("ok");
