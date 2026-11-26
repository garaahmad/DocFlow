import Link from "next/link";
import { FileText } from "lucide-react";
import { Status } from "./app-shared";
import { displayMoney } from "@/lib/money";
export type DocumentRow = {
  id: string;
  filename: string;
  kind: string | null;
  vendor: string | null;
  reference: string | null;
  currency: string | null;
  total: { toFixed: () => string } | null;
  status: string;
  createdAt: Date;
  issuedOn?: Date | null;
  findings?: unknown;
};
export function DocumentTable({
  documents,
  locale,
}: {
  documents: DocumentRow[];
  locale: string;
}) {
  const ar = locale === "ar";
  return (
    <div className="table-scroll">
      <table className="doc-table">
        <thead>
          <tr>
            <th>{ar ? "المستند" : "Document"}</th>
            <th>{ar ? "النوع" : "Type"}</th>
            <th>{ar ? "التاريخ" : "Date"}</th>
            <th>{ar ? "الإجمالي" : "Total"}</th>
            <th>{ar ? "الحالة" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((row, i) => {
            const duplicates =
              Array.isArray(row.findings) &&
              row.findings.some((issue) => issue?.type === "duplicate");
            return (
              <tr key={row.id}>
                <td>
                  <Link
                    className="document-link"
                    href={"/dashboard/documents/" + row.id}
                  >
                    <span
                      className={
                        "document-icon " +
                        ["lavender", "mint", "peach", "blue"][i % 4]
                      }
                    >
                      <FileText size={17} />
                    </span>
                    <span>
                      <b>{row.vendor ?? row.filename}</b>
                      <small>
                        {row.vendor ? row.filename : (row.reference ?? "—")}
                      </small>
                      {duplicates && (
                        <small className="warning">
                          {ar ? "تكرار محتمل" : "Possible duplicate"}
                        </small>
                      )}
                    </span>
                  </Link>
                </td>
                <td>{row.kind ?? "—"}</td>
                <td>
                  {(row.issuedOn ?? row.createdAt).toLocaleDateString(locale, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </td>
                <td>
                  <b>
                    {displayMoney(row.total?.toFixed(), row.currency, locale)}
                  </b>
                </td>
                <td>
                  <Status status={row.status} locale={locale} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
