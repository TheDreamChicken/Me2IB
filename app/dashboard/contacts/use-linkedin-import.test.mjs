import assert from "node:assert/strict";
import test from "node:test";
import { importFormReducer } from "./linkedin-import-state.ts";

function blankForm(overrides = {}) {
  return {
    name: "",
    company: "",
    position: "",
    email: "",
    phone: "",
    linkedin_url: "https://www.linkedin.com/in/first-person",
    photo_url: "",
    location: "",
    industry: "",
    how_met: "",
    connection_strength: "2",
    relationship: "",
    shared_interests: "",
    alma_mater: "",
    notes: "",
    tags: "",
    last_contacted: "",
    followup_interval_days: "21",
    status: "active",
    ...overrides,
  };
}

function importState(form = blankForm(), overrides = {}) {
  return {
    activeImportId: 0,
    form,
    importedBy: {},
    manuallyEditedAt: {},
    ...overrides,
  };
}

test("a stale import cannot merge after the LinkedIn URL changes", () => {
  let state = importFormReducer(importState(), {
    type: "begin_import",
    importId: 1,
  });
  state = importFormReducer(state, {
    type: "manual_change",
    key: "linkedin_url",
    value: "https://www.linkedin.com/in/second-person",
    importId: 2,
  });
  state = importFormReducer(state, {
    type: "apply_import",
    importId: 1,
    direct: { name: "First Person" },
  });

  assert.equal(state.form.linkedin_url, "https://www.linkedin.com/in/second-person");
  assert.equal(state.form.name, "");
});

test("beginning a refresh does not erase a prior good import", () => {
  const prior = importState(blankForm({ name: "Prior Good Name" }), {
    activeImportId: 1,
    importedBy: { name: "direct" },
  });
  const refreshing = importFormReducer(prior, {
    type: "begin_import",
    importId: 2,
  });

  assert.equal(refreshing.form.name, "Prior Good Name");
  assert.equal(refreshing.importedBy.name, "direct");
});

test("a partial successful refresh keeps prior imported fields it did not replace", () => {
  const prior = importState(blankForm({ name: "Prior Good Name" }), {
    activeImportId: 2,
    importedBy: { name: "direct" },
  });
  const refreshed = importFormReducer(prior, {
    type: "apply_import",
    importId: 2,
    direct: { company: "New Company" },
  });

  assert.equal(refreshed.form.name, "Prior Good Name");
  assert.equal(refreshed.form.company, "New Company");
  assert.equal(refreshed.importedBy.name, "direct");
  assert.equal(refreshed.importedBy.company, "direct");
});

test("a successful re-pull replaces prior imports but preserves curated values", () => {
  const prior = importState(
    blankForm({
      name: "Wrong Imported Name",
      company: "Curated Company",
      photo_url: "https://example.test/curated.jpg",
    }),
    {
      activeImportId: 2,
      importedBy: { name: "ai" },
    }
  );
  const next = importFormReducer(prior, {
    type: "apply_import",
    importId: 2,
    direct: { name: "Verified Name", company: "Direct Company" },
    directPhoto:
      "https://media.licdn.com/dms/image/v2/profile-displayphoto-shrink_200_200/new",
  });

  assert.equal(next.form.name, "Verified Name");
  assert.equal(next.form.company, "Curated Company");
  assert.equal(next.form.photo_url, "https://example.test/curated.jpg");
  assert.equal(next.importedBy.name, "direct");
  assert.equal(next.importedBy.company, undefined);
});

test("a fresh verified photo replaces an older saved LinkedIn photo", () => {
  const oldPhoto =
    "https://media.licdn.com/dms/image/v2/profile-displayphoto-shrink_200_200/old";
  const newPhoto =
    "https://media-exp1.licdn.com/dms/image/v2/profile-displayphoto-shrink_200_200/new";
  const prior = importState(blankForm({ photo_url: oldPhoto }), {
    activeImportId: 2,
  });
  const next = importFormReducer(prior, {
    type: "apply_import",
    importId: 2,
    directPhoto: newPhoto,
  });

  assert.equal(next.form.photo_url, newPhoto);
  assert.equal(next.importedBy.photo_url, "direct");
});

test("a broken saved LinkedIn photo can be removed without touching custom photos", () => {
  const linkedInPhoto =
    "https://media.licdn.com/dms/image/v2/profile-displayphoto-shrink_200_200/old";
  const linkedInState = importFormReducer(
    importState(blankForm({ photo_url: linkedInPhoto })),
    { type: "remove_imported_photo", photoUrl: linkedInPhoto }
  );
  assert.equal(linkedInState.form.photo_url, "");

  const customPhoto = "https://example.test/profile.jpg";
  const customState = importFormReducer(
    importState(blankForm({ photo_url: customPhoto })),
    { type: "remove_imported_photo", photoUrl: customPhoto }
  );
  assert.equal(customState.form.photo_url, customPhoto);
});

test("an explicit later pull may refill a field cleared before it began", () => {
  let state = importState(blankForm({ name: "Imported Name" }), {
    activeImportId: 1,
    importedBy: { name: "direct" },
  });
  state = importFormReducer(state, {
    type: "manual_change",
    key: "name",
    value: "",
    importId: 1,
  });
  state = importFormReducer(state, { type: "begin_import", importId: 2 });
  state = importFormReducer(state, {
    type: "apply_import",
    importId: 2,
    direct: { name: "Verified Name" },
  });

  assert.equal(state.form.name, "Verified Name");
});

test("an edit made while a pull is running wins over that pull", () => {
  let state = importFormReducer(importState(), {
    type: "begin_import",
    importId: 3,
  });
  state = importFormReducer(state, {
    type: "manual_change",
    key: "name",
    value: "",
    importId: 3,
  });
  state = importFormReducer(state, {
    type: "apply_import",
    importId: 3,
    direct: { name: "Should Not Appear" },
  });

  assert.equal(state.form.name, "");
});
