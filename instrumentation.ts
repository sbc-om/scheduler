export async function register() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_RUNTIME !== "nodejs"
  ) {
    return;
  }

  const { startWorkerRuntime } = await import("./worker/runtime");
  await startWorkerRuntime();
}