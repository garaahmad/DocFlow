import Link from "next/link";
import { Layers2 } from "lucide-react";
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="DocFlow AI">
      <span className="brand-icon">
        <Layers2 size={21} strokeWidth={2.4} />
      </span>
      <span>
        DocFlow<span className="brand-ai"> AI</span>
      </span>
    </Link>
  );
}
