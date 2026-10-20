#!/usr/bin/env node
/* tools/kamera-studio-holen.js – kopiert das Kamera-Studio unverändert aus dem Kamera-Konfigurator nach lib/kamera-studio/.
   Quelle: „Wetter Apps/Kamera Konfigurator/src/“ (wird in den übergeordneten Ordnern gesucht) oder der Ordner aus --quelle=<pfad>. Die Dateien dort nie hier von Hand ändern.
   Schreibt lib/kamera-studio/HERKUNFT.txt mit Datum und Git-Stand der Quelle. Danach: node tools/version.js
   Aufruf:  node tools/kamera-studio-holen.js            (kopiert)
            node tools/kamera-studio-holen.js --pruefen  (ändert nichts, Exit-Code 1, wenn die Kopie von der Quelle abweicht)
            node tools/kamera-studio-holen.js --quelle=<Ordner mit ks-studio.js usw.>   (andere Quelle, z. B. eine Arbeitskopie; geht auch mit --pruefen) */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WURZEL = path.join(__dirname, '..');
const ZIEL = path.join(WURZEL, 'lib', 'kamera-studio');
const DATEIEN = ['ks-symbole.js', 'ks-engine.js', 'ks-studio.js', 'ks-studio.css'];

function quelleFinden() {
  const opt = process.argv.find(a => a.startsWith('--quelle='));
  if (opt) {
    const k = path.resolve(opt.slice('--quelle='.length));
    if (DATEIEN.every(d => fs.existsSync(path.join(k, d)))) return k;
    console.error('In ' + k + ' fehlen Studio-Dateien (' + DATEIEN.join(', ') + ').');
    process.exit(2);
  }
  for (let o = WURZEL; o !== path.dirname(o); o = path.dirname(o)) {
    for (const k of [path.join(o, 'Kamera Konfigurator', 'src'), path.join(o, 'Wetter Apps', 'Kamera Konfigurator', 'src')]) {
      if (DATEIEN.every(d => fs.existsSync(path.join(k, d)))) return k;
    }
  }
  console.error('Ordner „Kamera Konfigurator/src“ mit dem Kamera-Studio nicht gefunden.');
  process.exit(2);
}

const Q = quelleFinden();
const abweichend = DATEIEN.filter(d => !fs.existsSync(path.join(ZIEL, d)) || !fs.readFileSync(path.join(Q, d)).equals(fs.readFileSync(path.join(ZIEL, d))));
if (process.argv.includes('--pruefen')) {
  if (abweichend.length) { console.error('Kamera-Studio weicht von der Quelle ab: ' + abweichend.join(', ')); process.exit(1); }
  console.log('Kamera-Studio stimmt mit der Quelle überein.');
  process.exit(0);
}
fs.mkdirSync(ZIEL, { recursive: true });
DATEIEN.forEach(d => fs.copyFileSync(path.join(Q, d), path.join(ZIEL, d)));
let stand = 'unbekannt';
let geaendert = false;
try {
  stand = execSync('git log -1 --format="%h %cs %s" -- .', { cwd: Q, encoding: 'utf8' }).trim();
  geaendert = execSync('git status --porcelain -- .', { cwd: Q, encoding: 'utf8' }).trim() !== '';
} catch (e) { /* Quelle ohne Git */ }
fs.writeFileSync(path.join(ZIEL, 'HERKUNFT.txt'),
  'Kamera-Studio, unverändert kopiert mit tools/kamera-studio-holen.js\n' +
  'Quelle: ' + (process.argv.some(a => a.startsWith('--quelle=')) ? Q : 'Wetter Apps/Kamera Konfigurator/src/ (privat: GitHub kamera-konfigurator-quelle)') + '\n' +
  'Stand der Quelle: ' + stand + (geaendert ? ' (Quelle hatte beim Kopieren noch nicht gesicherte Änderungen)' : '') + '\n' +
  'Dateien: ' + DATEIEN.join(', ') + '\n' +
  'Nicht von Hand ändern: Änderungen in der Quelle machen, dann neu holen.\n');
console.log((abweichend.length ? 'Kopiert: ' + abweichend.join(', ') : 'Keine Änderung') + ' (Quelle ' + stand + ')');
