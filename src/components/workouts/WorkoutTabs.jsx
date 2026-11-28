import SubTabs from '../shared/SubTabs.jsx'
import { CalendarOutlined, LineChartOutlined, ProfileOutlined, SyncOutlined } from '@ant-design/icons'

const TABS = [
  { id: 'today', label: 'Today', href: '#/workouts', Icon: CalendarOutlined },
  { id: 'plans', label: 'Plans', href: '#/workouts/plans', Icon: ProfileOutlined },
  { id: 'cycles', label: 'Cycles', href: '#/workouts/cycles', Icon: SyncOutlined },
  { id: 'graphs', label: 'Graphs', href: '#/workouts/graphs', Icon: LineChartOutlined, phoneOnly: true }, // wide screens show the graphs beside the rest
]

// the Workouts page's own sections: today's session, your plans, your cycles (and on phones the graphs)
export default function WorkoutTabs({ sub }) {
  return <SubTabs label="Workout sections" tabs={TABS} current={sub} />
}
