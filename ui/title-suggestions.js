(() => {
  const TITLE_SUGGESTION_LIST_ID = "snipaze-title-suggestions";

  function getMatches(notes, query, excludeId) {
    const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
    return (Array.isArray(notes) ? notes : [])
      .filter(
        (note) =>
          note?.id !== excludeId &&
          (!normalizedQuery ||
            String(note?.title || "")
              .toLocaleLowerCase()
              .includes(normalizedQuery)),
      )
      .slice(0, 8);
  }

  function createTitleButton(note, onChoose) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.suggestedTitle = note?.title || "Untitled note";

    const title = document.createElement("span");
    title.textContent = note?.title || "Untitled note";

    const category = document.createElement("small");
    category.textContent = note?.category || "Uncategorized";

    button.append(title, category);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onChoose(button.dataset.suggestedTitle || "");
    });
    return button;
  }

  function refresh(input, options = {}) {
    if (!input) return;
    const notes = options.notes || [];
    const excludeId = options.excludeId || "";
    const localSuggestions = input
      .closest("[data-title-entry]")
      ?.querySelector("[data-title-suggestions]");

    if (input.dataset.dismissTitleSuggestions === "true") {
      if (localSuggestions) localSuggestions.hidden = true;
      return;
    }

    const matches = getMatches(notes, input.value, excludeId);
    if (localSuggestions) {
      input.removeAttribute("list");
      localSuggestions.replaceChildren(
        ...matches.map((note) =>
          createTitleButton(note, (title) => {
            input.value = title;
            input.setSelectionRange?.(input.value.length, input.value.length);
            localSuggestions.replaceChildren();
            localSuggestions.hidden = true;
          }),
        ),
      );
      localSuggestions.hidden = !matches.length;
      return;
    }

    let list = document.getElementById(TITLE_SUGGESTION_LIST_ID);
    if (!list) {
      list = document.createElement("datalist");
      list.id = TITLE_SUGGESTION_LIST_ID;
      list.dataset.snipazeTitleSuggestions = "";
      document.documentElement.append(list);
    }

    input.setAttribute("list", list.id);
    list.replaceChildren(
      ...matches.map((note) => {
        const option = document.createElement("option");
        option.value = note?.title || "Untitled note";
        option.label = note?.category || "Uncategorized";
        option.textContent = `${note?.title || "Untitled note"} - ${note?.category || "Uncategorized"}`;
        return option;
      }),
    );
  }

  function attach(input, options = {}) {
    if (!input) return;
    input.removeAttribute("list");

    const box = document.createElement("div");
    box.className = "snipaze-picker-title-suggestions";
    box.hidden = true;
    box.style.display = "none";
    input.insertAdjacentElement("afterend", box);

    const render = () => {
      const notes = typeof options.getNotes === "function" ? options.getNotes() : options.notes || [];
      const matches = getMatches(notes, input.value, options.excludeId || "");
      box.replaceChildren(
        ...matches.map((note) => {
          const button = createTitleButton(note, (title) => {
            input.value = title;
            input.setSelectionRange?.(input.value.length, input.value.length);
            box.replaceChildren();
            box.hidden = true;
            box.style.display = "none";
          });
          button.className = "snipaze-picker-title-suggestion";
          button.querySelector("small")?.classList.add("snipaze-picker-title-suggestion-category");
          return button;
        }),
      );
      box.hidden = !matches.length;
      box.style.display = matches.length ? "grid" : "none";
    };

    input.addEventListener("focus", render);
    input.addEventListener("input", render);
    input.addEventListener("blur", () =>
      setTimeout(() => {
        box.hidden = true;
        box.style.display = "none";
      }, 0),
    );
  }

  globalThis.SnipazeTitleSuggestions = { refresh, attach };
})();
