const testDir = "./content/tests/rice-classic";
const contentVersion = "20260523-submit-scroll";
const stateKey = "purity-test-localized:selected-ids";
const submittedKey = "purity-test-localized:submitted";
const languageSelectionKey = "purity-test-localized:selected-languages";
const sourceCompareKey = "purity-test-localized:source-compare";

const elements = {
  title: document.querySelector("#title"),
  languageLabel: document.querySelector("#language-label"),
  languageSearch: document.querySelector("#language-search"),
  languageOptions: document.querySelector("#language-options"),
  selectedLanguages: document.querySelector("#selected-languages"),
  sourceCompare: document.querySelector("#source-compare"),
  sourceCompareLabel: document.querySelector("#source-compare-label"),
  scoreLabel: document.querySelector("#score-label"),
  scorePanel: document.querySelector(".score-panel"),
  score: document.querySelector("#score"),
  selectedLabel: document.querySelector("#selected-label"),
  selectedCount: document.querySelector("#selected-count"),
  submit: document.querySelector("#submit"),
  reset: document.querySelector("#reset"),
  resultPanel: document.querySelector("#result-panel"),
  resultLabel: document.querySelector("#result-label"),
  finalScore: document.querySelector("#final-score"),
  resultBody: document.querySelector("#result-body"),
  bottomSubmit: document.querySelector("#bottom-submit"),
  bottomReset: document.querySelector("#bottom-reset"),
  statusPanel: document.querySelector("#status-panel"),
  statusTitle: document.querySelector("#status-title"),
  statusBody: document.querySelector("#status-body"),
  itemList: document.querySelector("#item-list"),
  privacyNote: document.querySelector("#privacy-note")
};

let manifest;
let uiStrings;
let sourceContent;
let contentByLanguage = new Map();
let selectedLanguageCodes = [];
let languageRenderToken = 0;
let languageSearchTerm = "";
let selectedIds = loadSelectedIds();
let submitted = localStorage.getItem(submittedKey) === "true";

function loadSelectedIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(stateKey) || "[]");
    return new Set(stored.filter(Number.isInteger));
  } catch {
    return new Set();
  }
}

function saveSelectedIds() {
  localStorage.setItem(stateKey, JSON.stringify([...selectedIds].sort((a, b) => a - b)));
}

function saveSubmitted() {
  localStorage.setItem(submittedKey, String(submitted));
}

function loadSelectedLanguageCodes() {
  try {
    const stored = JSON.parse(localStorage.getItem(languageSelectionKey) || "[]");
    return Array.isArray(stored) ? stored.filter((code) => typeof code === "string") : [];
  } catch {
    return [];
  }
}

function languageCodesFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const rawCodes = params.get("langs") || params.get("lang");
  if (!rawCodes) {
    return [];
  }
  return rawCodes.split(",").map((code) => code.trim()).filter(Boolean);
}

function saveSelectedLanguageCodes() {
  localStorage.setItem(languageSelectionKey, JSON.stringify(selectedLanguageCodes));
}

function updateLanguageUrl() {
  const url = new URL(window.location.href);

  if (selectedLanguageCodes.length > 0) {
    url.searchParams.set("langs", selectedLanguageCodes.join(","));
  } else {
    url.searchParams.delete("langs");
  }

  url.searchParams.delete("lang");
  window.history.replaceState(null, "", url);
}

function sourceCompareEnabled() {
  const stored = localStorage.getItem(sourceCompareKey);
  return stored === null ? true : stored === "true";
}

function saveSourceCompare() {
  localStorage.setItem(sourceCompareKey, String(elements.sourceCompare.checked));
}

async function readJson(url) {
  const response = await fetch(`${url}?v=${contentVersion}`);
  if (!response.ok) {
    throw new Error(`Unable to load ${url}`);
  }
  return response.json();
}

function activeLanguageCode() {
  return selectedLanguageCodes[0] || manifest.sourceLanguage;
}

function strings() {
  return uiStrings.en;
}

function score() {
  return manifest.score.startsAt - selectedIds.size * manifest.score.subtractPerCheckedItem;
}

function updateMetrics() {
  elements.score.textContent = String(score());
  elements.selectedCount.textContent = `${selectedIds.size} / ${manifest.itemCount}`;
  renderResult();
}

function renderLanguageOptions() {
  elements.languageOptions.replaceChildren();

  const searchTerm = languageSearchTerm.trim().toLowerCase();
  const visibleLanguages = manifest.languages.filter((language) => {
    const haystack = [
      language.code,
      language.label,
      language.displayLabel || ""
    ].join(" ").toLowerCase();
    return !searchTerm || haystack.includes(searchTerm);
  });

  for (const language of visibleLanguages) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `language-${language.code}`;
    checkbox.value = language.code;
    checkbox.checked = selectedLanguageCodes.includes(language.code);
    checkbox.addEventListener("change", () => {
      let nextCodes;
      if (checkbox.checked) {
        nextCodes = selectedLanguageCodes.concat(language.code);
      } else {
        nextCodes = selectedLanguageCodes.filter((code) => code !== language.code);
      }
      setLanguages(nextCodes);
    });

    const text = document.createElement("span");
    text.textContent = language.displayLabel || language.label;

    const option = document.createElement("label");
    option.className = "language-option";
    option.htmlFor = checkbox.id;
    option.append(checkbox, text);
    elements.languageOptions.append(option);
  }
}

function renderSelectedLanguages() {
  elements.selectedLanguages.replaceChildren();

  const label = document.createElement("span");
  label.className = "selected-languages-label";
  label.textContent = strings().selectedLanguages;
  elements.selectedLanguages.append(label);

  const codes = selectedLanguageCodes.length > 0 ? selectedLanguageCodes : [manifest.sourceLanguage];

  for (const code of codes) {
    const chip = document.createElement("span");
    chip.className = "selected-language-chip";
    chip.textContent = shortLanguageLabel(code);
    chip.title = languageLabel(code);
    elements.selectedLanguages.append(chip);
  }
}

function itemById(content, id) {
  return content.items.find((item) => item.id === id);
}

function languageByCode(code) {
  return manifest.languages.find((language) => language.code === code);
}

function languageLabel(code) {
  const language = languageByCode(code);
  return language?.displayLabel || language?.label || code;
}

function shortLanguageLabel(code) {
  const labels = {
    en: "EN",
    ja: "JP",
    vi: "VI",
    zh: "ZH-S",
    fr: "FR",
    es: "ES",
    hi: "HI",
    "zh-Hant": "ZH-T",
    ru: "RU",
    th: "TH",
    ko: "KO",
    id: "ID",
    pl: "PL",
    bn: "BN",
    gu: "GU"
  };
  return labels[code] || code.toUpperCase();
}

function selectedContentRows(id, primaryCode) {
  return selectedLanguageCodes
    .filter((code) => code !== primaryCode)
    .map((code) => {
      const content = contentByLanguage.get(code);
      const item = content ? itemById(content, id) : undefined;
      return item ? { code, item } : undefined;
    })
    .filter(Boolean);
}

function firstSelectedContent() {
  const code = selectedLanguageCodes[0];
  return code ? contentByLanguage.get(code) : undefined;
}

function renderTranslationStack(id, primaryCode) {
  const rows = selectedContentRows(id, primaryCode);

  if (rows.length === 0) {
    return undefined;
  }

  const stack = document.createElement("div");
  stack.className = "translation-stack";

  for (const row of rows) {
    const translation = document.createElement("div");
    translation.className = "translation-row";

    const label = document.createElement("span");
    label.className = "translation-label";
    label.textContent = shortLanguageLabel(row.code);
    label.title = languageLabel(row.code);

    const text = document.createElement("span");
    text.textContent = row.item.text;

    translation.append(label, text);
    stack.append(translation);
  }

  return stack;
}

function helpRows(id, primaryCode, primaryItem) {
  const rows = [];

  if (primaryItem.help) {
    rows.push({ code: primaryCode, help: primaryItem.help });
  }

  for (const row of selectedContentRows(id, primaryCode)) {
    if (row.item.help) {
      rows.push({ code: row.code, help: row.item.help });
    }
  }

  return rows;
}

function renderHelpText(rows) {
  const helpText = document.createElement("div");
  helpText.className = "item-help";
  helpText.hidden = true;

  if (rows.length === 1) {
    helpText.textContent = rows[0].help;
    return helpText;
  }

  const stack = document.createElement("div");
  stack.className = "help-stack";

  for (const row of rows) {
    const helpRow = document.createElement("p");
    helpRow.className = "help-row";

    const label = document.createElement("strong");
    label.textContent = shortLanguageLabel(row.code);
    label.title = languageLabel(row.code);

    const text = document.createElement("span");
    text.textContent = row.help;

    helpRow.append(label, text);
    stack.append(helpRow);
  }

  helpText.append(stack);
  return helpText;
}

function renderItems() {
  elements.itemList.replaceChildren();

  if (sourceContent.items.length === 0) {
    elements.statusPanel.hidden = false;
    elements.statusTitle.textContent = strings().sourcePendingTitle;
    elements.statusBody.textContent = strings().sourcePendingBody;
    return;
  }

  elements.statusPanel.hidden = true;

  const showSource = elements.sourceCompare.checked;
  const selectedContent = firstSelectedContent();
  const primaryContent = showSource || !selectedContent ? sourceContent : selectedContent;
  const primaryCode = primaryContent.language;

  for (const sourceItem of sourceContent.items) {
    const item = itemById(primaryContent, sourceItem.id) || sourceItem;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `item-${item.id}`;
    checkbox.checked = selectedIds.has(item.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedIds.add(item.id);
      } else {
        selectedIds.delete(item.id);
      }
      saveSelectedIds();
      updateMetrics();
    });

    const primaryText = document.createElement("span");
    primaryText.textContent = item.text;

    const translationStack = renderTranslationStack(item.id, primaryCode);

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.append(checkbox, primaryText);

    if (translationStack) {
      label.append(translationStack);
    }

    const main = document.createElement("div");
    main.className = "item-main";
    main.append(label);

    const helpContentRows = helpRows(item.id, primaryCode, item);
    if (helpContentRows.length > 0) {
      const helpId = `item-${item.id}-help`;
      const helpButton = document.createElement("button");
      helpButton.type = "button";
      helpButton.className = "help-button";
      helpButton.textContent = "?";
      helpButton.setAttribute("aria-expanded", "false");
      helpButton.setAttribute("aria-controls", helpId);
      helpButton.setAttribute("aria-label", strings().explainItem);

      const helpText = renderHelpText(helpContentRows);
      helpText.id = helpId;

      helpButton.addEventListener("click", () => {
        const isHidden = helpText.hidden;
        helpText.hidden = !isHidden;
        helpButton.setAttribute("aria-expanded", String(isHidden));
        helpButton.setAttribute("aria-label", isHidden ? strings().hideExplanation : strings().explainItem);
      });

      main.append(helpButton);
      const row = document.createElement("li");
      row.append(main, helpText);
      elements.itemList.append(row);
      continue;
    }

    const row = document.createElement("li");
    row.append(main);
    elements.itemList.append(row);
  }
}

function renderResult() {
  elements.resultPanel.hidden = !submitted;

  if (!submitted) {
    return;
  }

  elements.finalScore.textContent = String(score());
  elements.resultBody.textContent = strings().resultBody;
}

function renderText() {
  const text = strings();
  document.documentElement.lang = manifest.sourceLanguage;
  elements.title.textContent = sourceContent.title;
  elements.languageLabel.textContent = text.languageLabel;
  elements.languageSearch.placeholder = text.languageSearch;
  elements.languageSearch.setAttribute("aria-label", text.languageSearch);
  elements.sourceCompareLabel.textContent = text.sourceCompare;
  elements.scoreLabel.textContent = text.scoreLabel;
  elements.selectedLabel.textContent = text.selectedCount;
  elements.submit.textContent = text.submit;
  elements.reset.textContent = text.reset;
  elements.bottomSubmit.textContent = text.submit;
  elements.bottomReset.textContent = text.reset;
  elements.resultLabel.textContent = text.resultLabel;
  elements.resultBody.textContent = text.resultBody;
  elements.privacyNote.textContent = text.privacyNote;
}

async function loadLanguage(code) {
  if (contentByLanguage.has(code)) {
    return contentByLanguage.get(code);
  }

  const language = languageByCode(code) || languageByCode(manifest.sourceLanguage);
  const content = await readJson(`${testDir}/${language.file}`);
  contentByLanguage.set(content.language, content);
  return content;
}

async function setLanguages(codes) {
  const renderToken = languageRenderToken + 1;
  languageRenderToken = renderToken;
  const validCodes = codes.filter((code, index) => {
    return languageByCode(code) && codes.indexOf(code) === index;
  });
  selectedLanguageCodes = validCodes;
  await Promise.all(selectedLanguageCodes.map(loadLanguage));

  if (renderToken !== languageRenderToken) {
    return;
  }

  saveSelectedLanguageCodes();
  updateLanguageUrl();
  renderLanguageOptions();
  renderSelectedLanguages();
  renderText();
  renderItems();
  updateMetrics();
}

async function init() {
  [manifest, uiStrings] = await Promise.all([
    readJson(`${testDir}/manifest.json`),
    readJson("./content/ui.json")
  ]);
  const sourceEntry = manifest.languages.find((language) => language.code === manifest.sourceLanguage);
  sourceContent = await readJson(`${testDir}/${sourceEntry.file}`);
  contentByLanguage.set(sourceContent.language, sourceContent);
  const urlLanguages = languageCodesFromUrl();
  const storedLanguages = loadSelectedLanguageCodes();
  const browserLanguage = navigator.language;
  const browserCode = manifest.languages.find((language) => browserLanguage === language.code || browserLanguage.startsWith(`${language.code}-`))?.code;
  selectedLanguageCodes = urlLanguages.length > 0
    ? urlLanguages
    : storedLanguages.length > 0
    ? storedLanguages
    : [browserCode || manifest.sourceLanguage];
  renderLanguageOptions();
  elements.sourceCompare.checked = sourceCompareEnabled();
  await setLanguages(selectedLanguageCodes);
}

elements.sourceCompare.addEventListener("change", () => {
  saveSourceCompare();
  renderItems();
});

function scrollToResult() {
  const stickyOffset = elements.scorePanel.getBoundingClientRect().height + 14;
  const resultTop = elements.resultPanel.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: Math.max(0, resultTop - stickyOffset),
    behavior: "smooth"
  });
}

function submitAnswers() {
  submitted = true;
  saveSubmitted();
  renderText();
  updateMetrics();
  scrollToResult();
}

function resetAnswers() {
  selectedIds = new Set();
  submitted = false;
  saveSelectedIds();
  saveSubmitted();
  renderText();
  renderItems();
  updateMetrics();
}

elements.languageSearch.addEventListener("input", (event) => {
  languageSearchTerm = event.target.value;
  renderLanguageOptions();
});

elements.submit.addEventListener("click", submitAnswers);
elements.bottomSubmit.addEventListener("click", submitAnswers);
elements.reset.addEventListener("click", resetAnswers);
elements.bottomReset.addEventListener("click", resetAnswers);

init().catch((error) => {
  elements.statusPanel.hidden = false;
  elements.statusTitle.textContent = "Unable to load app content.";
  elements.statusBody.textContent = error.message;
});
