#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;
const hljsSource = fs.readFileSync(path.join(root, "vendor", "highlight.min.js"), "utf8");
const sandbox = { window: {}, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(hljsSource, sandbox, { filename: "highlight.min.js" });
const hljs = sandbox.hljs;

const tokenStyles = {
  light: {
    base: { color: "#24292e", background: "#ffffff", gutterBg: "#f1f3f5", gutterColor: "#667085", border: "#d7dde5" },
    classes: {
      "hljs-keyword": "color:#d73a49;font-weight:700",
      "hljs-doctag": "color:#d73a49;font-weight:700",
      "hljs-type": "color:#d73a49;font-weight:700",
      "hljs-title": "color:#6f42c1",
      "hljs-attr": "color:#005cc5",
      "hljs-attribute": "color:#005cc5",
      "hljs-literal": "color:#005cc5",
      "hljs-number": "color:#005cc5",
      "hljs-operator": "color:#005cc5",
      "hljs-variable": "color:#005cc5",
      "hljs-string": "color:#032f62",
      "hljs-regexp": "color:#032f62",
      "hljs-built_in": "color:#e36209",
      "hljs-symbol": "color:#e36209",
      "hljs-comment": "color:#6a737d",
      "hljs-code": "color:#6a737d",
      "hljs-name": "color:#22863a",
      "hljs-selector-tag": "color:#22863a",
      "hljs-section": "color:#005cc5;font-weight:700",
      "hljs-emphasis": "font-style:italic",
      "hljs-strong": "font-weight:700"
    }
  },
  dark: {
    base: { color: "#c9d1d9", background: "#0d1117", gutterBg: "#161b22", gutterColor: "#8b949e", border: "#30363d" },
    classes: {
      "hljs-keyword": "color:#ff7b72;font-weight:700",
      "hljs-doctag": "color:#ff7b72;font-weight:700",
      "hljs-type": "color:#ff7b72;font-weight:700",
      "hljs-title": "color:#d2a8ff",
      "hljs-attr": "color:#79c0ff",
      "hljs-attribute": "color:#79c0ff",
      "hljs-literal": "color:#79c0ff",
      "hljs-number": "color:#79c0ff",
      "hljs-operator": "color:#79c0ff",
      "hljs-variable": "color:#79c0ff",
      "hljs-string": "color:#a5d6ff",
      "hljs-regexp": "color:#a5d6ff",
      "hljs-built_in": "color:#ffa657",
      "hljs-symbol": "color:#ffa657",
      "hljs-comment": "color:#8b949e",
      "hljs-code": "color:#8b949e",
      "hljs-name": "color:#7ee787",
      "hljs-selector-tag": "color:#7ee787",
      "hljs-section": "color:#1f6feb;font-weight:700",
      "hljs-emphasis": "font-style:italic",
      "hljs-strong": "font-weight:700"
    }
  }
};

function usage() {
  return `Usage:
  node cli.js --language python < input.py > output.html
  node cli.js --language javascript --input app.js --output code.html

Options:
  --language, -l       Highlight language. Default: plaintext
  --theme, -t          light or dark. Default: light
  --font-size          CSS font size. Default: 12px
  --no-line-numbers    Hide line numbers
  --input, -i          Read code from file instead of stdin
  --output, -o         Write HTML to file instead of stdout
  --full-document      Output a complete HTML document
  --help, -h           Show this help
`;
}

function parseArgs(argv) {
  const options = {
    language: "plaintext",
    theme: "light",
    fontSize: "12px",
    lineNumbers: true,
    fullDocument: false,
    input: null,
    output: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[i];
    };

    if (arg === "--language" || arg === "-l") options.language = next();
    else if (arg === "--theme" || arg === "-t") options.theme = next();
    else if (arg === "--font-size") options.fontSize = next();
    else if (arg === "--no-line-numbers") options.lineNumbers = false;
    else if (arg === "--input" || arg === "-i") options.input = next();
    else if (arg === "--output" || arg === "-o") options.output = next();
    else if (arg === "--full-document") options.fullDocument = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (!tokenStyles[options.theme]) {
    throw new Error("--theme must be light or dark");
  }

  return options;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineHighlightStyles(html, theme) {
  return html.replace(/<span class="([^"]+)">/g, (_match, classes) => {
    const style = classes
      .split(/\s+/)
      .map((className) => tokenStyles[theme].classes[className])
      .filter(Boolean)
      .join(";");
    return style ? `<span style="${style}">` : "<span>";
  });
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

function highlight(code, language, theme) {
  if (language === "plaintext" || !hljs.getLanguage(language)) {
    return escapeHtml(code);
  }

  const highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value;
  return inlineHighlightStyles(highlighted, theme);
}

function buildHtml(code, options) {
  const theme = tokenStyles[options.theme];
  const highlighted = highlight(code.replace(/\r\n/g, "\n"), options.language, options.theme);
  const lines = highlighted.split(/\n/);
  const rows = lines.map((line, index) => {
    const gutter = options.lineNumbers
      ? `<td style="width:46px;padding:0 8px;text-align:right;color:${theme.base.gutterColor};background:${theme.base.gutterBg};border-right:2px solid #b7d7a8;vertical-align:top;">${index + 1}</td>`
      : "";
    const content = preserveHtmlWhitespace(line) || "&nbsp;";
    return `<tr>${gutter}<td style="padding:0 12px;white-space:pre;vertical-align:top;"><code style="font-family:Consolas, 'Courier New', monospace;white-space:pre;">${content}</code></td></tr>`;
  }).join("");

  const table = `<table style="width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid ${theme.base.border};background:${theme.base.background};color:${theme.base.color};font-family:Consolas, 'Courier New', monospace;font-size:${options.fontSize};line-height:1.45;"><tbody>${rows}</tbody></table>`;

  if (!options.fullDocument) {
    return `<meta charset="utf-8">${table}\n`;
  }

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Highlighted Code</title></head>
<body>${table}</body>
</html>
`;
}

function readInput(options) {
  if (options.input) {
    return fs.readFileSync(options.input, "utf8");
  }
  return fs.readFileSync(0, "utf8");
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(usage());
      return;
    }

    const html = buildHtml(readInput(options), options);
    if (options.output) {
      fs.writeFileSync(options.output, html);
    } else {
      process.stdout.write(html);
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exitCode = 1;
  }
}

main();
