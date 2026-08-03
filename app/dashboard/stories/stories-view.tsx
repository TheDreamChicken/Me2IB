"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpen, Check, ListPlus, Plus, Star } from "lucide-react";
import type { Story } from "@/lib/types";
import { STORY_CATEGORIES, labelFor } from "@/lib/constants";
import {
  CLASSIC_QUESTIONS,
  STARRED_CLASSICS,
  type ClassicQuestion,
} from "@/lib/classic-questions";
import {
  addClassicQuestions,
  deleteStory,
  upsertStory,
} from "@/lib/actions/stories";
import { PreferenceDeleteButton as DeleteButton } from "@/app/dashboard/settings/delete-button";
import {
  Badge,
  Button,
  Card,
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
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

const STORY_STRENGTHS = [
  { value: "draft", label: "Draft", badge: "bg-zinc-100 text-zinc-600" },
  { value: "solid", label: "Solid", badge: "bg-amber-100 text-amber-700" },
  {
    value: "polished",
    label: "Polished",
    badge: "bg-emerald-100 text-emerald-700",
  },
] as const;

function strengthBadge(value: string): string {
  return (
    STORY_STRENGTHS.find((s) => s.value === value)?.badge ??
    "bg-zinc-100 text-zinc-600"
  );
}

function strengthLabel(value: string): string {
  return STORY_STRENGTHS.find((s) => s.value === value)?.label ?? value;
}

const STARRED_CLASSIC_QUESTION_TEXT = new Set(
  STARRED_CLASSICS.map((question) => question.question)
);

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function BrowseClassicsButton({
  onClick,
  variant = "secondary",
  size = "md",
}: {
  onClick: () => void;
  variant?: "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  return (
    <Button variant={variant} size={size} onClick={onClick}>
      <ListPlus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      Browse the classics
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Classics library (modal body)                                       */
/* ------------------------------------------------------------------ */

function ClassicsLibrary({ stories }: { stories: Story[] }) {
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  // Per-question in-flight set so adding one row never locks the others.
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());
  const [, startRowTransition] = useTransition();
  const [bulkPending, startBulkTransition] = useTransition();

  const inBank = useMemo(
    () => new Set(stories.map((s) => s.question)),
    [stories]
  );

  const groups = useMemo(
    () =>
      STORY_CATEGORIES.map((c) => {
        const questions = CLASSIC_QUESTIONS.filter(
          (q) => q.category === c.value
        );
        return {
          value: c.value as string,
          label: c.label as string,
          questions: [
            ...questions.filter((q) => q.starred),
            ...questions.filter((q) => !q.starred),
          ],
        };
      }).filter((g) => g.questions.length > 0),
    []
  );

  const missingStarred = STARRED_CLASSICS.filter(
    (q) => !inBank.has(q.question)
  );

  function addOne(q: ClassicQuestion) {
    setError(null);
    setAddedCount(null);
    setInFlight((prev) => new Set(prev).add(q.question));
    startRowTransition(async () => {
      const fd = new FormData();
      fd.set("question", q.question);
      fd.set("category", q.category);
      const res = await upsertStory(fd);
      if (res.error) setError(res.error);
      setInFlight((prev) => {
        const next = new Set(prev);
        next.delete(q.question);
        return next;
      });
    });
  }

  function addAllStarred() {
    setError(null);
    setAddedCount(null);
    startBulkTransition(async () => {
      const res = await addClassicQuestions(
        missingStarred.map((q) => ({
          question: q.question,
          category: q.category,
        }))
      );
      if (res.error) setError(res.error);
      else setAddedCount(res.added ?? 0);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          = asked in almost every interview
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={bulkPending || missingStarred.length === 0}
          onClick={addAllStarred}
        >
          {bulkPending ? (
            <Spinner />
          ) : missingStarred.length === 0 ? (
            <>
              <Check className="h-3.5 w-3.5" /> All starred added
            </>
          ) : (
            <>
              <ListPlus className="h-3.5 w-3.5" />
              {missingStarred.length === STARRED_CLASSICS.length
                ? `Add all ${missingStarred.length} starred`
                : `Add ${missingStarred.length} missing starred`}
            </>
          )}
        </Button>
      </div>

      {addedCount !== null && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {addedCount === 0
            ? "Nothing to add — those are already in your bank."
            : `Added ${addedCount} question${addedCount === 1 ? "" : "s"} to your bank.`}
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      {groups.map((group) => {
        const addedInGroup = group.questions.filter((q) =>
          inBank.has(q.question)
        ).length;
        return (
          <section key={group.value}>
            <div className="mb-2 flex items-baseline gap-2">
              <h3 className="text-sm font-semibold text-brand-900">
                {group.label}
              </h3>
              <span className="text-xs text-zinc-400">
                {addedInGroup} of {group.questions.length} in your bank
              </span>
            </div>
            <ul className="space-y-1">
              {group.questions.map((q) => {
                const added = inBank.has(q.question);
                const pending = inFlight.has(q.question);
                return (
                  <li
                    key={q.question}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-1.5",
                      added ? "bg-brand-50/60" : "hover:bg-brand-50"
                    )}
                  >
                    <Star
                      aria-hidden
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        q.starred
                          ? "fill-amber-400 text-amber-400"
                          : "text-transparent"
                      )}
                    />
                    <p
                      className={cn(
                        "flex-1 text-sm leading-snug",
                        added ? "text-zinc-400" : "text-brand-900"
                      )}
                    >
                      {q.question}
                    </p>
                    {added ? (
                      <span className="inline-flex shrink-0 items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600">
                        <Check className="h-3.5 w-3.5" /> In your bank
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        disabled={pending}
                        onClick={() => addOne(q)}
                      >
                        {pending ? (
                          <Spinner className="h-3.5 w-3.5" />
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" /> Add
                          </>
                        )}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function StoryCard({ story, onClick }: { story: Story; onClick: () => void }) {
  const isStarredClassic = STARRED_CLASSIC_QUESTION_TEXT.has(story.question);

  return (
    <Card
      className={cn("p-4", !story.answer && "border-dashed")}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          {isStarredClassic && (
            <span
              className="mt-0.5 shrink-0"
              title="Classic question — asked in almost every interview"
              aria-label="Classic question — asked in almost every interview"
              role="img"
            >
              <Star
                aria-hidden
                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
              />
            </span>
          )}
          <p className="text-sm font-semibold leading-snug text-brand-900">
            {story.question}
          </p>
        </div>
        <Badge className={strengthBadge(story.strength)}>
          {strengthLabel(story.strength)}
        </Badge>
      </div>
      {story.answer ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
          {story.answer}
        </p>
      ) : (
        <p className="mt-2 text-xs italic text-zinc-400">No answer yet</p>
      )}
      {(story.firm || story.tags.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {story.firm && (
            <Badge className="bg-brand-100 text-brand-700">{story.firm}</Badge>
          )}
          {story.tags.map((t) => (
            <Badge key={t} className="bg-brand-50 text-brand-600">
              #{t}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Add / edit form                                                     */
/* ------------------------------------------------------------------ */

function StoryForm({
  story,
  onDone,
}: {
  story: Story | null;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await upsertStory(formData);
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
      {story && <input type="hidden" name="id" value={story.id} />}

      <Field label="Question *">
        <Input
          name="question"
          placeholder="Tell me about a time you..."
          defaultValue={story?.question}
          required
          autoFocus
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <Select name="category" defaultValue={story?.category ?? "behavioral"}>
            {STORY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Strength">
          <Select name="strength" defaultValue={story?.strength ?? "draft"}>
            {STORY_STRENGTHS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Firm" hint="Tailoring this for a specific firm? (optional)">
        <Input
          name="firm"
          placeholder="Goldman Sachs, Bain, Evercore..."
          defaultValue={story?.firm ?? ""}
        />
      </Field>

      <Field
        label="Answer"
        hint="Structure it with STAR — Situation, Task, Action, Result."
      >
        <Textarea
          name="answer"
          className="min-h-48"
          placeholder="Last spring, our club's biggest event lost its venue two weeks out..."
          defaultValue={story?.answer ?? ""}
        />
      </Field>

      <Field label="Notes" hint="Delivery reminders, follow-up questions to expect...">
        <Textarea name="notes" defaultValue={story?.notes ?? ""} />
      </Field>

      <Field label="Tags" hint="Comma-separated, e.g. leadership, club, superday">
        <Input name="tags" defaultValue={story?.tags?.join(", ") ?? ""} />
      </Field>

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
          {pending ? <Spinner /> : story ? "Save changes" : "Add story"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Detail popup                                                        */
/* ------------------------------------------------------------------ */

function StoryDetail({
  story,
  onEdit,
  onClose,
}: {
  story: Story;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-brand-100 via-brand-50 to-white p-5">
        <h3 className="text-lg font-semibold leading-snug text-brand-900">
          {story.question}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge>{labelFor(STORY_CATEGORIES, story.category)}</Badge>
          <Badge className={strengthBadge(story.strength)}>
            {strengthLabel(story.strength)}
          </Badge>
          {story.firm && (
            <Badge className="bg-brand-100 text-brand-700">
              Tailored for {story.firm}
            </Badge>
          )}
        </div>
      </div>

      {story.answer ? (
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-400">Answer</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-900">
            {story.answer}
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-4 py-3 text-sm italic text-zinc-400">
          No answer yet — jot one down so future-you walks in consistent and
          practiced.
        </p>
      )}

      {story.notes && (
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-400">Notes</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
            {story.notes}
          </p>
        </div>
      )}

      {story.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {story.tags.map((t) => (
            <Badge key={t} className="bg-brand-50 text-brand-600">
              #{t}
            </Badge>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-brand-100 pt-4">
        {pending ? (
          <Button variant="danger" size="sm" disabled>
            <Spinner />
          </Button>
        ) : (
          <DeleteButton
            onConfirm={() => {
              setError(null);
              startTransition(async () => {
                const res = await deleteStory(story.id);
                if (res.error) setError(res.error);
                else onClose();
              });
            }}
          />
        )}
        <Button onClick={onEdit}>Edit story</Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function StoriesView({ stories }: { stories: Story[] }) {
  const [query, setQuery] = useState("");
  const [strengthFilter, setStrengthFilter] = useState("");
  const [tab, setTab] = useState<"general" | "by_firm">("general");
  const [firmFilter, setFirmFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [browsingClassics, setBrowsingClassics] = useState(false);
  const [editing, setEditing] = useState<Story | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Keep the detail modal in sync with fresh server data after actions.
  const selected = stories.find((s) => s.id === selectedId) ?? null;

  const firms = useMemo(
    () =>
      Array.from(
        new Set(
          stories
            .map((s) => s.firm)
            .filter((f): f is string => Boolean(f))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [stories]
  );

  // If the selected firm's last story was deleted or re-tagged, the filter
  // would silently exclude everything — treat a stale selection as "All firms".
  const effectiveFirmFilter = firms.includes(firmFilter) ? firmFilter : "";

  const filtered = useMemo(() => {
    let list =
      tab === "general"
        ? stories.filter((s) => !s.firm)
        : stories.filter(
            (s) =>
              s.firm && (!effectiveFirmFilter || s.firm === effectiveFirmFilter)
          );
    if (strengthFilter) list = list.filter((s) => s.strength === strengthFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) =>
        [s.question, s.answer]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q))
      );
    }
    return list;
  }, [stories, tab, effectiveFirmFilter, query, strengthFilter]);

  const groups = useMemo(() => {
    const known = new Set<string>(STORY_CATEGORIES.map((c) => c.value));
    const result = STORY_CATEGORIES.map((c) => ({
      value: c.value as string,
      label: c.label as string,
      stories: filtered.filter((s) => s.category === c.value),
    }));
    const leftovers = filtered.filter((s) => !known.has(s.category));
    if (leftovers.length > 0) {
      result.push({
        value: "__uncategorized",
        label: "Uncategorized",
        stories: leftovers,
      });
    }
    return result.filter((g) => g.stories.length > 0);
  }, [filtered]);

  const bankIsSmall = stories.length < 6;

  return (
    <div>
      <PageHeader
        title="Story bank"
        description="Answer the classics once, keep them polished, and never get caught off guard by 'tell me about a time...' again."
        action={
          <>
            {bankIsSmall && (
              <BrowseClassicsButton onClick={() => setBrowsingClassics(true)} />
            )}
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add story
            </Button>
          </>
        }
      />

      {/* General vs firm-tailored tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-brand-200 bg-white p-1">
          {(
            [
              { value: "general", label: "General" },
              { value: "by_firm", label: "By firm" },
            ] as const
          ).map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "cursor-pointer rounded-lg px-4 py-1.5 text-xs font-medium transition-colors",
                tab === t.value
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-brand-700 hover:bg-brand-50"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "by_firm" && firms.length > 0 && (
          <Select
            value={effectiveFirmFilter}
            onChange={(e) => setFirmFilter(e.target.value)}
            className="w-auto"
          >
            <option value="">All firms</option>
            {firms.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search questions and answers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select
          value={strengthFilter}
          onChange={(e) => setStrengthFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All strengths</option>
          {STORY_STRENGTHS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        {!bankIsSmall && (
          <div className="ml-auto">
            <BrowseClassicsButton
              variant="ghost"
              size="sm"
              onClick={() => setBrowsingClassics(true)}
            />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title={
            stories.length === 0
              ? "No stories yet"
              : tab === "by_firm" && firms.length === 0
                ? "Nothing firm-specific yet"
                : "No matches"
          }
          hint={
            stories.length === 0
              ? "Start with the classic prompts every interviewer asks, or add your own."
              : tab === "by_firm" && firms.length === 0
                ? "Tag a story with a firm and it'll show up here, ready for that superday."
                : "Try a different search or filter."
          }
          action={
            stories.length === 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                <BrowseClassicsButton
                  onClick={() => setBrowsingClassics(true)}
                />
                <Button onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" /> Add your first story
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const answered = group.stories.filter((s) => s.answer).length;
            return (
              <section key={group.value}>
                <div className="mb-3 flex items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-brand-900">
                    {group.label}
                  </h2>
                  <span
                    className={cn(
                      "text-xs",
                      answered < group.stories.length
                        ? "text-amber-600"
                        : "text-zinc-400"
                    )}
                  >
                    {answered < group.stories.length
                      ? `${group.stories.length - answered} unanswered`
                      : `${answered} of ${group.stories.length} answered`}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.stories.map((s) => (
                    <StoryCard
                      key={s.id}
                      story={s}
                      onClick={() => setSelectedId(s.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Add */}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add story" wide>
        <StoryForm story={null} onDone={() => setAdding(false)} />
      </Modal>

      {/* Classics library */}
      <Modal
        open={browsingClassics}
        onClose={() => setBrowsingClassics(false)}
        title="The classics"
        wide
      >
        <ClassicsLibrary stories={stories} />
      </Modal>

      {/* Persistent detail/edit shell avoids replaying the modal entrance. */}
      <Modal
        open={!!selected}
        onClose={() => {
          if (editing) setEditing(null);
          else setSelectedId(null);
        }}
        title={editing ? "Edit story" : ""}
        wide
        scrollKey={
          editing ? `edit:${editing.id}` : `detail:${selected?.id ?? ""}`
        }
      >
        {editing ? (
          <StoryForm story={editing} onDone={() => setEditing(null)} />
        ) : selected ? (
          <StoryDetail
            story={selected}
            onClose={() => setSelectedId(null)}
            onEdit={() => setEditing(selected)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
