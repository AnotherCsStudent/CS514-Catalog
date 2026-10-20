import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PlannerProvider from './state/PlannerProvider.jsx'
import { loadSchedule } from './data/load.js'

const root = createRoot(document.getElementById('root'))
root.render(<p className="app-loading">Loading class schedule…</p>)

// Course data must be loaded before the planner state (which reads it) starts.
const { error, curriculumError } = await loadSchedule()

root.render(
  <StrictMode>
    <BrowserRouter>
      <PlannerProvider>
        <App loadError={error} curriculumError={curriculumError} />
      </PlannerProvider>
    </BrowserRouter>
  </StrictMode>,
)
