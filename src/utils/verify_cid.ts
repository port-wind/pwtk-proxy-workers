import jsSHA from 'jssha'
import secretKeys from '../config/secret_keys.json'

export default (cid: string) => {
  // cid: 7242364623859486720.17.d81728f6ec4e471fa886b7d76ad73c112c7af08d
  // cid: random.secret_version.sign

  const [random, secret_version, sign] = cid.split('.')

  if (!random || !secret_version || !sign) {
    console.log('cid分割错误')
    return false
  }

  const current_secret = secretKeys.find(item => item.version === secret_version)
  if (!current_secret) {
    console.log('secret_version错误')
    return false
  }

  const secret_key: string = current_secret.key
  const computed_sign = new jsSHA('SHA-1', 'TEXT').update(random).update(secret_key).getHash('HEX')

  return sign === computed_sign
}
