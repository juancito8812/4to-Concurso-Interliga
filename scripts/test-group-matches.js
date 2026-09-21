// Smoke test de groupMatchesByDay (src/lib/espnApi.ts) sin arrancar Next:
// transpila el módulo con el TypeScript de node 22 y stubs de los alias "@/...".
// Uso: node scripts/test-group-matches.js
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const MODULE_PATH = path.join(__dirname, "..", "src", "lib", "espnApi.ts");
const OUT_DIR = fs.mkdtempSync(path.join(require("os").tmpdir(), "groupmatches-"));

// Transpila espnApi.ts + stubs de sus imports a CommonJS ejecutable
function emit(relIn, source) {
  const out = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const file = path.join(OUT_DIR, relIn.replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
  return file;
}

// stub de "@/lib/dataLoader" (no se usa en la ruta testeada)
const dataLoaderJs = emit("lib/dataLoader.ts", `export async function loadData(p) { return []; }`);
// stub de "@/lib/leagueConfig" (solo se usa leagueSlugToName, no en la ruta testeada)
const leagueConfigJs = emit("lib/leagueConfig.ts", `export function leagueSlugToName(s) { return s; }`);
const espnApiJs = emit("lib/espnApi.ts", fs.readFileSync(MODULE_PATH, "utf8"));

// Resuelve "@/x" → stubs
const Module = require("module");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request.startsWith("@/lib/")) {
    const name = path.basename(request);
    return path.join(OUT_DIR, "lib", name.replace(/\.ts$/, "") + ".js");
  }
  return origResolve.call(this, request, ...args);
};

const { groupMatchesByDay } = require(espnApiJs);

let failures = 0;
const ok = (msg) => console.log("✅", msg);
const fail = (msg) => { console.error("❌", msg); failures++; };

const md = (id, date, matchday) => ({ id, date, status: "", name: "", homeTeam: "A", homeLogo: "", awayTeam: "B", awayLogo: "", matchday });

// 1. Con matchday: agrupa por jornada, ordenado por fecha
const g1 = groupMatchesByDay([
  md("3", "2026-10-01T20:00:00Z", 2),
  md("1", "2026-09-20T18:00:00Z", 1),
  md("2", "2026-09-24T18:00:00Z", 1),
]);
if (g1.length === 2) ok("con matchday: 2 grupos"); else fail(`esperaba 2 grupos, hay ${g1.length}`);
if (g1[0]?.label === "Jornada 1" && g1[0].matches.length === 2) ok("grupo 1 = Jornada 1 con 2 partidos"); else fail("grupo 1 incorrecto: " + JSON.stringify(g1[0]));
if (g1[1]?.label === "Jornada 2" && g1[0].matches[0].id === "1") ok("grupo 2 = Jornada 2 y orden por fecha"); else fail("grupo 2/orden incorrecto");
if (g1.every((g) => g.key.startsWith("md-"))) ok("keys con prefijo md-");

// 2. Sin matchday (fallback ESPN): agrupa por día con etiqueta de fecha
const g2 = groupMatchesByDay([
  md("b", "2026-09-20T20:00:00Z", null),
  md("a", "2026-09-20T18:00:00Z", null),
  md("c", "2026-09-21T18:00:00Z", null),
]);
if (g2.length === 2) ok("sin matchday: 2 grupos por día"); else fail(`esperaba 2 grupos, hay ${g2.length}`);
if (g2[0]?.key === "date-2026-09-20" && g2[0].matches.length === 2) ok("día 1 agrupa 2 partidos"); else fail("día 1 incorrecto");
if (g2[1]?.key === "date-2026-09-21" && g2[1].label.length > 0) ok("día 2 con etiqueta de fecha"); else fail("día 2 incorrecto");

// 3. Lista vacía
if (groupMatchesByDay([]).length === 0) ok("lista vacía → 0 grupos"); else fail("lista vacía no da 0 grupos");

// 4. Inmutabilidad: no muta el array de entrada
const input = [md("1", "2026-09-21T18:00:00Z", null), md("2", "2026-09-20T18:00:00Z", null)];
groupMatchesByDay(input);
if (input[0].id === "1") ok("no muta el array de entrada"); else fail("mutó el array de entrada");

console.log(failures === 0 ? "\n🎉 SMOKE TEST OK" : `\n🔴 ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
