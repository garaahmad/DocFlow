import { ServiceError } from "@/lib/access";
export async function readBytes(request: Request, limit: number) {
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    throw new ServiceError(413, "This request exceeds the allowed size.");
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > limit) {
        await reader.cancel();
        throw new ServiceError(413, "This request exceeds the allowed size.");
      }
      parts.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(parts, size);
}
export async function readJson(
  request: Request,
  max = 262144,
): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new ServiceError(415, "Send a JSON request body.");
  return JSON.parse((await readBytes(request, max)).toString("utf8"));
}
