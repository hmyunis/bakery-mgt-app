const fs = require("fs");
const path = require("path");
const ts = require("../ui/node_modules/typescript");

const root = path.join(__dirname, "..", "ui", "src");
const translatedProps = new Set([
    "label", "placeholder", "title", "description", "aria-label", "emptyContent",
    "errorMessage", "content", "alt", "header", "name", "message", "subtitle",
]);
const ignoredProps = new Set([
    "className", "class", "id", "key", "type", "name", "value", "color", "variant",
    "size", "radius", "placement", "href", "to", "src", "target", "rel", "method",
    "action", "role", "autoComplete", "accept", "scope", "mode", "viewBox", "d",
]);
const objectProps = new Set(["label", "title", "description", "message", "header", "subtitle"]);
const callNames = new Set(["alert", "confirm"]);
const entityMap = { "&apos;": "'", "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">" };

function decodeEntities(value) {
    return value.replace(/&(apos|quot|amp|lt|gt);/g, (entity) => entityMap[entity]);
}

function isVisible(value) {
    const s = decodeEntities(value).replace(/\s+/g, " ").trim();
    if (!/[A-Za-z]/.test(s) || /^https?:\/\//.test(s) || /^#[0-9a-f]{3,8}$/i.test(s)) return false;
    if (/(^|\s|:|!)(?:text|bg|border|w|h|min-w|max-w|min-h|max-h|font|dark|hover|focus|rounded|px|py|p|m|gap|grid|flex|items|justify|animate|shadow|transition|z|absolute|relative|inset|top|bottom|left|right|opacity|overflow|truncate|whitespace|cursor|ring|divide|space)-/.test(s)) return false;
    if (/^[a-z0-9_-]+$/i.test(s) && s === s.toLowerCase() && !["add", "edit", "save", "delete", "cancel", "close", "search", "export", "active", "inactive", "paid", "unpaid", "pending", "today", "all", "more", "back", "next", "previous", "none", "local", "existing", "fresh", "available", "sold", "items", "units", "product", "sale", "ingredient", "shortfall", "and", "or", "of", "pcs", "x"].includes(s)) return false;
    if (/^(GET|POST|PUT|PATCH|DELETE|yyyy|MM|dd|HH|mm|ss|asc|desc|true|false|null)$/i.test(s)) return false;
    if (/^[A-Z_][A-Z0-9_]*$/.test(s) && s.length > 4) return false;
    if (/^[a-z]+\/[a-z+.-]+$/i.test(s)) return false;
    return true;
}

function normalized(value) {
    return decodeEntities(value).replace(/\s+/g, " ").trim();
}

function files(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory()
            ? entry.name === "locales" ? [] : files(full)
            : /\.tsx?$/.test(entry.name) ? [full] : [];
    });
}

const keys = new Set();
const checkOnly = process.argv.includes("--check");
let changedFiles = 0;
for (const file of files(root)) {
    let source = fs.readFileSync(file, "utf8");
    const sf = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const replacements = [];
    const add = (start, end, raw, jsx = false) => {
        const value = normalized(raw);
        if (!isVisible(value)) return;
        keys.add(value);
        replacements.push({ start, end, text: jsx ? `{tr(${JSON.stringify(value)})}` : `tr(${JSON.stringify(value)})` });
    };
    function visit(node) {
        if (ts.isJsxText(node)) add(node.getStart(sf), node.end, node.text, true);
        if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
            const prop = node.name.getText(sf);
            if (translatedProps.has(prop) && !ignoredProps.has(prop)) add(node.initializer.getStart(sf), node.initializer.end, node.initializer.text);
        }
        if (ts.isStringLiteral(node)) {
            const parent = node.parent;
            if (ts.isPropertyAssignment(parent) && parent.initializer === node && objectProps.has(parent.name.getText(sf))) add(node.getStart(sf), node.end, node.text);
            if (ts.isJsxExpression(parent)) add(node.getStart(sf), node.end, node.text);
            if ((ts.isConditionalExpression(parent) || ts.isBinaryExpression(parent)) && parent.parent && ts.isJsxExpression(parent.parent)) add(node.getStart(sf), node.end, node.text);
        }
        if (ts.isCallExpression(node)) {
            const expr = node.expression;
            const isToast = ts.isPropertyAccessExpression(expr) && expr.expression.getText(sf) === "toast";
            const isDirect = ts.isIdentifier(expr) && callNames.has(expr.text);
            if (isToast || isDirect) for (const arg of node.arguments) if (ts.isStringLiteral(arg)) add(arg.getStart(sf), arg.end, arg.text);
        }
        if (ts.isNewExpression(node) && node.expression.getText(sf) === "Error") {
            for (const arg of node.arguments ?? []) if (ts.isStringLiteral(arg)) add(arg.getStart(sf), arg.end, arg.text);
        }
        if (ts.isReturnStatement(node) && node.expression && ts.isStringLiteral(node.expression)) {
            add(node.expression.getStart(sf), node.expression.end, node.expression.text);
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isStringLiteral(node.right)) {
            const target = node.left.getText(sf);
            if (/error|message/i.test(target)) add(node.right.getStart(sf), node.right.end, node.right.text);
        }
        ts.forEachChild(node, visit);
    }
    visit(sf);
    if (!replacements.length) continue;
    changedFiles++;
    if (checkOnly) continue;
    replacements.sort((a, b) => b.start - a.start);
    for (const replacement of replacements) source = source.slice(0, replacement.start) + replacement.text + source.slice(replacement.end);
    if (!/from ["'](?:\.\.\/)*locales["']/.test(source)) {
        const relative = path.relative(path.dirname(file), path.join(root, "locales")).replace(/\\/g, "/");
        const modulePath = relative.startsWith(".") ? relative : `./${relative}`;
        source = `import { tr } from ${JSON.stringify(modulePath)};\n${source}`;
    } else {
        source = source.replace(/import\s*{([^}]*)}\s*from\s*(["'](?:\.\.\/)*locales["'])/, (all, names, modulePath) => {
            if (/\btr\b/.test(names)) return all;
            return `import { ${names.trim()}, tr } from ${modulePath}`;
        });
    }
    fs.writeFileSync(file, source);
}

if (!checkOnly) fs.writeFileSync(path.join(__dirname, "ui-locale-keys.json"), JSON.stringify([...keys].sort(), null, 2) + "\n");
if (checkOnly && changedFiles) {
    console.error(`Found ${keys.size} hardcoded UI strings in ${changedFiles} files.`);
    process.exit(1);
}
console.log(checkOnly ? "No hardcoded UI strings found." : `Localized ${keys.size} UI strings.`);
