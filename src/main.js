const slider = document.querySelector("#slider");
const cards = slider ? [...slider.children] : [];
const previous = document.querySelector("#previous");
const next = document.querySelector("#next");
const counter = document.querySelector("#active-slide");
let active = 0;

function updateControls() {
  if (counter) counter.textContent = String(active + 1).padStart(2, "0");
  if (previous) previous.disabled = active === 0;
  if (next) next.disabled = active === cards.length - 1;
}

function move(direction) {
  active = Math.min(Math.max(active + direction, 0), cards.length - 1);
  cards[active]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  updateControls();
}

previous?.addEventListener("click", () => move(-1));
next?.addEventListener("click", () => move(1));
slider?.addEventListener("scroll", () => {
  const center = slider.scrollLeft + slider.clientWidth / 2;
  active = cards.reduce((best, card, index) => {
    const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
    return distance < best.distance ? { index, distance } : best;
  }, { index: 0, distance: Infinity }).index;
  updateControls();
});

function chooseService(id) {
  const select = document.querySelector("#service-select");
  if (select) select.value = id;
  document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
}

document.querySelectorAll("[data-service]").forEach((button) => button.addEventListener("click", () => chooseService(button.dataset.service)));

const localityInput = document.querySelector("#locality-input");
const localitySuggestions = document.querySelector("#locality-suggestions");
let postcodePlaces = [];
let visiblePlaces = [];
let selectedPlace = -1;

function normalizePlace(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

async function loadPostcodes() {
  if (postcodePlaces.length) return postcodePlaces;
  const response = await fetch("/assets/postcodes.json");
  if (!response.ok) throw new Error("Postcode list could not be loaded.");
  postcodePlaces = (await response.json()).places ?? [];
  return postcodePlaces;
}

function closeLocalitySuggestions() {
  visiblePlaces = [];
  selectedPlace = -1;
  localitySuggestions?.replaceChildren();
  if (localitySuggestions) localitySuggestions.hidden = true;
  localityInput?.setAttribute("aria-expanded", "false");
  localityInput?.removeAttribute("aria-activedescendant");
}

function selectLocality(place) {
  if (localityInput) localityInput.value = place;
  closeLocalitySuggestions();
}

function highlightLocality(index) {
  if (!localitySuggestions || !visiblePlaces.length) return;
  selectedPlace = (index + visiblePlaces.length) % visiblePlaces.length;
  [...localitySuggestions.children].forEach((item, itemIndex) => item.setAttribute("aria-selected", String(itemIndex === selectedPlace)));
  const active = localitySuggestions.children[selectedPlace];
  localityInput?.setAttribute("aria-activedescendant", active.id);
  active.scrollIntoView({ block: "nearest" });
}

function renderLocalitySuggestions(places) {
  if (!localitySuggestions || !localityInput) return;
  visiblePlaces = places;
  selectedPlace = -1;
  localitySuggestions.replaceChildren(...places.map((place, index) => {
    const item = document.createElement("li");
    item.id = `locality-option-${index}`;
    item.role = "option";
    item.textContent = place;
    item.setAttribute("aria-selected", "false");
    item.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      selectLocality(place);
    });
    return item;
  }));
  localitySuggestions.hidden = places.length === 0;
  localityInput.setAttribute("aria-expanded", String(places.length > 0));
}

localityInput?.addEventListener("input", async () => {
  const query = normalizePlace(localityInput.value.trim());
  if (query.length < 2) return closeLocalitySuggestions();

  try {
    const places = await loadPostcodes();
    const matches = places
      .map((place) => ({ place, normalized: normalizePlace(place) }))
      .filter(({ normalized }) => normalized.startsWith(query) || normalized.slice(5).startsWith(query))
      .slice(0, 8)
      .map(({ place }) => place);
    renderLocalitySuggestions(matches);
  } catch {
    closeLocalitySuggestions();
  }
});

localityInput?.addEventListener("keydown", (event) => {
  if (!visiblePlaces.length) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightLocality(selectedPlace + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightLocality(selectedPlace - 1);
  } else if (event.key === "Enter" && selectedPlace >= 0) {
    event.preventDefault();
    selectLocality(visiblePlaces[selectedPlace]);
  } else if (event.key === "Escape") {
    closeLocalitySuggestions();
  }
});

localityInput?.addEventListener("blur", () => setTimeout(closeLocalitySuggestions, 100));

document.querySelector("#contact-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const status = form.querySelector("#form-status");
  const data = new FormData(form);
  const selected = form.querySelector("#service-select")?.selectedOptions[0]?.textContent ?? "";
  data.set("service", selected);

  if (submit) submit.disabled = true;
  form.setAttribute("aria-busy", "true");
  if (status) {
    status.className = "form-status wide is-pending";
    status.textContent = form.dataset.sending ?? "";
  }

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Form submission failed.");
    form.reset();
    closeLocalitySuggestions();
    if (status) {
      status.className = "form-status wide is-success";
      status.textContent = form.dataset.success ?? "";
    }
  } catch {
    if (status) {
      status.className = "form-status wide is-error";
      status.textContent = form.dataset.error ?? "";
    }
  } finally {
    if (submit) submit.disabled = false;
    form.removeAttribute("aria-busy");
  }
});

updateControls();
