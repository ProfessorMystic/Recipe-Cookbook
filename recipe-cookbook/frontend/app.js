// ---------- Configuration ----------

// Base URL of your API. If you changed the port or host, update here.
// When running locally with Uvicorn defaults, this is fine:
const API = "http://127.0.0.1:8000";

// ---------- DOM references (we grab elements once and reuse them) ----------

const form = document.getElementById("recipe-form");      // the "Add Recipe" form
const list = document.getElementById("list");             // <ul> where recipes render
const searchInput = document.getElementById("search");    // search text box
const searchBtn = document.getElementById("searchBtn");   // "Search" button
const clearBtn = document.getElementById("clearBtn");     // "Clear" button
const statusBox = document.getElementById("status");      // message area (success/errors)

// ---------- Small helpers for UX ----------

/**
 * showStatus - display a temporary notice to the user
 * @param {"ok"|"err"} kind   visual style: green for ok, red for error
 * @param {string} msg        message text
 */
function showStatus(kind, msg) {
  statusBox.className = `status show ${kind}`; // apply classes
  statusBox.textContent = msg;                 // set text
  // auto-hide after 2.5s
  setTimeout(() => {
    statusBox.className = "status";
    statusBox.textContent = "";
  }, 2500);
}

/**
 * safeText - escape HTML to avoid accidental HTML injection in titles, etc.
 * @param {string} s
 * @returns {string}
 */
function safeText(s) {
  return s.replace(/[&<>"']/g, (ch) => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]
  ));
}

// ---------- Core data fetching functions ----------

/**
 * fetchRecipes - get the list of recipes (optionally filtered by q)
 * @param {string} q  optional search string for title
 */
async function fetchRecipes(q = "") {
  // Build URL with optional query parameter
  const url = q ? `${API}/recipes?q=${encodeURIComponent(q)}` : `${API}/recipes`;

  try {
    const res = await fetch(url);      // GET request
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();     // parse JSON response
    render(data);                      // render <li> items
  } catch (err) {
    console.error("Failed to fetch recipes:", err);
    showStatus("err", "Could not load recipes. Is the API running?");
  }
}

/**
 * createRecipe - POST a new recipe to the API
 * @param {{title:string, ingredients:string, instructions:string}} payload
 */
async function createRecipe(payload) {
  try {
    const res = await fetch(`${API}/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // tell server we're sending JSON
      body: JSON.stringify(payload)                    // convert object -> JSON string
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const created = await res.json();
    showStatus("ok", `Added "${created.title}".`);
    return created;
  } catch (err) {
    console.error("Failed to create recipe:", err);
    showStatus("err", "Failed to add recipe.");
    return null;
  }
}

/**
 * updateRecipe - PATCH specific fields of a recipe
 * @param {number} id
 * @param {Partial<{title:string, ingredients:string, instructions:string}>} payload
 */
async function updateRecipe(id, payload) {
  try {
    const res = await fetch(`${API}/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const updated = await res.json();
    showStatus("ok", `Updated "${updated.title}".`);
    return updated;
  } catch (err) {
    console.error("Failed to update recipe:", err);
    showStatus("err", "Failed to update recipe.");
    return null;
  }
}

/**
 * deleteRecipe - DELETE a recipe by ID
 * @param {number} id
 */
async function deleteRecipe(id) {
  try {
    const res = await fetch(`${API}/recipes/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    showStatus("ok", "Deleted recipe.");
    return true;
  } catch (err) {
    console.error("Failed to delete recipe:", err);
    showStatus("err", "Failed to delete recipe.");
    return false;
  }
}

// ---------- Rendering (turn JSON -> HTML) ----------

/**
 * render - build the list UI from an array of recipe objects
 * @param {Array<{id:number,title:string,ingredients:string,instructions:string}>} recipes
 */
function render(recipes) {
  // Clear the list first
  list.innerHTML = "";

  // Handle empty state
  if (!recipes || recipes.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No recipes (yet). Add one above!";
    list.appendChild(empty);
    return;
  }

  // Build one <li> per recipe
  for (const r of recipes) {
    // Create the list item container
    const li = document.createElement("li");

    // Build inner markup using escaped text (safeText)
    li.innerHTML = `
      <h3>${safeText(r.title)}</h3>
      <div class="meta"><strong>Ingredients:</strong>\n${safeText(r.ingredients)}</div>
      <div class="meta"><strong>Instructions:</strong>\n${safeText(r.instructions)}</div>
      <div class="actions">
        <!-- data-id attributes let us know which recipe the buttons refer to -->
        <button data-id="${r.id}" class="edit neutral">Edit</button>
        <button data-id="${r.id}" class="delete danger">Delete</button>
      </div>
    `;

    // Attach event handlers to the buttons inside each <li>
    li.querySelector(".delete").addEventListener("click", async () => {
      // Confirm before deleting (simple modal)
      const yes = confirm(`Delete "${r.title}"?`);
      if (!yes) return;
      const ok = await deleteRecipe(r.id);
      if (ok) await fetchRecipes(searchInput.value.trim());
    });

    li.querySelector(".edit").addEventListener("click", async () => {
      // Very simple "edit" UX using prompt() for now.
      // You can later replace this with a nicer modal or inline form.
      const title = prompt("New title (leave blank to keep)", r.title);
      const ingredients = prompt("New ingredients (leave blank to keep)", r.ingredients);
      const instructions = prompt("New instructions (leave blank to keep)", r.instructions);

      // Build payload only with fields the user actually changed / provided
      const payload = {};
      if (title !== null && title !== "" && title !== r.title) payload.title = title;
      if (ingredients !== null && ingredients !== "" && ingredients !== r.ingredients) payload.ingredients = ingredients;
      if (instructions !== null && instructions !== "" && instructions !== r.instructions) payload.instructions = instructions;

      // If nothing changed, do nothing
      if (Object.keys(payload).length === 0) return;

      const updated = await updateRecipe(r.id, payload);
      if (updated) await fetchRecipes(searchInput.value.trim());
    });

    // Append the ready-made <li> into the <ul>
    list.appendChild(li);
  }
}

// ---------- Event listeners (form submit, search, clear) ----------

// Handle form submit to add a recipe
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // prevent page reload

  // Read values from inputs
  const title = document.getElementById("title").value.trim();
  const ingredients = document.getElementById("ingredients").value.trim();
  const instructions = document.getElementById("instructions").value.trim();

  // Simple validation: ensure not empty
  if (!title || !ingredients || !instructions) {
    showStatus("err", "Please fill out all fields.");
    return;
  }

  // Call the API to create the recipe
  const created = await createRecipe({ title, ingredients, instructions });
  if (!created) return;

  // Reset the form and refresh the list
  form.reset();
  await fetchRecipes(searchInput.value.trim());
});

// Run a search
searchBtn.addEventListener("click", () => {
  fetchRecipes(searchInput.value.trim());
});

// Clear the search and show all recipes
clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  fetchRecipes();
});

// On initial page load, fetch all recipes
fetchRecipes();
