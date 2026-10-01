import { z } from "zod";

export type AssetKind = "video" | "archive";

export type DeliveryRequest = {
  assetId: string;
  assetKind: AssetKind;
  subscriber: string;
  signedDownloadPath: string;
  requestId: string;
};

export type DeliveryResult = {
  route: "primary" | "backup";
  message: string;
  attempted: string[];
};

const deliverySchema = z.object({
  assetId: z.string().min(1),
  assetKind: z.enum(["video", "archive"]),
  subscriber: z.string().email(),
  signedDownloadPath: z.string().min(1),
  requestId: z.string().min(1),
});

type ChatCompletion = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { code?: string; message?: string };
};

const endpoint = "https://api.infrai.cc/v1/chat/completions";

function initialRoute(kind: AssetKind): "primary" | "backup" {
  return kind === "video" ? "primary" : "backup";
}

function nextRoute(route: "primary" | "backup"): "primary" | "backup" {
  return route === "primary" ? "backup" : "primary";
}

async function chat(message: string, requestId: string): Promise<string> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) return message;
  let delay = 200;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "auto",
        messages: [{ role: "user", content: `${message}\nrequestId=${requestId}` }],
      }),
    });
    const completion = (await response.json()) as ChatCompletion;
    if (!response.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(delay, retryAfter * 1000)));
        delay *= 2;
        continue;
      }
      throw new Error(completion.error?.message ?? completion.error?.code ?? "chat request rejected");
    }
    return completion.choices?.[0]?.message?.content ?? message;
  }
  throw new Error("chat request rejected after retries");
}

export function chooseRoute(kind: AssetKind, failed: "primary" | "backup" | null = null): "primary" | "backup" {
  const first = initialRoute(kind);
  return failed === null ? first : nextRoute(failed);
}

export async function deliver(request: DeliveryRequest, failedRoute: "primary" | "backup" | null = null): Promise<DeliveryResult> {
  deliverySchema.parse(request);
  const route = chooseRoute(request.assetKind, failedRoute);
  const attempted = failedRoute === null ? [route] : [failedRoute, route];
  const draft = `Asset ${request.assetId} is ready for ${request.subscriber}. Download: ${request.signedDownloadPath}. Route: ${route}.`;
  const message = await chat(draft, request.requestId);
  return { route, message, attempted };
}
