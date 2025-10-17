import { Context } from 'hono'
import type { FC, PropsWithChildren } from 'hono/jsx'
import { UAParser } from 'ua-parser-js'
import { Fragment } from 'hono/jsx'
import { bizDomains, type BizDomainType } from '../config/biz_domains'

interface StatusProps {
  c: Context
}

const Layout: FC = ({ children }) => (
  <html>
    <head>
      <title>Status</title>
    </head>
    <body>{children}</body>
  </html>
)

const JsonViewer = ({ data }: { data: Object }) => {
  const jsonString = JSON.stringify(data, null, 2)
  return (
    <Fragment>
      <pre>{jsonString}</pre>
    </Fragment>
  )
}

const UAStatus = ({ userAgent }: { userAgent: string }) => {
  const ua = UAParser(userAgent)
  return <JsonViewer data={ua} />
}

// 后台的可链接情况
const BackendStatus = async () => {
  const backendStatusList: BizDomainType[] = []

  for (const domain of bizDomains) {
    let status: string = 'error'
    try {
      const res = await fetch(domain.domain)
      console.log('res: ', res.headers)
      status = `${res.statusText}`
    } catch (e) {
      status = '无法链接'
    }
    backendStatusList.push({ ...domain, status })
  }

  return (
    <Fragment>
      <h3>后台链接情况</h3>
      <ul>
        {backendStatusList.map(domain => (
          <li key={domain.id}>
            {domain.name}: {domain.domain} - {domain.status}
          </li>
        ))}
      </ul>
    </Fragment>
  )
}

const Status: FC<PropsWithChildren<StatusProps>> = props => {
  const userAgent = props.c.req.header('User-Agent')
  return (
    <Layout>
      <h1>项目状态信息</h1>
      <h3>用户代理信息</h3>
      {userAgent && <UAStatus userAgent={userAgent} />}
    </Layout>
  )
}

export default Status
