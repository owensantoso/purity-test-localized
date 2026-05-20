import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const testDir = path.join(root, "content", "tests", "rice-classic");
const manifestPath = path.join(testDir, "manifest.json");

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

if (!Array.isArray(manifest.languages) || manifest.languages.length === 0) {
  fail("manifest.languages must list at least one language");
}

const sourceEntry = manifest.languages.find((language) => language.code === manifest.sourceLanguage);

if (!sourceEntry) {
  fail("manifest.sourceLanguage must exist in manifest.languages");
}

const sourceFile = await readJson(path.join(testDir, sourceEntry.file));
const sourceIds = idsFor(sourceFile);

if (sourceIds.length !== 0 && sourceIds.length !== manifest.itemCount) {
  fail(`source language has ${sourceIds.length} items, expected ${manifest.itemCount}`);
}

for (const language of manifest.languages) {
  const languageFile = await readJson(path.join(testDir, language.file));

  if (languageFile.language !== language.code) {
    fail(`${language.file} language code does not match manifest entry ${language.code}`);
  }

  const languageIds = idsFor(languageFile);

  if (sourceIds.length === 0) {
    if (languageIds.length !== 0) {
      fail(`${language.code} has items before the source language has canonical items`);
    }
    continue;
  }

  if (!sameIds(languageIds, sourceIds)) {
    fail(`${language.code} item IDs do not match source language IDs`);
  }
}

console.log("Content validation passed.");

