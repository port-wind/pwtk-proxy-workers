import type { Response } from './types/response'
import verify_cid from './utils/verify_cid'
import axios from 'axios'
import SnowflakeId from 'snowflake-id'
import secretKeys from './config/secret_keys.json'
import jsSHA from 'jssha'
import { generateHonoObject } from 'hono-do'
import { bizDomains } from './config/biz_domains'
import { getCookie, setCookie } from 'hono/cookie'
import { UAParser } from 'ua-parser-js'

export const CIDManager = generateHonoObject('/client', async (app, state, vars) => {
  const { storage } = state

  let snowflake: SnowflakeId

  async function create_cid() {
    const current_key_version: string = (vars.env as any)['CID_CURRENT_SECRET_KEY_VERSION']

    const current_secret = secretKeys.find(item => item.version === current_key_version)
    if (!current_secret) return null

    const secret_key: string = current_secret.key
    const secret_version: string = current_secret.version

    if (!snowflake) {
      if (!(await storage.get('snowflakeId'))) {
        snowflake = new SnowflakeId()
        await storage.put('cid', snowflake)
      } else {
        snowflake = (await storage.get('snowflakeId'))!
      }
    }

    const random = snowflake.generate()
    const sign = new jsSHA('SHA-1', 'TEXT').update(random).update(secret_key).getHash('HEX')
    return `${random}.${secret_version}.${sign}`
  }

  /**
   * @description 获取cid
   */
  app.get('/cid', async c => {
    const cid_from_cookie = getCookie(c, 'cid')
    if (cid_from_cookie) {
      return c.json<Response<{ cid: string }>>({
        success: true,
        data: {
          cid: cid_from_cookie,
        },
      })
    }
    const cid = await create_cid()

    if (!cid) {
      return c.json<Response>({
        success: false,
        errCode: 'CID_CREATE_ERROR',
        errMessage: 'CID create error :(',
        data: undefined,
      })
    }

    setCookie(c, 'cid', cid, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    })
    return c.json<Response<{ cid: string }>>({
      success: true,
      data: {
        cid,
      },
    })
  })

  /**
   * @description 注册cid
   */
  app.post('/register-cid', async c => {
    type ClientTypeType = 'S_WEB' | 'C_APP' | 'C_WEB' | 'C_H5'
    type ClientFlagType = 'w' | 'h' | 'a' | 'i'
    const { cid, manageSiteId, clientType, clientFlag, os } = await c.req.json()

    // * 存在校验
    if (!cid || !manageSiteId || !clientType || !clientFlag) {
      return c.json<Response>({
        success: false,
        errCode: 'PARAMS_MISSING',
        errMessage: 'Params is missing :(',
        data: undefined,
      })
    }

    // * 类型校验
    if (
      typeof cid !== 'string' ||
      typeof manageSiteId !== 'string' ||
      typeof clientType !== 'string' ||
      typeof clientFlag !== 'string'
    ) {
      return c.json<Response>({
        success: false,
        errCode: 'PARAMS_TYPE_ERROR',
        errMessage: 'Params type error :(',
        data: undefined,
      })
    }

    // * 长度校验
    if (cid.length > 255 || clientType.length > 8) {
      return c.json<Response>({
        success: false,
        errCode: 'PARAMS_LENGTH_ERROR',
        errMessage: 'Params length error :(',
        data: undefined,
      })
    }

    // * clientType 校验
    const clientTypeList: ClientTypeType[] = ['S_WEB', 'C_APP', 'C_WEB', 'C_H5']
    if (!clientTypeList.includes(clientType as ClientTypeType)) {
      return c.json<Response>({
        success: false,
        errCode: 'CLIENT_TYPE_ERROR',
        errMessage: 'Client type error :(',
        data: undefined,
      })
    }

    // * clientFlag 校验
    const clientFlagList: ClientFlagType[] = ['w', 'h', 'a', 'i']
    if (!clientFlagList.includes(clientFlag as ClientFlagType)) {
      return c.json<Response>({
        success: false,
        errCode: 'CLIENT_FLAG_ERROR',
        errMessage: 'Client flag error :(',
        data: undefined,
      })
    }

    // * cid 合法性校验
    if (!verify_cid(cid)) {
      return c.json<Response>({
        success: false,
        errCode: 'CID_VERIFY_ERROR',
        errMessage: 'CID verify error :(',
        data: undefined,
      })
    }

    // * os 类型校验
    if (os && typeof os !== 'string') {
      return c.json<Response>({
        success: false,
        errCode: 'OS_TYPE_ERROR',
        errMessage: 'OS type error :(',
        data: undefined,
      })
    }

    const domain = bizDomains.find(item => item.id === manageSiteId)?.domain

    if (!domain) {
      return c.json<Response>({
        success: false,
        errCode: 'DOMAIN_NOT_FOUND',
        errMessage: 'Domain not found :(',
        data: undefined,
      })
    }

    const userAgent = c.req.header('User-Agent')
    const uaObject = UAParser(userAgent)

    // * 发送请求
    try {
      const res = await axios.post<{ success: boolean; errCode?: string; errMessage?: string; data?: boolean }>(
        `${domain}/biz-client/biz/login/regCid`,
        {
          ua: userAgent,
          clientType,
          clientFlag,
          os: os ?? JSON.stringify(uaObject.os),
        },
        { headers: { cid } }
      )
      if (res.data.success !== true) {
        return c.json<Response<any>>({
          success: false,
          errCode: 'REGISTER_CID_ERROR',
          errMessage: 'Register cid error :(',
          data: res,
        })
      }
    } catch (e) {
      return c.json<Response<any>>({
        success: false,
        errCode: 'REGISTER_CID_ERROR',
        errMessage: 'Register cid error :(',
        data: e,
      })
    }

    return c.json<Response>({
      success: true,
      data: undefined,
    })
  })
})
