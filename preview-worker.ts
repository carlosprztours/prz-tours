import { createHmac } from "node:crypto";

// @ts-expect-error OpenNext generates this module during the build.
import handler from "./.open-next/worker.js";

type PreviewEnv = CloudflareEnv & {
  AUTH_SECRET?: string;
  EDITORIAL_TRANSLATION_WORKERS_AI?: string;
};

export default {
  fetch: handler.fetch,
  async scheduled(event, env, ctx) {
    if (env.EDITORIAL_TRANSLATION_WORKERS_AI !== "true" || !env.AUTH_SECRET) return;
    const timestamp = String(event.scheduledTime);
    const signature = createHmac("sha256", env.AUTH_SECRET).update(`editorial-recovery:${timestamp}`).digest("hex");
    const response = await handler.fetch(new Request(
      "https://prz-tours-video-preview.carlosprz-tours.workers.dev/api/internal/editorial-recovery",
      {
        method: "POST",
        headers: {
          "x-editorial-signature": signature,
          "x-editorial-scheduled-time": timestamp,
        },
      },
    ), env, ctx);
    if (!response.ok) throw new Error(`Preview editorial recovery returned ${response.status}`);
  },
} satisfies ExportedHandler<PreviewEnv>;
