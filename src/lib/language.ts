import { cookies } from "next/headers";
export async function language() {
  return (await cookies()).get("docflow-language")?.value === "ar"
    ? "ar"
    : "en";
}
