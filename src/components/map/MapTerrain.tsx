import type { Season } from './mapData';
import { TERRAIN_PALETTES } from './mapData';

interface MapTerrainProps {
  season: Season;
}

/** Shared transition style for smooth seasonal color changes */
const T: React.CSSProperties = { transition: 'fill 1.5s, stroke 1.5s' };

/**
 * MapTerrain: Renders the full strategic map terrain as inline SVG elements.
 *
 * All coordinates are derived from the terrain-map.svg (viewBox 0 0 1000 850)
 * divided by 10 to fit the GameMap viewBox (0 0 100 85).
 *
 * Rendering order matches the SVG layer structure:
 * 1. Ocean background + wave texture
 * 2. Main landmass (coastline shape)
 * 3. Plains regions (6 areas)
 * 4. Mountains (7 ranges + SE hills + plateau)
 * 5. Desert / arid zones (Northwest)
 * 6. Rivers (Yellow, Yangtze, tributaries)
 * 7. Lakes (Dongting, Poyang, Tai)
 * 8. Coast foam
 * 9. Seasonal overlays (snow, blossoms, leaves)
 */
export function MapTerrain({ season }: MapTerrainProps) {
  const p = TERRAIN_PALETTES[season];

  return (
    <g className="map-terrain">
      {/* ==================== 1. OCEAN BACKGROUND ==================== */}
      <rect x="0" y="0" width="100" height="85" fill={p.ocean1} style={T} />

      {/* Subtle wave texture overlay */}
      <g opacity="0.18">
        {Array.from({ length: 17 }, (_, i) => (
          <path
            key={`wave-${i}`}
            d={`M 70,${i * 5 + 1} Q 75,${i * 5 - 0.5} 80,${i * 5 + 1} Q 85,${i * 5 + 2.5} 90,${i * 5 + 1} Q 95,${i * 5 - 0.5} 100,${i * 5 + 1}`}
            stroke={p.waveColor}
            strokeWidth="0.15"
            fill="none"
            style={T}
          />
        ))}
      </g>

      {/* Deep ocean areas (further from coast) */}
      <ellipse cx="95" cy="30" rx="12" ry="25" fill={p.ocean2} opacity="0.5" style={T} />
      <ellipse cx="90" cy="70" rx="15" ry="18" fill={p.ocean2} opacity="0.5" style={T} />


      {/* ==================== 2. MAIN LANDMASS ==================== */}
      <path
        d={`
          M 5,0
          L 40,0 L 50,0 L 60,0 L 70,0 L 80,0
          L 83,2 L 87,5 L 90,8 L 92,10
          L 91,12 L 89,14 L 88,17 L 87,20
          L 86,23 L 85.5,26 L 85,28 L 84,30
          L 83,32 L 82,35 L 81,37 L 80,39
          L 79.5,41 L 79,43 L 78.5,44 L 80,46
          L 82,47 L 85,48 L 88,49 L 90,51
          L 91,53 L 90,56 L 89,58 L 87,59
          L 85,60 L 83,61 L 81,62 L 79,64
          L 78,66 L 77,68 L 76,70 L 75,72
          L 74,74 L 72,76 L 70,77 L 68,77.5
          L 66,78 L 64,78.2 L 62,78.5 L 60,79
          L 55,80 L 50,81 L 45,81.5 L 40,82
          L 35,82.5 L 30,82.8 L 25,83
          L 20,82.5 L 15,81.5 L 10,81
          L 5,80.5 L 0,80 L 0,0 Z
        `}
        fill={p.land}
        stroke="none"
        style={T}
      />


      {/* ==================== 3. PLAINS REGIONS ==================== */}

      {/* Central Plains 中原 (洛陽/許昌/陳留/濮陽 area) */}
      <path
        d={`
          M 50,22 L 58,20 L 65,20 L 72,21 L 78,22
          L 80,25 L 81,29 L 80,33 L 79,37
          L 77,39 L 74,40 L 70,41 L 66,40
          L 62,39 L 58,37 L 54,35 L 51,32
          L 49,28 L 49,24 Z
        `}
        fill={p.plains}
        stroke="none"
        style={T}
      />

      {/* North China Plain 河北平原 (鄴/平原/南皮) */}
      <path
        d={`
          M 60,12 L 68,10 L 76,10 L 83,11
          L 85,14 L 86,18 L 85,22 L 83,24
          L 80,25 L 75,24 L 70,23 L 65,22
          L 61,20 L 59,17 L 59,14 Z
        `}
        fill={p.plains}
        stroke="none"
        style={T}
      />

      {/* Jing Province plains 荊州 (襄陽/新野/江陵) */}
      <path
        d={`
          M 46,38 L 53,37 L 58,38 L 62,40
          L 65,43 L 66,47 L 65,51 L 63,54
          L 60,56 L 56,57 L 52,56 L 48,54
          L 45,51 L 43,47 L 43,43 Z
        `}
        fill={p.plains}
        stroke="none"
        style={T}
      />

      {/* Eastern plains (下邳/壽春/廬江) */}
      <path
        d={`
          M 72,31 L 78,30 L 82,32 L 83,36
          L 82,40 L 81,43 L 80,46 L 79,47
          L 76,48 L 73,47 L 71,44 L 70,41
          L 70,37 L 71,34 Z
        `}
        fill={p.plains}
        stroke="none"
        style={T}
      />

      {/* Sichuan Basin 四川盆地 (成都/梓潼) */}
      <path
        d={`
          M 20,35 L 27,33 L 34,34 L 38,37
          L 40,41 L 40,45 L 39,49 L 36,52
          L 32,53 L 27,53 L 23,51 L 20,48
          L 18,44 L 18,39 Z
        `}
        fill={p.plains}
        stroke="none"
        style={T}
      />

      {/* Southern plains (長沙/武陵 area) */}
      <path
        d={`
          M 42,55 L 50,54 L 58,55 L 64,57
          L 68,60 L 70,64 L 69,68 L 66,71
          L 62,73 L 57,74 L 52,73 L 47,71
          L 43,68 L 41,64 L 40,60 L 41,57 Z
        `}
        fill={p.southLand}
        stroke="none"
        style={T}
      />

      {/* Lingnan 嶺南 (桂陽/零陵) */}
      <path
        d={`
          M 30,70 L 40,69 L 50,70 L 60,72
          L 70,73 L 75,74 L 74,77 L 70,78.5
          L 62,79.5 L 53,81 L 44,81.5 L 35,82
          L 27,82.5 L 20,82 L 25,78 L 30,74 Z
        `}
        fill={p.lingnan}
        stroke="none"
        style={T}
      />


      {/* ==================== 4. MOUNTAINS ==================== */}

      {/* 太行山脈 Taihang Mountains (between 晉陽 and 鄴/濮陽) */}
      <path
        d={`
          M 56,8 L 58,10 L 59,13 L 60,16
          L 60.5,19 L 61,22 L 61,25 L 60,28
          L 58.5,26 L 57.5,23 L 57,20 L 56.5,17
          L 55.5,14 L 54.5,11 Z
        `}
        fill={p.mountain}
        stroke={p.mountainStroke}
        strokeWidth="0.1"
        opacity="0.85"
        style={T}
      />
      {/* Taihang peaks */}
      <path d="M 55.5,10 L 56.5,8 L 57.5,10 Z" fill={p.mountainPeak} opacity="0.7" style={T} />
      <path d="M 56.5,13 L 57.2,11.5 L 58,13 Z" fill={p.mountainPeak} opacity="0.7" style={T} />
      <path d="M 57.5,16 L 58.2,14.5 L 59,16 Z" fill={p.mountainPeak} opacity="0.7" style={T} />
      <path d="M 58,19 L 58.8,17.2 L 59.5,19 Z" fill={p.mountainPeak} opacity="0.7" style={T} />
      <path d="M 58.5,22 L 59.3,20.5 L 60,22 Z" fill={p.mountainPeak} opacity="0.7" style={T} />

      {/* 燕山 Yan Mountains (north of 薊/北平) */}
      <path
        d={`
          M 62,5 L 68,4 L 74,5 L 80,5.5 L 85,7
          L 84,9.5 L 80,9 L 75,8.5 L 70,8 L 65,7.5 L 62,7 Z
        `}
        fill={p.mountain}
        stroke={p.mountainStroke}
        strokeWidth="0.1"
        opacity="0.8"
        style={T}
      />
      <path d="M 65,6 L 66.5,4 L 68,6 Z" fill={p.mountainPeak} opacity="0.6" style={T} />
      <path d="M 72,5.5 L 73.2,3.8 L 74.5,5.5 Z" fill={p.mountainPeak} opacity="0.6" style={T} />
      <path d="M 79,6.5 L 80,4.8 L 81,6.5 Z" fill={p.mountainPeak} opacity="0.6" style={T} />

      {/* 秦嶺 Qinling Mountains (between 長安/漢中 and 洛陽/宛) */}
      <path
        d={`
          M 35,28 L 40,27 L 44,28 L 48,29
          L 52,30 L 55,31 L 56,34
          L 54,35 L 51,34 L 47,33
          L 43,32 L 39,31 L 36,30 Z
        `}
        fill={p.mountain}
        stroke={p.mountainStroke}
        strokeWidth="0.1"
        opacity="0.85"
        style={T}
      />
      <path d="M 38,28.5 L 39.5,26.5 L 41,28.5 Z" fill={p.mountainPeak} opacity="0.7" style={T} />
      <path d="M 43,29 L 44.5,27 L 46,29 Z" fill={p.mountainPeak} opacity="0.7" style={T} />
      <path d="M 48,30 L 49.2,28.2 L 50.5,30 Z" fill={p.mountainPeak} opacity="0.7" style={T} />
      <path d="M 53,31 L 54,29.5 L 55,31.5 Z" fill={p.mountainPeak} opacity="0.7" style={T} />

      {/* 大巴山 Daba Mountains (north of Sichuan, between 漢中 and 梓潼) */}
      <path
        d={`
          M 25,33 L 30,31 L 35,30 L 38,31
          L 39,34 L 38,37 L 35,36
          L 31,35.5 L 27,35 L 25,34.5 Z
        `}
        fill={p.mountain}
        stroke={p.mountainStroke}
        strokeWidth="0.1"
        opacity="0.8"
        style={T}
      />
      <path d="M 28,32 L 29.5,30 L 31,32 Z" fill={p.mountainPeak} opacity="0.6" style={T} />
      <path d="M 34,31 L 35.2,29.2 L 36.5,31 Z" fill={p.mountainPeak} opacity="0.6" style={T} />

      {/* 巫山 Wu Mountains (between 永安 and 江陵, Three Gorges) */}
      <path
        d={`
          M 39,47 L 42,46 L 45,47 L 47,49
          L 46,52 L 44,53 L 42,52
          L 40,50 L 39,48.5 Z
        `}
        fill={p.mountain}
        stroke={p.mountainStroke}
        strokeWidth="0.1"
        opacity="0.75"
        style={T}
      />
      <path d="M 41,47 L 42,45.5 L 43,47 Z" fill={p.mountainPeak} opacity="0.6" style={T} />
      <path d="M 44,48.5 L 45,46.8 L 46,48.8 Z" fill={p.mountainPeak} opacity="0.6" style={T} />

      {/* 岷山/西南山地 Southwest mountains (around 建寧/雲南) */}
      <path
        d={`
          M 10,40 L 16,38 L 20,39 L 22,42
          L 21,46 L 20,50 L 19,54 L 18,58
          L 17,62 L 16,66 L 15,70 L 14,73
          L 12,74 L 10,72 L 9,68 L 9.5,64
          L 10,60 L 10.5,56 L 10,52 L 9.5,48 L 9.5,44 Z
        `}
        fill={p.mountain}
        stroke={p.mountainStroke}
        strokeWidth="0.1"
        opacity="0.8"
        style={T}
      />
      <path d="M 13,42 L 14.5,39.5 L 16,42 Z" fill={p.mountainPeak} opacity="0.6" style={T} />
      <path d="M 14,50 L 15.5,47.8 L 16.8,50 Z" fill={p.mountainPeak} opacity="0.6" style={T} />
      <path d="M 13.5,58 L 15,55.8 L 16.2,58 Z" fill={p.mountainPeak} opacity="0.6" style={T} />
      <path d="M 13,66 L 14.5,64 L 15.8,66 Z" fill={p.mountainPeak} opacity="0.6" style={T} />

      {/* 南嶺 Nanling Mountains (between 荊南 and 嶺南) */}
      <path
        d={`
          M 42,66 L 48,65 L 54,66 L 60,66.5
          L 66,67 L 70,68 L 72,70
          L 70,72 L 66,71.5 L 60,71
          L 54,70.5 L 48,70 L 43,69.5 L 41,68 Z
        `}
        fill={p.mountain}
        stroke={p.mountainStroke}
        strokeWidth="0.1"
        opacity="0.7"
        style={T}
      />
      <path d="M 46,66 L 47.5,64.2 L 49,66 Z" fill={p.mountainPeak} opacity="0.5" style={T} />
      <path d="M 56,66.5 L 57.2,64.8 L 58.5,66.5 Z" fill={p.mountainPeak} opacity="0.5" style={T} />
      <path d="M 65,67.5 L 66.2,65.8 L 67.5,67.8 Z" fill={p.mountainPeak} opacity="0.5" style={T} />

      {/* 東南丘陵 Southeast hills (between 柴桑/會稽) */}
      <path
        d={`
          M 72,50 L 77,49 L 82,50 L 86,52
          L 87,56 L 85,59 L 82,60 L 79,61
          L 76,62 L 73,61 L 71,58 L 70,55 L 71,52 Z
        `}
        fill={p.seHills}
        stroke="none"
        opacity="0.6"
        style={T}
      />
      <path d="M 75,51 L 76.2,49.5 L 77.5,51 Z" fill={p.seHillPeak} opacity="0.4" style={T} />
      <path d="M 81,53 L 82,51.5 L 83,53 Z" fill={p.seHillPeak} opacity="0.4" style={T} />
      <path d="M 77,58 L 78,56.5 L 79,58 Z" fill={p.seHillPeak} opacity="0.4" style={T} />

      {/* Northern plateau hills (above 晉陽, near 西涼) */}
      <path
        d={`
          M 10,6 L 20,4 L 35,5 L 45,6 L 53,7
          L 54,10 L 53,13 L 50,14
          L 44,13.5 L 38,13 L 30,12
          L 22,11 L 15,10 L 10,9 Z
        `}
        fill={p.plateau}
        stroke="none"
        opacity="0.5"
        style={T}
      />
      <path d="M 20,6 L 21.5,4 L 23,6 Z" fill={p.plateauPeak} opacity="0.5" style={T} />
      <path d="M 35,6.5 L 36.2,4.8 L 37.5,6.5 Z" fill={p.plateauPeak} opacity="0.5" style={T} />
      <path d="M 46,7.5 L 47.2,5.8 L 48.5,7.8 Z" fill={p.plateauPeak} opacity="0.5" style={T} />


      {/* ==================== 5. DESERT / ARID (Northwest) ==================== */}

      {/* 西涼 Desert area (Gansu corridor) */}
      <path
        d={`
          M 5,5 L 15,3 L 25,4 L 31,7
          L 33,11 L 32,15 L 29,17 L 25,18
          L 20,17.5 L 15,16 L 10,15
          L 6,13 L 5,10 Z
        `}
        fill={p.desert}
        stroke="none"
        opacity="0.7"
        style={T}
      />

      {/* Desert sand dune details */}
      <path d="M 10,8 Q 13,6.5 16,8" stroke={p.desertDetail} strokeWidth="0.15" fill="none" opacity="0.3" style={T} />
      <path d="M 15,10 Q 18,8.8 21,10" stroke={p.desertDetail} strokeWidth="0.15" fill="none" opacity="0.3" style={T} />
      <path d="M 12,13 Q 15,11.8 18,13" stroke={p.desertDetail} strokeWidth="0.15" fill="none" opacity="0.3" style={T} />
      <path d="M 20,6 Q 22.5,5 25,6" stroke={p.desertDetail} strokeWidth="0.15" fill="none" opacity="0.3" style={T} />

      {/* Arid transition zone (around 天水) */}
      <path
        d={`
          M 28,17 L 34,16 L 40,18 L 42,21
          L 40,24 L 36,25 L 31,24
          L 27,22 L 26,19.5 Z
        `}
        fill={p.aridZone}
        stroke="none"
        opacity="0.5"
        style={T}
      />


      {/* ==================== 6. RIVERS ==================== */}

      {/* 黃河 Yellow River - upper course */}
      <path
        d={`
          M 5,20
          Q 10,18 15,16
          Q 20,14 25,12
          Q 30,10 35,9
          Q 40,8.5 43,10
          Q 46,12 48,15
          Q 50,17 53,18
        `}
        stroke={p.riverMajor}
        strokeWidth="0.5"
        fill="none"
        opacity="0.8"
        strokeLinecap="round"
        style={T}
      />

      {/* Yellow River middle course (flows east through 中原) */}
      <path
        d={`
          M 53,18
          Q 56,19 58,20
          Q 62,22 66,23.5
          Q 70,24.5 74,25
          Q 78,25.5 82,26
          Q 85,26.5 87,27
        `}
        stroke={p.riverMajor}
        strokeWidth="0.5"
        fill="none"
        opacity="0.8"
        strokeLinecap="round"
        style={T}
      />

      {/* Yellow River entering sea (near 北海) */}
      <path
        d="M 87,27 Q 89,27.5 91,28"
        stroke={p.riverMajor}
        strokeWidth="0.4"
        fill="none"
        opacity="0.6"
        strokeLinecap="round"
        style={T}
      />

      {/* 渭水 Wei River (flows through 長安) */}
      <path
        d="M 30,26 Q 35,27 40,27.5 Q 43,27.8 46,28 Q 50,28.5 53,29"
        stroke={p.riverMinor}
        strokeWidth="0.3"
        fill="none"
        opacity="0.6"
        strokeLinecap="round"
        style={T}
      />

      {/* 長江 Yangtze River - upper (from Sichuan through Three Gorges) */}
      <path
        d={`
          M 15,53
          Q 20,52 25,51
          Q 28,50 31,49.5
          Q 34,49 37,50
          Q 40,51 43,52
        `}
        stroke={p.riverMajor}
        strokeWidth="0.6"
        fill="none"
        opacity="0.85"
        strokeLinecap="round"
        style={T}
      />

      {/* Middle Yangtze (through 江陵/江夏/柴桑) */}
      <path
        d={`
          M 43,52
          Q 46,52.5 49,52
          Q 52,51.5 54,51
          Q 56,50.5 58,50
          Q 61,49.5 64,50
          Q 67,50.5 70,51
          Q 72,51.5 74,52
        `}
        stroke={p.riverMajor}
        strokeWidth="0.6"
        fill="none"
        opacity="0.85"
        strokeLinecap="round"
        style={T}
      />

      {/* Lower Yangtze (through 廬江/建業 to sea) */}
      <path
        d={`
          M 74,52
          Q 76,51 78,49
          Q 79,48 80,47
          Q 81.5,46 83,45.5
          Q 85,45 87,44.5
        `}
        stroke={p.riverMajor}
        strokeWidth="0.5"
        fill="none"
        opacity="0.8"
        strokeLinecap="round"
        style={T}
      />

      {/* 漢水 Han River (from 漢中 through 襄陽 to 江夏) */}
      <path
        d={`
          M 39,34
          Q 42,36 45,38
          Q 48,40 51,42
          Q 53,44 55,46
          Q 57,48 59,49.5
        `}
        stroke={p.riverMinor}
        strokeWidth="0.35"
        fill="none"
        opacity="0.65"
        strokeLinecap="round"
        style={T}
      />

      {/* 淮河 Huai River (between Yellow River and Yangtze, through 壽春) */}
      <path
        d={`
          M 53,38
          Q 57,38.5 61,39
          Q 65,39.5 69,40
          Q 72,40.5 75,41
          Q 78,41.5 81,42
        `}
        stroke={p.riverMinor}
        strokeWidth="0.3"
        fill="none"
        opacity="0.55"
        strokeLinecap="round"
        style={T}
      />

      {/* 嘉陵江 Jialing River (through 梓潼 to 成都) */}
      <path
        d="M 31,26 Q 32,30 32.5,34 Q 33,38 32,42 Q 31,46 30,49"
        stroke={p.riverMinor}
        strokeWidth="0.25"
        fill="none"
        opacity="0.5"
        strokeLinecap="round"
        style={T}
      />

      {/* 湘江 Xiang River (through 長沙 area) */}
      <path
        d="M 59,50 Q 59.5,53 60,56 Q 60,58 59.5,60 Q 59,63 58,66"
        stroke={p.riverMinor}
        strokeWidth="0.25"
        fill="none"
        opacity="0.5"
        strokeLinecap="round"
        style={T}
      />

      {/* 贛江 Gan River (through south of 柴桑) */}
      <path
        d="M 71,52 Q 71.5,55 71.8,58 Q 72,60 71.8,62 Q 71.5,65 71,68"
        stroke={p.riverMinor}
        strokeWidth="0.25"
        fill="none"
        opacity="0.5"
        strokeLinecap="round"
        style={T}
      />


      {/* ==================== 7. LAKES ==================== */}

      {/* 洞庭湖 Dongting Lake (near 江陵/長沙) */}
      <ellipse cx="55.5" cy="53" rx="2.5" ry="1.8" fill={p.lake} opacity="0.7" style={T} />
      <ellipse cx="55.5" cy="53" rx="2" ry="1.4" fill={p.lakeHighlight} opacity="0.4" style={T} />

      {/* 鄱陽湖 Poyang Lake (near 柴桑) */}
      <ellipse cx="71" cy="53" rx="2" ry="2.2" fill={p.lake} opacity="0.7" style={T} />
      <ellipse cx="71" cy="53" rx="1.5" ry="1.7" fill={p.lakeHighlight} opacity="0.4" style={T} />

      {/* 太湖 Tai Lake (near 建業/會稽) */}
      <ellipse cx="83" cy="48" rx="1.5" ry="1.2" fill={p.lake} opacity="0.6" style={T} />


      {/* ==================== 8. COAST FOAM ==================== */}

      {/* Northern coastline foam */}
      <path
        d={`
          M 87,10 Q 86,12 85.5,15 Q 84.8,18 84.5,21 Q 84,24 83.8,27
          Q 83.5,30 83,33 Q 82.5,36 82,38 Q 81.5,40 81.2,42
        `}
        stroke={p.coastFoam}
        strokeWidth="0.2"
        fill="none"
        opacity="0.4"
        strokeDasharray="0.8,0.4"
        style={T}
      />

      {/* Southern coastline foam */}
      <path
        d={`
          M 87,44.5 Q 88,47 89,50 Q 89.5,53 88.8,56
          Q 88,58 86.5,60 Q 84.5,62 82.5,63.5
          Q 80,65 78,66.5 Q 76,68 74.5,70
          Q 73,72 72,74 Q 71,76 70,77.5
        `}
        stroke={p.coastFoam}
        strokeWidth="0.2"
        fill="none"
        opacity="0.4"
        strokeDasharray="0.8,0.4"
        style={T}
      />


      {/* ==================== 9. SEASONAL OVERLAYS ==================== */}

      {/* ── Winter: Snow on mountains and northern regions ── */}
      {season === 'winter' && (
        <g className="winter-overlay">
          {/* Snow blanket on northern land (y < 20 band) */}
          <rect
            x="0" y="0" width="80" height="18"
            fill="white" opacity="0.12"
            style={{ transition: 'opacity 1.5s' }}
          />

          {/* Snow on Taihang mountains */}
          <path
            d={`
              M 56,8 L 58,10 L 59,13 L 60,16
              L 60.5,19 L 61,22 L 61,25 L 60,28
              L 58.5,26 L 57.5,23 L 57,20 L 56.5,17
              L 55.5,14 L 54.5,11 Z
            `}
            fill="white"
            opacity="0.2"
          />

          {/* Snow on Yan mountains */}
          <path
            d={`
              M 62,5 L 68,4 L 74,5 L 80,5.5 L 85,7
              L 84,9.5 L 80,9 L 75,8.5 L 70,8 L 65,7.5 L 62,7 Z
            `}
            fill="white"
            opacity="0.22"
          />

          {/* Snow on Qinling */}
          <path
            d={`
              M 35,28 L 40,27 L 44,28 L 48,29
              L 52,30 L 55,31 L 56,34
              L 54,35 L 51,34 L 47,33
              L 43,32 L 39,31 L 36,30 Z
            `}
            fill="white"
            opacity="0.18"
          />

          {/* Snow on Daba mountains */}
          <path
            d={`
              M 25,33 L 30,31 L 35,30 L 38,31
              L 39,34 L 38,37 L 35,36
              L 31,35.5 L 27,35 L 25,34.5 Z
            `}
            fill="white"
            opacity="0.15"
          />

          {/* Snow on Northern plateau */}
          <path
            d={`
              M 10,6 L 20,4 L 35,5 L 45,6 L 53,7
              L 54,10 L 53,13 L 50,14
              L 44,13.5 L 38,13 L 30,12
              L 22,11 L 15,10 L 10,9 Z
            `}
            fill="white"
            opacity="0.2"
          />

          {/* Snow on desert (lighter) */}
          <path
            d={`
              M 5,5 L 15,3 L 25,4 L 31,7
              L 33,11 L 32,15 L 29,17 L 25,18
              L 20,17.5 L 15,16 L 10,15
              L 6,13 L 5,10 Z
            `}
            fill="white"
            opacity="0.1"
          />

          {/* Scattered snowflake dots across northern terrain */}
          {[
            [12, 7], [22, 9], [32, 8], [42, 10], [48, 6],
            [55, 5], [63, 8], [72, 7], [78, 10], [83, 12],
            [15, 13], [25, 11], [38, 15], [46, 14], [52, 12],
            [64, 14], [70, 16], [76, 18], [80, 15], [68, 6],
            [19, 5], [28, 6], [37, 11], [43, 8], [58, 7],
            [66, 11], [74, 13], [82, 9], [50, 9], [60, 3],
          ].map(([cx, cy], i) => (
            <circle
              key={`snow-${i}`}
              cx={cx}
              cy={cy}
              r={0.2 + (i % 3) * 0.1}
              fill="white"
              opacity={0.3 + (i % 4) * 0.1}
            />
          ))}
        </g>
      )}

      {/* ── Spring: Cherry blossom dots near 長安, 洛陽, 襄陽 ── */}
      {season === 'spring' && (
        <g className="spring-overlay">
          {/* Blossom clusters near 長安 (45,28) */}
          {[
            [43.2, 26.5, 0.35, '#f9b4c2'],
            [44.8, 27.2, 0.3, '#f7a0b2'],
            [46.5, 26.8, 0.4, '#f9c0cc'],
            [44.0, 29.2, 0.3, '#f7a0b2'],
            [45.5, 29.8, 0.35, '#f9b4c2'],
            [43.5, 28.0, 0.25, '#fcd0d8'],
            [46.8, 28.5, 0.3, '#f9b4c2'],
            [44.5, 26.0, 0.28, '#f7a0b2'],
          ].map(([cx, cy, r, fill], i) => (
            <circle
              key={`blossom-changan-${i}`}
              cx={cx}
              cy={cy}
              r={r as number}
              fill={fill as string}
              opacity={0.6 + (i % 3) * 0.1}
            />
          ))}

          {/* Blossom clusters near 洛陽 (56,30) */}
          {[
            [54.5, 28.5, 0.35, '#f9b4c2'],
            [55.8, 29.0, 0.4, '#f7a0b2'],
            [57.2, 28.8, 0.3, '#f9c0cc'],
            [56.5, 31.5, 0.35, '#f7a0b2'],
            [55.0, 31.0, 0.3, '#f9b4c2'],
            [57.8, 30.5, 0.28, '#fcd0d8'],
            [54.2, 30.0, 0.32, '#f9b4c2'],
            [57.5, 29.5, 0.25, '#f7a0b2'],
          ].map(([cx, cy, r, fill], i) => (
            <circle
              key={`blossom-luoyang-${i}`}
              cx={cx}
              cy={cy}
              r={r as number}
              fill={fill as string}
              opacity={0.55 + (i % 3) * 0.12}
            />
          ))}

          {/* Blossom clusters near 襄陽 (55,47) */}
          {[
            [53.5, 45.5, 0.35, '#f9b4c2'],
            [54.8, 46.2, 0.3, '#f7a0b2'],
            [56.2, 45.8, 0.4, '#f9c0cc'],
            [55.5, 48.5, 0.3, '#f7a0b2'],
            [54.0, 48.0, 0.35, '#f9b4c2'],
            [56.8, 47.5, 0.28, '#fcd0d8'],
            [53.2, 47.0, 0.3, '#f9b4c2'],
            [56.5, 46.5, 0.25, '#f7a0b2'],
          ].map(([cx, cy, r, fill], i) => (
            <circle
              key={`blossom-xiangyang-${i}`}
              cx={cx}
              cy={cy}
              r={r as number}
              fill={fill as string}
              opacity={0.55 + (i % 3) * 0.12}
            />
          ))}

          {/* Scattered petals drifting across central plains */}
          {[
            [48, 24, 0.2], [51, 26, 0.18], [59, 25, 0.22],
            [62, 28, 0.2], [50, 33, 0.18], [53, 36, 0.22],
            [47, 40, 0.2], [60, 42, 0.18], [52, 44, 0.22],
            [58, 34, 0.2], [64, 32, 0.18], [42, 30, 0.22],
          ].map(([cx, cy, r], i) => (
            <circle
              key={`petal-${i}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="#f9b4c2"
              opacity={0.35 + (i % 3) * 0.1}
            />
          ))}
        </g>
      )}

      {/* ── Autumn: Falling leaf dots across plains ── */}
      {season === 'autumn' && (
        <g className="autumn-overlay">
          {/* Scattered leaves across Central Plains and North China */}
          {[
            // Central Plains
            [52, 23, '#d4880a'], [56, 25, '#c87a0e'], [60, 22, '#e0a020'],
            [64, 24, '#d49010'], [68, 26, '#c87a0e'], [72, 23, '#d4880a'],
            [55, 28, '#e0a020'], [62, 30, '#c87a0e'], [58, 32, '#d49010'],
            [66, 28, '#d4880a'], [70, 30, '#e0a020'], [74, 27, '#c87a0e'],

            // North China Plain
            [62, 13, '#d49010'], [66, 15, '#c87a0e'], [70, 12, '#d4880a'],
            [74, 14, '#e0a020'], [78, 16, '#c87a0e'], [82, 13, '#d49010'],
            [64, 18, '#d4880a'], [72, 20, '#e0a020'], [76, 18, '#c87a0e'],

            // Jing Province plains
            [48, 40, '#d49010'], [52, 42, '#c87a0e'], [56, 44, '#d4880a'],
            [50, 46, '#e0a020'], [54, 48, '#c87a0e'], [58, 46, '#d49010'],
            [46, 44, '#d4880a'], [60, 40, '#e0a020'], [52, 50, '#c87a0e'],

            // Sichuan Basin
            [24, 38, '#d49010'], [28, 40, '#c87a0e'], [32, 42, '#d4880a'],
            [26, 44, '#e0a020'], [30, 46, '#c87a0e'], [34, 44, '#d49010'],

            // Eastern plains
            [74, 34, '#d4880a'], [78, 36, '#e0a020'], [76, 40, '#c87a0e'],
            [80, 38, '#d49010'], [72, 42, '#d4880a'], [78, 44, '#e0a020'],

            // Southern areas (fewer, warmer tones)
            [50, 58, '#d49010'], [56, 60, '#c87a0e'], [62, 58, '#d4880a'],
            [54, 62, '#e0a020'], [60, 64, '#c87a0e'], [48, 56, '#d49010'],
          ].map(([cx, cy, fill], i) => (
            <circle
              key={`leaf-${i}`}
              cx={cx as number}
              cy={cy as number}
              r={0.2 + (i % 4) * 0.08}
              fill={fill as string}
              opacity={0.4 + (i % 3) * 0.12}
            />
          ))}

          {/* Larger leaf clusters in key areas */}
          {[
            [55, 24], [63, 26], [69, 22], [76, 25],
            [50, 38], [56, 42], [48, 48], [62, 36],
          ].map(([cx, cy], i) => (
            <g key={`leaf-cluster-${i}`}>
              <circle cx={cx - 0.3} cy={cy} r={0.22} fill="#c87a0e" opacity="0.5" />
              <circle cx={cx + 0.3} cy={cy - 0.2} r={0.18} fill="#d4880a" opacity="0.45" />
              <circle cx={cx} cy={cy + 0.3} r={0.2} fill="#e0a020" opacity="0.4" />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}
