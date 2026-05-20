const testDir = "./content/tests/rice-classic";
const stateKey = "purity-test-localized:selected-ids";

const elements = {
  title: document.querySelector("#title"),
  intro: document.querySelector("#intro"),
  languageLabel: document.querySelector("#language-label"),
  languageSelect: document.querySelector("#language-select"),
  sourceCompare: document.querySelector("#source-compare"),
  sourceCompareLabel: document.querySelector("#source-compare-label"),
  scoreLabel: document.querySelector("#score-label"),
  score: document.querySelector("#score"),
  selectedLabel: document.querySelector("#selected-label"),
  selectedCount: document.querySelector("#selected-count"),
  reset: document.querySelector("#reset"),
  statusPanel: document.querySelector("#status-panel"),
  statusTitle: document.querySelector("#status-title"),
  statusBody: document.querySelector("#status-body"),
  itemList: document.querySelector("#item-list"),
  toggleChecked: document.querySelector("#toggle-checked"),
  checkedList: document.querySelector("#checked-list"),
  privacyNote: document.querySelector("#privacy-note")
};

let manifest;
let uiStrings;
let sourceContent;
let currentContent;
let selectedIds = loadSelectedIds();

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

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load ${url}`);
  }
  return response.json();
}

function strings() {
  return uiStrings[currentContent.language] || uiStrings.en;
}

function score() {
  return manifest.score.startsAt - selectedIds.size * manifest.score.subtractPerCheckedItem;
}

function updateMetrics() {
  elements.score.textContent = String(score());
  elements.selectedCount.textContent = `${selectedIds.size} / ${manifest.itemCount}`;
}

function renderLanguageOptions() {
  elements.languageSelect.replaceChildren(
    ...manifest.languages.map((language) => {
      const option = document.createElement("option");
      option.value = language.code;
      option.textContent = language.label;
      return option;
    })
  );
}

function itemTextById(content, id) {
  return content.items.find((item) => item.id === id)?.text || "";
}

function renderItems() {
  elements.itemList.replaceChildren();

  if (currentContent.items.length === 0) {
    elements.statusPanel.hidden = false;
    elements.statusTitle.textContent = strings().sourcePendingTitle;
    elements.statusBody.textContent = strings().sourcePendingBody;
    return;
  }

  elements.statusPanel.hidden = true;

  for (const item of currentContent.items) {
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
      renderCheckedItems();
    });

    const primaryText = document.createElement("span");
    primaryText.textContent = item.text;

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.append(checkbox, primaryText);

    if (
      elements.sourceCompare.checked &&
      currentContent.language !== manifest.sourceLanguage
    ) {
      const sourceText = itemTextById(sourceContent, item.id);
      if (sourceText) {
        const source = document.createElement("small");
        source.textContent = sourceText;
        label.append(source);
      }
    }

    const row = document.createElement("li");
    row.append(label);
    elements.itemList.append(row);
  }
}

function renderCheckedItems() {
  elements.checkedList.replaceChildren();

  if (selectedIds.size === 0) {
    const empty = document.createElement("li");
    empty.textContent = strings().noCheckedItems;
    elements.checkedList.append(empty);
    return;
  }

  const checkedItems = currentContent.items.filter((item) => selectedIds.has(item.id));

  for (const item of checkedItems) {
    const row = document.createElement("li");
    row.textContent = item.text;
    elements.checkedList.append(row);
  }
}

function renderText() {
  const text = strings();
  document.documentElement.lang = currentContent.language;
  elements.title.textContent = currentContent.title;
  elements.intro.textContent = currentContent.intro;
  elements.languageLabel.textContent = text.languageLabel;
  elements.sourceCompareLabel.textContent = text.sourceCompare;
  elements.scoreLabel.textContent = text.scoreLabel;
  elements.selectedLabel.textContent = text.selectedCount;
  elements.reset.textContent = text.reset;
  elements.toggleChecked.textContent = elements.checkedList.hidden
    ? text.showChecked
    : text.hideChecked;
  elements.privacyNote.textContent = text.privacyNote;
}

async function setLanguage(code) {
  const language = manifest.languages.find((entry) => entry.code === code) || manifest.languages[0];
  currentContent = await readJson(`${testDir}/${language.file}`);
  elements.languageSelect.value = currentContent.language;
  renderText();
  renderItems();
  renderCheckedItems();
  updateMetrics();
}

async function init() {
  [manifest, uiStrings] = await Promise.all([
    readJson(`${testDir}/manifest.json`),
    readJson("./content/ui.json")
  ]);
  const sourceEntry = manifest.languages.find((language) => language.code === manifest.sourceLanguage);
  sourceContent = await readJson(`${testDir}/${sourceEntry.file}`);
  renderLanguageOptions();
  await setLanguage(navigator.language.split("-")[0]);
}

elements.languageSelect.addEventListener("change", (event) => {
  setLanguage(event.target.value);
});

elements.sourceCompare.addEventListener("change", renderItems);

elements.reset.addEventListener("click", () => {
  selectedIds = new Set();
  saveSelectedIds();
  renderItems();
  renderCheckedItems();
  updateMetrics();
});

elements.toggleChecked.addEventListener("click", () => {
  elements.checkedList.hidden = !elements.checkedList.hidden;
  renderText();
  renderCheckedItems();
});

init().catch((error) => {
  elements.statusPanel.hidden = false;
  elements.statusTitle.textContent = "Unable to load app content.";
  elements.statusBody.textContent = error.message;
});

