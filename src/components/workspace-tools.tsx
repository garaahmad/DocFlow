"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { authClient } from "@/lib/auth-client";

export function InvitationAccept({ token }: { token: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <>
      <button
        className="button primary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setNotice("");
          try {
            await api("accept", { token });
            router.push("/dashboard");
            router.refresh();
          } catch (e) {
            setNotice(errorMessage(e));
          } finally {
            setPending(false);
          }
        }}
      >
        Join workspace
      </button>
      {notice && (
        <p role="alert" className="notice error">
          {notice}
        </p>
      )}
    </>
  );
}
type Answer = {
  title: string;
  range: { from: string; to: string };
  facts: { label: string; value: string }[];
  narrative: string | null;
  mock: boolean;
};
const prompts = [
  ["How much did we spend this month?", "كم أنفقنا هذا الشهر؟"],
  [
    "Which vendor has the highest invoice total?",
    "أي مورد لديه أعلى إجمالي فواتير؟",
  ],
  ["Show invoices pending review.", "اعرض الفواتير قيد المراجعة."],
  ["Compare the last three months.", "قارن الأشهر الثلاثة الماضية."],
  ["Summarize expenses by category.", "لخّص الإنفاق حسب الفئة."],
  ["Which invoices might be duplicates?", "ما الفواتير المكررة المحتملة؟"],
] as const;
export function Assistant({
  locale,
  enabled,
  documentId,
  range,
}: {
  locale: string;
  enabled: boolean;
  documentId?: string;
  range?: { from: string; to: string };
}) {
  const ar = locale === "ar";
  const t = (en: string, a: string) => (ar ? a : en);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<
    { question: string; answer: Answer }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function submit(value: string) {
    if (busy || !enabled) return;
    setNotice("");
    setBusy(true);
    try {
      const answer = await api<Answer>("assistant", {
        documentId,
        question: value,
        history: history.slice(-4).map((turn) => turn.question),
        range,
      });
      setHistory((previous) => [...previous, { question: value, answer }]);
      setQuestion("");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel assistant-panel">
      {!enabled && (
        <p className="notice">
          {t(
            "The assistant requires an insights key and document editing access.",
            "يتطلب المساعد مفتاح Gemini وصلاحية تحرير المستندات.",
          )}
        </p>
      )}
      {!history.length && (
        <div className="assistant-intro">
          <div className="feature-icon">
            <Bot size={23} />
          </div>
          <h2>
            {documentId
              ? t("Explore this document", "استكشف هذا المستند")
              : t("Ask about your workspace", "اسأل عن مساحة عملك")}
          </h2>
          <p>
            {t(
              "Answers are based on workspace records and approved amounts.",
              "الإجابات تستند إلى سجلات مساحة العمل والمبالغ المعتمدة.",
            )}
          </p>
          <div className="prompt-list">
            {(documentId
              ? [
                  [
                    "Summarize the findings in this document.",
                    "لخّص تنبيهات هذا المستند.",
                  ],
                ]
              : range
                ? [
                    [
                      "Summarize spending for this report.",
                      "لخّص الإنفاق لهذا التقرير.",
                    ],
                  ]
                : prompts
            ).map(([en, a]) => (
              <button
                key={en}
                className="button outline small"
                disabled={!enabled || busy}
                type="button"
                onClick={() => submit(t(en, a))}
              >
                {t(en, a)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="conversation" aria-live="polite">
        {history.map((turn, index) => (
          <article key={index}>
            <p className="chat-question">{turn.question}</p>
            <div className="chat-answer">
              <h3>{turn.answer.title}</h3>
              <small>
                {turn.answer.range.from} — {turn.answer.range.to}
                {turn.answer.mock
                  ? " · " + t("Mock mode", "الوضع التجريبي")
                  : ""}
              </small>
              {turn.answer.narrative && <p>{turn.answer.narrative}</p>}
              {turn.answer.facts.length ? (
                <ul>
                  {turn.answer.facts.map((fact, i) => (
                    <li key={i}>
                      <b>{fact.label}</b>
                      <span>{fact.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {t(
                    "No matching records were found.",
                    "لم يتم العثور على سجلات مطابقة.",
                  )}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      {notice && (
        <p role="alert" className="notice error">
          {notice}
        </p>
      )}
      <form
        className="assistant-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(question);
        }}
      >
        <input
          disabled={!enabled || busy}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          minLength={3}
          maxLength={600}
          aria-label={t("Ask a question", "اطرح سؤالًا")}
          placeholder={t(
            "Ask a question about your documents…",
            "اطرح سؤالًا عن مستنداتك…",
          )}
        />
        <button
          className="button primary"
          disabled={!enabled || busy || question.trim().length < 3}
        >
          <Send size={16} />
          {busy ? t("Checking…", "جارٍ التحقق…") : t("Send", "إرسال")}
        </button>
      </form>
    </section>
  );
}
export function TeamTools({
  locale,
  members,
  eligible,
}: {
  locale: string;
  members: {
    id: string;
    name: string;
    email: string;
    role: string;
    editable: boolean;
  }[];
  eligible: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const t = (en: string, a: string) => (locale === "ar" ? a : en);
  async function run(operation: () => Promise<void>) {
    setFailed(false);
    setBusy(true);
    setNotice("");
    try {
      await operation();
      router.refresh();
    } catch (error) {
      setNotice(errorMessage(error));
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <section className="panel">
        <h2>{t("Workspace members", "أعضاء مساحة العمل")}</h2>
        <ul className="team-list">
          {members.map((member) => (
            <li key={member.id}>
              <span className="workspace-avatar">{member.name[0]}</span>
              <div>
                <b>{member.name}</b>
                <small>{member.email}</small>
              </div>
              {member.editable ? (
                <div className="inline-actions">
                  <select
                    aria-label={t("Change role", "تغيير الدور")}
                    value={member.role}
                    disabled={busy}
                    onChange={(e) => {
                      const role = e.target.value;
                      run(async () => {
                        await api("members/" + member.id, { role });
                        setNotice(t("Role updated.", "تم تحديث الدور."));
                      });
                    }}
                  >
                    {["ADMIN", "MEMBER", "VIEWER"].map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                  <button
                    className="button small danger"
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          t(
                            "Remove this workspace member?",
                            "هل تريد إزالة هذا العضو؟",
                          ),
                        )
                      )
                        run(async () => {
                          await api("members/" + member.id, {});
                          setNotice(t("Member removed.", "تمت إزالة العضو."));
                        });
                    }}
                  >
                    {t("Remove", "إزالة")}
                  </button>
                </div>
              ) : (
                <span className="status neutral">{member.role}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
      {eligible && (
        <section className="panel">
          <h2>{t("Invite a teammate", "ادع زميلًا")}</h2>
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              setUrl("");
              run(async () => {
                const result = await api<{ url: string; delivered: boolean }>(
                  "invite",
                  { email: data.get("email"), role: data.get("role") },
                );
                setUrl(result.url);
                setNotice(
                  result.delivered
                    ? t("Invitation emailed.", "تم إرسال الدعوة.")
                    : t(
                        "Share the invitation link privately.",
                        "شارك رابط الدعوة بشكل خاص.",
                      ),
                );
              });
            }}
          >
            <div className="form-grid">
              <label>
                {t("Email address", "البريد الإلكتروني")}
                <input name="email" required type="email" />
              </label>
              <label>
                {t("Role", "الدور")}
                <select name="role" defaultValue="MEMBER">
                  <option>MEMBER</option>
                  <option>VIEWER</option>
                  <option>ADMIN</option>
                </select>
              </label>
            </div>
            <div>
              <button className="button primary" disabled={busy}>
                {t("Create invitation", "إنشاء دعوة")}
              </button>
            </div>
          </form>
          {url && (
            <label>
              {t("Invitation link", "رابط الدعوة")}
              <input
                value={url}
                readOnly
                onFocus={(event) => event.target.select()}
                dir="ltr"
              />
            </label>
          )}
        </section>
      )}
      {notice && (
        <p
          className={"notice " + (failed ? "error" : "success")}
          role={failed ? "alert" : "status"}
        >
          {notice}
        </p>
      )}
    </div>
  );
}
export function BillingButtons({ locale }: { locale: string }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const t = (en: string, a: string) => (locale === "ar" ? a : en);
  return (
    <>
      <div className="inline-actions">
        {(
          [
            ["pro", "Choose Pro", "اختر برو"],
            ["business", "Choose Business", "اختر الأعمال"],
            ["portal", "Manage subscription", "إدارة الاشتراك"],
          ] as const
        ).map(([plan, en, a]) => (
          <button
            key={plan}
            disabled={busy}
            className={"button " + (plan === "pro" ? "primary" : "outline")}
            onClick={async () => {
              setBusy(true);
              setNotice("");
              try {
                const { url } = await api<{ url: string | null }>("billing", {
                  plan,
                });
                if (!url)
                  throw new Error("Stripe did not return a checkout link.");
                location.assign(url);
              } catch (error) {
                setNotice(errorMessage(error));
                setBusy(false);
              }
            }}
          >
            {t(en, a)}
          </button>
        ))}
      </div>
      {notice && (
        <p role="alert" className="notice error">
          {notice}
        </p>
      )}
    </>
  );
}
export function Profile({
  locale,
  name,
  email,
}: {
  locale: string;
  name: string;
  email: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();
  const [busy, setBusy] = useState(false);
  const t = (en: string, a: string) => (locale === "ar" ? a : en);
  return (
    <section className="panel stack">
      <h2>{t("Profile and security", "الملف الشخصي والأمان")}</h2>
      <form
        className="form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setStatus(undefined);
          try {
            const result = await authClient.updateUser({
              name: String(
                new FormData(event.currentTarget).get("name"),
              ).trim(),
            });
            if (result.error) throw new Error(result.error.message);
            setStatus({ text: t("Profile updated.", "تم تحديث الملف.") });
            router.refresh();
          } catch (e) {
            setStatus({ text: errorMessage(e), error: true });
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            {t("Full name", "الاسم الكامل")}
            <input name="name" defaultValue={name} required maxLength={80} />
          </label>
          <label>
            {t("Email", "البريد")}
            <input value={email} readOnly dir="ltr" />
          </label>
        </div>
        <div>
          <button className="button outline" disabled={busy}>
            {t("Save profile", "حفظ الملف")}
          </button>
        </div>
      </form>
      <form
        className="form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          setBusy(true);
          setStatus(undefined);
          try {
            const data = new FormData(form);
            const result = await authClient.changePassword({
              currentPassword: String(data.get("current")),
              newPassword: String(data.get("new")),
              revokeOtherSessions: true,
            });
            if (result.error) throw new Error(result.error.message);
            form.reset();
            setStatus({
              text: t(
                "Password changed. Other sessions were signed out.",
                "تم تغيير كلمة المرور وإنهاء الجلسات الأخرى.",
              ),
            });
          } catch (e) {
            setStatus({ text: errorMessage(e), error: true });
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            {t("Current password", "كلمة المرور الحالية")}
            <input
              name="current"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            {t("New password", "كلمة المرور الجديدة")}
            <input
              name="new"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
        </div>
        <div>
          <button className="button outline" disabled={busy}>
            {t("Change password", "تغيير كلمة المرور")}
          </button>
        </div>
      </form>
      {status && (
        <p
          role={status.error ? "alert" : "status"}
          className={"notice " + (status.error ? "error" : "success")}
        >
          {status.text}
        </p>
      )}
    </section>
  );
}
export function SaveReport({
  locale,
  range,
}: {
  locale: string;
  range: { from: string; to: string };
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const t = (en: string, a: string) => (locale === "ar" ? a : en);
  return (
    <form
      className="form"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const name = new FormData(form).get("name");
        setBusy(true);
        setNotice("");
        setFailed(false);
        try {
          await api("reports", { name, range });
          form.reset();
          setNotice(t("Report saved.", "تم حفظ التقرير."));
          router.refresh();
        } catch (error) {
          setNotice(errorMessage(error));
          setFailed(true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        {t("Report name", "اسم التقرير")}
        <input
          name="name"
          required
          minLength={2}
          maxLength={70}
          placeholder={t("November expense review", "مراجعة مصروفات نوفمبر")}
        />
      </label>
      <div>
        <button className="button outline" disabled={busy}>
          {t("Save date range", "حفظ الفترة")}
        </button>
      </div>
      {notice && (
        <p
          className={"notice " + (failed ? "error" : "success")}
          role={failed ? "alert" : "status"}
        >
          {notice}
        </p>
      )}
    </form>
  );
}
export function PrintReport({ locale }: { locale: string }) {
  return (
    <button className="button outline small" onClick={() => window.print()}>
      {locale === "ar" ? "طباعة أو PDF" : "Print or save PDF"}
    </button>
  );
}
