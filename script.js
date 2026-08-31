// ==================================================
// 基础配置与状态
// ==================================================

let openerPreview = null;
try {
  if (new URLSearchParams(window.location.search).get("preview") === "1" && window.opener?.FORHER_EDITOR_PREVIEW) {
    openerPreview = window.opener.FORHER_EDITOR_PREVIEW;
  }
} catch {
  openerPreview = null;
}
const CONTENT_DATA = openerPreview || window.CONTENT || {};
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
const LAYOUT_ALIASES = {
  "offset-left": "left",
  "offset-right": "right",
  "duo": "double"
};

const state = {
  started: false,
  letterOpened: false,
  chapter: 1,
  audio: null,
  audioWanted: false,
  audioAvailable: true,
  lightboxFocus: null,
  easterEggClicks: 0
};

const elements = {
  body: document.body,
  loader: document.querySelector("#pageLoader"),
  startButton: document.querySelector("#startButton"),
  timeline: document.querySelector("#memoryTimeline"),
  envelopeSection: document.querySelector("#envelopeSection"),
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
  musicControl: document.querySelector("#musicControl"),
  musicIcon: document.querySelector("#musicIcon"),
  lightbox: document.querySelector("#lightbox"),
  lightboxStage: document.querySelector("#lightboxStage"),
  lightboxCaption: document.querySelector("#lightboxCaption"),
  lightboxClose: document.querySelector("#lightboxClose"),
  debugPanel: document.querySelector("#debugPanel"),
  previousChapterButton: document.querySelector("#previousChapterButton"),
  nextChapterButton: document.querySelector("#nextChapterButton"),
  easterEggTrigger: document.querySelector("#easterEggTrigger"),
  easterEgg: document.querySelector("#easterEgg")
};

function setText(selector, value = "") {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function normalizeLayout(layout) {
  return LAYOUT_ALIASES[layout] || layout || "large";
}

function getTones(memory, secondary = false) {
  const fallback = secondary ? ["#89765e", "#403a31"] : ["#667064", "#2a302a"];
  const tones = secondary ? memory.secondaryTones : memory.tones;
  return Array.isArray(tones) && tones.length >= 2 ? tones : fallback;
}

// ==================================================
// 页面初始化
// ==================================================

function applyContent() {
  const opening = CONTENT_DATA.opening || {};
  const chapterOne = CONTENT_DATA.chapterOne || {};
  const chapterTwo = CONTENT_DATA.chapterTwo || {};
  const dateQuestion = CONTENT_DATA.dateQuestion || {};
  const confession = CONTENT_DATA.confession || {};
  const ending = CONTENT_DATA.ending || {};

  setText("#openingEyebrow", opening.eyebrow);
  setText("#introTitle", opening.title);
  setText("#openingSubtitle", opening.subtitle);
  setText("#startButtonText", opening.button || "开始阅读");
  setText("#openingHint", opening.hint);
  setText("#chapterOneTitle", chapterOne.title);
  setText("#chapterOneIntro", chapterOne.intro);
  setText("#chapterOneEndingPrimary", chapterOne.ending?.[0]);
  setText("#chapterOneEndingSecondary", chapterOne.ending?.[1]);
  setText("#envelopeLabel", chapterOne.envelopeLabel || "拆开这封信");
  elements.envelopeTrigger.setAttribute("aria-label", chapterOne.envelopeLabel || "拆开这封信");

  setText("#datePrelude", dateQuestion.prelude);
  setText("#dateQuestionTitle", dateQuestion.title);
  setText("#dateCorrectText", dateQuestion.correct);
  setText("#dateTransitionText", dateQuestion.transition);
  setText("#enterChapterTwoButton", dateQuestion.continueLabel || "继续");

  setText("#chapterTwoTitle", chapterTwo.title);
  setText("#chapterTwoIntro", chapterTwo.intro);
  setText("#confessionBefore", confession.before);
  setText("#confessionButtonText", confession.button || "继续");
  setText("#confessionFinal", confession.final);
  setText("#endingText", ending.text);
  setText("#continuedText", ending.continued || "TO BE CONTINUED...");

  renderMemories();
  renderLetter();
  renderImportantPhoto();
  renderEndingPhoto();
  populateDateSelectors();
  setupDebugPanel();
  setupEasterEgg();
  observeReveals();

  requestAnimationFrame(() => {
    elements.body.classList.remove("is-loading");
    elements.body.classList.add("is-ready");
    elements.loader.setAttribute("aria-hidden", "true");
  });
}

function createPlaceholder(label, tones, extraClass = "") {
  const placeholder = document.createElement("span");
  placeholder.className = `photo-placeholder ${extraClass}`.trim();
  placeholder.setAttribute("role", "img");
  placeholder.setAttribute("aria-label", label || "照片占位");
  placeholder.style.setProperty("--ph-a", tones[0]);
  placeholder.style.setProperty("--ph-b", tones[1]);
  const labelNode = document.createElement("span");
  labelNode.textContent = label || "[照片]";
  placeholder.append(labelNode);
  return placeholder;
}

function createImage(image, alt, fit, position, onError) {
  const img = document.createElement("img");
  img.src = image;
  img.alt = alt || "照片";
  img.loading = "lazy";
  img.decoding = "async";
  img.width = 1200;
  img.height = 1500;
  img.style.objectFit = fit === "contain" ? "contain" : "cover";
  img.style.objectPosition = position || "center";
  if (onError) img.addEventListener("error", onError, { once: true });
  return img;
}

function createMediaButton(memory, secondary = false) {
  const image = secondary ? memory.secondaryImage : memory.image;
  const tones = getTones(memory, secondary);
  const label = secondary ? `${memory.alt || "照片"}（第二张）` : (memory.alt || "照片");
  const button = document.createElement("button");
  button.type = "button";
  button.className = secondary ? "memory__visual memory__visual--secondary" : "memory__visual";
  button.setAttribute("aria-label", `查看大图：${label}`);

  if (image) {
    button.append(createImage(image, label, memory.fit, memory.position, event => {
      event.currentTarget.replaceWith(createPlaceholder(label, tones));
    }));
  } else {
    button.append(createPlaceholder(label, tones));
  }

  button.addEventListener("click", () => openLightbox({
    image,
    alt: label,
    caption: memory.caption,
    fit: memory.fit,
    position: memory.position,
    tones
  }));
  return button;
}

// ==================================================
// 第一章渲染
// ==================================================

function createMemoryText(memory, index) {
  const text = document.createElement("div");
  text.className = "memory__text";

  const meta = document.createElement("div");
  meta.className = "memory__meta";
  const frame = document.createElement("span");
  frame.className = "memory__frame";
  frame.textContent = `FRAME ${String(index + 1).padStart(2, "0")}`;
  const date = document.createElement("time");
  date.className = "memory__date";
  date.textContent = memory.date || "[日期]";
  const slash = document.createElement("span");
  slash.textContent = "/";
  slash.setAttribute("aria-hidden", "true");
  const location = document.createElement("span");
  location.className = "memory__location";
  location.textContent = memory.location || "[地点]";
  meta.append(frame, date, slash, location);

  const caption = document.createElement("p");
  caption.className = "memory__caption";
  caption.textContent = memory.caption || "[照片说明]";
  text.append(meta, caption);
  return text;
}

function renderMemories() {
  elements.timeline.replaceChildren();
  const memories = Array.isArray(CONTENT_DATA.memories) ? CONTENT_DATA.memories : [];
  setText("#memoryCountLabel", `${String(memories.length).padStart(2, "0")} FRAMES`);
  const fragment = document.createDocumentFragment();

  memories.forEach((memory, index) => {
    const layout = normalizeLayout(memory.layout);
    const article = document.createElement("article");
    article.className = `memory memory--${layout} reveal`;
    article.dataset.memoryId = memory.id || `memory-${index + 1}`;
    article.setAttribute("aria-label", `记忆 ${index + 1}`);
    if (memory.tilt) article.style.setProperty("--tilt", memory.tilt);

    const number = document.createElement("span");
    number.className = "memory__large-index";
    number.textContent = String(index + 1).padStart(2, "0");
    number.setAttribute("aria-hidden", "true");
    const text = createMemoryText(memory, index);
    const mainVisual = createMediaButton(memory);

    if (["left", "right"].includes(layout)) {
      article.append(number, mainVisual, text);
    } else if (layout === "double") {
      article.append(number, text, mainVisual, createMediaButton(memory, true));
    } else if (layout === "polaroid") {
      article.append(number, mainVisual, text);
    } else {
      article.append(number, text, mainVisual);
    }
    fragment.append(article);
  });
  elements.timeline.append(fragment);
}

function renderLetter() {
  const container = document.querySelector("#letterCopy");
  container.replaceChildren();
  const paragraphs = Array.isArray(CONTENT_DATA.letterParagraphs) ? CONTENT_DATA.letterParagraphs : [];
  const fragment = document.createDocumentFragment();

  paragraphs.forEach((paragraph, index) => {
    const block = document.createElement("section");
    block.className = "letter-paragraph reveal-letter";
    block.dataset.paragraphId = paragraph.id || `letter-${index + 1}`;
    const number = document.createElement("span");
    number.className = "letter-paragraph__index";
    number.textContent = String(index + 1).padStart(2, "0");
    const text = document.createElement("p");
    text.textContent = typeof paragraph === "string" ? paragraph : paragraph.text;
    block.append(number, text);
    fragment.append(block);
  });
  container.append(fragment);
}

function renderStandaloneMedia(button, data, placeholderLabel, tones) {
  button.replaceChildren();
  const image = data?.image || "";
  const alt = data?.alt || placeholderLabel;
  if (image) {
    button.append(createImage(image, alt, data.fit, data.position, event => {
      event.currentTarget.replaceWith(createPlaceholder(placeholderLabel, tones));
    }));
  } else {
    button.append(createPlaceholder(placeholderLabel, tones));
  }
  button.addEventListener("click", () => openLightbox({
    image,
    alt,
    caption: data?.caption || "",
    fit: data?.fit,
    position: data?.position,
    tones
  }));
}

function renderImportantPhoto() {
  const data = CONTENT_DATA.importantPhoto || {};
  renderStandaloneMedia(document.querySelector("#importantPhotoMedia"), data, "[重要照片]", ["#ded6c8", "#bdb3a2"]);
  setText("#importantPhotoCaption", data.caption);
}

function renderEndingPhoto() {
  const data = CONTENT_DATA.ending || {};
  const button = document.querySelector("#nextPhotoMedia");
  button.replaceChildren();
  const image = data.image || "";
  if (image) {
    button.append(createImage(image, data.alt, "cover", "center", event => {
      event.currentTarget.replaceWith(createPlaceholder(data.photoLabel || "NEXT PHOTO", ["#e8e2d7", "#d0c7b7"]));
    }));
  } else {
    const index = document.createElement("span");
    index.className = "next-photo__index";
    index.textContent = data.index || "NEXT / 01";
    const label = document.createElement("span");
    label.className = "next-photo__label";
    label.textContent = data.photoLabel || "NEXT PHOTO";
    button.append(index, label);
  }
  button.addEventListener("click", () => openLightbox({
    image,
    alt: data.alt || data.photoLabel,
    caption: data.text,
    fit: "cover",
    position: "center",
    tones: ["#e8e2d7", "#d0c7b7"]
  }));
}

function populateDateSelectors() {
  const configuredYear = Number(String(CONTENT_DATA.firstMeetDate || "2025-06-18").split("-")[0]);
  const currentYear = new Date().getFullYear();
  const startYear = Math.min(configuredYear - 3, currentYear - 5);
  const endYear = Math.max(configuredYear + 3, currentYear + 2);

  elements.yearSelect.replaceChildren();
  elements.monthSelect.replaceChildren();
  for (let year = startYear; year <= endYear; year += 1) elements.yearSelect.add(new Option(String(year), String(year)));
  for (let month = 1; month <= 12; month += 1) {
    const value = String(month).padStart(2, "0");
    elements.monthSelect.add(new Option(value, value));
  }
  elements.yearSelect.value = String(currentYear);
  elements.monthSelect.value = "01";
  updateDayOptions();
  elements.daySelect.value = "01";
}

function updateDayOptions() {
  const oldDay = elements.daySelect.value || "01";
  const year = Number(elements.yearSelect.value || new Date().getFullYear());
  const month = Number(elements.monthSelect.value || 1);
  const days = new Date(year, month, 0).getDate();
  elements.daySelect.replaceChildren();
  for (let day = 1; day <= days; day += 1) {
    const value = String(day).padStart(2, "0");
    elements.daySelect.add(new Option(value, value));
  }
  elements.daySelect.value = Number(oldDay) <= days ? oldDay : String(days).padStart(2, "0");
}

// ==================================================
// 滚动动画
// ==================================================

function observeReveals() {
  const items = document.querySelectorAll(".reveal, .reveal-letter");
  if (!("IntersectionObserver" in window) || REDUCED_MOTION.matches) {
    items.forEach(item => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, activeObserver) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        activeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6%" });
  items.forEach(item => observer.observe(item));
}

// ==================================================
// 图片查看
// ==================================================

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
  if (!elements.lightbox.classList.contains("is-open")) return;
  elements.lightbox.classList.remove("is-open");
  elements.lightbox.setAttribute("aria-hidden", "true");
  elements.body.classList.remove("lightbox-open");
  state.lightboxFocus?.focus?.();
}

// ==================================================
// 信封动画
// ==================================================

function startExperience() {
  if (state.started) return;
  state.started = true;
  state.audioWanted = true;
  elements.body.classList.add("is-started");
  window.scrollTo(0, 0);
  playTrack("chapterOne");
}

function openLetter() {
  if (state.letterOpened) return;
  if (!state.started) startExperience();
  state.letterOpened = true;
  elements.envelopeTrigger.classList.add("is-open");
  elements.envelopeTrigger.setAttribute("aria-expanded", "true");
  elements.letterStage.setAttribute("aria-hidden", "false");
  window.setTimeout(() => {
    elements.letterStage.classList.add("is-open");
    elements.yearSelect.focus({ preventScroll: true });
  }, REDUCED_MOTION.matches ? 0 : 380);
}

// ==================================================
// 日期验证
// ==================================================

function selectedDate() {
  return `${elements.yearSelect.value}-${elements.monthSelect.value}-${elements.daySelect.value}`;
}

function validateDate(event) {
  event.preventDefault();
  const value = selectedDate();
  if (value !== CONTENT_DATA.firstMeetDate) {
    elements.dateMessage.textContent = CONTENT_DATA.dateQuestion?.wrong || "好像不是这一天。再想想？";
    elements.daySelect.focus();
    return;
  }
  elements.dateMessage.textContent = "";
  elements.dateLetter.classList.add("is-success");
  elements.dateSuccessValue.textContent = value.split("-").join(" · ");
  window.setTimeout(() => elements.enterChapterTwoButton.focus(), REDUCED_MOTION.matches ? 0 : 450);
}

function fillCorrectDate() {
  const [year, month, day] = String(CONTENT_DATA.firstMeetDate).split("-");
  elements.yearSelect.value = year;
  elements.monthSelect.value = month;
  updateDayOptions();
  elements.daySelect.value = day;
}

// ==================================================
// 第一章 / 第二章切换
// ==================================================

function enterChapterTwo() {
  if (state.chapter === 2) return;
  state.chapter = 2;
  if (!state.started) startExperience();
  elements.body.classList.add("chapter-two-active");
  elements.chapterTwo.setAttribute("aria-hidden", "false");
  updateChapterNavigation();
  switchMusic("chapterTwo");
  window.setTimeout(() => {
    elements.chapterTwo.scrollIntoView({ behavior: REDUCED_MOTION.matches ? "auto" : "smooth", block: "start" });
    document.querySelectorAll("#chapterTwo .reveal-letter").forEach(item => item.classList.add("is-visible"));
  }, REDUCED_MOTION.matches ? 0 : 300);
}

function returnChapterOne() {
  if (state.chapter === 1) return;
  state.chapter = 1;
  state.letterOpened = false;
  elements.body.classList.remove("chapter-two-active");
  elements.chapterTwo.setAttribute("aria-hidden", "true");
  elements.letterStage.classList.remove("is-open");
  elements.letterStage.setAttribute("aria-hidden", "true");
  elements.envelopeTrigger.classList.remove("is-open");
  elements.envelopeTrigger.setAttribute("aria-expanded", "false");
  elements.dateLetter.classList.remove("is-success");
  elements.dateMessage.textContent = "";
  updateChapterNavigation();
  switchMusic("chapterOne");
  document.querySelector(".chapter-one").scrollIntoView({
    behavior: REDUCED_MOTION.matches ? "auto" : "smooth",
    block: "start"
  });
}

function revealConfession() {
  if (elements.confessionReveal.classList.contains("is-visible")) return;
  elements.confessionReveal.classList.add("is-visible");
  elements.continueButton.setAttribute("aria-expanded", "true");
  elements.continueButton.disabled = true;
  window.setTimeout(() => elements.confessionReveal.scrollIntoView({
    behavior: REDUCED_MOTION.matches ? "auto" : "smooth",
    block: "start"
  }), REDUCED_MOTION.matches ? 0 : 260);
}

// ==================================================
// 背景音乐
// ==================================================

function setMusicUi(playing) {
  elements.musicControl.setAttribute("aria-pressed", String(playing));
  elements.musicControl.setAttribute("aria-label", playing ? "暂停背景音乐" : "播放背景音乐");
  elements.musicIcon.textContent = playing ? "Ⅱ" : "♪";
}

function createAudio(source) {
  const audio = new Audio();
  audio.preload = "none";
  audio.loop = true;
  audio.volume = 0;
  audio.src = source;
  audio.addEventListener("error", () => {
    state.audioAvailable = false;
    state.audioWanted = false;
    elements.musicControl.classList.add("is-unavailable");
    setMusicUi(false);
  }, { once: true });
  return audio;
}

function fadeVolume(audio, target, duration = 900) {
  const start = audio.volume;
  const startedAt = performance.now();
  const tick = now => {
    const progress = Math.min((now - startedAt) / duration, 1);
    audio.volume = start + (target - start) * progress;
    if (progress < 1) requestAnimationFrame(tick);
    else if (target === 0) audio.pause();
  };
  requestAnimationFrame(tick);
}

async function playTrack(name) {
  const source = CONTENT_DATA.music?.[name];
  if (!source || !state.audioAvailable) return;
  const next = createAudio(source);
  const previous = state.audio;
  state.audio = next;
  try {
    await next.play();
    fadeVolume(next, 0.32);
    if (previous) fadeVolume(previous, 0);
    setMusicUi(true);
  } catch {
    state.audioAvailable = false;
    state.audioWanted = false;
    elements.musicControl.classList.add("is-unavailable");
    setMusicUi(false);
  }
}

function switchMusic(name) {
  if (state.audioWanted && state.audioAvailable) playTrack(name);
}

function toggleMusic() {
  if (!state.started) return;
  if (!state.audioAvailable) {
    state.audioAvailable = true;
    elements.musicControl.classList.remove("is-unavailable");
  }
  state.audioWanted = !state.audioWanted;
  if (state.audioWanted) {
    if (state.audio?.src) {
      state.audio.play().then(() => {
        fadeVolume(state.audio, 0.32);
        setMusicUi(true);
      }).catch(() => {
        state.audioAvailable = false;
        state.audioWanted = false;
        elements.musicControl.classList.add("is-unavailable");
      });
    } else {
      playTrack(state.chapter === 1 ? "chapterOne" : "chapterTwo");
    }
  } else if (state.audio) {
    fadeVolume(state.audio, 0, 420);
    setMusicUi(false);
  }
}

// ==================================================
// 开发模式章节导航
// ==================================================

function setupDebugPanel() {
  if (!CONTENT_DATA.debug || !elements.debugPanel) return;
  elements.debugPanel.classList.add("is-enabled");
  updateChapterNavigation();
}

function updateChapterNavigation() {
  if (!elements.previousChapterButton || !elements.nextChapterButton) return;
  elements.previousChapterButton.disabled = state.chapter === 1;
  elements.nextChapterButton.disabled = state.chapter === 2;
}

function setupEasterEgg() {
  if (!CONTENT_DATA.enableEasterEgg) {
    elements.easterEggTrigger.hidden = true;
    return;
  }
  elements.easterEggTrigger.hidden = false;
}

function handleEasterEgg() {
  if (!CONTENT_DATA.enableEasterEgg) return;
  state.easterEggClicks += 1;
  if (state.easterEggClicks >= (CONTENT_DATA.easterEgg?.clicks || 5)) {
    elements.easterEgg.textContent = CONTENT_DATA.easterEgg?.text || "[隐藏文字]";
    elements.easterEgg.classList.add("is-visible");
    state.easterEggClicks = 0;
  }
}

// ==================================================
// 事件绑定
// ==================================================

elements.startButton.addEventListener("click", startExperience);
elements.envelopeTrigger.addEventListener("click", openLetter);
elements.dateForm.addEventListener("submit", validateDate);
elements.yearSelect.addEventListener("change", updateDayOptions);
elements.monthSelect.addEventListener("change", updateDayOptions);
elements.enterChapterTwoButton.addEventListener("click", enterChapterTwo);
elements.continueButton.addEventListener("click", revealConfession);
elements.musicControl.addEventListener("click", toggleMusic);
elements.lightboxClose.addEventListener("click", closeLightbox);
elements.lightbox.addEventListener("click", event => {
  if (event.target === elements.lightbox) closeLightbox();
});
elements.previousChapterButton?.addEventListener("click", returnChapterOne);
elements.nextChapterButton?.addEventListener("click", enterChapterTwo);
elements.easterEggTrigger.addEventListener("click", handleEasterEgg);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeLightbox();
});

applyContent();
