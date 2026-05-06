import './styles.css'
import { registerRoute, startRouter } from './router'
import { renderHome } from './pages/home'
import { renderTeacherConsole } from './pages/teacher-console'
import { renderRunner } from './pages/runner'
import { renderReport } from './pages/report'
import { renderSetup } from './pages/setup'
import { renderHistory } from './pages/history'
import { renderExport } from './pages/export-page'

registerRoute('/', (root) => renderHome(root))
registerRoute('/teacher', (root) => renderTeacherConsole(root))
registerRoute('/run/:mode/:activity', (root, params, query) =>
  renderRunner(root, { mode: params.mode, activity: params.activity }, query)
)
registerRoute('/report/:sessionId', (root, params) =>
  renderReport(root, { sessionId: params.sessionId })
)
registerRoute('/setup', (root) => renderSetup(root))
registerRoute('/history/:studentId', (root, params) =>
  renderHistory(root, { studentId: params.studentId })
)
registerRoute('/export', (root) => renderExport(root))

const app = document.getElementById('app')
if (!app) throw new Error('#app not found')
startRouter(app)
