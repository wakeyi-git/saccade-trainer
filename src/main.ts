import './styles.css'
import { registerRoute, startRouter } from './router'
import { renderHome } from './pages/home'
import { renderTeacherConsole } from './pages/teacher-console'
import { renderRunner } from './pages/runner'

registerRoute('/', (root) => renderHome(root))
registerRoute('/teacher', (root) => renderTeacherConsole(root))
registerRoute('/run/:mode/:activity', (root, params) =>
  renderRunner(root, { mode: params.mode, activity: params.activity })
)

const app = document.getElementById('app')
if (!app) throw new Error('#app not found')
startRouter(app)
