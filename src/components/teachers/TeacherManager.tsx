import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Teacher, BeltType } from '../../types';
import { BeltBadge } from '../belts/BeltBadge';
import { DEFAULT_BLACK_GI_AVATAR } from '../../constants/avatar';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  Award,
  BookOpen,
  Trash2,
  Edit3,
  X,
  CheckCircle2,
  Calendar,
  MessageSquare,
  ShieldCheck,
  UserPlus
} from 'lucide-react';

export const TeacherManager: React.FC = () => {
  const { teachers, addTeacher, updateTeacher, deleteTeacher, classes } = useData();

  const [search, setSearch] = useState('');
  const [selectedBelt, setSelectedBelt] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    belt: 'PRETA' as BeltType,
    degrees: 1,
    specialty: 'Jiu-Jitsu Fundamental & Avançado',
    cref: '',
    photoUrl: DEFAULT_BLACK_GI_AVATAR,
    bio: '',
    active: true,
    startDate: new Date().toISOString().split('T')[0],
  });

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                          t.specialty.toLowerCase().includes(search.toLowerCase()) ||
                          (t.cref && t.cref.toLowerCase().includes(search.toLowerCase()));
    const matchesBelt = selectedBelt === 'ALL' || t.belt === selectedBelt;
    return matchesSearch && matchesBelt;
  });

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      belt: 'PRETA',
      degrees: 1,
      specialty: 'Jiu-Jitsu Fundamental & Avançado',
      cref: '',
      photoUrl: DEFAULT_BLACK_GI_AVATAR,
      bio: '',
      active: true,
      startDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      belt: teacher.belt,
      degrees: teacher.degrees,
      specialty: teacher.specialty,
      cref: teacher.cref || '',
      photoUrl: teacher.photoUrl,
      bio: teacher.bio || '',
      active: teacher.active,
      startDate: teacher.startDate,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    if (editingTeacher) {
      updateTeacher(editingTeacher.id, formData);
    } else {
      addTeacher(formData);
    }

    setIsModalOpen(false);
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;
    const msg = `Olá, ${name}! Contato do sistema BJJCRON. Oss!`;
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const photoPresets = [
    DEFAULT_BLACK_GI_AVATAR,
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-neutral-900 to-amber-950/60 border border-slate-800 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-amber-400" />
            <h3 className="text-xl font-bold text-slate-100">
              Corpo Docente & Cadastro de Professores
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Cadastre instrutores, mestres e monitores com registros de faixa, CREF e turmas sob responsabilidade.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar Novo Professor
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Total de Professores</span>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{teachers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Professores Faixa Preta</span>
            <p className="text-2xl font-black text-slate-100 mt-0.5">
              {teachers.filter(t => t.belt === 'PRETA').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Turmas Ativas Mapeadas</span>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{classes.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, especialidade ou CREF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div>
          <select
            value={selectedBelt}
            onChange={e => setSelectedBelt(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="ALL">Todas as Faixas</option>
            <option value="PRETA">Faixa Preta</option>
            <option value="MARROM">Faixa Marrom</option>
            <option value="ROXA">Faixa Roxa</option>
            <option value="AZUL">Faixa Azul</option>
          </select>
        </div>
      </div>

      {/* Teachers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers.map(teacher => {
          const teacherClasses = classes.filter(
            c => c.professorId === teacher.id || c.professorName.toLowerCase().includes(teacher.name.toLowerCase().split(' ')[0])
          );

          return (
            <div
              key={teacher.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col justify-between space-y-4 shadow-lg relative group hover:border-slate-700 transition-all"
            >
              <div className="space-y-4">
                {/* Header Profile */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={teacher.photoUrl}
                      alt={teacher.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400/50 shadow-md"
                    />
                    <div>
                      <h4 className="font-extrabold text-base text-slate-100 line-clamp-1">
                        {teacher.name}
                      </h4>
                      <div className="mt-1">
                        <BeltBadge belt={teacher.belt} stripes={teacher.degrees} size="sm" />
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      teacher.active
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {teacher.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      Especialidade:
                    </span>
                    <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                      {teacher.specialty}
                    </span>
                  </div>

                  {teacher.cref && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        CREF:
                      </span>
                      <span className="font-mono text-slate-300 font-bold">{teacher.cref}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Email:
                    </span>
                    <span className="text-slate-300 truncate max-w-[150px]">{teacher.email}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      Telefone:
                    </span>
                    <span className="text-slate-300 font-mono">{teacher.phone}</span>
                  </div>
                </div>

                {/* Bio / Description */}
                {teacher.bio && (
                  <p className="text-xs text-slate-400 line-clamp-2 italic bg-slate-950/30 p-2 rounded-lg border border-slate-800/40">
                    "{teacher.bio}"
                  </p>
                )}

                {/* Classes Taught */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                    Turmas Sob Instrução ({teacherClasses.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {teacherClasses.length === 0 ? (
                      <span className="text-[10px] text-slate-600 italic">Nenhuma turma vinculada</span>
                    ) : (
                      teacherClasses.map(c => (
                        <span
                          key={c.id}
                          className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold"
                        >
                          {c.title}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => handleWhatsApp(teacher.phone, teacher.name)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(teacher)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    title="Editar Professor"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Remover o cadastro do professor ${teacher.name}?`)) {
                        deleteTeacher(teacher.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700"
                    title="Excluir Professor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add/Edit Teacher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">
                  {editingTeacher ? 'Editar Cadastro de Professor' : 'Novo Cadastro de Professor / Instrutor'}
                </h3>
                <p className="text-xs text-slate-400">
                  Preencha as informações do mestre ou instrutor responsável pelas aulas.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prof. Gabriel 'Fera' Santos"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="professor@bjjcron.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98765-4321"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Faixa Atual:</label>
                  <select
                    value={formData.belt}
                    onChange={e => setFormData({ ...formData, belt: e.target.value as BeltType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="PRETA">Faixa Preta</option>
                    <option value="MARROM">Faixa Marrom</option>
                    <option value="ROXA">Faixa Roxa</option>
                    <option value="AZUL">Faixa Azul</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Graus na Faixa (0-6):</label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={formData.degrees}
                    onChange={e => setFormData({ ...formData, degrees: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Registro CREF (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 012345-G/SP"
                    value={formData.cref}
                    onChange={e => setFormData({ ...formData, cref: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Especialidade Principal</label>
                  <input
                    type="text"
                    placeholder="Ex: Gi, No-Gi, Competição, Kids"
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">URL da Foto do Perfil</label>
                <input
                  type="text"
                  value={formData.photoUrl}
                  onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-400 font-bold">Avatares Sugeridos:</span>
                  {photoPresets.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({ ...formData, photoUrl: url })}
                      className={`w-7 h-7 rounded-full overflow-hidden border ${
                        formData.photoUrl === url ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-slate-800'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Resumo Curricular / Minibio</label>
                <textarea
                  rows={2}
                  placeholder="Experiência no tatame, títulos principais, observações..."
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                >
                  {editingTeacher ? 'Atualizar Cadastro' : 'Salvar Professor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
