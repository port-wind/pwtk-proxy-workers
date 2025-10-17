export type Response<T = undefined> = {
  success: boolean
  errCode?: string
  errMessage?: string
  data: T
}
