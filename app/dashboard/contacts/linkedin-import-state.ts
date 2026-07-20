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
  profileLinkedInKey: string | null;
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

function storedLinkedInPhotoSource(
  value: string
): "linkedin" | "unavatar" | null {
  try {
    const url = new URL(value);
    const source = url.searchParams.get("source");
    if (source !== "linkedin" && source !== "unavatar") return null;
    const path = decodeURIComponent(url.pathname);
    return /\/storage\/v1\/object\/public\/avatars\/[^/]+\/contacts\/linkedin-[0-9a-f]{40}$/i.test(
      path
    )
      ? source
      : null;
  } catch {
    return null;
  }
}

export function isUnavatarImportPhoto(value: string): boolean {
  return storedLinkedInPhotoSource(value) === "unavatar";
}

function isManagedLinkedInPhoto(value: string): boolean {
  return isLinkedInProfilePhoto(value) || storedLinkedInPhotoSource(value) !== null;
}

export function linkedInProfileKey(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !/^(?:(?:www|[a-z]{2,3})\.)?linkedin\.com$/i.test(url.hostname)
    ) {
      return null;
    }
    const match = url.pathname.match(/^\/in\/([a-z0-9_-]+)\/?$/i);
    return match ? `linkedin.com/in/${match[1].toLowerCase()}` : null;
  } catch {
    return null;
  }
}

export function profileBoundContact(
  data: ParsedContact | undefined,
  requestedUrl: string
): ParsedContact | undefined {
  if (!data) return undefined;
  const requestedKey = linkedInProfileKey(requestedUrl);
  const returnedKey = linkedInProfileKey(data.linkedin_url ?? "");
  return requestedKey && returnedKey === requestedKey ? data : undefined;
}

export function sanitizeParsedContact(
  data: ParsedContact | undefined
): ParsedContact | undefined {
  if (!data) return undefined;
  const sanitized = { ...data };
  const identityKeys = [
    "name",
    "company",
    "position",
    "location",
    "email",
    "phone",
    "alma_mater",
  ] as const;
  for (const key of identityKeys) {
    const value = sanitized[key];
    if (typeof value !== "string") continue;
    const markers = value.match(/[*•_]/g)?.length ?? 0;
    if (markers >= 2 || value.includes("…") || /\.{3,}/.test(value)) {
      sanitized[key] = null;
    }
  }
  if (
    typeof sanitized.email === "string" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized.email.trim())
  ) {
    sanitized.email = null;
  }
  if (typeof sanitized.phone === "string") {
    const digits = sanitized.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 20) sanitized.phone = null;
  }
  return sanitized;
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
    if (form[key].trim() && importedBy[key] === undefined) {
      if (source === "ai" || manuallyEditedAt[key] !== undefined) continue;
    }
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
      const priorKey = linkedInProfileKey(state.form.linkedin_url);
      const nextKey = linkedInProfileKey(action.value);
      const sameProfile = Boolean(priorKey && nextKey && priorKey === nextKey);
      if (!sameProfile) {
        for (const key of Object.keys(state.importedBy) as (keyof FormState)[]) {
          if (state.importedBy[key]) form[key] = "";
        }
      }
      return {
        activeImportId: action.importId,
        form,
        importedBy: sameProfile ? importedBy : {},
        manuallyEditedAt,
        profileLinkedInKey: state.profileLinkedInKey,
      };
    }
    return { ...state, form, importedBy, manuallyEditedAt };
  }

  if (action.type === "begin_import") {
    const currentKey = linkedInProfileKey(state.form.linkedin_url);
    if (
      currentKey &&
      state.profileLinkedInKey &&
      currentKey !== state.profileLinkedInKey
    ) {
      const form = { ...state.form };
      const importedBy = { ...state.importedBy };
      for (const key of PARSE_KEYS) {
        if (
          key !== "linkedin_url" &&
          state.manuallyEditedAt[key] !== state.activeImportId
        ) {
          form[key] = "";
          delete importedBy[key];
        }
      }
      return {
        ...state,
        activeImportId: action.importId,
        form,
        importedBy,
        profileLinkedInKey: currentKey,
      };
    }
    return {
      ...state,
      activeImportId: action.importId,
      profileLinkedInKey: currentKey ?? state.profileLinkedInKey,
    };
  }

  if (action.type === "cancel_import") {
    return { ...state, activeImportId: action.importId };
  }

  if (action.type === "remove_imported_photo") {
    if (
      state.form.photo_url !== action.photoUrl ||
      state.importedBy.photo_url === undefined
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
      isManagedLinkedInPhoto(form.photo_url))
  ) {
    form.photo_url = action.directPhoto;
    importedBy.photo_url = "direct";
  }
  return { ...state, form, importedBy };
}
