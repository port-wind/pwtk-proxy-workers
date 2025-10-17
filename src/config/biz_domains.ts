interface BizDomainType {
  id: string
  name: string
  domain: string
  cid_current_secret_key_version: number
  status?: string
}

const bizDomains: BizDomainType[] = [
  {
    id: 'pw01tk01',
    name: 'dev',
    domain: 'https://biz-client.pwtk.cc',
    cid_current_secret_key_version: 1,
  },
  {
    id: 'pw02tk01',
    name: 'prod',
    domain: 'https://bc.tkonline.cc',
    cid_current_secret_key_version: 1,
  },
  {
    id: 'pw02tk02',
    name: 'prod',
    domain: 'https://bc49.tkonline.cc',
    cid_current_secret_key_version: 1,
  },
]

export { bizDomains, BizDomainType }
