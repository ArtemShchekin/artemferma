
import React from 'react'

export function useToast(){
  const [msg,setMsg] = React.useState<string|null>(null)
  const show = (m:string)=>{ setMsg(m); setTimeout(()=>setMsg(null), 2500) }
  const Toast = ()=> msg? <div className="toast">{msg}</div>:null
  return { show, Toast }
}
