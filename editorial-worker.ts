import { createHmac } from "node:crypto";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore OpenNext generates this module after the pre-build TypeScript check.
import handler from "./.open-next/worker.js";

type EditorialEnv = CloudflareEnv & {
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
      "https://perez-tours.com/api/internal/editorial-recovery",
      {
        method: "POST",
        headers: {
          "x-editorial-signature": signature,
          "x-editorial-scheduled-time": timestamp,
        },
      },
    ), env, ctx);
    if (!response.ok) throw new Error(`Editorial recovery returned ${response.status}`);
  },
} satisfies ExportedHandler<EditorialEnv>;
