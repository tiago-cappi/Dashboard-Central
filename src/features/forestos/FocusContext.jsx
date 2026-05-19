import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from '../../lib/supabase.js';

const FocusContext = createContext(null);

function sessionXp(elapsedMin, entity) {
  const imp = Math.max(1, Number(entity?.importance ?? 1));
  const dif = Math.max(1, Number(entity?.difficulty ?? 1));
  return Math.round((elapsedMin * imp * dif) / 10);
}

function elapsedMinutesSince(iso) {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildConsolidatedDescription(miniMissions) {
  const items = (miniMissions || []).filter((m) => m && m.title?.trim());
  if (items.length === 0) return 'Sessão multi-missão sem itens.';
  const lines = items.map((m) => {
    const mark = m.status === 'done' ? '✓' : '○';
    return `${mark} ${m.title.trim()}`;
  });
  return ['Sessão de foco multi-missão — itens trabalhados:', '', ...lines].join('\n');
}

export function FocusProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [focusMission, setFocusMission] = useState(null);
  const [focusHabit, setFocusHabit] = useState(null);
  const [multiFocusSession, setMultiFocusSession] = useState(null);
  const [pendingMission, setPendingMission] = useState(null);
  const [pendingHabit, setPendingHabit] = useState(null);
  const [pendingMultiSession, setPendingMultiSession] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const subscribersRef = useRef(new Set());

  const notify = useCallback(() => {
    for (const fn of subscribersRef.current) fn();
  }, []);

  const subscribe = useCallback((fn) => {
    subscribersRef.current.add(fn);
    return () => subscribersRef.current.delete(fn);
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) return null;
    const { data } = await supabase.from('profile').select('*').limit(1).maybeSingle();
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  // Carrega missão em foco
  useEffect(() => {
    const id = profile?.current_focus_mission_id;
    if (!id) {
      setFocusMission(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('missions').select('*').eq('id', id).maybeSingle();
      if (!cancelled) setFocusMission(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.current_focus_mission_id]);

  // Carrega hábito em foco
  useEffect(() => {
    const id = profile?.current_focus_habit_id;
    if (!id) {
      setFocusHabit(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('habits').select('*').eq('id', id).maybeSingle();
      if (!cancelled) setFocusHabit(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.current_focus_habit_id]);

  // Carrega sessão multi-missão em foco
  useEffect(() => {
    const id = profile?.current_multi_focus_session_id;
    if (!id) {
      setMultiFocusSession(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('multi_focus_sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!cancelled) setMultiFocusSession(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.current_multi_focus_session_id]);

  useEffect(() => {
    if (!profile?.focus_started_at) return undefined;
    const i = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, [profile?.focus_started_at]);

  const focusEntityType = profile?.current_focus_mission_id
    ? 'mission'
    : profile?.current_focus_habit_id
      ? 'habit'
      : profile?.current_multi_focus_session_id
        ? 'multi'
        : null;
  const focusEntityId =
    profile?.current_focus_mission_id ||
    profile?.current_focus_habit_id ||
    profile?.current_multi_focus_session_id ||
    null;
  const isActive = Boolean(focusEntityId && profile?.focus_started_at);

  const elapsedSec = useMemo(() => {
    if (!profile?.focus_started_at) return 0;
    return Math.max(0, Math.floor((nowTick - new Date(profile.focus_started_at).getTime()) / 1000));
  }, [profile?.focus_started_at, nowTick]);

  const openFocusModal = useCallback((mission) => {
    setPendingMission(mission);
    setPendingHabit(null);
    setPendingMultiSession(false);
  }, []);

  const openFocusModalForHabit = useCallback((habit) => {
    setPendingHabit(habit);
    setPendingMission(null);
    setPendingMultiSession(false);
  }, []);

  const openFocusModalForMultiSession = useCallback(() => {
    setPendingMultiSession(true);
    setPendingMission(null);
    setPendingHabit(null);
  }, []);

  const cancelFocus = useCallback(() => {
    setPendingMission(null);
    setPendingHabit(null);
    setPendingMultiSession(false);
  }, []);

  // Encerra a sessão atual (mission, habit ou multi) creditando minutos/xp conforme tipo.
  // - Hábitos: XP da sessão vai DIRETO ao profile.total_xp (auto-harvest).
  // - Missões: minutos e XP ficam acumulados em xp_gained da missão até a colheita explícita.
  // - Multi-missão: cria UMA Mission consolidada (status='done', harvested=true) e credita XP
  //   direto no profile.total_xp (já que a Mission consolidada nasce colhida — registro histórico).
  const pauseFocus = useCallback(
    async (silent = false, overrideElapsedMin = null) => {
      if (busy && !silent) return;
      if (!focusEntityId || !profile?.focus_started_at) return;
      setBusy(true);

      const startedAt = profile.focus_started_at;
      const elapsedMin = overrideElapsedMin !== null ? overrideElapsedMin : elapsedMinutesSince(startedAt);

      const isHabit = focusEntityType === 'habit';
      const isMulti = focusEntityType === 'multi';

      let totalXpAfter = null;

      if (isMulti) {
        // ── Sessão multi-missão ──
        const { data: sess } = await supabase
          .from('multi_focus_sessions')
          .select('*')
          .eq('id', focusEntityId)
          .maybeSingle();

        if (sess && elapsedMin >= 1) {
          const xp = sessionXp(elapsedMin, sess);
          const today = todayIsoDate();
          const missionId = genId();
          const description = buildConsolidatedDescription(sess.mini_missions);

          // 1) Cria a Mission consolidada já como done + harvested
          await supabase.from('missions').insert({
            id: missionId,
            title: `Sessão de foco · ${elapsedMin} min`,
            description,
            sector_id: null,
            goal_id: null,
            parent_mission_id: null,
            importance: sess.importance,
            difficulty: sess.difficulty,
            status: 'done',
            harvested: true,
            focus_minutes: elapsedMin,
            xp_gained: xp,
            due_date: null,
            created_at: today,
            completed_at: today,
            harvested_at: today,
          });

          // 2) Credita XP direto no profile (Mission já nasce colhida)
          if (xp > 0) {
            const { data: prof } = await supabase
              .from('profile')
              .select('*')
              .limit(1)
              .maybeSingle();
            totalXpAfter = Number(prof?.total_xp ?? 0) + xp;
            await supabase
              .from('profile')
              .update({ total_xp: totalXpAfter })
              .eq('id', prof?.id ?? 1);
          }

          // 3) Fecha a sessão multi
          await supabase
            .from('multi_focus_sessions')
            .update({
              status: 'completed',
              ended_at: new Date().toISOString(),
              focus_minutes: elapsedMin,
              xp_gained: xp,
              consolidated_mission_id: missionId,
            })
            .eq('id', focusEntityId);

          // 4) Evento xp_event apontando para a Mission consolidada
          await supabase.from('events').insert({
            type: 'xp_event',
            entity_type: 'mission',
            entity_id: missionId,
            entity_title: `Sessão de foco · ${elapsedMin} min`,
            focus_minutes: elapsedMin,
            xp_gained: xp,
            total_xp_after: totalXpAfter,
            data: { reason: 'multi_session_auto_harvest', session_id: focusEntityId, started_at: startedAt },
          });
        } else if (sess) {
          // < 1 min — descarta sem criar Mission nem XP
          await supabase
            .from('multi_focus_sessions')
            .update({
              status: 'discarded',
              ended_at: new Date().toISOString(),
              focus_minutes: elapsedMin,
              xp_gained: 0,
            })
            .eq('id', focusEntityId);
        }

        const { data: prof } = await supabase
          .from('profile')
          .update({ current_multi_focus_session_id: null, focus_started_at: null })
          .eq('id', profile.id ?? 1)
          .select()
          .maybeSingle();
        if (prof) setProfile(prof);
        setMultiFocusSession(null);
        setBusy(false);
        notify();
        return { elapsedMin, entityId: focusEntityId, entityType: 'multi' };
      }

      // ── Missão ou Hábito (caminho original) ──
      const table = isHabit ? 'habits' : 'missions';
      const { data: e } = await supabase.from(table).select('*').eq('id', focusEntityId).maybeSingle();
      const xp = e ? sessionXp(elapsedMin, e) : 0;
      const newMinutes = Number(e?.focus_minutes ?? 0) + elapsedMin;

      if (e && elapsedMin > 0) {
        if (isHabit) {
          await supabase
            .from('habits')
            .update({ focus_minutes: newMinutes })
            .eq('id', focusEntityId);

          if (xp > 0) {
            const { data: prof } = await supabase
              .from('profile')
              .select('*')
              .limit(1)
              .maybeSingle();
            totalXpAfter = Number(prof?.total_xp ?? 0) + xp;
            await supabase
              .from('profile')
              .update({ total_xp: totalXpAfter })
              .eq('id', prof?.id ?? 1);
          }

          await supabase.from('events').insert({
            type: 'xp_event',
            entity_type: 'habit',
            entity_id: focusEntityId,
            entity_title: e.title,
            focus_minutes: elapsedMin,
            xp_gained: xp,
            total_xp_after: totalXpAfter,
            data: { reason: 'auto_harvest', started_at: startedAt },
          });
        } else {
          const newXp = Number(e?.xp_gained ?? 0) + xp;
          await supabase
            .from('missions')
            .update({ focus_minutes: newMinutes, xp_gained: newXp })
            .eq('id', focusEntityId);

          await supabase.from('events').insert({
            type: 'focus_session',
            entity_type: 'mission',
            entity_id: focusEntityId,
            entity_title: e.title,
            focus_minutes: elapsedMin,
            xp_gained: xp,
            data: { reason: 'paused', started_at: startedAt },
          });
        }
      }

      const patch = isHabit
        ? { current_focus_habit_id: null, focus_started_at: null }
        : { current_focus_mission_id: null, focus_started_at: null };

      const { data: prof } = await supabase
        .from('profile')
        .update(patch)
        .eq('id', profile.id ?? 1)
        .select()
        .maybeSingle();
      if (prof) setProfile(prof);
      setFocusMission(null);
      setFocusHabit(null);
      setBusy(false);
      notify();
      return { elapsedMin, xp, entityId: focusEntityId, entityType: focusEntityType };
    },
    [profile, busy, notify, focusEntityId, focusEntityType],
  );

  const startFocus = useCallback(
    async (entity, entityType = 'mission') => {
      if (!entity?.id || busy) return false;
      // Se há outra sessão ativa diferente, pausa primeiro
      if (focusEntityId && focusEntityId !== entity.id) {
        await pauseFocus(true);
      }
      setBusy(true);
      const startedAt = new Date().toISOString();
      const patch = entityType === 'habit'
        ? { current_focus_habit_id: entity.id, current_focus_mission_id: null, focus_started_at: startedAt }
        : { current_focus_mission_id: entity.id, current_focus_habit_id: null, focus_started_at: startedAt };
      const { data, error } = await supabase
        .from('profile')
        .update(patch)
        .eq('id', profile?.id ?? 1)
        .select()
        .maybeSingle();
      if (!error && data) {
        setProfile(data);
        if (entityType === 'habit') setFocusHabit(entity);
        else setFocusMission(entity);
        setPendingMission(null);
        setPendingHabit(null);
        setPendingMultiSession(false);
        setBusy(false);
        notify();
        return true;
      }
      setBusy(false);
      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.id, focusEntityId, busy, notify, pauseFocus],
  );

  // Inicia sessão multi-missão. Cria row em multi_focus_sessions + seta profile.
  const startMultiFocus = useCallback(
    async ({ mode, pomoDuration, importance, difficulty, miniMissions }) => {
      if (busy) return false;
      const validItems = (miniMissions || [])
        .filter((m) => m && m.title?.trim())
        .map((m, i) => ({
          id: m.id || genId(),
          title: m.title.trim(),
          status: 'pending',
          order: i,
          completed_at: null,
        }));
      if (validItems.length === 0) return false;
      const imp = Math.max(1, Math.min(5, Number(importance)));
      const dif = Math.max(1, Math.min(5, Number(difficulty)));
      if (!imp || !dif) return false;

      // Se já há sessão ativa, encerra primeiro
      if (focusEntityId) {
        await pauseFocus(true);
      }

      setBusy(true);
      const startedAt = new Date().toISOString();
      const sessionId = genId();
      const row = {
        id: sessionId,
        mode: mode === 'pomodoro' ? 'pomodoro' : 'stopwatch',
        pomo_duration_min: mode === 'pomodoro' ? Math.max(1, Math.min(480, Number(pomoDuration) || 25)) : null,
        importance: imp,
        difficulty: dif,
        mini_missions: validItems,
        started_at: startedAt,
        ended_at: null,
        focus_minutes: 0,
        xp_gained: 0,
        consolidated_mission_id: null,
        status: 'active',
      };
      const { error: insertErr } = await supabase.from('multi_focus_sessions').insert(row);
      if (insertErr) {
        setBusy(false);
        return false;
      }

      const { data, error } = await supabase
        .from('profile')
        .update({
          current_multi_focus_session_id: sessionId,
          current_focus_mission_id: null,
          current_focus_habit_id: null,
          focus_started_at: startedAt,
        })
        .eq('id', profile?.id ?? 1)
        .select()
        .maybeSingle();
      if (!error && data) {
        setProfile(data);
        setMultiFocusSession(row);
        setPendingMission(null);
        setPendingHabit(null);
        setPendingMultiSession(false);
        setBusy(false);
        notify();
        return true;
      }
      setBusy(false);
      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.id, focusEntityId, busy, notify, pauseFocus],
  );

  // Atualiza o JSON de mini-missões da sessão multi ativa
  const updateMultiSessionMiniMissions = useCallback(
    async (sessionId, miniMissions) => {
      if (!sessionId) return;
      const normalized = (miniMissions || []).map((m, i) => ({
        id: m.id || genId(),
        title: String(m.title ?? '').trim(),
        status: m.status === 'done' ? 'done' : 'pending',
        order: i,
        completed_at: m.status === 'done' ? (m.completed_at || new Date().toISOString()) : null,
      })).filter((m) => m.title);
      const { data } = await supabase
        .from('multi_focus_sessions')
        .update({ mini_missions: normalized })
        .eq('id', sessionId)
        .select()
        .maybeSingle();
      if (data) setMultiFocusSession(data);
    },
    [],
  );

  // Colheita de missão (concluir + creditar XP acumulado no perfil)
  const harvestMission = useCallback(
    async (missionId) => {
      if (!missionId || busy) return null;
      setBusy(true);

      if (profile?.current_focus_mission_id === missionId) {
        await pauseFocus(true);
      }

      const { data: m } = await supabase.from('missions').select('*').eq('id', missionId).maybeSingle();
      if (!m) {
        setBusy(false);
        return null;
      }
      const xpToHarvest = Number(m.xp_gained ?? 0);
      const today = todayIsoDate();

      await supabase
        .from('missions')
        .update({
          status: 'done',
          completed_at: today,
          harvested: true,
          harvested_at: today,
        })
        .eq('id', missionId);

      const { data: prof } = await supabase.from('profile').select('*').limit(1).maybeSingle();
      const newTotalXp = Number(prof?.total_xp ?? 0) + xpToHarvest;
      const { data: profUpdated } = await supabase
        .from('profile')
        .update({ total_xp: newTotalXp })
        .eq('id', prof?.id ?? 1)
        .select()
        .maybeSingle();
      if (profUpdated) setProfile(profUpdated);

      await supabase.from('events').insert({
        type: 'xp_event',
        entity_type: 'mission',
        entity_id: missionId,
        entity_title: m.title,
        focus_minutes: Number(m.focus_minutes ?? 0),
        xp_gained: xpToHarvest,
        total_xp_after: newTotalXp,
        data: { harvested: true },
      });

      setBusy(false);
      notify();
      return { xpToHarvest, missionId };
    },
    [profile, busy, notify, pauseFocus],
  );

  const value = useMemo(
    () => ({
      profile,
      focusMission,
      focusHabit,
      multiFocusSession,
      pendingMission,
      pendingHabit,
      pendingMultiSession,
      focusEntityType,
      focusEntityId,
      isActive,
      elapsedSec,
      busy,
      openFocusModal,
      openFocusModalForHabit,
      openFocusModalForMultiSession,
      cancelFocus,
      startFocus,
      startMultiFocus,
      updateMultiSessionMiniMissions,
      pauseFocus,
      harvestMission,
      reloadProfile,
      subscribe,
      notify,
    }),
    [
      profile,
      focusMission,
      focusHabit,
      multiFocusSession,
      pendingMission,
      pendingHabit,
      pendingMultiSession,
      focusEntityType,
      focusEntityId,
      isActive,
      elapsedSec,
      busy,
      openFocusModal,
      openFocusModalForHabit,
      openFocusModalForMultiSession,
      cancelFocus,
      startFocus,
      startMultiFocus,
      updateMultiSessionMiniMissions,
      pauseFocus,
      harvestMission,
      reloadProfile,
      subscribe,
      notify,
    ],
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus precisa de <FocusProvider>');
  return ctx;
}
