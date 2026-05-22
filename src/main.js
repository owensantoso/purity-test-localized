const testDir = "./content/tests/rice-classic";
const contentVersion = "20260523-bengali-language";
const stateKey = "purity-test-localized:selected-ids";
const submittedKey = "purity-test-localized:submitted";
const checkedListVisibleKey = "purity-test-localized:checked-list-visible";

const elements = {
  title: document.querySelector("#title"),
  languageLabel: document.querySelector("#language-label"),
  languageSelect: document.querySelector("#language-select"),
  sourceCompare: document.querySelector("#source-compare"),
  sourceCompareLabel: document.querySelector("#source-compare-label"),
  scoreLabel: document.querySelector("#score-label"),
  score: document.querySelector("#score"),
  selectedLabel: document.querySelector("#selected-label"),
  selectedCount: document.querySelector("#selected-count"),
  submit: document.querySelector("#submit"),
  reset: document.querySelector("#reset"),
  resultPanel: document.querySelector("#result-panel"),
  resultLabel: document.querySelector("#result-label"),
  finalScore: document.querySelector("#final-score"),
  resultBody: document.querySelector("#result-body"),
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
let submitted = localStorage.getItem(submittedKey) === "true";
let checkedListVisible = localStorage.getItem(checkedListVisibleKey) === "true";

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

function saveCheckedListVisible() {
  localStorage.setItem(checkedListVisibleKey, String(checkedListVisible));
}

async function readJson(url) {
  const response = await fetch(`${url}?v=${contentVersion}`);
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
  renderResult();
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

    const main = document.createElement("div");
    main.className = "item-main";
    main.append(label);

    if (item.help) {
      const helpId = `item-${item.id}-help`;
      const helpButton = document.createElement("button");
      helpButton.type = "button";
      helpButton.className = "help-button";
      helpButton.textContent = "?";
      helpButton.setAttribute("aria-expanded", "false");
      helpButton.setAttribute("aria-controls", helpId);
      helpButton.setAttribute("aria-label", strings().explainItem);

      const helpText = document.createElement("p");
      helpText.id = helpId;
      helpText.className = "item-help";
      helpText.hidden = true;
      helpText.textContent = item.help;

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

function renderCheckedItems() {
  elements.checkedList.replaceChildren();
  elements.checkedList.hidden = !checkedListVisible;

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
  document.documentElement.lang = currentContent.language;
  elements.title.textContent = currentContent.title;
  elements.languageLabel.textContent = text.languageLabel;
  elements.sourceCompareLabel.textContent = text.sourceCompare;
  elements.scoreLabel.textContent = text.scoreLabel;
  elements.selectedLabel.textContent = text.selectedCount;
  elements.submit.textContent = text.submit;
  elements.reset.textContent = text.reset;
  elements.resultLabel.textContent = text.resultLabel;
  elements.resultBody.textContent = text.resultBody;
  elements.toggleChecked.textContent = !checkedListVisible
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
  elements.sourceCompare.checked = true;
  await setLanguage(navigator.language.split("-")[0]);
}

elements.languageSelect.addEventListener("change", (event) => {
  setLanguage(event.target.value);
});

elements.sourceCompare.addEventListener("change", renderItems);

elements.submit.addEventListener("click", () => {
  submitted = true;
  checkedListVisible = true;
  saveSubmitted();
  saveCheckedListVisible();
  renderText();
  renderCheckedItems();
  updateMetrics();
  elements.resultPanel.scrollIntoView({ block: "nearest", behavior: "smooth" });
});

elements.reset.addEventListener("click", () => {
  selectedIds = new Set();
  submitted = false;
  checkedListVisible = false;
  saveSelectedIds();
  saveSubmitted();
  saveCheckedListVisible();
  renderText();
  renderItems();
  renderCheckedItems();
  updateMetrics();
});

elements.toggleChecked.addEventListener("click", () => {
  checkedListVisible = !checkedListVisible;
  saveCheckedListVisible();
  renderText();
  renderCheckedItems();
});

init().catch((error) => {
  elements.statusPanel.hidden = false;
  elements.statusTitle.textContent = "Unable to load app content.";
  elements.statusBody.textContent = error.message;
});
