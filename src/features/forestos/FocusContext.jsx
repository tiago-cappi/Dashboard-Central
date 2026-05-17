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

export function FocusProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [focusMission, setFocusMission] = useState(null);
  const [focusHabit, setFocusHabit] = useState(null);
  const [pendingMission, setPendingMission] = useState(null);
  const [pendingHabit, setPendingHabit] = useState(null);
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

  useEffect(() => {
    if (!profile?.focus_started_at) return undefined;
    const i = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, [profile?.focus_started_at]);

  const focusEntityType = profile?.current_focus_mission_id
    ? 'mission'
    : profile?.current_focus_habit_id
      ? 'habit'
      : null;
  const focusEntityId = profile?.current_focus_mission_id || profile?.current_focus_habit_id || null;
  const isActive = Boolean(focusEntityId && profile?.focus_started_at);

  const elapsedSec = useMemo(() => {
    if (!profile?.focus_started_at) return 0;
    return Math.max(0, Math.floor((nowTick - new Date(profile.focus_started_at).getTime()) / 1000));
  }, [profile?.focus_started_at, nowTick]);

  const openFocusModal = useCallback((mission) => {
    setPendingMission(mission);
    setPendingHabit(null);
  }, []);

  const openFocusModalForHabit = useCallback((habit) => {
    setPendingHabit(habit);
    setPendingMission(null);
  }, []);

  const cancelFocus = useCallback(() => {
    setPendingMission(null);
    setPendingHabit(null);
  }, []);

  // Encerra a sessão atual (mission OU habit) creditando minutos/xp no entity.
  // Para hábitos: o XP da sessão é colhido AUTOMATICAMENTE no profile.
  // Para missões: o XP fica acumulado em xp_gained até a colheita explícita.
  const pauseFocus = useCallback(
    async (silent = false, overrideElapsedMin = null) => {
      if (busy && !silent) return;
      if (!focusEntityId || !profile?.focus_started_at) return;
      setBusy(true);

      const startedAt = profile.focus_started_at;
      const elapsedMin = overrideElapsedMin !== null ? overrideElapsedMin : elapsedMinutesSince(startedAt);

      const isHabit = focusEntityType === 'habit';
      const table = isHabit ? 'habits' : 'missions';
      const { data: e } = await supabase.from(table).select('*').eq('id', focusEntityId).maybeSingle();
      const xp = e ? sessionXp(elapsedMin, e) : 0;
      const newMinutes = Number(e?.focus_minutes ?? 0) + elapsedMin;

      let totalXpAfter = null;

      if (e && elapsedMin > 0) {
        if (isHabit) {
          // hábito: acumula só minutos no row; XP vai direto pro profile
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
          // missão: acumula minutos e XP no row, sem creditar no profile ainda
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
      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      await supabase
        .from('missions')
        .update({
          status: 'done',
          completed_at: todayIso,
          harvested: true,
          harvested_at: todayIso,
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
      pendingMission,
      pendingHabit,
      focusEntityType,
      focusEntityId,
      isActive,
      elapsedSec,
      busy,
      openFocusModal,
      openFocusModalForHabit,
      cancelFocus,
      startFocus,
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
      pendingMission,
      pendingHabit,
      focusEntityType,
      focusEntityId,
      isActive,
      elapsedSec,
      busy,
      openFocusModal,
      openFocusModalForHabit,
      cancelFocus,
      startFocus,
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
