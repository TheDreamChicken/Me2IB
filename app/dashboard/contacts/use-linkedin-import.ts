"use client";

import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import { callAI } from "@/lib/ai-client";
import { INDUSTRIES } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import {
  hasMeaningfulFields,
  importFormReducer,
  linkedInProfileKey,
  profileBoundContact,
  sanitizeParsedContact,
  type FormState,
  type ParsedContact,
} from "./linkedin-import-state";

export type { FormState } from "./linkedin-import-state";

type LinkedInProfileResponse = {
  profileText?: string;
  photoUrl?: string | null;
  fields?: ParsedContact;
  access?: "public" | "authwall" | "blocked" | "unavailable";
  warning?: string;
  error?: string;
};

function normalizedIndustry(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/[ -]+/g, "_");
  const exact = INDUSTRIES.find(
    (industry) =>
      industry.value === value ||
      industry.label.toLowerCase().replace(/[ -]+/g, "_") === value
  );
  if (exact) return exact.value;
  const plain = value.replace(/_/g, " ");
  if (/bank|finance|private equity|venture capital|asset management/.test(plain)) {
    return "finance";
  }
  if (/consult|strategy|advisory/.test(plain)) return "consulting";
  if (/market|advertis|brand/.test(plain)) return "marketing";
  if (/operation|supply chain/.test(plain)) return "operations";
  if (/technology|software|engineering/.test(plain)) return "tech";
  if (/data|analytic/.test(plain)) return "data";
  if (/real estate|property/.test(plain)) return "real_estate";
  return "";
}

function normalizeParsedContact(
  data: ParsedContact | undefined
): ParsedContact | undefined {
  const sanitized = sanitizeParsedContact(data);
  if (!sanitized?.industry) return sanitized;
  return {
    ...sanitized,
    industry: normalizedIndustry(sanitized.industry) || null,
  };
}

function appendNotice(base: string | null, addition: string): string {
  return [base, addition].filter(Boolean).join(" ");
}

function profileComparisonContext(profile: Profile | null) {
  if (!profile) return null;

  return {
    school: profile.school,
    fieldsOfStudy:
      profile.majors?.length || profile.minors?.length
        ? [...(profile.majors ?? []), ...(profile.minors ?? [])]
        : [profile.major, profile.minor].filter(Boolean),
    city: profile.city,
    targetIndustries: profile.target_industries,
    clubsAndActivities: profile.clubs,
    professionalSummary: profile.professional_summary,
    personalInterests: profile.personal_interests,
    funFacts: profile.fun_facts,
  };
}

export function useLinkedInImport(
  initialForm: FormState,
  profile: Profile | null
) {
  const [state, dispatch] = useReducer(importFormReducer, {
    activeImportId: 0,
    form: initialForm,
    importedBy: {},
    manuallyEditedAt: {},
    profileLinkedInKey: linkedInProfileKey(initialForm.linkedin_url),
  });
  const [parsePending, setParsePending] = useState(false);
  const [, startParse] = useTransition();
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSetup, setParseSetup] = useState<string | null>(null);
  const [parseNotice, setParseNotice] = useState<string | null>(null);
  const [parseDone, setParseDone] = useState(false);
  const requestIdRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);

  function cancelImport(clearStatus = true) {
    const importId = ++requestIdRef.current;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    dispatch({ type: "cancel_import", importId });
    setParsePending(false);
    if (clearStatus) {
      setParseDone(false);
      setParseError(null);
      setParseNotice(null);
      setParseSetup(null);
    }
  }

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      requestAbortRef.current?.abort();
    },
    []
  );

  function handleFieldChange(key: keyof FormState, value: string) {
    let importId = requestIdRef.current;
    if (key === "linkedin_url") {
      importId = ++requestIdRef.current;
      requestAbortRef.current?.abort();
      requestAbortRef.current = null;
      setParsePending(false);
      setParseDone(false);
      setParseError(null);
      setParseNotice(null);
      setParseSetup(null);
    }
    dispatch({ type: "manual_change", key, value, importId });
  }

  function importedPhotoFailed(photoUrl: string) {
    const wasImportedThisSession = state.importedBy.photo_url !== undefined;
    if (state.form.photo_url !== photoUrl || !wasImportedThisSession) {
      return;
    }
    const photoWasOnlyImport = wasImportedThisSession && Object.keys(state.importedBy).every(
      (key) => key === "photo_url"
    );
    dispatch({ type: "remove_imported_photo", photoUrl });
    if (photoWasOnlyImport) {
      setParseDone(false);
      setParseError(
        "The verified profile photo did not load in this browser, so I left it out."
      );
    } else {
      setParseNotice((current) =>
        appendNotice(
          current,
          "The verified profile photo did not load in this browser, so I left it out."
        )
      );
    }
  }

  function runParse() {
    const linkedinUrl = state.form.linkedin_url.trim();
    if (!linkedinUrl) return;
    const importId = ++requestIdRef.current;
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    dispatch({ type: "begin_import", importId });
    setParsePending(true);
    setParseError(null);
    setParseSetup(null);
    setParseNotice(null);
    setParseDone(false);

    startParse(async () => {
      const isCurrent = () => requestIdRef.current === importId;
      try {
        let pulled: LinkedInProfileResponse = {};
        let pullWarning: string | null = null;
        try {
          const response = await fetch("/dashboard/contacts/linkedin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: linkedinUrl }),
            signal: controller.signal,
          });
          pulled = (await response.json()) as LinkedInProfileResponse;
          if (!isCurrent()) return;
          if (!response.ok) {
            if (
              response.status >= 400 &&
              response.status < 500 &&
              response.status !== 429
            ) {
              setParseError(
                pulled.error ?? "That LinkedIn profile URL could not be used."
              );
              return;
            }
            pullWarning =
              pulled.error ?? "LinkedIn blocked the direct profile page.";
            pulled = {};
          } else {
            pullWarning = pulled.warning ?? null;
          }
        } catch {
          if (!isCurrent()) return;
          pullWarning = "LinkedIn blocked the direct profile page.";
        }

        const directFields = normalizeParsedContact(pulled.fields);
        const directPhoto = pulled.photoUrl?.trim() ?? "";
        const directUseful =
          hasMeaningfulFields(directFields) || Boolean(directPhoto);
        const result = await callAI<ParsedContact>("parse_contact", {
          url: linkedinUrl,
          text: pulled.profileText ?? "",
          profile: profileComparisonContext(profile),
        });
        if (!isCurrent()) return;

        if (result.setup) {
          setParseSetup(result.setup);
          if (directUseful) {
            dispatch({
              type: "apply_import",
              importId,
              direct: directFields,
              directPhoto,
            });
            setParseDone(true);
            setParseNotice(
              pullWarning ??
                "Pulled public details tied to that LinkedIn URL. AI could not check for additional public fields because it is not configured. Review everything before saving."
            );
          } else if (pullWarning) {
            setParseError(pullWarning);
          }
          return;
        }

        if (result.error || result.upgrade) {
          if (directUseful) {
            dispatch({
              type: "apply_import",
              importId,
              direct: directFields,
              directPhoto,
            });
            setParseDone(true);
            setParseNotice(
              appendNotice(
                pullWarning ??
                  "Pulled public details tied to that LinkedIn URL. Review everything before saving.",
                result.error
                  ? `The broader public-web check did not finish: ${result.error}`
                  : "The broader public-web check was not available for this account."
              )
            );
          } else {
            setParseError(
              result.error ??
                pullWarning ??
                "The broader public-web check was not available for this account."
            );
          }
          return;
        }

        const unboundData = normalizeParsedContact(result.data);
        const data = profileBoundContact(unboundData, linkedinUrl);
        const aiUseful = hasMeaningfulFields(data);
        const unboundAiFields = hasMeaningfulFields(unboundData) && !data;
        const unboundAiPhoto =
          !directPhoto && Boolean(unboundData?.photo_url?.trim());
        if (!directUseful && !aiUseful) {
          setParseError(
            unboundAiFields
              ? "Public web results could not be tied back to the exact LinkedIn URL, so I left them out instead of risking the wrong person."
              : unboundAiPhoto
              ? "A possible photo was found, but it could not be tied safely to this exact profile, so I left it out. No other verifiable details came back."
              : pullWarning ??
                  "No verifiable public details came back. Check that the URL is the right public profile."
          );
          return;
        }

        dispatch({
          type: "apply_import",
          importId,
          direct: directFields,
          ai: data,
          directPhoto,
        });
        setParseDone(true);
        let notice =
          pullWarning ??
          (directUseful
            ? "Checked the exact public LinkedIn record first, then corroborated remaining fields with public web results. Review everything before saving."
            : "Used only details corroborated from exact-identity public web results.");
        if (unboundAiPhoto) {
          notice = appendNotice(
            notice,
            "I left out a search-only photo because LinkedIn did not provide enough identity-bound evidence for it."
          );
        }
        if (unboundAiFields) {
          notice = appendNotice(
            notice,
            "I left out broader web fields that did not resolve back to this exact LinkedIn URL."
          );
        }
        setParseNotice(notice);
      } finally {
        if (isCurrent()) {
          requestAbortRef.current = null;
          setParsePending(false);
        }
      }
    });
  }

  return {
    cancelImport,
    form: state.form,
    handleFieldChange,
    importedPhotoFailed,
    parseDone,
    parseError,
    parseNotice,
    parsePending,
    parseSetup,
    runParse,
  };
}
