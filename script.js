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
const elements = {
  body: document.body,
  loader: document.querySelector("#pageLoader"),
  startButton: document.querySelector("#startButton"),
  timeline: document.querySelector("#memoryTimeline"),
  storyEntryButton: document.querySelector("#storyEntryButton"),
  nextChapterButton: document.querySelector("#nextChapterButton"),
  debugPanel: document.querySelector("#debugPanel"),
  lightbox: document.querySelector("#lightbox"),
  lightboxStage: document.querySelector("#lightboxStage"),
  lightboxCaption: document.querySelector("#lightboxCaption"),
  lightboxClose: document.querySelector("#lightboxClose")
};

function setText(selector, value = "") {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function createPlaceholder(label, tones = ["#d8c6b5", "#8fa7a0"], extraClass = "") {
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
}

function createMomentMedia(memory) {
  const tones = Array.isArray(memory.tones) ? memory.tones : ["#d8c6b5", "#8fa7a0"];
  const button = document.createElement("button");
  button.type = "button";
  button.className = "memory__visual moment-card__media";
  button.setAttribute("aria-label", `查看大图：${memory.alt || "朋友圈照片"}`);
  if (memory.image) {
    button.append(createImage(memory.image, memory.alt, memory.fit, memory.position, event => {
      event.currentTarget.replaceWith(createPlaceholder(memory.alt, tones));
    }));
  } else {
    button.append(createPlaceholder(memory.alt, tones));
  }
  button.addEventListener("click", () => openLightbox({
    image: memory.image,
    alt: memory.alt,
    caption: memory.caption,
    fit: memory.fit,
    position: memory.position,
    tones
  }));
  return button;
}

function renderMoments() {
  elements.timeline.replaceChildren();
  const memories = Array.isArray(CONTENT_DATA.memories) ? CONTENT_DATA.memories : [];
  setText("#memoryCountLabel", `${String(memories.length).padStart(2, "0")} MOMENTS`);
  const fragment = document.createDocumentFragment();
  memories.forEach((memory, index) => {
    const article = document.createElement("article");
    article.className = "memory moment-card reveal";
    article.setAttribute("aria-label", `朋友圈日常 ${index + 1}`);
    const avatar = document.createElement("span");
    avatar.className = "moment-card__avatar";
    avatar.textContent = "她";
    avatar.setAttribute("aria-hidden", "true");
    const body = document.createElement("div");
    body.className = "moment-card__body";
    const name = document.createElement("strong");
    name.className = "moment-card__name";
    name.textContent = "她的日常";
    const caption = document.createElement("p");
    caption.className = "moment-card__caption";
    caption.textContent = memory.caption || "[朋友圈原文]";
    const commentaryLabel = document.createElement("span");
    commentaryLabel.className = "moment-card__commentary-label";
    commentaryLabel.textContent = CONTENT_DATA.chapterOne?.commentaryLabel || "我的旁白";
    const title = document.createElement("h3");
    title.className = "moment-card__title";
    title.textContent = memory.title || "";
    const footer = document.createElement("div");
    footer.className = "moment-card__footer";
    const date = document.createElement("time");
    date.textContent = memory.date || "[朋友圈日期]";
    const location = document.createElement("span");
    location.textContent = memory.location || "";
    footer.append(date, location);
    body.append(name);
    if (memory.title) body.append(title);
    body.append(commentaryLabel, caption, createMomentMedia(memory), footer);
    article.append(avatar, body);
    fragment.append(article);
  });
  elements.timeline.append(fragment);
}

function observeReveals() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || REDUCED_MOTION.matches) {
    items.forEach(item => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .1, rootMargin: "0px 0px -5%" });
  items.forEach(item => observer.observe(item));
}

function startExperience() {
  elements.body.classList.add("is-started");
  window.scrollTo(0, 0);
}

function enterStory() {
  elements.body.classList.add("page-leaving");
  window.setTimeout(() => { window.location.href = "./story.html"; }, REDUCED_MOTION.matches ? 0 : 480);
}

function applyContent() {
  const opening = CONTENT_DATA.opening || {};
  const chapter = CONTENT_DATA.chapterOne || {};
  setText("#openingEyebrow", opening.eyebrow);
  setText("#introTitle", opening.title);
  setText("#openingSubtitle", opening.subtitle);
  setText("#startButtonText", opening.button || "开始");
  setText("#openingHint", opening.hint);
  setText("#chapterOneTitle", chapter.title);
  setText("#chapterOneIntro", chapter.intro);
  setText("#chapterOneEndingPrimary", chapter.ending?.[0]);
  setText("#chapterOneEndingSecondary", chapter.ending?.[1]);
  setText("#chapterOneClosingNote", chapter.closingNote);
  setText("#chapterOneEndingQuestion", chapter.endingQuestion);
  setText("#storyButtonText", chapter.storyButton || "继续，看看后来");
  renderMoments();
  observeReveals();
  if (CONTENT_DATA.debug) elements.debugPanel?.classList.add("is-enabled");
  requestAnimationFrame(() => {
    elements.body.classList.remove("is-loading");
    elements.body.classList.add("is-ready");
    elements.loader?.setAttribute("aria-hidden", "true");
  });
}

elements.startButton.addEventListener("click", startExperience);
elements.storyEntryButton.addEventListener("click", enterStory);
elements.nextChapterButton?.addEventListener("click", enterStory);
elements.lightboxClose.addEventListener("click", closeLightbox);
elements.lightbox.addEventListener("click", event => { if (event.target === elements.lightbox) closeLightbox(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeLightbox(); });

applyContent();
