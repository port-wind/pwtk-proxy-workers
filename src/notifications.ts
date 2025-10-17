import type { Response } from './types/response'
import { generateHonoObject } from 'hono-do'

declare module 'hono-do' {
  interface HonoObjectVars {
    messages: {
      code: number
      data: any
      targets: P2PTarget[] | BCTarget
      timestamp: number
    }[]
  }
}

// 消息code
const enum MessageCode {
  // 单播消息
  P2P = 2001,
  // 广播消息
  BC = 2002,
}

/**
 * 客户端类型（允许同时登录多个）
 * S_WEB：超级管理员后台
 * C_APP：移动应用客户端
 * C_WEB：PC网页客户端
 * C_H5：移动网页客户端
 */
type ClientType = 'S_WEB' | 'C_APP' | 'C_WEB' | 'C_H5'
/**
 * 终端标记（允许同时登录多个）
 * w：web
 * h：H5
 * a：android
 * i：iOS
 */
type ClientFlag = 'w' | 'h' | 'a' | 'i'

// manageSiteId + userId + cid 作为key
type P2PTarget = {
  manageSiteId: string // ! 必填
  userId: string | null // ! 有userId则必定有cid。
  cid: string | null // ! 有cid不一定有userId
  clientFlag: ClientFlag | null
  clientType: ClientType | null
}

type BCTarget = {
  manageSiteId: string // ! 必填
}

interface PushType {
  targets: P2PTarget[] | BCTarget
  data: any
}

export const Notifications = generateHonoObject('/notifications', (app, state, vars) => {
  /**
   * @description 消息推送接口
   */
  app.post('/push', async c => {
    const body: PushType = await c.req.json()
    // * 存在校验
    if (!body || !body.targets || !body.data) {
      return c.json<Response>({
        success: false,
        errCode: 'PARAMS_MISSING',
        errMessage: 'Params is missing :(',
        data: undefined,
      })
    }

    // * 类型校验
    if (typeof body.targets !== 'object') {
      return c.json<Response>({
        success: false,
        errCode: 'PARAMS_TYPE_ERROR',
        errMessage: 'Params type error :(',
        data: undefined,
      })
    }
    // * 如果没有messages则初始化
    // !vars.messages && (vars.messages = [])

    // * 发送消息的时间戳
    const timestamp = Date.now()

    // 判断targets是array还是object
    if (Array.isArray(body.targets)) {
      // * 单播消息
      body.targets.forEach(target => {
        // 1. manageSiteId一定是一致的
        // 2. userId是一致的（如果有）
        // 3. cid是一致的（如果没有userId一定有cid）
      })
    } else {
      // todo: 广播消息
    }

    // vars.messages.push({ ...body, timestamp, code: 2001 })
    // state.getWebSockets().forEach(ws => {
    // const { id } = ws.deserializeAttachment()
    // if (body.targets.includes(id)) {
    //   try {
    //     ws.send(JSON.stringify({ code: 2001, data: body.data, timestamp }))
    //   } catch (error) {
    //     ws.close()
    //   }
    // }
    // })
    return c.json<Response>({ success: true, data: undefined })
  })

  app.get('/websocket', async c => {
    if (c.req.header('Upgrade') !== 'websocket')
      return c.json<Response>({
        success: false,
        errCode: 'NOT_WEBSOCKET',
        errMessage: 'Not a websocket request :(',
        data: undefined,
      })
    const url = new URL(c.req.url)
    const params = url.searchParams
    // ! 必填
    const id = params.get('id')
    // ! 必填
    const idType = params.get('idType')
    const manageSiteId = params.get('manageSiteId')
    const clientType = params.get('clientType')
    const clientFlag = params.get('clientFlag')
    if (!id)
      return c.json<Response>({ success: false, errCode: 'ID_MISSING', errMessage: 'Missing id :(', data: undefined })
    if (!idType)
      return c.json<Response>({
        success: false,
        errCode: 'ID_TYPE_MISSING',
        errMessage: 'Missing idType :(',
        data: undefined,
      })
    if (idType !== 'user-id' && idType !== 'cid')
      return c.json<Response>({
        success: false,
        errCode: 'ID_TYPE_ERROR',
        errMessage: 'idType error :(',
        data: undefined,
      })
    return await handleWebSocketUpgrade(id, idType, manageSiteId, clientType, clientFlag)
  })

  async function handleWebSocketUpgrade(
    id: string,
    idType: 'user-id' | 'cid',
    manageSiteId: string | null,
    clientType: string | null,
    clientFlag: string | null
  ) {
    // * 检查是否已经存在相同id的连接
    // const clientIds = state.getWebSockets().map(ws => {
    //   const { id, idType } = ws.deserializeAttachment()
    //   return id
    // })
    // * 存在则返回403
    // if (clientIds.includes(id)) {
    //   return new Response(null, { status: 403 })
    // }

    // * 如果存在相同的id与idtype链接则返回403
    for (const ws of state.getWebSockets()) {
      const { id: clientId, idType: clientType, manageSiteId: siteId, clientFlag: flag } = ws.deserializeAttachment()
      if (clientId === id && clientType === idType) {
        return new Response(null, { status: 403 })
      }
    }

    // * 不存在则创建新的连接
    const [client, server] = Object.values(new WebSocketPair())
    state.acceptWebSocket(server)

    server.serializeAttachment({ id, idType, manageSiteId, clientType, clientFlag })

    return new Response(null, { status: 101, webSocket: client })
  }
})

Notifications.webSocketMessage(async (webSocket, msg, state, vars) => {
  // const { clientId: senderClientId } = await webSocket.deserializeAttachment()
  // state.getWebSockets().forEach(ws => {
  //   const { clientId } = ws.deserializeAttachment()
  //   if (clientId === senderClientId) {
  //     return
  //   }
  //   try {
  //     vars.messages.push(JSON.parse(msg.toString()))
  //     ws.send(msg.toString())
  //   } catch (error) {
  //     ws.close()
  //   }
  // })
})

/**
 * 协议定义
 * 1. 状态code：
 *  - 1xxx: 客户端到服务端的消息 => 暂时不支持
 *  - 2xxx: 服务端到客户端的消息
 *   - 2001: 服务端到客户端的单播消息
 *   - 2002: 服务端到客户端的多播消息 => 暂时不支持
 *   - 2003: 服务端到客户端的广播消息 => 暂时不支持
 * 2. 消息内容:
 *  - 服务端到客户端的消息格式: { code: 2000, data: any }
 */
