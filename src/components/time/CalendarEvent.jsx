import { https } from '../../lib/links.js'
import { timeOfDay } from '../../lib/time.js'
import { CalendarOutlined, CheckOutlined, ClockCircleOutlined, CloseOutlined, EnvironmentOutlined, ExportOutlined, SwapLeftOutlined, SwapRightOutlined, TeamOutlined, UserOutlined, VideoCameraFilled } from '@ant-design/icons'

const SHOW_AS = { free: 'Free', tentative: 'Tentative', busy: 'Busy', oof: 'Away', workingElsewhere: 'Working elsewhere' }
const RESPONSE = { accepted: 'Accepted', tentativelyAccepted: 'Maybe', declined: 'Declined', notResponded: 'Not answered yet', organizer: 'Your meeting' }

// one event in the day's "On your calendar" list: when, what, where, who, your answer, a Join button for an online meeting
// (Teams, Zoom, Meet…), Open in Outlook, and the invitation's notes / attendee list under Details.
// state: '' | ' now' | ' past' (today only)
// soon: "in 1h 40m" for today's next events
export default function CalendarEvent({ e, state, soon }) {
  const join = https(e.join?.url)
  const link = https(e.link)
  const people = e.attendees ?? []
  const meta = [
    // a location that is only the meeting app ("Microsoft Teams Meeting") or its link adds nothing next to the Join button
    e.location && !(join && (e.location === e.join?.url || /^(microsoft )?teams( meeting)?$|^zoom( meeting)?$|^google meet$/i.test(e.location.trim()))) ? { icon: <EnvironmentOutlined />, text: e.location } : null,
    e.organizer ? { icon: <UserOutlined />, text: `From ${e.organizer}` } : null,
    people.length ? { icon: <TeamOutlined />, text: `${people.length} ${people.length === 1 ? 'person' : 'people'}` } : null,
    e.response && RESPONSE[e.response] ? { icon: e.response === 'declined' ? <CloseOutlined /> : <CheckOutlined />, text: RESPONSE[e.response] } : null,
    e.showAs && SHOW_AS[e.showAs] && e.showAs !== 'busy' ? { icon: <ClockCircleOutlined />, text: SHOW_AS[e.showAs] } : null,
  ].filter(Boolean)
  return (
    <li className={`oncal-item${state}${e.response === 'declined' ? ' declined' : ''}`}>
      <span className="oncal-when">
        {state === ' now' ? 'Now' : <>{e.cutStart && <><SwapLeftOutlined /> </>}{timeOfDay(e.start)}</>}
        <small>{e.cutEnd ? <>past midnight <SwapRightOutlined /></> : `to ${timeOfDay(e.end)}`}</small>
        {soon && <small className="oncal-soon">{soon}</small>}
      </span>
      <div className="oncal-main">
        <span className="oncal-title">{e.title}</span>
        {meta.length > 0 && (
          <ul className="oncal-meta">
            {meta.map((m) => (
              <li key={m.text}>
                <span aria-hidden="true">{m.icon}</span> {m.text}
              </li>
            ))}
          </ul>
        )}
        {(join || link) && (
          <div className="oncal-actions">
            {join && (
              <a className="btn btn-sm oncal-join" href={join} target="_blank" rel="noopener noreferrer">
                <VideoCameraFilled />
                Join {e.join.app === 'meeting' ? 'meeting' : `${e.join.app} meeting`}
              </a>
            )}
            {link && (
              <a className="btn btn-sm" href={link} target="_blank" rel="noopener noreferrer">
                <CalendarOutlined />
                Open in Outlook
                <ExportOutlined />
              </a>
            )}
          </div>
        )}
        {(e.notes || people.length > 0) && (
          <details className="oncal-more">
            <summary>Details</summary>
            {people.length > 0 && <p className="oncal-people">{people.join(', ')}</p>}
            {e.notes && <p className="oncal-notes">{e.notes}</p>}
          </details>
        )}
      </div>
    </li>
  )
}
