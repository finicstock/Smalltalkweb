const ALLOWED_TAGS = new Set([
  "a",
  "blockquote",
  "br",
  "code",
  "colgroup",
  "col",
  "div",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "iframe",
  "img",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const ALLOWED_ATTRS = new Set([
  "alt",
  "class",
  "colspan",
  "data-youtube-video",
  "download",
  "href",
  "id",
  "rel",
  "rowspan",
  "src",
  "style",
  "target",
  "title",
]);

const ALLOWED_STYLE_PROPS = new Set([
  "background",
  "background-color",
  "border",
  "border-bottom",
  "border-left",
  "border-radius",
  "border-top",
  "box-shadow",
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "letter-spacing",
  "line-height",
  "margin",
  "margin-left",
  "padding",
  "padding-left",
  "text-align",
]);

function isSafeUrl(value: string, tagName: string, attrName: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;

  try {
    const url = new URL(trimmed, window.location.origin);
    if (attrName === "src" && tagName === "img" && url.protocol === "data:") {
      return trimmed.startsWith("data:image/");
    }
    if (attrName === "src" && tagName === "iframe") {
      return /(^|\.)youtube(-nocookie)?\.com$/.test(url.hostname);
    }
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function sanitizeStyle(style: string) {
  return style
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const [property, ...valueParts] = rule.split(":");
      const propertyName = property?.trim().toLowerCase();
      const value = valueParts.join(":").trim();
      if (!propertyName || !value) return "";
      if (!ALLOWED_STYLE_PROPS.has(propertyName)) return "";
      if (/expression\s*\(|javascript:|url\s*\(/i.test(value)) return "";
      return `${propertyName}: ${value}`;
    })
    .filter(Boolean)
    .join("; ");
}

function sanitizeElement(element: Element) {
  const tagName = element.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    element.remove();
    return;
  }

  if (tagName === "iframe") {
    const src = element.getAttribute("src") ?? "";
    if (!isSafeUrl(src, tagName, "src")) {
      element.remove();
      return;
    }
  }

  Array.from(element.attributes).forEach((attr) => {
    const attrName = attr.name.toLowerCase();
    const attrValue = attr.value;

    if (attrName.startsWith("on") || !ALLOWED_ATTRS.has(attrName)) {
      element.removeAttribute(attr.name);
      return;
    }

    if ((attrName === "href" || attrName === "src") && !isSafeUrl(attrValue, tagName, attrName)) {
      element.removeAttribute(attr.name);
      return;
    }

    if (attrName === "style") {
      const safeStyle = sanitizeStyle(attrValue);
      if (safeStyle) {
        element.setAttribute("style", safeStyle);
      } else {
        element.removeAttribute("style");
      }
    }

    if (attrName === "target" && attrValue === "_blank") {
      element.setAttribute("rel", "noopener noreferrer");
    }
  });
}

export function sanitizeHtml(html: string) {
  if (!html || typeof document === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;

  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        sanitizeElement(child as Element);
      }

      if (child.isConnected || child.parentNode) {
        walk(child);
      }
    });
  };

  walk(template.content);
  return template.innerHTML;
}
