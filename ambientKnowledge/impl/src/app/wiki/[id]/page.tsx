import Link from "next/link";
import { getKnowledgeItemById, listKnowledgeItems } from "@/lib/knowledgeStore";
import type { KnowledgeItem } from "@/lib/types";

const items = listKnowledgeItems() as KnowledgeItem[];

const typeColors: Record<string, { bg: string; text: string; label: string }> = {
  project: { bg: "var(--accent-light)", text: "var(--accent-dark)", label: "Project" },
  note: { bg: "var(--context-bg)", text: "var(--warning)", label: "Document" },
  user: { bg: "var(--context-bg)", text: "var(--success)", label: "Team Member" },
};

function formatUpdatedAt(ms?: number): string | null {
  if (!ms) return null;
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return null;
  }
}

export default async function WikiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getKnowledgeItemById(id) ?? items.find((i) => i.id === id);
  if (!item) return <NotFoundWiki />;

  const relatedItems: KnowledgeItem[] = item.links
    ? (item.links
        .map((linkId) => items.find((i) => i.id === linkId))
        .filter(Boolean) as KnowledgeItem[])
    : [];

  const referencedBy = items
    .filter((i) => i.id !== item.id)
    .filter((i) => i.links?.includes(item.id))
    .slice(0, 8);

  const typeInfo = typeColors[item.type] || typeColors.note;
  const updatedAt = formatUpdatedAt(item.updatedAtMs);
  const aclPrincipals = item.acl?.principals ?? null;
  const entities = item.entities ?? [];

  return (
    <div className="min-h-screen" style={{ background: "var(--main-bg)" }}>
      {/* Top nav bar */}
      <header
        className="sticky top-0 z-10 border-b px-6 py-3 flex items-center gap-3"
        style={{ background: "var(--main-bg)", borderColor: "var(--main-border)" }}
      >
        <Link
          href="/"
          className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-100 flex items-center gap-1.5"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to chat
        </Link>
        <span className="text-sm" style={{ color: "var(--main-text-muted)" }}>
          /
        </span>
        <span className="text-sm font-medium" style={{ color: "var(--main-text-muted)" }}>
          Wiki
        </span>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Type badge */}
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-4"
          style={{ background: typeInfo.bg, color: typeInfo.text }}
        >
          {typeInfo.label}
        </span>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--main-text)" }}>
          {item.title}
        </h1>

        {/* Metadata */}
        {(item.sourceSystem || item.container || updatedAt || (aclPrincipals && aclPrincipals.length) || entities.length > 0) ? (
          <div
            className="rounded-lg border p-4 mb-6"
            style={{ background: "var(--context-bg)", borderColor: "var(--main-border)" }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--main-text-muted)" }}
            >
              Metadata
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.sourceSystem ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--main-text-muted)" }}>
                    Source
                  </p>
                  <p className="text-sm" style={{ color: "var(--main-text)" }}>
                    {item.sourceSystem}
                  </p>
                </div>
              ) : null}

              {item.container ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--main-text-muted)" }}>
                    Container
                  </p>
                  <p className="text-sm" style={{ color: "var(--main-text)" }}>
                    {item.container}
                  </p>
                </div>
              ) : null}

              {updatedAt ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--main-text-muted)" }}>
                    Updated
                  </p>
                  <p className="text-sm" style={{ color: "var(--main-text)" }}>
                    {updatedAt}
                  </p>
                </div>
              ) : null}

              {(aclPrincipals && aclPrincipals.length > 0) ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--main-text-muted)" }}>
                    Access
                  </p>
                  <p className="text-sm" style={{ color: "var(--main-text)" }}>
                    {aclPrincipals.join(", ")}
                  </p>
                </div>
              ) : null}
            </div>

            {entities.length > 0 ? (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--main-text-muted)" }}>
                  Entities
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {entities.map((e) => (
                    <span
                      key={e}
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{ background: "var(--main-bg)", color: "var(--main-text-muted)", border: "1px solid var(--main-border)" }}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Summary callout */}
        <div
          className="rounded-lg border-l-4 px-4 py-3 mb-6"
          style={{ background: "var(--accent-light)", borderColor: "var(--accent)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--accent-dark)" }}>
            Summary
          </p>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--main-text)" }}>
            {item.summary}
          </p>
        </div>

        {/* Body */}
        <div className="prose mb-8">
          {item.body.split(". ").reduce((acc: string[][], sentence, i, arr) => {
            // Group sentences into paragraphs of roughly 2-3 sentences
            const lastGroup = acc[acc.length - 1];
            if (lastGroup && lastGroup.length < 3) {
              lastGroup.push(sentence + (i < arr.length - 1 ? "." : ""));
            } else {
              acc.push([sentence + (i < arr.length - 1 ? "." : "")]);
            }
            return acc;
          }, []).map((group, i) => (
            <p
              key={i}
              className="text-[15px] leading-[1.7] mb-4"
              style={{ color: "var(--main-text)" }}
            >
              {group.join(" ")}
            </p>
          ))}
        </div>

        {/* Tags */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--main-text-muted)" }}>
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: "var(--context-bg)", color: "var(--main-text-muted)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Related pages */}
        {relatedItems.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--main-text-muted)" }}>
              Related Pages
            </h3>
            <div className="space-y-2">
              {relatedItems.map((related) => {
                const relType = typeColors[related.type] || typeColors.note;
                return (
                  <Link
                    key={related.id}
                    href={`/wiki/${related.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                    style={{ borderColor: "var(--main-border)", textDecoration: "none" }}
                  >
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{ background: relType.bg, color: relType.text }}
                    >
                      {relType.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--main-text)" }}>
                        {related.title}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--main-text-muted)" }}>
                        {related.summary}
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: "var(--main-text-muted)" }}>
                      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Referenced by */}
        {referencedBy.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--main-text-muted)" }}>
              Referenced By
            </h3>
            <div className="space-y-2">
              {referencedBy.map((ref) => {
                const refType = typeColors[ref.type] || typeColors.note;
                return (
                  <Link
                    key={ref.id}
                    href={`/wiki/${ref.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                    style={{ borderColor: "var(--main-border)", textDecoration: "none" }}
                  >
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{ background: refType.bg, color: refType.text }}
                    >
                      {refType.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--main-text)" }}>
                        {ref.title}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--main-text-muted)" }}>
                        {ref.summary}
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: "var(--main-text-muted)" }}>
                      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NotFoundWiki() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--main-bg)" }}>
      <div className="text-center">
        <p className="text-5xl mb-4">📄</p>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--main-text)" }}>Page not found</h1>
        <p className="text-sm mb-4" style={{ color: "var(--main-text-muted)" }}>
          This wiki page doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90 inline-block"
          style={{ background: "var(--accent)", textDecoration: "none" }}
        >
          ← Back to chat
        </Link>
      </div>
    </div>
  );
}
