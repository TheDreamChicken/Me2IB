export type FormState = {
  name: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  linkedin_url: string;
  photo_url: string;
  location: string;
  industry: string;
  how_met: string;
  connection_strength: string;
  relationship: string;
  shared_interests: string;
  alma_mater: string;
  notes: string;
  tags: string;
  last_contacted: string;
  followup_interval_days: string;
  status: string;
};

export const PARSE_KEYS = [
  "name",
  "company",
  "position",
  "location",
  "industry",
  "email",
  "phone",
  "linkedin_url",
  "photo_url",
  "alma_mater",
  "shared_interests",
  "relationship",
] as const;

export type ParseKey = (typeof PARSE_KEYS)[number];
export type ParsedContact = Partial<Record<ParseKey, string | null>>;
type ImportSource = "direct" | "ai";

export type ImportFormState = {
  activeImportId: number;
  form: FormState;
  importedBy: Partial<Record<keyof FormState, ImportSource>>;
  manuallyEditedAt: Partial<Record<keyof FormState, number>>;
};

export type ImportFormAction =
  | {
      type: "manual_change";
      key: keyof FormState;
      value: string;
      importId: number;
    }
  | { type: "begin_import"; importId: number }
  | { type: "cancel_import"; importId: number }
  | {
      type: "apply_import";
      importId: number;
      direct?: ParsedContact;
      ai?: ParsedContact;
      directPhoto?: string;
    }
  | { type: "remove_imported_photo"; photoUrl: string };

const MEANINGFUL_PARSE_KEYS = PARSE_KEYS.filter(
  (key) => key !== "linkedin_url" && key !== "photo_url"
);

export function isLinkedInProfilePhoto(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /^(?:media|media-exp\d+)\.licdn\.com$/i.test(url.hostname) &&
      /\/dms\/image\/.*profile-(?:display|framed)photo(?:[-_/]|$)/i.test(
        url.pathname
      )
    );
  } catch {
    return false;
  }
}

export function hasMeaningfulFields(data: ParsedContact | undefined): boolean {
  return !!data && MEANINGFUL_PARSE_KEYS.some((key) => {
    const value = data[key];
    return typeof value === "string" && Boolean(value.trim());
  });
}

function applyValues(
  form: FormState,
  importedBy: Partial<Record<keyof FormState, ImportSource>>,
  manuallyEditedAt: Partial<Record<keyof FormState, number>>,
  data: ParsedContact | undefined,
  source: ImportSource,
  importId: number
): void {
  if (!data) return;
  for (const key of PARSE_KEYS) {
    if (key === "linkedin_url" || key === "photo_url") continue;
    const raw = data[key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value || manuallyEditedAt[key] === importId) continue;
    if (source === "ai" && importedBy[key] === "direct") continue;
    if (form[key].trim() && importedBy[key] === undefined) continue;
    form[key] = value;
    importedBy[key] = source;
  }
}

export function importFormReducer(
  state: ImportFormState,
  action: ImportFormAction
): ImportFormState {
  if (action.type === "manual_change") {
    const form = { ...state.form, [action.key]: action.value };
    const importedBy = { ...state.importedBy };
    const manuallyEditedAt = {
      ...state.manuallyEditedAt,
      [action.key]: action.importId,
    };
    delete importedBy[action.key];

    if (action.key === "linkedin_url") {
      for (const key of Object.keys(state.importedBy) as (keyof FormState)[]) {
        if (state.importedBy[key]) form[key] = "";
      }
      return {
        activeImportId: action.importId,
        form,
        importedBy: {},
        manuallyEditedAt,
      };
    }
    return { ...state, form, importedBy, manuallyEditedAt };
  }

  if (action.type === "begin_import" || action.type === "cancel_import") {
    return { ...state, activeImportId: action.importId };
  }

  if (action.type === "remove_imported_photo") {
    if (
      state.form.photo_url !== action.photoUrl ||
      (state.importedBy.photo_url === undefined &&
        !isLinkedInProfilePhoto(state.form.photo_url))
    ) {
      return state;
    }
    const importedBy = { ...state.importedBy };
    delete importedBy.photo_url;
    return {
      ...state,
      form: { ...state.form, photo_url: "" },
      importedBy,
    };
  }

  if (state.activeImportId !== action.importId) return state;

  const form = { ...state.form };
  const importedBy: Partial<Record<keyof FormState, ImportSource>> = {
    ...state.importedBy,
  };
  applyValues(
    form,
    importedBy,
    state.manuallyEditedAt,
    action.direct,
    "direct",
    action.importId
  );
  applyValues(
    form,
    importedBy,
    state.manuallyEditedAt,
    action.ai,
    "ai",
    action.importId
  );
  if (
    action.directPhoto &&
    state.manuallyEditedAt.photo_url !== action.importId &&
    (!form.photo_url.trim() ||
      importedBy.photo_url !== undefined ||
      isLinkedInProfilePhoto(form.photo_url))
  ) {
    form.photo_url = action.directPhoto;
    importedBy.photo_url = "direct";
  }
  return { ...state, form, importedBy };
}
