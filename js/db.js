// MezaTag Database: Pokémon Profiles, Types, and Marker Mappings
const MezaDB = (function() {
  const STORAGE_KEY = 'mezastar_pokemon_db_v1';

  // Pokémon Types with associated colors and icons
  const TYPES = {
    Electric: { color: '#FACC15', bg: 'rgba(250, 204, 21, 0.2)', icon: '⚡' },
    Fire:     { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.2)', icon: '🔥' },
    Water:    { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.2)', icon: '💧' },
    Grass:    { color: '#22C55E', bg: 'rgba(34, 197, 94, 0.2)', icon: '🍃' },
    Dragon:   { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.2)', icon: '🐉' },
    Psychic:  { color: '#EC4899', bg: 'rgba(236, 72, 153, 0.2)', icon: '🔮' },
    Ghost:    { color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.2)', icon: '👻' },
    Fighting: { color: '#EA580C', bg: 'rgba(234, 88, 12, 0.2)', icon: '🥊' },
    Steel:    { color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.2)', icon: '🛡️' },
    Dark:     { color: '#334155', bg: 'rgba(51, 65, 85, 0.2)', icon: '🌑' },
    Ice:      { color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.2)', icon: '❄️' },
    Ground:   { color: '#D97706', bg: 'rgba(217, 119, 6, 0.2)', icon: '🏜️' },
    Rock:     { color: '#78716C', bg: 'rgba(120, 113, 108, 0.2)', icon: '🪨' },
    Normal:   { color: '#A1A1AA', bg: 'rgba(161, 161, 170, 0.2)', icon: '⭐' },
    Poison:   { color: '#A855F7', bg: 'rgba(168, 85, 247, 0.2)', icon: '☠️' },
    Flying:   { color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.2)', icon: '🌪️' },
    Fairy:    { color: '#F472B6', bg: 'rgba(244, 114, 182, 0.2)', icon: '✨' },
    Bug:      { color: '#84CC16', bg: 'rgba(132, 204, 22, 0.2)', icon: '🐛' }
  };

  // Mezastar Star Tiers
  const STAR_TIERS = {
    1: { name: 'Normal', stars: '★', color: '#64748B', borderColor: '#475569', aura: 'rgba(100, 116, 139, 0.4)' },
    2: { name: 'Super', stars: '★★', color: '#10B981', borderColor: '#059669', aura: 'rgba(16, 185, 129, 0.5)' },
    3: { name: 'Hyper', stars: '★★★', color: '#3B82F6', borderColor: '#2563EB', aura: 'rgba(59, 130, 246, 0.6)' },
    4: { name: 'Master', stars: '★★★★', color: '#F59E0B', borderColor: '#D97706', aura: 'rgba(245, 158, 11, 0.7)' },
    5: { name: 'Super Star', stars: '★★★★★', color: '#EF4444', borderColor: '#DC2626', aura: 'rgba(239, 68, 68, 0.85)' },
    6: { name: 'Legend Star', stars: '★★★★★★', color: '#A855F7', borderColor: '#7C3AED', aura: 'rgba(168, 85, 247, 0.95)' }
  };

  // Default Tag Catalog
  const DEFAULT_CATALOG = [
    {
      id: 0,
      name: 'Pikachu',
      dex: '#0025',
      stars: 5,
      type: 'Electric',
      hp: 175,
      attack: 160,
      defense: 120,
      speed: 185,
      move: '10,000,000 Volt Bolt',
      color: '#EAB308',
      spriteId: '25'
    },
    {
      id: 1,
      name: 'Charizard',
      dex: '#0006',
      stars: 6,
      type: 'Fire',
      hp: 210,
      attack: 235,
      defense: 165,
      speed: 190,
      move: 'G-Max Wildfire',
      color: '#EA580C',
      spriteId: '6'
    },
    {
      id: 2,
      name: 'Lucario',
      dex: '#0448',
      stars: 5,
      type: 'Fighting',
      hp: 185,
      attack: 215,
      defense: 150,
      speed: 180,
      move: 'Aura Sphere Barrage',
      color: '#0284C7',
      spriteId: '448'
    },
    {
      id: 3,
      name: 'Gengar',
      dex: '#0094',
      stars: 4,
      type: 'Ghost',
      hp: 170,
      attack: 195,
      defense: 140,
      speed: 190,
      move: 'Shadow Ball Storm',
      color: '#7E22CE',
      spriteId: '94'
    },
    {
      id: 4,
      name: 'Rayquaza',
      dex: '#0384',
      stars: 6,
      type: 'Dragon',
      hp: 240,
      attack: 260,
      defense: 175,
      speed: 210,
      move: 'Dragon Ascent',
      color: '#059669',
      spriteId: '384'
    },
    {
      id: 5,
      name: 'Mewtwo',
      dex: '#0150',
      stars: 6,
      type: 'Psychic',
      hp: 250,
      attack: 270,
      defense: 180,
      speed: 220,
      move: 'Psystrike Blast',
      color: '#9333EA',
      spriteId: '150'
    },
    {
      id: 6,
      name: 'Greninja',
      dex: '#0658',
      stars: 5,
      type: 'Water',
      hp: 180,
      attack: 210,
      defense: 135,
      speed: 230,
      move: 'Giant Water Shuriken',
      color: '#1D4ED8',
      spriteId: '658'
    },
    {
      id: 7,
      name: 'Blastoise',
      dex: '#0009',
      stars: 4,
      type: 'Water',
      hp: 205,
      attack: 180,
      defense: 220,
      speed: 140,
      move: 'Hydro Cannon Cannons',
      color: '#2563EB',
      spriteId: '9'
    },
    {
      id: 8,
      name: 'Venusaur',
      dex: '#0003',
      stars: 4,
      type: 'Grass',
      hp: 215,
      attack: 185,
      defense: 200,
      speed: 145,
      move: 'Frenzy Plant Burst',
      color: '#16A34A',
      spriteId: '3'
    },
    {
      id: 9,
      name: 'Zeraora',
      dex: '#0807',
      stars: 5,
      type: 'Electric',
      hp: 190,
      attack: 230,
      defense: 155,
      speed: 240,
      move: 'Plasma Fists',
      color: '#FACC15',
      spriteId: '807'
    },
    {
      id: 10,
      name: 'Miraidon',
      dex: '#1008',
      stars: 6,
      type: 'Electric',
      hp: 245,
      attack: 265,
      defense: 190,
      speed: 235,
      move: 'Electro Drift Overdrive',
      color: '#6366F1',
      spriteId: '1008'
    },
    {
      id: 11,
      name: 'Koraidon',
      dex: '#1007',
      stars: 6,
      type: 'Fighting',
      hp: 250,
      attack: 260,
      defense: 195,
      speed: 230,
      move: 'Collision Course Impact',
      color: '#DC2626',
      spriteId: '1007'
    }
  ];

  let currentCatalog = [];

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        currentCatalog = JSON.parse(saved);
        return;
      }
    } catch (e) {
      console.warn('Failed to load DB from localStorage:', e);
    }
    currentCatalog = JSON.parse(JSON.stringify(DEFAULT_CATALOG));
    save();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentCatalog));
    } catch (e) {
      console.warn('Failed to save DB to localStorage:', e);
    }
  }

  function getAll() {
    return currentCatalog;
  }

  function getById(id) {
    const found = currentCatalog.find(item => item.id === Number(id));
    if (found) return found;

    // Fallback dynamic profile if custom marker ID not in catalog
    return {
      id: Number(id),
      name: `Unknown #${id}`,
      dex: `#${String(id).padStart(4, '0')}`,
      stars: 3,
      type: 'Normal',
      hp: 150,
      attack: 150,
      defense: 150,
      speed: 150,
      move: 'Normal Tackle',
      color: '#64748B',
      spriteId: null
    };
  }

  function upsert(item) {
    const index = currentCatalog.findIndex(p => p.id === Number(item.id));
    if (index >= 0) {
      currentCatalog[index] = { ...currentCatalog[index], ...item };
    } else {
      currentCatalog.push(item);
    }
    // Keep sorted by ID
    currentCatalog.sort((a, b) => a.id - b.id);
    save();
  }

  function remove(id) {
    currentCatalog = currentCatalog.filter(p => p.id !== Number(id));
    save();
  }

  function resetToDefaults() {
    currentCatalog = JSON.parse(JSON.stringify(DEFAULT_CATALOG));
    save();
  }

  function exportJSON() {
    return JSON.stringify(currentCatalog, null, 2);
  }

  function importJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        currentCatalog = parsed;
        save();
        return true;
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
    return false;
  }

  // Initialize
  load();

  return {
    TYPES,
    STAR_TIERS,
    getAll,
    getById,
    upsert,
    remove,
    resetToDefaults,
    exportJSON,
    importJSON
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MezaDB;
}
