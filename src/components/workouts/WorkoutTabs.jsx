import SubTabs from '../shared/SubTabs.jsx'

const TABS = [
  { id: 'today', label: 'Today', href: '#/workouts' },
  { id: 'plans', label: 'Plans', href: '#/workouts/plans' },
  { id: 'cycles', label: 'Cycles', href: '#/workouts/cycles' },
  { id: 'graphs', label: 'Graphs', href: '#/workouts/graphs', phoneOnly: true }, // wide screens show the graphs beside the rest
]

// the Workouts page's own sections: today's session, your plans, your cycles (and on phones the graphs)
export default function WorkoutTabs({ sub }) {
  return <SubTabs label="Workout sections" tabs={TABS} current={sub} />
}
