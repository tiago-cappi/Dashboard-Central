import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from '../../../lib/supabase.js';
import { useFocus } from '../FocusContext.jsx';

/**
 * Carrega a hierarquia completa: setores → projetos → objetivos → sub-objetivos
 * → missões → sub-missões. Hábitos e lembretes aparecem como folhas.
 * Identifica órfãos para o "Bosque Livre" (inclui hábitos em setores arquivados).
 */
export function useForestTree() {
  const [data, setData] = useState({
    sectors: [],
    projects: [],
    goals: [],
    missions: [],
    habits: [],
    reminders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useFocus();

  const load = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      setError(new Error('Supabase não configurado.'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [sR, pR, gR, mR, hR, rR] = await Promise.all([
        supabase.from('sectors').select('id, name, color, archived').order('name'),
        supabase
          .from('projects')
          .select('id, title, description, sector_id, status, created_at, target_date')
          .order('title'),
        supabase
          .from('goals')
          .select(
            'id, title, description, sector_id, project_id, parent_goal_id, horizon, status, target_date',
          )
          .order('title'),
        supabase
          .from('missions')
          .select(
            'id, title, description, sector_id, goal_id, parent_mission_id, importance, difficulty, status, due_date, completed_at, focus_minutes, xp_gained',
          )
          .order('title'),
        supabase.from('habits').select('*').order('title'),
        supabase.from('reminders').select('*').eq('active', true).order('title'),
      ]);
      if (sR.error) throw sR.error;
      if (pR.error) throw pR.error;
      if (gR.error) throw gR.error;
      if (mR.error) throw mR.error;
      if (hR.error) throw hR.error;
      if (rR.error) throw rR.error;
      setData({
        sectors: sR.data ?? [],
        projects: pR.data ?? [],
        goals: gR.data ?? [],
        missions: mR.data ?? [],
        habits: hR.data ?? [],
        reminders: rR.data ?? [],
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => subscribe(() => load()), [subscribe, load]);

  const tree = useMemo(() => buildForest(data), [data]);

  return { ...data, ...tree, loading, error, refetch: load };
}

function buildForest({ sectors, projects, goals, missions, habits, reminders }) {
  const sectorById = new Map(sectors.map((s) => [s.id, s]));
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const missionById = new Map(missions.map((m) => [m.id, m]));
  const habitById = new Map(habits.map((h) => [h.id, h]));
  const reminderById = new Map(reminders.map((r) => [r.id, r]));

  // Agrupamentos
  const projectsBySector = groupBy(projects, (p) => p.sector_id);
  const goalsByProject = groupBy(goals, (g) => g.project_id);
  const goalsBySector = groupBy(goals, (g) => g.sector_id);
  const goalsByParentGoal = groupBy(goals, (g) => g.parent_goal_id);
  const missionsByGoal = groupBy(missions, (m) => m.goal_id);
  const missionsBySector = groupBy(missions, (m) => m.sector_id);
  const missionsByParentMission = groupBy(missions, (m) => m.parent_mission_id);
  const habitsByGoal = groupBy(habits, (h) => h.goal_id);
  const habitsBySector = groupBy(habits, (h) => h.sector_id);
  const remindersByGoal = groupBy(reminders, (r) => r.goal_id);
  const remindersBySector = groupBy(reminders, (r) => r.sector_id);

  function buildReminderNode(reminder) {
    return {
      type: 'reminder',
      id: reminder.id,
      title: reminder.title || reminder.message,
      data: reminder,
      children: [],
    };
  }

  function buildHabitNode(habit) {
    return { type: 'habit', id: habit.id, title: habit.title, data: habit, children: [] };
  }

  function buildMissionNode(mission) {
    const children = (missionsByParentMission.get(mission.id) ?? []).map(buildMissionNode);
    return { type: 'mission', id: mission.id, title: mission.title, data: mission, children };
  }

  function buildGoalNode(goal, depth = 0) {
    const subGoals = (goalsByParentGoal.get(goal.id) ?? []).map((g) => buildGoalNode(g, depth + 1));
    const goalMissions = (missionsByGoal.get(goal.id) ?? [])
      .filter((m) => !m.parent_mission_id || !missionById.has(m.parent_mission_id))
      .map(buildMissionNode);
    const goalHabits = (habitsByGoal.get(goal.id) ?? []).map(buildHabitNode);
    const goalReminders = (remindersByGoal.get(goal.id) ?? []).map(buildReminderNode);
    return {
      type: depth === 0 ? 'goal' : 'subgoal',
      id: goal.id,
      title: goal.title,
      data: goal,
      children: [...subGoals, ...goalMissions, ...goalHabits, ...goalReminders],
    };
  }

  function buildProjectNode(project) {
    const topGoals = (goalsByProject.get(project.id) ?? [])
      .filter((g) => !g.parent_goal_id || !goalById.has(g.parent_goal_id))
      .map((g) => buildGoalNode(g, 0));
    return { type: 'project', id: project.id, title: project.title, data: project, children: topGoals };
  }

  function buildSectorNode(sector) {
    const sectorProjects = (projectsBySector.get(sector.id) ?? []).map(buildProjectNode);
    const looseGoals = (goalsBySector.get(sector.id) ?? [])
      .filter(
        (g) =>
          (!g.project_id || !projectById.has(g.project_id)) &&
          (!g.parent_goal_id || !goalById.has(g.parent_goal_id)),
      )
      .map((g) => buildGoalNode(g, 0));
    const looseMissions = (missionsBySector.get(sector.id) ?? [])
      .filter(
        (m) =>
          (!m.goal_id || !goalById.has(m.goal_id)) &&
          (!m.parent_mission_id || !missionById.has(m.parent_mission_id)),
      )
      .map(buildMissionNode);
    const looseHabits = (habitsBySector.get(sector.id) ?? [])
      .filter((h) => !h.goal_id || !goalById.has(h.goal_id))
      .map(buildHabitNode);
    const looseReminders = (remindersBySector.get(sector.id) ?? [])
      .filter((r) => !r.goal_id || !goalById.has(r.goal_id))
      .map(buildReminderNode);
    return {
      type: 'sector',
      id: sector.id,
      title: sector.name,
      data: sector,
      children: [...sectorProjects, ...looseGoals, ...looseMissions, ...looseHabits, ...looseReminders],
    };
  }

  const trees = sectors.filter((s) => !s.archived).map(buildSectorNode);

  // === Bosque Livre — órfãos ===
  const orphanProjects = projects
    .filter((p) => !p.sector_id || !sectorById.has(p.sector_id))
    .map(buildProjectNode);

  const orphanGoals = goals
    .filter(
      (g) =>
        (!g.sector_id || !sectorById.has(g.sector_id)) &&
        (!g.project_id || !projectById.has(g.project_id)) &&
        (!g.parent_goal_id || !goalById.has(g.parent_goal_id)),
    )
    .map((g) => buildGoalNode(g, 0));

  const orphanMissions = missions
    .filter(
      (m) =>
        (!m.sector_id || !sectorById.has(m.sector_id)) &&
        (!m.goal_id || !goalById.has(m.goal_id)) &&
        (!m.parent_mission_id || !missionById.has(m.parent_mission_id)),
    )
    .map(buildMissionNode);

  // Hábitos órfãos: sem setor válido (ou setor arquivado) E sem objetivo válido
  const orphanHabits = habits
    .filter((h) => {
      const hasActiveSector = h.sector_id && sectorById.has(h.sector_id) && !sectorById.get(h.sector_id).archived;
      const hasValidGoal = h.goal_id && goalById.has(h.goal_id);
      return !hasActiveSector && !hasValidGoal;
    })
    .map(buildHabitNode);

  // Lembretes órfãos: sem setor válido (ou setor arquivado) E sem objetivo válido
  const orphanReminders = reminders
    .filter((r) => {
      const hasActiveSector = r.sector_id && sectorById.has(r.sector_id) && !sectorById.get(r.sector_id).archived;
      const hasValidGoal = r.goal_id && goalById.has(r.goal_id);
      return !hasActiveSector && !hasValidGoal;
    })
    .map(buildReminderNode);

  return {
    trees,
    orphans: {
      projects: orphanProjects,
      goals: orphanGoals,
      missions: orphanMissions,
      habits: orphanHabits,
      reminders: orphanReminders,
    },
    indexes: { sectorById, projectById, goalById, missionById, habitById, reminderById },
  };
}

function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!k) continue;
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}
