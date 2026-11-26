"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CloudUpload, FileText, X } from "lucide-react";
import { Status } from "./app-shared";

type Upload = {
  key: string;
  file: File;
  progress: number;
  state: string;
  id?: string;
  error?: string;
};
const busyStates = ["UPLOADED", "QUEUED", "PROCESSING"];
function transmit(
  file: File,
  progress: (value: number) => void,
): Promise<{ id: string; status: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/workspace/upload");
    request.timeout = 45000;
    request.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    request.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () =>
      reject(new Error("Network error. Try the upload again."));
    request.ontimeout = () => reject(new Error("Upload timed out. Try again."));
    request.onload = () => {
      try {
        const data = JSON.parse(request.responseText);
        if (request.status >= 200 && request.status < 300) resolve(data);
        else reject(new Error(data.error ?? "Upload failed."));
      } catch {
        reject(new Error("Upload failed."));
      }
    };
    request.send(file);
  });
}
export function UploadCenter({
  locale,
  enabled,
  mock,
}: {
  locale: string;
  enabled: boolean;
  mock: boolean;
}) {
  const ar = locale === "ar";
  const t = (en: string, a: string) => (ar ? a : en);
  const picker = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const update = (key: string, values: Partial<Upload>) =>
    setItems((previous) =>
      previous.map((item) =>
        item.key === key ? { ...item, ...values } : item,
      ),
    );
  const pendingKey = items
    .filter((item) => item.id && busyStates.includes(item.state))
    .map((item) => item.key + ":" + item.id)
    .join(",");
  useEffect(() => {
    if (!pendingKey) return;
    let disposed = false;
    const poll = async () => {
      await Promise.all(
        pendingKey.split(",").map(async (item) => {
          const [key, id] = item.split(":");
          try {
            const response = await fetch("/api/workspace/documents/" + id, {
              cache: "no-store",
            });
            if (!response.ok || disposed) return;
            const doc = await response.json();
            update(key, { state: doc.status, error: doc.error || undefined });
          } catch {
            /* Keep the last confirmed state until the connection recovers. */
          }
        }),
      );
    };
    const timer = setInterval(poll, 2500);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [pendingKey]);
  function add(files: FileList | null) {
    if (!files || !enabled) return;
    const capacity = Math.max(0, 20 - items.length);
    setMessage(
      files.length > capacity
        ? t("Add up to 20 files per batch.", "يمكن إضافة ٢٠ ملفًا لكل دفعة.")
        : "",
    );
    setItems((previous) => [
      ...previous,
      ...Array.from(files)
        .slice(0, capacity)
        .map((file) => ({
          key: crypto.randomUUID(),
          file,
          progress: 0,
          state: file.size > 10485760 || !file.size ? "INVALID" : "READY",
          error:
            file.size > 10485760 || !file.size
              ? t(
                  "Use a non-empty file up to 10 MB.",
                  "استخدم ملفًا غير فارغ حتى ١٠ ميغابايت.",
                )
              : undefined,
        })),
    ]);
  }
  async function begin() {
    setUploading(true);
    for (const item of items.filter(
      (item) => item.state === "READY" || item.state === "UPLOAD_ERROR",
    )) {
      update(item.key, { state: "SENDING", error: undefined, progress: 0 });
      try {
        const next = await transmit(item.file, (progress) =>
          update(item.key, { progress }),
        );
        update(item.key, { id: next.id, state: next.status, progress: 100 });
      } catch (error) {
        update(item.key, {
          state: "UPLOAD_ERROR",
          error:
            error instanceof Error
              ? error.message
              : t("Upload failed.", "فشل التحميل."),
        });
      }
    }
    setUploading(false);
  }
  return (
    <div className="panel upload-panel">
      {mock && (
        <p className="notice">
          {t(
            "Local mock extraction is active. Results come from test fixtures.",
            "الاستخراج التجريبي مفعّل محليًا.",
          )}
        </p>
      )}
      {!enabled && (
        <p className="notice">
          {t(
            "Configure extraction and private object storage to enable uploads.",
            "اضبط إعدادات الاستخراج والتخزين الخاص لتفعيل التحميل.",
          )}
        </p>
      )}
      <div
        className={"dropzone " + (dragging ? "dragging" : "")}
        onDragOver={(event) => {
          event.preventDefault();
          if (enabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(event.dataTransfer.files);
        }}
      >
        <span className="drop-icon">
          <CloudUpload size={28} />
        </span>
        <h2>
          {t("Drag and drop your documents", "اسحب مستنداتك وأفلتها هنا")}
        </h2>
        <p>
          {t(
            "PDF, JPEG, PNG, or WebP · Up to 10 MB per file",
            "PDF وJPEG وPNG وWebP · حتى ١٠ ميغابايت لكل ملف",
          )}
        </p>
        <input
          hidden
          ref={picker}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          aria-label={t("Choose files", "اختر الملفات")}
          onChange={(event) => {
            add(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          className="button outline"
          disabled={!enabled || uploading}
          onClick={() => picker.current?.click()}
        >
          {t("Choose files", "اختر الملفات")}
        </button>
      </div>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {items.length > 0 && (
        <>
          <ul className="upload-list">
            {items.map((item) => (
              <li key={item.key}>
                <span className="document-icon lavender">
                  <FileText size={18} />
                </span>
                <div>
                  <b>{item.file.name}</b>
                  <small>{(item.file.size / 1024).toFixed(1)} KB</small>
                  {item.state === "SENDING" && (
                    <progress
                      aria-label={t("Upload progress", "نسبة التحميل")}
                      value={item.progress}
                      max={100}
                    />
                  )}{" "}
                  {item.error && (
                    <small className="warning" role="alert">
                      {item.error}
                    </small>
                  )}
                </div>
                <div className="inline-actions">
                  {item.id ? (
                    <>
                      <Status locale={locale} status={item.state} />
                      <Link
                        href={"/dashboard/documents/" + item.id}
                        className="button small outline"
                      >
                        {t("Open document", "فتح المستند")}
                      </Link>
                    </>
                  ) : !uploading ? (
                    <button
                      className="icon-button"
                      aria-label={t("Remove file", "إزالة الملف")}
                      onClick={() =>
                        setItems(items.filter((x) => x.key !== item.key))
                      }
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <button
            className="button primary"
            onClick={begin}
            disabled={
              uploading ||
              !items.some(
                (i) => i.state === "READY" || i.state === "UPLOAD_ERROR",
              )
            }
          >
            <CloudUpload size={17} />
            {uploading
              ? t("Uploading…", "جارٍ التحميل…")
              : t("Upload selected files", "تحميل الملفات المحددة")}
          </button>
        </>
      )}
    </div>
  );
}
