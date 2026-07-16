"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpen, ListPlus, Plus } from "lucide-react";
import type { Story } from "@/lib/types";
import { STORY_CATEGORIES, labelFor } from "@/lib/constants";
import {
  deleteStory,
  seedStarterQuestions,
  upsertStory,
} from "@/lib/actions/stories";
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

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function SeedClassicsButton({
  variant = "secondary",
  size = "md",
}: {
  variant?: "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await seedStarterQuestions();
        })
      }
    >
      {pending ? (
        <Spinner />
      ) : (
        <>
          <ListPlus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          Add the classics
        </>
      )}
    </Button>
  );
}

function StoryCard({ story, onClick }: { story: Story; onClick: () => void }) {
  return (
    <Card
      className={cn("p-4", !story.answer && "border-dashed")}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-brand-900">
          {story.question}
        </p>
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
    <form action={submit} className="space-y-4">
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

  const filtered = useMemo(() => {
    let list =
      tab === "general"
        ? stories.filter((s) => !s.firm)
        : stories.filter(
            (s) => s.firm && (!firmFilter || s.firm === firmFilter)
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
  }, [stories, tab, firmFilter, query, strengthFilter]);

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
            {bankIsSmall && <SeedClassicsButton />}
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
            value={firmFilter}
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
            <SeedClassicsButton variant="ghost" size="sm" />
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
                <SeedClassicsButton />
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

      {/* Edit */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit story"
        wide
      >
        {editing && <StoryForm story={editing} onDone={() => setEditing(null)} />}
      </Modal>

      {/* Detail */}
      <Modal
        open={!!selected && !editing}
        onClose={() => setSelectedId(null)}
        title=""
        wide
      >
        {selected && (
          <StoryDetail
            story={selected}
            onClose={() => setSelectedId(null)}
            onEdit={() => setEditing(selected)}
          />
        )}
      </Modal>
    </div>
  );
}
