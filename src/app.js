(function () {
  "use strict";

  const elements = {
    input: document.getElementById("code-input"),
    language: document.getElementById("language-select"),
    theme: document.getElementById("theme-select"),
    themeLink: document.getElementById("highlight-theme"),
    fontSize: document.getElementById("font-size-select"),
    lineNumbers: document.getElementById("line-numbers-toggle"),
    sample: document.getElementById("sample-button"),
    clear: document.getElementById("clear-button"),
    copy: document.getElementById("copy-button"),
    download: document.getElementById("download-button"),
    preview: document.getElementById("preview"),
    status: document.getElementById("status")
  };

  const samples = {
    python: `def quick_sort(items):
    if len(items) <= 1:
        return items

    pivot = items[0]
    left = [x for x in items[1:] if x <= pivot]
    right = [x for x in items[1:] if x > pivot]
    return quick_sort(left) + [pivot] + quick_sort(right)

print(quick_sort([7, 2, 9, 4, 1]))`,
    javascript: `function groupBy(items, key) {
  return items.reduce((result, item) => {
    const value = item[key];
    result[value] ||= [];
    result[value].push(item);
    return result;
  }, {});
}`,
    bash: `#!/usr/bin/env bash
set -euo pipefail

for file in "$@"; do
  printf 'Processing %s\\n' "$file"
done`
  };

  let showLineNumbers = true;

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getHighlightedHtml(code, language) {
    if (!code) {
      return "";
    }

    if (language === "plaintext" || !window.hljs) {
      return escapeHtml(code);
    }

    if (hljs.getLanguage(language)) {
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    }

    return hljs.highlightAuto(code).value;
  }

  function splitHighlightedLines(highlightedHtml) {
    const lines = highlightedHtml.split(/\r\n|\r|\n/);
    return lines.length ? lines : [""];
  }

  function preserveHtmlWhitespace(html) {
    let output = "";
    let inTag = false;

    for (const character of html) {
      if (character === "<") {
        inTag = true;
        output += character;
      } else if (character === ">") {
        inTag = false;
        output += character;
      } else if (!inTag && character === " ") {
        output += "&nbsp;";
      } else if (!inTag && character === "\t") {
        output += "&nbsp;&nbsp;&nbsp;&nbsp;";
      } else {
        output += character;
      }
    }

    return output;
  }

  function buildPreviewHtml() {
    const code = elements.input.value.replace(/\r\n/g, "\n");
    const highlighted = getHighlightedHtml(code, elements.language.value);
    const lines = splitHighlightedLines(highlighted);
    const rowHtml = lines.map((line, index) => {
      const content = preserveHtmlWhitespace(line) || "&nbsp;";
      return `<tr><td class="line-number">${index + 1}</td><td class="code-line"><code>${content}</code></td></tr>`;
    }).join("");

    return `<table class="code-table" style="--code-font-size: ${elements.fontSize.value};"><tbody>${rowHtml}</tbody></table>`;
  }

  function render() {
    elements.preview.innerHTML = buildPreviewHtml();
    elements.preview.classList.toggle("no-line-numbers", !showLineNumbers);
  }

  function setStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = type ? `status ${type}` : "status";
  }

  function applyTheme() {
    const dark = elements.theme.value === "dark";
    document.body.classList.toggle("dark", dark);
    elements.themeLink.href = dark ? "vendor/github-dark.min.css" : "vendor/github.min.css";
    render();
  }

  function inlineStylesForCopy(root) {
    const dark = elements.theme.value === "dark";
    const table = root.querySelector(".code-table");
    const lineNumbers = root.querySelectorAll(".line-number");
    const codeLines = root.querySelectorAll(".code-line");

    if (table) {
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.tableLayout = "fixed";
      table.style.border = "1px solid #d7dde5";
      table.style.backgroundColor = dark ? "#0d1117" : "#ffffff";
      table.style.color = dark ? "#c9d1d9" : "#24292e";
      table.style.fontFamily = 'Consolas, "Courier New", monospace';
      table.style.fontSize = elements.fontSize.value;
      table.style.lineHeight = "1.45";
    }

    lineNumbers.forEach((cell) => {
      if (!showLineNumbers) {
        cell.remove();
        return;
      }
      cell.style.width = "46px";
      cell.style.padding = "0 8px";
      cell.style.textAlign = "right";
      cell.style.color = dark ? "#8b949e" : "#667085";
      cell.style.backgroundColor = dark ? "#161b22" : "#f1f3f5";
      cell.style.borderRight = "2px solid #b7d7a8";
      cell.style.verticalAlign = "top";
    });

    codeLines.forEach((cell) => {
      cell.style.padding = showLineNumbers ? "0 12px" : "0 14px";
      cell.style.whiteSpace = "pre";
      cell.style.verticalAlign = "top";
    });

    root.querySelectorAll("code, span").forEach((node) => {
      node.style.fontFamily = 'Consolas, "Courier New", monospace';
      node.style.whiteSpace = "pre";
    });
  }

  function copyTokenStyles(sourceRoot, cloneRoot) {
    const sourceTokens = sourceRoot.querySelectorAll("span");
    const cloneTokens = cloneRoot.querySelectorAll("span");

    cloneTokens.forEach((token, index) => {
      const source = sourceTokens[index];
      if (!source) {
        return;
      }

      const style = window.getComputedStyle(source);
      token.style.color = style.color;
      token.style.fontWeight = style.fontWeight;
      token.style.fontStyle = style.fontStyle;
      if (style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)") {
        token.style.backgroundColor = style.backgroundColor;
      }
    });
  }

  function getCopyHtml() {
    const wrapper = elements.preview.cloneNode(true);
    copyTokenStyles(elements.preview, wrapper);
    inlineStylesForCopy(wrapper);
    return `<meta charset="utf-8">${wrapper.innerHTML}`;
  }

  async function copyRichText() {
    const html = getCopyHtml();
    const text = elements.input.value;

    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" })
      });
      await navigator.clipboard.write([item]);
      return;
    }

    const temp = document.createElement("div");
    temp.contentEditable = "true";
    temp.style.position = "fixed";
    temp.style.left = "-9999px";
    temp.innerHTML = html;
    document.body.appendChild(temp);

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(temp);
    selection.removeAllRanges();
    selection.addRange(range);
    const copied = document.execCommand("copy");
    selection.removeAllRanges();
    temp.remove();

    if (!copied) {
      throw new Error("copy command failed");
    }
  }

  function downloadHtml() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Highlighted Code</title></head><body>${getCopyHtml()}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "highlighted-code.html";
    link.click();
    URL.revokeObjectURL(url);
  }

  function attachEvents() {
    elements.input.addEventListener("input", render);
    elements.language.addEventListener("change", render);
    elements.fontSize.addEventListener("change", render);
    elements.theme.addEventListener("change", applyTheme);

    elements.lineNumbers.addEventListener("click", () => {
      showLineNumbers = !showLineNumbers;
      elements.lineNumbers.setAttribute("aria-pressed", String(showLineNumbers));
      render();
    });

    elements.sample.addEventListener("click", () => {
      elements.input.value = samples[elements.language.value] || samples.python;
      render();
    });

    elements.clear.addEventListener("click", () => {
      elements.input.value = "";
      render();
      setStatus("");
    });

    elements.copy.addEventListener("click", async () => {
      try {
        await copyRichText();
        setStatus("已复制。粘贴到 WPS/LibreOffice 时请选择保留源格式。", "success");
      } catch (error) {
        console.error(error);
        setStatus("复制失败，可使用“导出 HTML”作为备用。", "error");
      }
    });

    elements.download.addEventListener("click", downloadHtml);
  }

  function init() {
    elements.input.value = samples.python;
    attachEvents();
    render();
  }

  init();
})();
