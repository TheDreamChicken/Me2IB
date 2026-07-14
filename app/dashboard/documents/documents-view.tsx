"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlignLeft,
  BookOpen,
  Download,
  File,
  FileText,
  FolderOpen,
  GraduationCap,
  Mail,
  Paperclip,
  PenLine,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import type { Document } from "@/lib/types";
import { DOC_TYPES, INDUSTRIES, labelFor } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { deleteDocument, saveDocument } from "@/lib/actions/documents";
import {
  Badge,
  Button,
  Card,
  DeleteButton,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Spinner,
  Textarea,
  cn,
} from "@/components/ui";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DOC_ICONS: Record<string, React.ElementType> = {
  resume: FileText,
  cover_letter: Mail,
  transcript: GraduationCap,
  essay: PenLine,
  writing_sample: BookOpen,
  other: File,
};

function docIcon(docType: string): React.ElementType {
  return DOC_ICONS[docType] ?? File;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** `${uid}/${Date.now()}-name.pdf` -> `name.pdf` */
function fileLabel(path: string) {
  return (path.split("/").pop() ?? path).replace(/^\d+-/, "");
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "border border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Add / edit form                                                     */
/* ------------------------------------------------------------------ */

function DocumentForm({
  doc,
  onDone,
}: {
  doc: Document | null;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const isEdit = !!doc;

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      if (!isEdit && mode === "upload") {
        const file = formData.get("file") as File | null;
        formData.delete("file"); // don't ship the binary to the server action
        if (!file || file.size === 0) {
          setError("Choose a file to upload.");
          return;
        }
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Not logged in.");
          return;
        }
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(path, file);
        if (uploadError) {
          setError(uploadError.message);
          return;
        }
        formData.set("file_path", path);
      }

      const res = await saveDocument(formData);
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form action={submit} className="space-y-4">
      {doc && <input type="hidden" name="id" value={doc.id} />}

      {!isEdit && (
        <div className="flex rounded-xl border border-brand-200 bg-brand-50 p-1">
          {(
            [
              { value: "upload", label: "Upload file", icon: Upload },
              { value: "paste", label: "Paste text", icon: AlignLeft },
            ] as const
          ).map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                mode === m.value
                  ? "bg-white text-brand-800 shadow-sm"
                  : "text-brand-500 hover:text-brand-700"
              )}
            >
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *">
          <Input
            name="name"
            placeholder="Resume — IB v3"
            defaultValue={doc?.name}
            required
            autoFocus
          />
        </Field>
        <Field label="Type">
          <Select name="doc_type" defaultValue={doc?.doc_type ?? "resume"}>
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Target industry"
          hint="Which industry / role this version is tuned for."
        >
          <Select
            name="industry_target"
            defaultValue={doc?.industry_target ?? ""}
          >
            <option value="">—</option>
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes">
          <Input
            name="notes"
            placeholder="Tailored for GS coverage groups..."
            defaultValue={doc?.notes ?? ""}
          />
        </Field>
      </div>

      {!isEdit && mode === "upload" && (
        <Field label="File *" hint="PDF or Word doc works best.">
          <input
            type="file"
            name="file"
            accept=".pdf,.doc,.docx,.txt,.rtf,.md"
            className="w-full cursor-pointer rounded-xl border border-dashed border-brand-200 bg-white px-3 py-3 text-sm text-zinc-500 transition-shadow file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-700 hover:file:bg-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </Field>
      )}

      {(isEdit || mode === "paste") && (
        <Field
          label={isEdit ? "Content (pasted text)" : "Content *"}
          hint="Paste the full text — this is what the AI review will read."
        >
          <Textarea
            name="content_text"
            rows={10}
            placeholder="Paste your resume / essay text here..."
            defaultValue={doc?.content_text ?? ""}
            required={!isEdit}
            className="min-h-40"
          />
        </Field>
      )}

      {isEdit && doc?.file_path && (
        <p className="flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
          <Paperclip className="h-3.5 w-3.5 shrink-0" />
          Attached file: {fileLabel(doc.file_path)} — it stays as-is when you
          save.
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : doc ? "Save changes" : "Add document"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Detail popup                                                        */
/* ------------------------------------------------------------------ */

function DocumentDetail({
  doc,
  onEdit,
  onClose,
}: {
  doc: Document;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Icon = docIcon(doc.doc_type);

  async function download() {
    if (!doc.file_path) return;
    setError(null);
    setDownloading(true);
    const supabase = createClient();
    const { data, error: signError } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60);
    setDownloading(false);
    if (signError || !data?.signedUrl) {
      setError(signError?.message ?? "Could not create a download link.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      {/* Header block */}
      <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-brand-100 via-brand-50 to-white p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-200 text-brand-700">
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-brand-900">{doc.name}</h3>
          <p className="text-sm text-zinc-500">
            Updated {formatDate(doc.updated_at)} · Added{" "}
            {formatDate(doc.created_at)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{labelFor(DOC_TYPES, doc.doc_type)}</Badge>
            {doc.industry_target && (
              <Badge className="bg-brand-50 text-brand-600">
                {labelFor(INDUSTRIES, doc.industry_target)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* File row */}
      {doc.file_path && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 bg-white px-4 py-3">
          <p className="flex min-w-0 items-center gap-2 text-sm text-brand-900">
            <Paperclip className="h-4 w-4 shrink-0 text-brand-400" />
            <span className="truncate">{fileLabel(doc.file_path)}</span>
          </p>
          <Button
            size="sm"
            variant="secondary"
            disabled={downloading}
            onClick={download}
          >
            {downloading ? <Spinner /> : <Download className="h-3.5 w-3.5" />}
            Download
          </Button>
        </div>
      )}

      {doc.notes && (
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-400">Notes</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
            {doc.notes}
          </p>
        </div>
      )}

      {doc.content_text && (
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-400">Content</p>
          <div className="max-h-64 overflow-y-auto rounded-xl bg-brand-50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-900">
              {doc.content_text}
            </p>
          </div>
        </div>
      )}

      {/* AI review placeholder */}
      <Card className="border-dashed bg-brand-50/60 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-brand-900">
              AI feedback — coming soon
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Honest strengths + critical improvements tuned to your target
              industry.
            </p>
          </div>
          <Button size="sm" variant="secondary" disabled>
            Review
          </Button>
        </div>
      </Card>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-brand-100 pt-4">
        <DeleteButton
          onConfirm={() => {
            startTransition(async () => {
              const res = await deleteDocument(doc.id);
              if (res.error) setError(res.error);
              else onClose();
            });
          }}
        />
        <div className="flex items-center gap-2">
          {pending && <Spinner />}
          <Button onClick={onEdit}>Edit document</Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function DocumentsView({ documents }: { documents: Document[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Keep the detail modal in sync with fresh server data after actions.
  const selected = documents.find((d) => d.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    let list = documents;
    if (typeFilter) list = list.filter((d) => d.doc_type === typeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((d) =>
        [d.name, d.notes]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q))
      );
    }
    return list;
  }, [documents, query, typeFilter]);

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Every version of your resume, cover letters, and essays — one tidy shelf."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add document
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-64"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={!typeFilter} onClick={() => setTypeFilter("")}>
            All
          </FilterChip>
          {DOC_TYPES.map((t) => (
            <FilterChip
              key={t.value}
              active={typeFilter === t.value}
              onClick={() => setTypeFilter(t.value)}
            >
              {t.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-10 w-10" />}
          title={documents.length === 0 ? "No documents yet" : "No matches"}
          hint={
            documents.length === 0
              ? "Upload your resume or paste an essay draft — keep every version in one place."
              : "Try a different search or filter."
          }
          action={
            documents.length === 0 ? (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Add your first document
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const Icon = docIcon(d.doc_type);
            return (
              <Card
                key={d.id}
                className="p-4"
                onClick={() => setSelectedId(d.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-brand-900">
                      {d.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge>{labelFor(DOC_TYPES, d.doc_type)}</Badge>
                      {d.industry_target && (
                        <Badge className="bg-brand-50 text-brand-600">
                          {labelFor(INDUSTRIES, d.industry_target)}
                        </Badge>
                      )}
                      {d.file_path && (
                        <Badge className="bg-zinc-100 text-zinc-500">
                          <Paperclip className="h-3 w-3" /> File
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">
                      Updated {formatDate(d.updated_at)}
                    </p>
                    {d.notes && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                        {d.notes}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add document"
        wide
      >
        <DocumentForm doc={null} onDone={() => setAdding(false)} />
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit document"
        wide
      >
        {editing && (
          <DocumentForm doc={editing} onDone={() => setEditing(null)} />
        )}
      </Modal>

      {/* Detail */}
      <Modal
        open={!!selected && !editing}
        onClose={() => setSelectedId(null)}
        title=""
        wide
      >
        {selected && (
          <DocumentDetail
            doc={selected}
            onClose={() => setSelectedId(null)}
            onEdit={() => setEditing(selected)}
          />
        )}
      </Modal>
    </div>
  );
}
