import React, { useState, useEffect } from 'react';
import { Student, AcademyConfig, BeltType } from '../../types';
import { Award, Printer, Edit3, RotateCcw, Palette } from 'lucide-react';

interface OfficialGraduationCertificateProps {
  student: Student;
  academyConfig: AcademyConfig;
  belt?: BeltType;
  stripes?: number;
}

// Convert all-caps or mixed string to clean Title Case ("PEDRO LORÊDO BORGES" -> "Pedro Lorêdo Borges")
function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => {
      const prepositions = ['de', 'da', 'do', 'dos', 'das', 'e'];
      if (prepositions.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// 100% Exact High-Fidelity Baroque Filigree Corner Scrollwork matching the reference diploma
const ExactDiplomaCornerOrnament: React.FC<{
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme: 'black' | 'gold' | 'silver';
}> = ({ position, theme }) => {
  const transform =
    position === 'top-right'
      ? 'scale(-1, 1)'
      : position === 'bottom-left'
      ? 'scale(1, -1)'
      : position === 'bottom-right'
      ? 'scale(-1, -1)'
      : 'none';

  const gradientId = `corner-gold-grad-${position}`;
  
  let strokeStyle = '#111827';
  let fillStyle = '#111827';

  if (theme === 'gold') {
    strokeStyle = `url(#${gradientId})`;
    fillStyle = `url(#${gradientId})`;
  } else if (theme === 'silver') {
    strokeStyle = '#4b5563';
    fillStyle = '#4b5563';
  }

  return (
    <svg
      viewBox="0 0 280 240"
      className="w-[260px] h-[220px] pointer-events-none select-none shrink-0"
      style={{ transform, transformOrigin: 'center' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9B7126" />
          <stop offset="25%" stopColor="#D4AF37" />
          <stop offset="45%" stopColor="#FBF0B9" />
          <stop offset="70%" stopColor="#DFB743" />
          <stop offset="90%" stopColor="#B38022" />
          <stop offset="100%" stopColor="#8C5C12" />
        </linearGradient>
      </defs>

      {/* --- 1. CORNER CREST TIP (Pointed Bud + Lateral Leaves) --- */}
      <g stroke={strokeStyle} fill={fillStyle}>
        {/* Outermost corner sharp leaf point */}
        <path d="M 12,12 C 16,14 18,18 20,24 C 18,20 14,16 12,12 Z" strokeWidth="0.5" />
        {/* Left top petal */}
        <path d="M 16,18 C 26,16 38,20 44,30 C 36,30 26,26 18,22 Z" strokeWidth="0.5" />
        {/* Left bottom petal */}
        <path d="M 18,16 C 16,26 20,38 30,44 C 30,36 26,26 22,18 Z" strokeWidth="0.5" />
        {/* Center droplet & ring */}
        <circle cx="28" cy="28" r="3.2" />
        <circle cx="28" cy="28" r="6" fill="none" strokeWidth="1.5" />
      </g>

      {/* --- 2. MAIN MEDALLION HEART & INNER KNOT LOOPS --- */}
      <g fill="none" stroke={strokeStyle} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer sweeping framing arc lines */}
        <path d="M 44,30 C 72,24 110,26 150,42" />
        <path d="M 30,44 C 24,72 26,110 42,150" />

        {/* Central Heart/Oval medallion frame */}
        <path d="M 38,38 C 58,24 82,30 92,50 C 100,66 94,82 78,92 C 62,100 46,94 38,78 C 30,62 26,44 38,38 Z" />

        {/* Inner intertwining C-scroll loops */}
        <path d="M 50,50 C 60,40 72,44 74,56 C 76,68 62,74 54,68 C 46,62 46,54 50,50 Z" />
        <path d="M 58,68 C 66,78 80,72 82,60 C 84,48 72,42 64,48" />

        {/* Lower interlocking symmetrical loops */}
        <path d="M 78,92 C 94,106 112,98 116,82 C 120,66 106,58 92,64 C 82,68 82,82 92,90" />
        <path d="M 92,78 C 106,94 98,112 82,116 C 66,120 58,106 64,92 C 68,82 82,82 90,92" />
      </g>

      {/* --- 3. HORIZONTAL VINES & LEAVES (Top Edge Flow) --- */}
      <g fill={fillStyle} stroke={strokeStyle} strokeLinecap="round" strokeLinejoin="round">
        {/* Leaf Cluster 1 */}
        <path
          d="M 94,32 C 110,20 134,22 148,32 C 132,36 118,42 110,50 C 100,42 96,34 94,32 Z"
          strokeWidth="0.8"
        />
        <path
          d="M 114,38 C 128,30 144,32 152,40 C 140,44 130,48 124,54 C 118,48 114,40 114,38 Z"
          strokeWidth="0.6"
          opacity="0.9"
        />
        <circle cx="148" cy="24" r="3.2" stroke="none" />

        {/* Leaf Cluster 2 */}
        <path
          d="M 152,28 C 172,16 200,20 214,34 C 198,38 184,46 174,56 C 164,44 154,34 152,28 Z"
          strokeWidth="0.8"
        />
        <path
          d="M 176,34 C 192,26 210,30 218,40 C 204,44 192,50 186,60 C 178,48 174,38 176,34 Z"
          strokeWidth="0.6"
          opacity="0.9"
        />
        <circle cx="212" cy="26" r="3.2" stroke="none" />

        {/* Leaf Cluster 3 & Outward End Spiral */}
        <path
          d="M 216,30 C 238,24 260,32 270,50 C 254,54 238,58 228,70 C 220,56 216,40 216,30 Z"
          strokeWidth="0.8"
        />
        <path
          d="M 270,50 C 276,56 278,66 270,72 C 262,76 254,74 252,64 C 250,56 258,50 266,52"
          fill="none"
          strokeWidth="2.4"
        />
        <circle cx="266" cy="40" r="2.8" stroke="none" />
      </g>

      {/* --- 4. VERTICAL VINES & LEAVES (Side Edge Flow) --- */}
      <g fill={fillStyle} stroke={strokeStyle} strokeLinecap="round" strokeLinejoin="round">
        {/* Leaf Cluster 1 */}
        <path
          d="M 32,94 C 20,110 22,134 32,148 C 36,132 42,118 50,110 C 42,100 34,96 32,94 Z"
          strokeWidth="0.8"
        />
        <path
          d="M 38,114 C 30,128 32,144 40,152 C 44,140 48,130 54,124 C 48,118 40,114 38,114 Z"
          strokeWidth="0.6"
          opacity="0.9"
        />
        <circle cx="24" cy="148" r="3.2" stroke="none" />

        {/* Leaf Cluster 2 */}
        <path
          d="M 28,152 C 16,172 20,200 34,214 C 38,198 46,184 56,174 C 44,164 34,154 28,152 Z"
          strokeWidth="0.8"
        />
        <path
          d="M 34,176 C 26,192 30,210 40,218 C 44,204 50,192 60,186 C 48,178 38,174 34,176 Z"
          strokeWidth="0.6"
          opacity="0.9"
        />
        <circle cx="26" cy="212" r="3.2" stroke="none" />

        {/* Leaf Cluster 3 & Downward End Spiral */}
        <path
          d="M 30,216 C 24,238 32,260 50,270 C 54,254 58,238 70,228 C 56,220 40,216 30,216 Z"
          strokeWidth="0.8"
        />
        <path
          d="M 50,270 C 56,276 66,278 72,270 C 76,262 74,254 64,252 C 56,250 50,258 52,266"
          fill="none"
          strokeWidth="2.4"
        />
        <circle cx="40" cy="266" r="2.8" stroke="none" />
      </g>
    </svg>
  );
};

// Martial Arts Top Emblem (Brasão Central com Lanças Cruzadas e Rosa dos Ventos)
const MartialArtsTopCrest: React.FC<{ academyLogo?: string; theme: 'black' | 'gold' | 'silver' }> = ({
  academyLogo,
  theme,
}) => {
  if (academyLogo && academyLogo.trim() !== '' && !academyLogo.includes('default')) {
    return (
      <div className="flex items-center justify-center">
        <img
          src={academyLogo}
          alt="Emblema da Academia"
          className="w-20 h-20 object-contain bg-transparent filter contrast-125"
        />
      </div>
    );
  }

  const crestGradId = `crest-gold-grad-${theme}`;
  let strokeColor = '#111827';
  let fillColor = '#111827';

  if (theme === 'gold') {
    strokeColor = `url(#${crestGradId})`;
    fillColor = `url(#${crestGradId})`;
  } else if (theme === 'silver') {
    strokeColor = '#374151';
    fillColor = '#374151';
  }

  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-[84px] h-[84px] shrink-0" fill={fillColor}>
        <defs>
          <linearGradient id={crestGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9B7126" />
            <stop offset="30%" stopColor="#D4AF37" />
            <stop offset="60%" stopColor="#FBF0B9" />
            <stop offset="85%" stopColor="#DFB743" />
            <stop offset="100%" stopColor="#8C5C12" />
          </linearGradient>
        </defs>

        {/* Crossed Martial Halberd Axes & Spearheads */}
        <line x1="12" y1="12" x2="88" y2="88" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
        <polygon points="7,7 21,9 9,21" />
        <polygon points="93,93 79,91 91,79" />

        <line x1="88" y1="12" x2="12" y2="88" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
        <polygon points="93,7 79,9 91,21" />
        <polygon points="7,93 21,91 9,79" />

        {/* 8-Point Compass Points */}
        <polygon points="50,2 55,24 50,28 45,24" />
        <polygon points="50,98 55,76 50,72 45,76" />
        <polygon points="2,50 24,55 28,50 24,45" />
        <polygon points="98,50 76,55 72,50 76,45" />

        {/* Central Diamond Frame */}
        <polygon points="50,18 82,50 50,82 18,50" fill="#ffffff" stroke={strokeColor} strokeWidth="3.2" />
        <polygon points="50,23 77,50 50,77 23,50" fill={fillColor} />

        {/* Inner Diamond Star */}
        <polygon points="50,30 56,46 72,50 56,54 50,70 44,54 28,50 44,46" fill="#ffffff" />
        <circle cx="50" cy="50" r="7" fill={fillColor} />

        {/* Monogram Letters: J (Top), E (Left), O (Right), X (Bottom & Center) */}
        <text x="50" y="41" fontSize="8" fontWeight="900" textAnchor="middle" fill="#ffffff" fontFamily="sans-serif">J</text>
        <text x="37" y="53" fontSize="7.5" fontWeight="900" textAnchor="middle" fill="#ffffff" fontFamily="sans-serif">E</text>
        <text x="63" y="53" fontSize="7.5" fontWeight="900" textAnchor="middle" fill="#ffffff" fontFamily="sans-serif">O</text>
        <text x="50" y="65" fontSize="8" fontWeight="900" textAnchor="middle" fill="#ffffff" fontFamily="sans-serif">X</text>
        <text x="50" y="53" fontSize="7" fontWeight="900" textAnchor="middle" fill="#ffffff" fontFamily="sans-serif">X</text>
      </svg>
    </div>
  );
};

export const OfficialGraduationCertificate: React.FC<OfficialGraduationCertificateProps> = ({
  student,
  academyConfig,
  belt = student.belt,
  stripes = student.stripes,
}) => {
  // Format Default Belt Label in Upper Case (e.g. "LARANJA COM PRETO", "AZUL", "PRETA")
  const getDefaultBeltText = (b: BeltType, s?: number) => {
    let name = '';
    switch (b) {
      case 'BRANCA': name = 'BRANCA'; break;
      case 'CINZA': name = 'CINZA'; break;
      case 'AMARELA': name = 'AMARELA'; break;
      case 'LARANJA': name = 'LARANJA'; break;
      case 'VERDE': name = 'VERDE'; break;
      case 'AZUL': name = 'AZUL'; break;
      case 'ROXA': name = 'ROXA'; break;
      case 'MARROM': name = 'MARROM'; break;
      case 'PRETA': name = 'PRETA'; break;
      default: name = `${b}`;
    }
    if (s && s > 0) {
      name += ` - ${s}º GRAU`;
    }
    return name;
  };

  // Format Default Date String (e.g. "Goiânia, 21 de Dezembro de 2025")
  const getDefaultDateText = () => {
    const d = student.lastGraduationDate
      ? new Date(student.lastGraduationDate + 'T12:00:00')
      : new Date();

    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const city = (academyConfig as any).city || 'Goiânia';

    return `${city}, ${day} de ${month} de ${year}`;
  };

  // Default Academy Title
  const defaultAcademyTitle = () => {
    const raw = academyConfig.fantasyName || academyConfig.name || 'ONE-X';
    const clean = raw.trim().toUpperCase();
    if (clean.startsWith('A ESCOLA DE JIU-JITSU')) {
      return clean;
    }
    return `A ESCOLA DE JIU-JITSU ${clean}`;
  };

  // Color Theme: 'black' (Default exact to user image), 'gold' (Gold), 'silver' (Silver)
  const [ornamentTheme, setOrnamentTheme] = useState<'black' | 'gold' | 'silver'>('black');

  // Editable Certificate Fields
  const [academyName, setAcademyName] = useState(defaultAcademyTitle());
  const [studentName, setStudentName] = useState(toTitleCase(student.name));
  const [beltTitle, setBeltTitle] = useState(getDefaultBeltText(belt, stripes));
  const [professorName, setProfessorName] = useState(
    academyConfig.headCoachName || 'Rodolfo Ferreira de Souza'
  );
  const [professorRole, setProfessorRole] = useState('Professor responsável');
  const [locationAndDate, setLocationAndDate] = useState(getDefaultDateText());

  // Edit Panel State
  const [isEditing, setIsEditing] = useState(false);

  // Sync state when selected student or academy config changes
  useEffect(() => {
    setAcademyName(defaultAcademyTitle());
    setStudentName(toTitleCase(student.name));
    setBeltTitle(getDefaultBeltText(belt, stripes));
    setProfessorName(academyConfig.headCoachName || 'Rodolfo Ferreira de Souza');
    setProfessorRole('Professor responsável');
    setLocationAndDate(getDefaultDateText());
  }, [student.id, student.name, student.belt, student.stripes, student.lastGraduationDate, academyConfig.fantasyName, academyConfig.name, academyConfig.headCoachName]);

  const handleResetToDefault = () => {
    setAcademyName(defaultAcademyTitle());
    setStudentName(toTitleCase(student.name));
    setBeltTitle(getDefaultBeltText(belt, stripes));
    setProfessorName(academyConfig.headCoachName || 'Rodolfo Ferreira de Souza');
    setProfessorRole('Professor responsável');
    setLocationAndDate(getDefaultDateText());
    setOrnamentTheme('black');
  };

  return (
    <div className="space-y-4">
      {/* Action Control Bar (Hidden on Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl print:hidden">
        <div>
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Certificado Oficial de Graduação (Modelo Idêntico)
          </h4>
          <p className="text-xs text-slate-400">
            Proporções, fontes, arabescos de cantoneira e espaçamentos 100% fiéis ao diploma físico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Color Theme Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 mr-1">
            <button
              type="button"
              onClick={() => setOrnamentTheme('black')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ornamentTheme === 'black'
                  ? 'bg-slate-700 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Preto Oficial (Original)"
            >
              <span>Preto Oficial</span>
            </button>
            <button
              type="button"
              onClick={() => setOrnamentTheme('gold')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ornamentTheme === 'gold'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Arabescos Dourados"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Dourado</span>
            </button>
            <button
              type="button"
              onClick={() => setOrnamentTheme('silver')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ornamentTheme === 'silver'
                  ? 'bg-slate-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grafite / Prata"
            >
              <span>Grafite</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isEditing
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Concluir Edição' : 'Editar Textos'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Certificado</span>
          </button>
        </div>
      </div>

      {/* Editing Form Drawer */}
      {isEditing && (
        <div className="bg-slate-900 border border-amber-500/40 p-5 rounded-2xl space-y-4 print:hidden animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              Personalizar Campos do Diploma
            </span>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar Padrão
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Título da Escola / Academia:</label>
              <input
                type="text"
                value={academyName}
                onChange={e => setAcademyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Nome do Aluno Graduado:</label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Título da Faixa (Ex: LARANJA COM PRETO):</label>
              <input
                type="text"
                value={beltTitle}
                onChange={e => setBeltTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Nome do Professor / Mestre:</label>
              <input
                type="text"
                value={professorName}
                onChange={e => setProfessorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Cargo / Título do Professor:</label>
              <input
                type="text"
                value={professorRole}
                onChange={e => setProfessorRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Cidade e Data:</label>
              <input
                type="text"
                value={locationAndDate}
                onChange={e => setLocationAndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATE DISPLAY & PRINT CONTAINER (A4 Landscape Layout) */}
      <div className="w-full overflow-x-auto pb-6 flex justify-center">
        <div
          id="official-graduation-certificate"
          className="bg-white text-black w-[1000px] min-w-[1000px] h-[700px] p-8 relative flex flex-col justify-between shadow-2xl rounded-xl border border-slate-200 select-text overflow-hidden print:w-full print:h-screen print:min-w-0 print:p-8 print:m-0 print:border-none print:shadow-none print:rounded-none print:bg-white"
        >
          {/* Exact Replica Baroque Filigree Corner Ornaments with Color Theme */}
          <div className="absolute top-0 left-0 z-0">
            <ExactDiplomaCornerOrnament position="top-left" theme={ornamentTheme} />
          </div>
          <div className="absolute top-0 right-0 z-0">
            <ExactDiplomaCornerOrnament position="top-right" theme={ornamentTheme} />
          </div>
          <div className="absolute bottom-0 left-0 z-0">
            <ExactDiplomaCornerOrnament position="bottom-left" theme={ornamentTheme} />
          </div>
          <div className="absolute bottom-0 right-0 z-0">
            <ExactDiplomaCornerOrnament position="bottom-right" theme={ornamentTheme} />
          </div>

          {/* Top & Center Content Section */}
          <div className="relative z-10 flex flex-col items-center text-center px-16 pt-2">
            {/* 1. Top Martial Crest Emblem */}
            <div className="mb-2">
              <MartialArtsTopCrest academyLogo={academyConfig.logoUrl} theme={ornamentTheme} />
            </div>

            {/* 2. Academy Name (Bold Serif, Single Line, High Impact) */}
            <h1
              className="text-[32px] font-black uppercase text-black tracking-[0.06em] leading-tight"
              style={{ fontFamily: "'Playfair Display', 'Bodoni Moda', Georgia, serif" }}
            >
              {academyName}
            </h1>

            {/* 3. Subtitle ("certifica por mérito e reconhecimento que o aluno") */}
            <p
              className="text-[15px] font-medium text-[#222222] tracking-normal mt-2.5 mb-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              certifica por mérito e reconhecimento que o aluno
            </p>

            {/* 4. Student Name (Large Flowing Cursive Script Calligraphy) */}
            <div className="my-1 w-full flex items-center justify-center min-h-[72px]">
              <span
                className="text-[58px] text-black font-normal tracking-wide px-4 block leading-none text-center"
                style={{
                  fontFamily: "'Great Vibes', 'Alex Brush', cursive",
                }}
              >
                {studentName}
              </span>
            </div>

            {/* 5. Pre-Belt Line ("é merecedor do título de faixa") */}
            <p
              className="text-[15px] font-medium text-[#222222] tracking-normal mt-2 mb-1.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              é merecedor do título de faixa
            </p>

            {/* 6. Belt Title ("LARANJA COM PRETO", "PRETA", etc.) */}
            <h2
              className="text-[32px] font-black tracking-[0.08em] text-black uppercase leading-tight mt-1 mb-2"
              style={{ fontFamily: "'Playfair Display', 'Bodoni Moda', Georgia, serif" }}
            >
              {beltTitle.toUpperCase()}
            </h2>
          </div>

          {/* Bottom Area: Signature & Location/Date */}
          <div className="relative z-10 flex flex-col items-center justify-end pb-3 space-y-4">
            {/* Professor Signature Block */}
            <div className="flex flex-col items-center w-[330px]">
              {/* Handwritten Cursive Signature Overlapping the Line */}
              <div
                className="h-10 text-[38px] text-black font-normal flex items-end justify-center select-none -mb-1.5"
                style={{ fontFamily: "'Alex Brush', 'Great Vibes', cursive" }}
              >
                {toTitleCase(professorName)}.
              </div>

              {/* Solid Signature Line */}
              <div className="w-full border-b-[1.5px] border-black my-1"></div>

              {/* Professor Name & Role */}
              <p
                className="text-[13px] font-bold text-black tracking-wide text-center"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {toTitleCase(professorName)}
              </p>
              <p
                className="text-[11px] text-[#333333] text-center"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {professorRole}
              </p>
            </div>

            {/* Location & Date */}
            <div
              className="text-[12.5px] text-[#1f2937] tracking-wide text-center"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {locationAndDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
