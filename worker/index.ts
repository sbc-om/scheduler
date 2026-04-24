import "dotenv/config";
import { logger } from "@/lib/logger";
import { startWorkerRuntime } from "./runtime";

startWorkerRuntime().catch((e) => {
  logger.fatal({ err: (e as Error).message }, "worker failed to start");
  process.exit(1);
});
