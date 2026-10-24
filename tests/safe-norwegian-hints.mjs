import assert from "node:assert/strict";
import {safeNorwegianHints} from "../api/_safe-norwegian-hints.js";

const screenshot="Jeg slutter på jobben klokka fire. Etter på kommer jeg hjemme. På fredag går jeg i svømmehallen. Svømmehallen er åpen til klokka sju.";
const hints=safeNorwegianHints(screenshot,{mode:"writing"});
assert.equal(hints.length,2,"Two independently verifiable issues remain teachable after grading fails");
assert.equal(hints[0].source_fragment,"Etter på");
assert.equal(hints[0].corrected_fragment,"etterpå");
assert.equal(hints[1].source_fragment,"kommer jeg hjemme");
assert.equal(hints[1].corrected_fragment,"kommer jeg hjem");
assert(hints.every(h=>screenshot.includes(h.source_fragment)),"Hints cite student's literal text");
assert.equal(safeNorwegianHints("Etterpå kommer jeg hjem. På fredag går jeg i svømmehallen.").length,0,
 "Correct text must not be marked wrong");
assert.equal(safeNorwegianHints("Jeg kommer hjemmefra.").length,0,
 "Do not confuse hjemmefra with hjemme");
assert.equal(safeNorwegianHints("Etter på kommer jeg hjem.",{mode:"speaking"}).length,0,
 "ASR word segmentation must never be graded as the learner's spelling");
assert.equal(safeNorwegianHints("<img src=x onerror=alert(1)>").length,0,
 "No AI-generated or HTML-based hints can be shown unverified");
console.log("PASS Nora verified Norwegian fallback hints: literal text, direction home, and speech protection");
