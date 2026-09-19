#!/usr/bin/env node
// Catches the one class of bug that reaches production through a green build: an
// identifier that is used but never declared, imported or defined in scope.
//
// Nothing else catches these. `tsc --noEmit` does not check .jsx/.js files. Vite and
// esbuild happily emit a reference to a name that does not exist — it only fails in the
// browser, as a ReferenceError that white-screens the page the moment a user opens it.
//
// Two real cases from this codebase, both of which shipped with a passing build:
//   backend/payment_routes.ts   `targetBrandId` used, never declared  (tsc did catch that one)
//   ManageUGCOrdersView.jsx     <AlertCircle /> used, never imported  (nothing caught it)
//
// This started as a regex that only looked at JSX tags, so it found <AlertCircle /> but
// would have missed a plain `targetBrandId`-style bug in a .jsx file. It now parses each
// file with Babel and walks real scopes, so any undeclared identifier is caught — JSX tag
// or not.
//
// Run via `npm run verify`, which also runs tsc and the test suite.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const parser = require("@babel/parser");
const traverseModule = require("@babel/traverse");
const traverse = traverseModule.default || traverseModule;

const ROOT = process.cwd();
const SCAN_DIRS = ["src"];

// Names resolvable at runtime without being declared in the file.
const GLOBALS = new Set([
  // JS builtins
  "globalThis", "Object", "Array", "String", "Number", "Boolean", "Symbol", "BigInt",
  "Math", "JSON", "Date", "RegExp", "Error", "TypeError", "RangeError", "SyntaxError",
  "Promise", "Map", "Set", "WeakMap", "WeakSet", "Proxy", "Reflect", "Intl",
  "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent",
  "encodeURI", "decodeURI", "escape", "unescape", "structuredClone", "queueMicrotask",
  "Infinity", "NaN", "undefined", "console", "process", "require", "module", "exports",
  "arguments", "Function", "Generator", "AsyncFunction",
  // DOM / browser
  "window", "document", "navigator", "location", "history", "screen", "localStorage",
  "sessionStorage", "fetch", "Headers", "Request", "Response", "FormData", "URL",
  "URLSearchParams", "Blob", "File", "FileReader", "FileList", "AbortController",
  "Image", "Audio", "Event", "CustomEvent", "MouseEvent", "KeyboardEvent", "TouchEvent",
  "IntersectionObserver", "ResizeObserver", "MutationObserver", "WebSocket",
  "Notification", "crypto", "atob", "btoa", "setTimeout", "clearTimeout", "setInterval",
  "clearInterval", "requestAnimationFrame", "cancelAnimationFrame",
  "alert", "confirm", "prompt", "performance", "getComputedStyle", "matchMedia", "CSS",
  "DOMParser", "XMLHttpRequest", "Worker", "self", "top", "parent", "frames", "open",
  "HTMLElement", "HTMLInputElement", "HTMLDivElement", "HTMLTextAreaElement",
  "HTMLButtonElement", "HTMLFormElement", "HTMLSelectElement", "HTMLImageElement",
  "HTMLCanvasElement", "HTMLVideoElement", "HTMLAnchorElement",
  "Node", "Element", "SVGElement", "NodeList", "DataTransfer", "ClipboardEvent",
  // React JSX runtime
  "React", "JSX"
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(entry) && !/\.d\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

function parse(code, file) {
  const isTs = /\.tsx?$/.test(file);
  return parser.parse(code, {
    sourceType: "module",
    allowReturnOutsideFunction: true,
    errorRecovery: true,
    plugins: [
      "jsx",
      isTs ? "typescript" : "flow",
      "classProperties",
      "classPrivateProperties",
      "classPrivateMethods",
      "decorators-legacy",
      "dynamicImport",
      "topLevelAwait",
      "importMeta"
    ]
  });
}

const problems = [];
const skipped = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file);
    if (/\.test\.[jt]sx?$/.test(rel)) continue;

    const code = readFileSync(file, "utf8");
    let ast;
    try {
      ast = parse(code, file);
    } catch (err) {
      // A file we cannot parse is a gap, not a pass — report it rather than staying silent.
      skipped.push({ rel, reason: String(err.message).split("\n")[0] });
      continue;
    }

    const seen = new Set();
    traverse(ast, {
      ReferencedIdentifier(path) {
        const name = path.node.name;
        if (!name || GLOBALS.has(name) || seen.has(name)) return;
        // <div>, <span> — lowercase JSX tags are HTML elements, not identifiers.
        if (path.isJSXIdentifier() && /^[a-z]/.test(name)) return;
        // Type-only positions. TS types live in a separate namespace from values, and an
        // `interface Props {}` or an index signature `[key: string]: any` is a declaration,
        // not a reference to something that has to exist at runtime.
        if (
          path.findParent(
            (p) =>
              p.isTSTypeReference() ||
              p.isTSTypeAnnotation() ||
              p.isTSInterfaceDeclaration() ||
              p.isTSTypeAliasDeclaration() ||
              p.isTSIndexSignature() ||
              p.isTSQualifiedName() ||
              p.isTSTypeParameterDeclaration() ||
              p.isTSTypeParameterInstantiation()
          )
        ) return;
        if (path.scope.hasBinding(name, true)) return;
        seen.add(name);
        problems.push({ rel, name, line: path.node.loc?.start.line ?? 0 });
      }
    });
  }
}

if (skipped.length) {
  console.warn("\n⚠ crash guard could not parse these files — they were NOT checked:\n");
  for (const s of skipped) console.warn(`  ${s.rel}\n    ${s.reason}\n`);
}

if (problems.length === 0) {
  console.log(`✓ crash guard: no undefined identifiers found`);
  process.exit(0);
}

console.error("\n✗ crash guard FAILED — these throw ReferenceError in the browser:\n");
for (const p of problems.sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line)) {
  console.error(`  ${p.rel}:${p.line}`);
  console.error(`    '${p.name}' is used but never declared, imported or defined\n`);
}
console.error(
  `${problems.length} problem(s). The build would have succeeded anyway — that is the point of this check.\n`
);
process.exit(1);
