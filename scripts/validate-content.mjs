import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const testDir = path.join(root, "content", "tests", "rice-classic");
const manifestPath = path.join(testDir, "manifest.json");
const strict = process.argv.includes("--strict");
const knownStatuses = new Set(["source-pending", "draft", "ready"]);

function fail(message) {
  console.error(`Content validation failed: ${message}`);
  process.exit(1);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(root, filePath)} is not valid JSON: ${error.message}`);
  }
}

function idsFor(languageFile) {
  if (!Array.isArray(languageFile.items)) {
    fail(`${languageFile.language || "unknown"} is missing an items array`);
  }

  const ids = languageFile.items.map((item) => item.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

  if (duplicates.length > 0) {
    fail(`${languageFile.language} has duplicate item IDs: ${[...new Set(duplicates)].join(", ")}`);
  }

  for (const item of languageFile.items) {
    if (!Number.isInteger(item.id)) {
      fail(`${languageFile.language} has an item with a non-integer id`);
    }

    if (typeof item.text !== "string" || item.text.trim().length === 0) {
      fail(`${languageFile.language} item ${item.id} is missing text`);
    }
  }

  return ids;
}

function sameIds(left, right) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

const manifest = await readJson(manifestPath);

if (!Number.isInteger(manifest.itemCount) || manifest.itemCount <= 0) {
  fail("manifest.itemCount must be a positive integer");
}

if (
  !manifest.score ||
  !Number.isInteger(manifest.score.startsAt) ||
  !Number.isInteger(manifest.score.subtractPerCheckedItem) ||
  manifest.score.startsAt <= 0 ||
  manifest.score.subtractPerCheckedItem <= 0
) {
  fail("manifest.score must define positive integer startsAt and subtractPerCheckedItem values");
}

if (manifest.score.startsAt !== manifest.itemCount || manifest.score.subtractPerCheckedItem !== 1) {
  fail("rice-classic scoring must start at itemCount and subtract 1 per checked item");
}

if (!Array.isArray(manifest.languages) || manifest.languages.length === 0) {
  fail("manifest.languages must list at least one language");
}

const languageCodes = new Set();
const languageFiles = new Set();

for (const language of manifest.languages) {
  if (typeof language.code !== "string" || language.code.trim().length === 0) {
    fail("manifest language entries must include a code");
  }

  if (languageCodes.has(language.code)) {
    fail(`manifest has duplicate language code: ${language.code}`);
  }
  languageCodes.add(language.code);

  if (typeof language.file !== "string" || !/^[a-z0-9-]+\.json$/i.test(language.file)) {
    fail(`${language.code} has an unsafe or invalid file name`);
  }

  if (languageFiles.has(language.file)) {
    fail(`manifest has duplicate language file: ${language.file}`);
  }
  languageFiles.add(language.file);

  if (!knownStatuses.has(language.status)) {
    fail(`${language.code} has unknown status: ${language.status}`);
  }
}

const sourceEntry = manifest.languages.find((language) => language.code === manifest.sourceLanguage);

if (!sourceEntry) {
  fail("manifest.sourceLanguage must exist in manifest.languages");
}

const sourceFile = await readJson(path.join(testDir, sourceEntry.file));
const sourceIds = idsFor(sourceFile);

if ((strict || sourceIds.length !== 0) && sourceIds.length !== manifest.itemCount) {
  fail(`source language has ${sourceIds.length} items, expected ${manifest.itemCount}`);
}

for (const language of manifest.languages) {
  const languageFile = await readJson(path.join(testDir, language.file));

  if (languageFile.language !== language.code) {
    fail(`${language.file} language code does not match manifest entry ${language.code}`);
  }

  if (languageFile.label !== language.label) {
    fail(`${language.file} label does not match manifest entry ${language.label}`);
  }

  const languageIds = idsFor(languageFile);

  if (sourceIds.length === 0) {
    if (strict) {
      fail("strict mode requires canonical source items before release");
    }

    if (languageIds.length !== 0) {
      fail(`${language.code} has items before the source language has canonical items`);
    }
    continue;
  }

  if (!strict && language.status !== "ready" && languageIds.length === 0) {
    continue;
  }

  if (!sameIds(languageIds, sourceIds)) {
    fail(`${language.code} item IDs do not match source language IDs`);
  }
}

console.log("Content validation passed.");
