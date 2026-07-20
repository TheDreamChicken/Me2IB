import assert from "node:assert/strict";
import test from "node:test";
import {
  importFormReducer,
  isUnavatarImportPhoto,
  linkedInProfileKey,
  profileBoundContact,
  sanitizeParsedContact,
} from "./linkedin-import-state.ts";

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
    profileLinkedInKey: linkedInProfileKey(form.linkedin_url),
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

test("AI fields are accepted only when they resolve to the requested profile", () => {
  const requested = "https://www.linkedin.com/in/matt-weiss-84514b223/";
  const fields = {
    name: "Matt Weiss",
    company: "Huron",
    linkedin_url:
      "https://uk.linkedin.com/in/matt-weiss-84514b223/?trk=public_profile",
  };
  assert.equal(profileBoundContact(fields, requested), fields);
  assert.equal(
    profileBoundContact(
      { ...fields, linkedin_url: "https://www.linkedin.com/in/matt-b-weiss" },
      requested
    ),
    undefined
  );
  assert.equal(
    profileBoundContact({ ...fields, linkedin_url: null }, requested),
    undefined
  );
});

test("masked or invalid AI contact fields are discarded before merging", () => {
  assert.deepEqual(
    sanitizeParsedContact({
      name: "J*** D***",
      company: "F****** C******",
      position: "A******",
      email: "j***@example.com",
      phone: "(***) ***-1234",
      location: "Chicago",
      linkedin_url: "https://www.linkedin.com/in/example",
    }),
    {
      name: null,
      company: null,
      position: null,
      email: null,
      phone: null,
      location: "Chicago",
      linkedin_url: "https://www.linkedin.com/in/example",
    }
  );
  assert.equal(
    sanitizeParsedContact({ email: "not-an-email", phone: "555" }).email,
    null
  );
  assert.equal(
    sanitizeParsedContact({ email: "person@example.com", phone: "+1 312 555 1212" })
      .phone,
    "+1 312 555 1212"
  );
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
      manuallyEditedAt: { company: 1 },
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

test("an explicit pull refreshes stale persisted fields with exact direct data", () => {
  const prior = importState(
    blankForm({ company: "Old Company", position: "Old Role" }),
    { activeImportId: 2 }
  );
  const next = importFormReducer(prior, {
    type: "apply_import",
    importId: 2,
    direct: { company: "New Company", position: "New Role" },
  });

  assert.equal(next.form.company, "New Company");
  assert.equal(next.form.position, "New Role");
});

test("pulling a different profile clears stale persisted identity fields", () => {
  let state = importState(
    blankForm({
      name: "First Person",
      company: "Old Company",
      photo_url: "https://example.supabase.co/storage/old-photo",
      notes: "Keep these relationship notes",
    })
  );
  state = importFormReducer(state, {
    type: "manual_change",
    key: "linkedin_url",
    value: "https://www.linkedin.com/in/second-person",
    importId: 1,
  });
  state = importFormReducer(state, { type: "begin_import", importId: 2 });
  state = importFormReducer(state, {
    type: "apply_import",
    importId: 2,
    direct: { name: "Second Person", company: "New Company" },
  });

  assert.equal(state.form.name, "Second Person");
  assert.equal(state.form.company, "New Company");
  assert.equal(state.form.photo_url, "");
  assert.equal(state.form.notes, "Keep these relationship notes");
});

test("a field curated after changing profiles survives the new pull", () => {
  let state = importState(blankForm({ name: "First Person", company: "Old Co" }));
  state = importFormReducer(state, {
    type: "manual_change",
    key: "linkedin_url",
    value: "https://www.linkedin.com/in/second-person",
    importId: 1,
  });
  state = importFormReducer(state, {
    type: "manual_change",
    key: "name",
    value: "My Corrected Name",
    importId: 1,
  });
  state = importFormReducer(state, { type: "begin_import", importId: 2 });
  state = importFormReducer(state, {
    type: "apply_import",
    importId: 2,
    direct: { name: "Second Person", company: "New Co" },
  });

  assert.equal(state.form.name, "My Corrected Name");
  assert.equal(state.form.company, "New Co");
});

test("a same-profile URL variation does not clear persisted fields before refresh", () => {
  let state = importState(blankForm({ name: "Curated Name", company: "Curated Co" }));
  state = importFormReducer(state, {
    type: "manual_change",
    key: "linkedin_url",
    value: "https://uk.linkedin.com/in/first-person/?trk=public_profile",
    importId: 1,
  });
  state = importFormReducer(state, { type: "begin_import", importId: 2 });

  assert.equal(state.form.name, "Curated Name");
  assert.equal(state.form.company, "Curated Co");
});

test("a same-profile URL variation keeps fields imported in this session", () => {
  const state = importState(
    blankForm({ name: "Imported Name", company: "Imported Co" }),
    { importedBy: { name: "direct", company: "ai" } }
  );
  const next = importFormReducer(state, {
    type: "manual_change",
    key: "linkedin_url",
    value: "https://uk.linkedin.com/in/first-person/?trk=public_profile",
    importId: 1,
  });

  assert.equal(next.form.name, "Imported Name");
  assert.equal(next.form.company, "Imported Co");
  assert.deepEqual(next.importedBy, { name: "direct", company: "ai" });
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

test("a fresh pull replaces an older me2IB-managed LinkedIn import", () => {
  const oldPhoto =
    "https://example.supabase.co/storage/v1/object/public/avatars/user-id/contacts/linkedin-0123456789abcdef0123456789abcdef01234567?v=old&source=unavatar";
  const newPhoto =
    "https://example.supabase.co/storage/v1/object/public/avatars/user-id/contacts/linkedin-0123456789abcdef0123456789abcdef01234567?v=new&source=unavatar";
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
  assert.equal(isUnavatarImportPhoto(next.form.photo_url), true);
});

test("source query text alone does not mark a curated photo as Unavatar", () => {
  const curated = "https://example.test/photo.jpg?source=unavatar";
  assert.equal(isUnavatarImportPhoto(curated), false);

  const next = importFormReducer(
    importState(blankForm({ photo_url: curated }), { activeImportId: 2 }),
    {
      type: "apply_import",
      importId: 2,
      directPhoto:
        "https://example.supabase.co/storage/v1/object/public/avatars/user-id/contacts/linkedin-0123456789abcdef0123456789abcdef01234567?v=new&source=unavatar",
    }
  );
  assert.equal(next.form.photo_url, curated);
});

test("a broken saved legacy LinkedIn photo is not removed automatically", () => {
  const savedPhoto =
    "https://media.licdn.com/dms/image/v2/profile-displayphoto-shrink_200_200/saved";
  const next = importFormReducer(
    importState(blankForm({ photo_url: savedPhoto })),
    { type: "remove_imported_photo", photoUrl: savedPhoto }
  );

  assert.equal(next.form.photo_url, savedPhoto);
  assert.equal(next.importedBy.photo_url, undefined);
});

test("a broken photo imported during the current session may be removed", () => {
  const importedPhoto =
    "https://media.licdn.com/dms/image/v2/profile-displayphoto-shrink_200_200/current";
  const next = importFormReducer(
    importState(blankForm({ photo_url: importedPhoto }), {
      importedBy: { photo_url: "direct" },
    }),
    { type: "remove_imported_photo", photoUrl: importedPhoto }
  );

  assert.equal(next.form.photo_url, "");
  assert.equal(next.importedBy.photo_url, undefined);
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
