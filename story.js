const CONTENT_DATA = window.CONTENT || {};
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
const state = { letterOpened: false, inLetter: false, lightboxFocus: null };
const elements = {
  body: document.body,
  loader: document.querySelector("#pageLoader"),
  storyTimeline: document.querySelector("#storyTimeline"),
  envelopeTrigger: document.querySelector("#envelopeTrigger"),
  letterStage: document.querySelector("#letterStage"),
  dateLetter: document.querySelector(".date-letter"),
  dateForm: document.querySelector("#dateForm"),
  dateMessage: document.querySelector("#dateMessage"),
  dateSuccessValue: document.querySelector("#dateSuccessValue"),
  yearSelect: document.querySelector("#yearSelect"),
  monthSelect: document.querySelector("#monthSelect"),
  daySelect: document.querySelector("#daySelect"),
  enterChapterTwoButton: document.querySelector("#enterChapterTwoButton"),
  chapterTwo: document.querySelector("#chapterTwo"),
  continueButton: document.querySelector("#continueButton"),
  confessionReveal: document.querySelector("#confessionReveal"),
  lightbox: document.querySelector("#lightbox"),
  lightboxStage: document.querySelector("#lightboxStage"),
  lightboxCaption: document.querySelector("#lightboxCaption"),
  lightboxClose: document.querySelector("#lightboxClose"),
  debugPanel: document.querySelector("#debugPanel"),
  previousChapterButton: document.querySelector("#previousChapterButton"),
  nextChapterButton: document.querySelector("#nextChapterButton")
};

function setText(selector, value = "") {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function createPlaceholder(label, tones = ["#d8c6b5", "#7e948e"], extraClass = "") {
  const placeholder = document.createElement("span");
  placeholder.className = `photo-placeholder ${extraClass}`.trim();
  placeholder.setAttribute("role", "img");
  placeholder.setAttribute("aria-label", label || "照片占位");
  placeholder.style.setProperty("--ph-a", tones[0]);
  placeholder.style.setProperty("--ph-b", tones[1]);
  const text = document.createElement("span");
  text.textContent = label || "[照片]";
  placeholder.append(text);
  return placeholder;
}

function createImage(image, alt, fit = "cover", position = "center", onError) {
  const img = document.createElement("img");
  img.src = image;
  img.alt = alt || "照片";
  img.loading = "lazy";
  img.decoding = "async";
  img.style.objectFit = fit;
  img.style.objectPosition = position;
  if (onError) img.addEventListener("error", onError, { once: true });
  return img;
}

function openLightbox(data) {
  state.lightboxFocus = document.activeElement;
  elements.lightboxStage.replaceChildren();
  if (data.image) {
    elements.lightboxStage.append(createImage(data.image, data.alt, data.fit, data.position, event => {
      event.currentTarget.replaceWith(createPlaceholder(data.alt, data.tones, "photo-placeholder--lightbox"));
    }));
  } else {
    elements.lightboxStage.append(createPlaceholder(data.alt, data.tones, "photo-placeholder--lightbox"));
  }
  elements.lightboxCaption.textContent = data.caption || "";
  elements.lightbox.classList.add("is-open");
  elements.lightbox.setAttribute("aria-hidden", "false");
  elements.body.classList.add("lightbox-open");
  elements.lightboxClose.focus();
}

function closeLightbox() {
  elements.lightbox.classList.remove("is-open");
  elements.lightbox.setAttribute("aria-hidden", "true");
  elements.body.classList.remove("lightbox-open");
  state.lightboxFocus?.focus?.();
}

function createStoryMedia(scene, secondary = false) {
  const image = secondary ? scene.secondaryImage : scene.image;
  const alt = secondary ? `${scene.alt || "故事照片"}（第二张）` : (scene.alt || "故事照片");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "story-scene__photo";
  button.setAttribute("aria-label", `查看大图：${alt}`);
  if (image) button.append(createImage(image, alt, scene.fit, scene.position, event => event.currentTarget.replaceWith(createPlaceholder(alt))));
  else button.append(createPlaceholder(alt));
  button.addEventListener("click", () => openLightbox({ image, alt, caption: scene.caption, fit: scene.fit, position: scene.position }));
  return button;
}

function createStorySpecial(scene) {
  if (scene.type === "text") return null;
  if (scene.type === "chat") {
    const chat = document.createElement("div");
    chat.className = "story-chat";
    (scene.messages || []).forEach(message => {
      const bubble = document.createElement("p");
      bubble.className = `story-chat__bubble story-chat__bubble--${message.side === "her" ? "her" : "me"}`;
      bubble.textContent = message.text;
      chat.append(bubble);
    });
    return chat;
  }
  if (scene.type === "checklist") {
    const list = document.createElement("ul");
    list.className = "story-checklist";
    (scene.items || []).forEach(item => { const row = document.createElement("li"); row.textContent = item; list.append(row); });
    return list;
  }
  if (scene.type === "quote") {
    const quote = document.createElement("blockquote");
    quote.className = "story-quote";
    quote.textContent = scene.title || "“是你吗？”";
    return quote;
  }
  if (scene.type === "note") {
    const note = document.createElement("p");
    note.className = "story-note";
    note.textContent = scene.note || "";
    return note;
  }
  if (scene.type === "gallery") {
    const gallery = document.createElement("div");
    gallery.className = "story-gallery";
    gallery.append(createStoryMedia(scene), createStoryMedia(scene, true));
    return gallery;
  }
  return createStoryMedia(scene);
}

function renderStoryScenes() {
  elements.storyTimeline.replaceChildren();
  const fragment = document.createDocumentFragment();
  (CONTENT_DATA.storyScenes || []).forEach((scene, index) => {
    const article = document.createElement("article");
    article.className = `story-scene story-scene--${scene.type || "photo"} reveal`;
    const number = document.createElement("span");
    number.className = "story-scene__index";
    number.textContent = String(index + 1).padStart(2, "0");
    const copy = document.createElement("div");
    copy.className = "story-scene__copy";
    const meta = document.createElement("p");
    meta.className = "story-scene__meta";
    meta.textContent = [scene.platform, scene.date, scene.location].filter(Boolean).join(" · ");
    const title = document.createElement("h3");
    title.textContent = scene.title || "";
    copy.append(meta, title);
    const caption = document.createElement("p");
    caption.className = "story-scene__caption";
    caption.textContent = scene.caption || "";
    const special = createStorySpecial(scene);
    article.append(number, copy);
    if (special) article.append(special);
    article.append(caption);
    fragment.append(article);
  });
  elements.storyTimeline.append(fragment);
}

function renderLetter() {
  const container = document.querySelector("#letterCopy");
  container.replaceChildren();
  (CONTENT_DATA.letterParagraphs || []).forEach((paragraph, index) => {
    const block = document.createElement("section");
    block.className = "letter-paragraph reveal-letter";
    const number = document.createElement("span");
    number.className = "letter-paragraph__index";
    number.textContent = String(index + 1).padStart(2, "0");
    const text = document.createElement("p");
    text.textContent = typeof paragraph === "string" ? paragraph : paragraph.text;
    block.append(number, text);
    container.append(block);
  });
}

function renderStandaloneMedia(button, data, fallback) {
  button.replaceChildren();
  if (data.image) button.append(createImage(data.image, data.alt, data.fit, data.position, event => event.currentTarget.replaceWith(createPlaceholder(fallback))));
  else button.append(createPlaceholder(fallback));
  button.addEventListener("click", () => openLightbox({ image: data.image, alt: data.alt, caption: data.caption, fit: data.fit, position: data.position }));
}

function renderEndingPhoto() {
  const data = CONTENT_DATA.ending || {};
  const button = document.querySelector("#nextPhotoMedia");
  button.replaceChildren();
  if (data.image) button.append(createImage(data.image, data.alt));
  else {
    const index = document.createElement("span"); index.className = "next-photo__index"; index.textContent = data.index || "NEXT FRAME";
    const label = document.createElement("span"); label.className = "next-photo__label"; label.textContent = data.photoLabel || "这张照片，我们还没有拍。";
    button.append(index, label);
  }
  button.addEventListener("click", () => openLightbox({ image: data.image, alt: data.alt, caption: data.text }));
}

function populateDateSelectors() {
  const configuredYear = Number(String(CONTENT_DATA.firstMeetDate).split("-")[0]);
  const currentYear = new Date().getFullYear();
  for (let year = Math.min(configuredYear - 3, currentYear - 5); year <= Math.max(configuredYear + 3, currentYear + 2); year += 1) elements.yearSelect.add(new Option(String(year), String(year)));
  for (let month = 1; month <= 12; month += 1) { const value = String(month).padStart(2, "0"); elements.monthSelect.add(new Option(value, value)); }
  elements.yearSelect.value = String(currentYear);
  elements.monthSelect.value = "01";
  updateDayOptions();
  elements.daySelect.value = "01";
}

function updateDayOptions() {
  const oldDay = elements.daySelect.value || "01";
  const days = new Date(Number(elements.yearSelect.value), Number(elements.monthSelect.value), 0).getDate();
  elements.daySelect.replaceChildren();
  for (let day = 1; day <= days; day += 1) { const value = String(day).padStart(2, "0"); elements.daySelect.add(new Option(value, value)); }
  elements.daySelect.value = Number(oldDay) <= days ? oldDay : String(days).padStart(2, "0");
}

function observeReveals() {
  const items = document.querySelectorAll(".reveal, .reveal-letter");
  if (!("IntersectionObserver" in window) || REDUCED_MOTION.matches) { items.forEach(item => item.classList.add("is-visible")); return; }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: .1, rootMargin: "0px 0px -5%" });
  items.forEach(item => observer.observe(item));
}

function openLetter() {
  if (state.letterOpened) return;
  state.letterOpened = true;
  elements.envelopeTrigger.classList.add("is-open");
  elements.envelopeTrigger.setAttribute("aria-expanded", "true");
  elements.letterStage.setAttribute("aria-hidden", "false");
  window.setTimeout(() => { elements.letterStage.classList.add("is-open"); elements.yearSelect.focus({ preventScroll: true }); }, REDUCED_MOTION.matches ? 0 : 380);
}

function validateDate(event) {
  event.preventDefault();
  const value = `${elements.yearSelect.value}-${elements.monthSelect.value}-${elements.daySelect.value}`;
  if (value !== CONTENT_DATA.firstMeetDate) { elements.dateMessage.textContent = CONTENT_DATA.dateQuestion?.wrong || "好像不是这一天。再想想？"; return; }
  elements.dateMessage.textContent = "";
  elements.dateLetter.classList.add("is-success");
  elements.dateSuccessValue.textContent = value.split("-").join(" · ");
}

function enterLetter() {
  state.inLetter = true;
  elements.body.classList.add("chapter-two-active");
  elements.chapterTwo.setAttribute("aria-hidden", "false");
  elements.nextChapterButton.disabled = true;
  window.setTimeout(() => {
    elements.chapterTwo.scrollIntoView({ behavior: REDUCED_MOTION.matches ? "auto" : "smooth", block: "start" });
    document.querySelectorAll("#chapterTwo .reveal-letter").forEach(item => item.classList.add("is-visible"));
  }, REDUCED_MOTION.matches ? 0 : 280);
}

function revealConfession() {
  elements.confessionReveal.classList.add("is-visible");
  elements.continueButton.setAttribute("aria-expanded", "true");
  elements.continueButton.disabled = true;
  window.setTimeout(() => elements.confessionReveal.scrollIntoView({ behavior: REDUCED_MOTION.matches ? "auto" : "smooth", block: "start" }), REDUCED_MOTION.matches ? 0 : 240);
}

function applyContent() {
  const story = CONTENT_DATA.storyChapter || {};
  const date = CONTENT_DATA.dateQuestion || {};
  const letter = CONTENT_DATA.chapterTwo || {};
  const confession = CONTENT_DATA.confession || {};
  const ending = CONTENT_DATA.ending || {};
  setText("#storyEyebrow", story.eyebrow);
  setText("#storyChapterTitle", story.title);
  setText("#storyChapterIntro", story.intro);
  setText("#datePrelude", date.prelude);
  setText("#dateQuestionTitle", date.title);
  setText("#dateCorrectText", date.correct);
  setText("#dateTransitionText", date.transition);
  setText("#enterChapterTwoButton", date.continueLabel || "打开这封信");
  setText("#chapterTwoTitle", letter.title);
  setText("#chapterTwoIntro", letter.intro);
  setText("#confessionBefore", confession.before);
  setText("#confessionButtonText", confession.button);
  setText("#confessionFinal", confession.final);
  setText("#endingText", ending.text);
  setText("#continuedText", ending.continued);
  renderStoryScenes();
  renderLetter();
  const importantPhoto = CONTENT_DATA.importantPhoto || {};
  const importantPhotoFigure = document.querySelector(".important-photo");
  if (importantPhoto.image) {
    importantPhotoFigure.hidden = false;
    renderStandaloneMedia(document.querySelector("#importantPhotoMedia"), importantPhoto, "[重要照片]");
    setText("#importantPhotoCaption", importantPhoto.caption);
  } else {
    importantPhotoFigure.hidden = true;
  }
  renderEndingPhoto();
  populateDateSelectors();
  observeReveals();
  if (CONTENT_DATA.debug) elements.debugPanel?.classList.add("is-enabled");
  requestAnimationFrame(() => { elements.body.classList.remove("is-loading"); elements.body.classList.add("is-ready"); elements.loader?.setAttribute("aria-hidden", "true"); });
}

elements.envelopeTrigger.addEventListener("click", openLetter);
elements.dateForm.addEventListener("submit", validateDate);
elements.yearSelect.addEventListener("change", updateDayOptions);
elements.monthSelect.addEventListener("change", updateDayOptions);
elements.enterChapterTwoButton.addEventListener("click", enterLetter);
elements.continueButton.addEventListener("click", revealConfession);
elements.previousChapterButton?.addEventListener("click", () => { if (state.inLetter) window.location.href = "./story.html"; else window.location.href = "./index.html"; });
elements.nextChapterButton?.addEventListener("click", openLetter);
elements.lightboxClose.addEventListener("click", closeLightbox);
elements.lightbox.addEventListener("click", event => { if (event.target === elements.lightbox) closeLightbox(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeLightbox(); });

applyContent();
