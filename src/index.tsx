import { Hono } from 'hono'
import { Template } from './template'
import Status from './pages/status'
import { cors } from 'hono/cors'
import { UAParser } from 'ua-parser-js'

const app = new Hono<{
  Bindings: {
    NOTIFICATIONS: DurableObjectNamespace
    CIDMANAGER: DurableObjectNamespace
  }
}>()

app.use(
  '*',
  cors({
    origin: '*',
  })
)

app.get('/', async c => {
  return c.html(<Status c={c} />)
})

app.get('/debug', async c => {
  const userAgent = c.req.header('User-Agent')
  const ua = UAParser(userAgent)
  return c.json({ ua })
})

app.all('/client/*', c => {
  const id = c.env.CIDMANAGER.idFromName('cid')
  const obj = c.env.CIDMANAGER.get(id)
  return obj.fetch(c.req.raw)
})

app.all('/notifications/*', c => {
  const id = c.env.NOTIFICATIONS.idFromName('notifications')
  const obj = c.env.NOTIFICATIONS.get(id)
  return obj.fetch(c.req.raw)
})

export default app

export * from './notifications'
export * from './client'
