// Usage: node fix-patterns.mjs path/to/skins.ts
import fs from 'fs';
const file = process.argv[2];
if (!file) { console.error('Pass the skins file path'); process.exit(1); }
const map = {
  prism_hex: 'prism_facets',
  capsule_pulse: 'pulse_waves',
  cyber_circuit: 'pcb_board',
  cyber_reactor: 'reactor_core',
  glacier_mint: 'glacier_crystal',
  synth_sunset: 'astral_mandala',
  mythic_celestial: 'orrery',
  obsidian_grid: 'obsidian_shatter',
  cobalt_stadium: 'cobalt_arena',
  crimson_arena: 'crimson_colosseum',
  arctic_slate: 'slate_tiles',
  emerald_club: 'emerald_argyle',
  apex_legend: 'apex_throne',
  volcanic_ember: 'volcanic_crust',
};
let src = fs.readFileSync(file, 'utf8');
for (const [id, pat] of Object.entries(map)) {
  const re = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?pattern:\\s*')[^']+(')`);
  if (!re.test(src)) { console.warn('NOT FOUND:', id); continue; }
  src = src.replace(re, `$1${pat}$2`);
  console.log('ok', id, '->', pat);
}
fs.writeFileSync(file, src);