import React, { useRef, useState } from 'react';
import { User } from '../../types';
import {
  Camera,
  Check,
  FileText,
  Lock,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  Unlink,
  Upload,
  User as UserIcon,
  UserCheck,
} from 'lucide-react';

interface Props {
  currentUser: User | null;
  users: User[];
  onUpdateUser: (updatedUser: User) => void;
  onUnlinkAuth: (targetUserId: string) => void;
  onLinkAuth?: (targetUserId: string, email: string) => void;
}

export const PerfilTab: React.FC<Props> = ({
  currentUser,
  users,
  onUpdateUser,
  onUnlinkAuth,
  onLinkAuth,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Profile editing states
  const [personalBio, setPersonalBio] = useState(currentUser?.bio || '');
  const [bioSavedNotification, setBioSavedNotification] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Admin states (Denis only)
  const [selectedUserForAdmin, setSelectedUserForAdmin] = useState<User | null>(null);
  const [adminAiDescDraft, setAdminAiDescDraft] = useState('');
  const [adminSaveNotification, setAdminSaveNotification] = useState(false);
  const [adminStatusFeedback, setAdminStatusFeedback] = useState<string | null>(null);
  const [assignmentMember, setAssignmentMember] = useState<User | null>(null);
  const [assignmentEmail, setAssignmentEmail] = useState('');
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div className="p-8 rounded-[26px] bg-white/[0.04] border border-white/10 text-center">
        <p className="text-zinc-400 text-sm">Por favor seleccioná un usuario para ver el perfil.</p>
      </div>
    );
  }

  const isDenisAdmin = currentUser.role === 'admin';

  // Handle avatar upload via file or camera
  const handleAvatarFile = (file: File) => {
    setAvatarError(null);
    if (!file.type.startsWith('image/')) { setAvatarError('Elegí una imagen válida.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const image = new Image();
      image.onload = () => {
        const size = 256;
        const scale = Math.min(size / image.width, size / image.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const avatarUrl = canvas.toDataURL('image/jpeg', 0.75);
        onUpdateUser({ ...currentUser, avatarUrl });
      };
      image.onerror = () => setAvatarError('No se pudo procesar la imagen.');
      image.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Save personal bio
  const handleSaveBio = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...currentUser,
      bio: personalBio.trim().slice(0, 280),
    });
    setBioSavedNotification(true);
    setTimeout(() => setBioSavedNotification(false), 2000);
  };

  // Save Denis's AI description update for any user
  const handleSaveAdminAiDescription = () => {
    if (!selectedUserForAdmin || !isDenisAdmin) return;
    onUpdateUser({
      ...selectedUserForAdmin,
      aiDescription: adminAiDescDraft.trim(),
    });
    setAdminSaveNotification(true);
    setTimeout(() => setAdminSaveNotification(false), 2000);
  };

  const openAssignment = (member: User) => {
    setAssignmentMember(member);
    setAssignmentEmail(member.linkedAuth?.accountEmail || '');
    setAssignmentError(null);
  };

  const saveAssignment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignmentMember || !onLinkAuth) return;
    const email = assignmentEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setAssignmentError('Ingresá un correo válido.');
      return;
    }
    const takenBy = users.find((member) => member.id !== assignmentMember.id && member.linkedAuth?.accountEmail.toLowerCase() === email);
    if (takenBy) {
      setAssignmentError(`Ese correo ya está asignado a ${takenBy.name}.`);
      return;
    }
    onLinkAuth(assignmentMember.id, email);
    setAdminStatusFeedback(`${assignmentMember.name} quedó vinculado a ${email}.`);
    setAssignmentMember(null);
  };

  return (
    <div className="space-y-4 pb-24 animate-fadeIn">
      {/* Main Profile Header Card */}
      <div className="p-5 rounded-[26px] bg-gradient-to-b from-white/[0.06] to-zinc-950/80 border border-white/15 backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col items-center text-center">
          {/* Avatar with Camera Overlay */}
          <div className="relative mb-3 group">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#0A84FF] to-[#5AC8FA] shadow-[0_0_20px_rgba(10,132,255,0.4)]">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-full h-full rounded-full object-cover bg-black"
              />
            </div>

            {/* Quick Change Avatar Buttons */}
            <div className="absolute bottom-0 right-0 flex items-center gap-1">
              {/* File upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full bg-[#0A84FF] text-white border-2 border-black hover:scale-105 active:scale-95 transition shadow-lg"
                title="Subir foto de perfil"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>

              {/* Camera take photo */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-2 rounded-full bg-zinc-800 text-white border-2 border-black hover:scale-105 active:scale-95 transition shadow-lg"
                title="Tomar foto con cámara"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Hidden native inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleAvatarFile(e.target.files[0]);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleAvatarFile(e.target.files[0]);
              }}
            />
          </div>

          {avatarError && <p className="mt-2 text-xs text-red-300">{avatarError}</p>}

          {/* User Name & Role */}
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>{currentUser.name}</span>
            {currentUser.role === 'admin' ? (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0A84FF] text-white shadow-[0_0_10px_#0A84FF]">
                Administrador
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-zinc-400 px-2 py-0.5 rounded-full bg-white/10">
                Miembro
              </span>
            )}
          </h2>

          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
            <span>🎂 Cumpleaños: {currentUser.birthday}</span>
            <span>•</span>
            <span>📍 Puerto Madero</span>
          </div>

          {/* Federated Auth Pill if linked */}
          {currentUser.linkedAuth && (
            <div className="mt-2 text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-[#30D158]" />
              <span>
                Vinculado a {currentUser.linkedAuth.provider === 'google' ? 'Google' : 'Apple'} (
                {currentUser.linkedAuth.accountEmail})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* DOBLE CAMPO DE PERFIL (Personal Bio vs. AI Description) */}
      <div className="space-y-3">
        {/* Field 1: Bio Personal (Editable by user, max 280 chars) */}
        <div className="p-4 rounded-[26px] bg-white/[0.04] border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <UserIcon className="w-4 h-4 text-[#0A84FF]" />
              <span>Bio Personal (Propia)</span>
            </div>
            <span className="text-[10px] text-zinc-500">{personalBio.length}/280 caracteres</span>
          </div>

          <form onSubmit={handleSaveBio} className="space-y-2.5">
            <textarea
              maxLength={280}
              rows={3}
              value={personalBio}
              onChange={(e) => setPersonalBio(e.target.value)}
              placeholder="Escribí unas palabras sobre vos..."
              className="w-full p-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs leading-relaxed focus:outline-none focus:border-[#0A84FF] transition"
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 italic">
                Editable por vos en cualquier momento.
              </span>
              <button
                id="btn-save-personal-bio"
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A84FF] hover:bg-[#0A84FF]/90 active:scale-95 text-xs font-bold text-white shadow transition"
              >
                {bioSavedNotification ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Guardado!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Bio</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Field 2: Descripción IA (Read-only for regular members; editable only by Denis) */}
        <div className="p-4 rounded-[26px] bg-white/[0.04] border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5AC8FA]">
              <Sparkles className="w-4 h-4" />
              <span>Descripción IA Integrada</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
              <Lock className="w-2.5 h-2.5 text-amber-400" />
              <span>Solo editable por Denis</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/70 border border-white/10 text-xs text-zinc-200 leading-relaxed italic">
            "{currentUser.aiDescription}"
          </div>

          <p className="text-[10px] text-zinc-500 mt-2">
            {isDenisAdmin
              ? 'Sos Denis: podés actualizar la personalidad IA de cualquier integrante en el panel de abajo.'
              : 'Esta personalidad fue generada por el grupo y solo Denis tiene la potestad de modificarla.'}
          </p>
        </div>
      </div>

      {/* PANEL ADMINISTRADOR EXCLUSIVO DE DENIS */}
      {isDenisAdmin && (
        <div className="p-5 rounded-[26px] bg-gradient-to-b from-[#0A84FF]/15 via-zinc-950/90 to-zinc-950 border-2 border-[#0A84FF]/40 shadow-[0_4px_30px_rgba(10,132,255,0.2)] space-y-5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0A84FF]" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Panel de Administrador (Denis)
            </h3>
          </div>

          <p className="text-xs text-zinc-400">
            Tenés la potestad exclusiva para definir <strong className="text-white">quién es quién</strong> en el grupo, reasignar cuentas de Google y editar las descripciones de la IA.
          </p>

          {/* Feedback banner */}
          {adminStatusFeedback && (
            <div className="p-3 rounded-xl bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] text-xs font-semibold flex items-center justify-between animate-fadeIn">
              <span>{adminStatusFeedback}</span>
              <button
                type="button"
                onClick={() => setAdminStatusFeedback(null)}
                className="text-white hover:underline text-[10px]"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* GESTIÓN DE IDENTIDADES: ¿QUIÉN ES QUIÉN? */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#0A84FF]" />
                  <span>Gestión de Cuentas de Google (¿Quién es quién?)</span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Solo el administrador puede cambiar o liberar las identidades elegidas.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {['maxi', 'drizza', 'alca', 'castro', 'alan'].map((id) => {
                const u = users.find((member) => member.id === id);
                if (!u) return null;
                const isLinked = !!u.linkedAuth;

                return (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatarUrl}
                        alt={u.name}
                        className="w-8 h-8 rounded-full object-cover bg-zinc-900 border border-white/15"
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isLinked ? (
                            <span className="text-[9px] bg-emerald-500/20 text-[#30D158] px-1.5 py-0.2 rounded font-bold border border-emerald-500/30">
                              Vinculado
                            </span>
                          ) : (
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded font-bold border border-amber-500/30">
                              Disponible en inicio
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {isLinked ? u.linkedAuth?.accountEmail : 'Aún no fue elegido por nadie'}
                        </div>
                      </div>
                    </div>

                    {/* Admin Action Buttons for this member */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {isLinked ? (
                        <>
                          <button
                            id={`btn-reassign-email-${u.id}`}
                            type="button"
                            onClick={() => openAssignment(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold border border-white/15 transition active:scale-95"
                          >
                            Reasignar
                          </button>
                          <button
                            id={`btn-free-name-${u.id}`}
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Liberar el nombre de ${u.name}? Volverá a estar disponible para que cualquiera lo elija al ingresar.`)) {
                                onUnlinkAuth(u.id);
                                setAdminStatusFeedback(`Nombre de ${u.name} liberado. Ahora está disponible en la pantalla de inicio.`);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-[#FF375F] text-[10px] font-bold border border-red-500/30 transition active:scale-95 flex items-center gap-1"
                          >
                            <Unlink className="w-3 h-3" />
                            <span>Liberar nombre</span>
                          </button>
                        </>
                      ) : (
                        <button
                          id={`btn-assign-email-${u.id}`}
                          type="button"
                            onClick={() => openAssignment(u)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30 text-[#5AC8FA] text-[10px] font-bold border border-[#0A84FF]/30 transition active:scale-95"
                        >
                          Asignar Google
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member Selection for AI Description */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Editar "Descripción IA" de un integrante:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {users.map((u) => {
                  const isSelected = selectedUserForAdmin?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      id={`admin-select-member-${u.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedUserForAdmin(u);
                        setAdminAiDescDraft(u.aiDescription);
                      }}
                      className={`p-2 rounded-xl border text-xs font-semibold transition text-center ${
                        isSelected
                          ? 'bg-[#0A84FF] text-white border-[#0A84FF]'
                          : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {u.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editing Section when member selected */}
            {selectedUserForAdmin && (
              <div className="p-3.5 rounded-2xl bg-black/80 border border-white/15 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={selectedUserForAdmin.avatarUrl}
                      alt={selectedUserForAdmin.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <span className="text-xs font-bold text-white">
                      Editando a {selectedUserForAdmin.name}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5AC8FA] mb-1">
                    Descripción IA de {selectedUserForAdmin.name}
                  </label>
                  <textarea
                    rows={3}
                    value={adminAiDescDraft}
                    onChange={(e) => setAdminAiDescDraft(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-white/20 text-white text-xs leading-relaxed focus:outline-none focus:border-[#0A84FF]"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    id="btn-admin-save-ai-desc"
                    type="button"
                    onClick={handleSaveAdminAiDescription}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0A84FF] to-[#5AC8FA] hover:opacity-95 text-white text-xs font-bold shadow"
                  >
                    {adminSaveNotification ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Descripción actualizada!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar Cambios de Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {assignmentMember && (
        <div role="dialog" aria-modal="true" aria-label={`Asignar cuenta a ${assignmentMember.name}`} className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <form onSubmit={saveAssignment} className="w-full max-w-sm rounded-[26px] border border-white/15 bg-zinc-950 p-5 shadow-2xl space-y-4 animate-scaleUp">
            <div>
              <p className="text-sm font-black text-white">Asignar cuenta de Google</p>
              <p className="mt-1 text-xs text-zinc-400">Solo <strong className="text-zinc-200">{assignmentEmail || 'el correo que indiques'}</strong> podrá entrar como {assignmentMember.name}.</p>
            </div>
            <div>
              <label htmlFor="assignment-email" className="block mb-1.5 text-[11px] font-bold text-zinc-300">Correo electrónico</label>
              <input id="assignment-email" type="email" autoFocus value={assignmentEmail} onChange={(event) => { setAssignmentEmail(event.target.value); setAssignmentError(null); }} placeholder="persona@gmail.com" className="w-full rounded-xl border border-white/20 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-[#0A84FF]" />
              {assignmentError && <p role="alert" className="mt-2 text-xs text-[#FF8A9B]">{assignmentError}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAssignmentMember(null)} className="flex-1 rounded-xl border border-white/15 py-2.5 text-xs font-bold text-zinc-300">Cancelar</button>
              <button type="submit" className="flex-1 rounded-xl bg-[#0A84FF] py-2.5 text-xs font-bold text-white">Guardar asignación</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
