// frontend/src/ui/App.tsx
import React from 'react'
import { api, setToken } from './api'
import './styles.css'

// assets
import icProfile from './assets/tab-profile.svg'
import icShop from './assets/tab-shop.svg'
import icGarden from './assets/tab-garden.svg'
import icInv from './assets/tab-inventory.svg'
import icBuy from './assets/btn-buy.svg'
import icSell from './assets/btn-sell.svg'
import icPlant from './assets/btn-plant.svg'
import icWash from './assets/btn-wash.svg'
import radish from './assets/radish.svg'
import carrot from './assets/carrot.svg'
import cabbage from './assets/cabbage.svg'
import mango from './assets/mango.svg'
import potato from './assets/potato.svg'
import eggplant from './assets/eggplant.svg'

type Tab = 'Профиль'|'Магазин'|'Грядка'|'Инвентарь'

function getStoredToken(){ return localStorage.getItem('token') }
function saveToken(t:string){ localStorage.setItem('token', t); setToken(t) }

const seedNames: Record<string,string> = {
  radish:'Редис', carrot:'Морковь', cabbage:'Капуста',
  mango:'Манго', potato:'Картофель', eggplant:'Баклажан'
}
const seedIcons: Record<string,string> = {
  radish, carrot, cabbage, mango, potato, eggplant
} as any

export default function App(){
  const storedToken = getStoredToken()
  const [token, setTok] = React.useState<string|null>(storedToken)
  const [active, setActive] = React.useState<Tab>('Профиль')
  const [toast, setToast] = React.useState<string|null>(null)

  React.useEffect(()=>{ setToken(token) },[token])
  const logout=()=>{
    localStorage.removeItem('token')
    setTok(null)
    setActive('Профиль')
  }
  const show=(m:string)=>{ setToast(m); setTimeout(()=>setToast(null), 2500) }

  const handleLoginSuccess=(t:string)=>{
    show('Вход выполнен')
    saveToken(t)
    setTok(t)
  }
  const handleRegisterSuccess=(t:string)=>{
    show('Регистрация произошла успешно')
    saveToken(t)
    setTok(t)
  }

  const tabs: {k:Tab; icon:string}[] = [
    {k:'Профиль',icon:icProfile},
    {k:'Магазин',icon:icShop},
    {k:'Грядка',icon:icGarden},
    {k:'Инвентарь',icon:icInv},
  ]

  return <div className='app'>
    {token? <>
      <Header onLogout={logout}/>
      <div className='tabs'>
        {tabs.map(t=>
          <button key={t.k} className={'tab '+(active===t.k?'active':'')} onClick={()=>setActive(t.k)}>
            <img src={t.icon} alt="" /> {t.k}
          </button>
        )}
      </div>
      <div style={{padding:20}}>
        {active==='Профиль'? <Profile onToast={show}/>:
          active==='Магазин'? <Shop onToast={show} seedIcons={seedIcons}/>:
          active==='Грядка'? <Garden onToast={show} seedIcons={seedIcons}/>:
          <Inventory onToast={show} seedIcons={seedIcons}/>
        }
      </div>
    </>:
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
      />}
    {toast? <div className="toast">{toast}</div>: null}
  </div>
}

function Header({onLogout}:{onLogout:()=>void}){
  return <div className='header'>
    <div className='logo'>🥕</div>
    <div className='badge'>Ферма</div>
    <div style={{marginLeft:'auto', display:'flex', gap:8}}>
      <button className='btn danger' onClick={onLogout}>Выйти</button>
    </div>
  </div>
}

function InputField({label,type='text',value,onChange,error}:{label:string;type?:string;value:string;onChange:(v:string)=>void;error?:string|null}){
  return <div className='input'>
    <label>{label}</label>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}/>
    {error? <div className='err'>{error}</div>:null}
  </div>
}

// === Auth page ===
function AuthPage({onLoginSuccess,onRegisterSuccess}:{onLoginSuccess:(t:string)=>void;onRegisterSuccess:(t:string)=>void}){
  const [mode,setMode]=React.useState<'login'|'register'>('login')
  return <div className='auth-page'>
    <div className='card auth-panel'>
      <div className='auth-tabs'>
        <button
          type='button'
          className={'auth-tab '+(mode==='login'?'active':'')}
          onClick={()=>setMode('login')}
        >Вход</button>
        <button
          type='button'
          className={'auth-tab '+(mode==='register'?'active':'')}
          onClick={()=>setMode('register')}
        >Регистрация</button>
      </div>
      {mode==='login'?
        <LoginForm onSuccess={onLoginSuccess} onSwitchToRegister={()=>setMode('register')}/>:
        <RegisterForm onSuccess={onRegisterSuccess} onSwitchToLogin={()=>setMode('login')}/>
      }
    </div>
  </div>
}

function LoginForm({onSuccess,onSwitchToRegister}:{onSuccess:(t:string)=>void;onSwitchToRegister:()=>void}){
  const [email,setEmail]=React.useState('')
  const [password,setPassword]=React.useState('')
  const [errEmail,setErrEmail]=React.useState<string|null>(null)
  const [errPass,setErrPass]=React.useState<string|null>(null)
  const submit=async()=>{
    setErrEmail(null); setErrPass(null)
    if(!email){ setErrEmail('Не заполнено поле'); return }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setErrEmail('Ошибка валидации'); return }
    if(!password){ setErrPass('Не заполнено поле'); return }
    try{
      const {data}=await api.post('/auth/login',{email,password})
      onSuccess(data.token)
    }catch(e:any){ setErrPass('Ошибка валидации') }
  }
  return <div className='auth-content'>
    <h3>Вход</h3>
    <div className='grid'>
      <InputField label='Email' value={email} onChange={setEmail} error={errEmail}/>
      <InputField label='Пароль' type='password' value={password} onChange={setPassword} error={errPass}/>
    </div>
    <div className='auth-controls'>
      <div className='auth-alt'>
        <span className='auth-question'>Нет аккаунта?</span>
        <button type='button' className='auth-secondary' onClick={onSwitchToRegister}>Зарегистрироваться</button>
      </div>
      <button className='btn' onClick={submit}>Войти</button>
    </div>
  </div>
}

function RegisterForm({onSuccess,onSwitchToLogin}:{onSuccess:(t:string)=>void;onSwitchToLogin:()=>void}){
  const [email,setEmail]=React.useState('')
  const [password,setPassword]=React.useState('')
  const [pass2,setPass2]=React.useState('')
  const [errE,setErrE]=React.useState<string|null>(null)
  const [errP,setErrP]=React.useState<string|null>(null)
  const [errP2,setErrP2]=React.useState<string|null>(null)
  const submit=async()=>{
    setErrE(null); setErrP(null); setErrP2(null);
    if(!email){ setErrE('Не заполнено поле'); return }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setErrE('Ошибка валидации'); return }
    if(!password){ setErrP('Не заполнено поле'); return }
    if(!/^(?=.*\d)[A-Za-z\d]{6,20}$/.test(password)){ setErrP('Ошибка валидации'); return }
    if(!pass2){ setErrP2('Не заполнено поле'); return }
    if(pass2!==password){ setErrP2('Ошибка валидации'); return }
    try{
      const {data}=await api.post('/auth/register',{email,password})
      onSuccess(data.token)
    }catch(e:any){ setErrE('Ошибка валидации') }
  }
  return <div className='auth-content'>
    <h3>Регистрация</h3>
    <div className='grid'>
      <InputField label='Email' value={email} onChange={setEmail} error={errE}/>
      <InputField label='Пароль' type='password' value={password} onChange={setPassword} error={errP}/>
      <InputField label='Подтверждение пароля' type='password' value={pass2} onChange={setPass2} error={errP2}/>
    </div>
    <div className='auth-controls'>
      <div className='auth-alt'>
        <span className='auth-question'>Уже есть аккаунт?</span>
        <button type='button' className='auth-secondary' onClick={onSwitchToLogin}>Войти</button>
      </div>
      <button className='btn' onClick={submit}>Зарегистрироваться</button>
    </div>
  </div>
}

// === Pages ===
function Profile({onToast}:{onToast:(m:string)=>void}){
  const [data,setData]=React.useState<any|null>(null)
  const [isCool,setIsCool]=React.useState(false)
  const [form,setForm]=React.useState<any>({})
  const [errs,setErrs]=React.useState<any>({})

  const load=async()=>{
    const {data}=await api.get('/profile')
    setData(data); setIsCool(!!data.isCoolFarmer)
    if(data.isCoolFarmer) setForm({nickname:data.nickname||'', passport:data.passport||''})
    else setForm({firstName:data.firstName||'', lastName:data.lastName||'', middleName:data.middleName||''})
  }
  React.useEffect(()=>{ load() },[])

  const save=async()=>{
    setErrs({})
    function setErr(k:string, msg:string){ setErrs((e:any)=>({...e,[k]:msg})) }
    if(isCool){
      if(!form.nickname) return setErr('nickname','Не заполнено поле')
      if(!/^[A-Za-z]{2,15}$/.test(form.nickname)) return setErr('nickname','Ошибка валидации')
      }
    }
    await api.put('/profile', { isCoolFarmer:isCool, ...form })
    onToast('Данные сохранены')
    load()
  }

  if(!data) return <div className='card'>Загрузка...</div>
  const level = data.level
  return <div className='grid'>
    <div className='row' style={{gap:8, justifyContent:'flex-end'}}>
      <div className='badge'>Уровень: {level}</div>
      <div className='badge'>Продано: {data.soldCount}</div>
      <div className='badge'>Баланс: <span className='money'>{data.balance} ₽</span></div>
    </div>
    <div className='card'>
      <label className='row' style={{gap:8}}>
        <input type='checkbox' checked={isCool} onChange={e=>setIsCool(e.target.checked)}/>
        Ты крутой фермер?
      </label>
      {!isCool? <div className='grid grid-3' style={{marginTop:12}}>
        <InputField label='Имя' value={form.firstName||''} onChange={v=>setForm({...form,firstName:v})} error={errs.firstName}/>
        <InputField label='Фамилия' value={form.lastName||''} onChange={v=>setForm({...form,lastName:v})} error={errs.lastName}/>
        <InputField label='Отчество' value={form.middleName||''} onChange={v=>setForm({...form,middleName:v})} error={errs.middleName}/>
      </div>:<div className='grid grid-2' style={{marginTop:12}}>
        <InputField label='Прозвище' value={form.nickname||''} onChange={v=>setForm({...form,nickname:v})} error={errs.nickname}/>
        <InputField label='Паспорт фермера' value={form.passport||''} onChange={v=>setForm({...form,passport:v})} error={errs.passport}/>
      </div>}
      <div className='row' style={{justifyContent:'flex-end', marginTop:12}}>
        <button className='btn' onClick={save}>Сохранить</button>
      </div>
    </div>
  </div>
}

function Shop({onToast, seedIcons}:{onToast:(m:string)=>void; seedIcons:any}){
  const [sub,setSub]=React.useState<'Покупка'|'Продажа'>('Покупка')
  const [prices,setPrices]=React.useState<any>(null)
  const [profile,setProfile]=React.useState<any>(null)
  const [inv,setInv]=React.useState<any>({seeds:[],vegRaw:[],vegWashed:[]})

  const load=async()=>{
    const p=await api.get('/profile'); setProfile(p.data)
    const pr=await api.get('/shop/prices'); setPrices(pr.data)
    const i=await api.get('/inventory'); setInv(i.data)
  }
  React.useEffect(()=>{ load() },[])

  const buy=async(type:string)=>{ await api.post('/shop/buy',{type}); onToast('Куплено'); load() }
  const sell=async(id:number)=>{ await api.post('/shop/sell',{inventoryId:id}); onToast('Продано'); load() }

  if(!prices || !profile) return <div className='card'>Загрузка...</div>
  const level = profile.level

  return <div className='grid'>
    <div className='row' style={{gap:8}}>
      <button className={'tab '+(sub==='Покупка'?'active':'')} onClick={()=>setSub('Покупка')}><img src={icBuy}/>&nbsp;Покупка</button>
      <button className={'tab '+(sub==='Продажа'?'active':'')} onClick={()=>setSub('Продажа')}><img src={icSell}/>&nbsp;Продажа</button>
    </div>

    {sub==='Покупка'? <div className='grid'>
      <div className='card grid'>
        <h3>Семена уровня 1 (по {prices.purchase.basePrice} ₽)</h3>
        {(['radish','carrot','cabbage'] as const).map(t=>
          <div key={t} className='shop-item'>
            <div className='shop-left'><img src={seedIcons[t]} alt=""/><div>{seedNames[t]}</div></div>
            <button className='btn' onClick={()=>buy(t)}><img src={icBuy} alt=""/>Купить</button>
          </div>
        )}
      </div>
      <div className='card grid'>
        <h3>Семена уровня 2 (по {prices.purchase.advPrice} ₽) — открываются после 50 продаж</h3>
        {(['mango','potato','eggplant'] as const).map(t=>
          <div key={t} className='shop-item' style={{opacity: level<2? .5:1}}>
            <div className='shop-left'><img src={seedIcons[t]} alt=""/><div>{seedNames[t]}</div></div>
            <button className='btn' disabled={level<2} onClick={()=>buy(t)}><img src={icBuy} alt=""/>Купить</button>
          </div>
        )}
      </div>
    </div>:
    <div className='card grid'>
      <h3>Помытые овощи к продаже</h3>
      {inv.vegWashed.length===0? <div>Пусто</div>:
        inv.vegWashed.map((i:any)=>
          <div key={i.id} className='shop-item'>
            <div className='shop-left'><img src={seedIcons[i.type]} alt=""/><div>{seedNames[i.type]}</div></div>
            <button className='btn' onClick={()=>sell(i.id)}><img src={icSell} alt=""/>Продать</button>
          </div>
        )
      }
    </div>}
  </div>
}

function Inventory({onToast, seedIcons}:{onToast:(m:string)=>void; seedIcons:any}){
  const [inv,setInv]=React.useState<any>({seeds:[],vegRaw:[],vegWashed:[]})
  const load=async()=>{ const {data}=await api.get('/inventory'); setInv(data) }
  React.useEffect(()=>{ load() },[])
  const wash=async(id:number)=>{ await api.patch(`/inventory/wash/${id}`); onToast('Овощ помыт'); load() }

  return <div className='grid'>
    <div className='grid grid-3'>
      <div className='card'>
        <h3>Семена</h3>
        {inv.seeds.length===0?'Пусто':inv.seeds.map((i:any)=>
          <div key={i.id} className='shop-item'>
            <div className='shop-left'><img src={seedIcons[i.type]} alt=""/><div>{seedNames[i.type]}</div></div>
          </div>
        )}
      </div>
      <div className='card'>
        <h3>Собранные</h3>
        {inv.vegRaw.length===0?'Пусто':inv.vegRaw.map((i:any)=>
          <div key={i.id} className='shop-item'>
            <div className='shop-left'><img src={seedIcons[i.type]} alt=""/><div>{seedNames[i.type]}</div></div>
            <button className='btn' onClick={()=>wash(i.id)}><img src={icWash} alt=""/>Помыть</button>
          </div>
        )}
      </div>
      <div className='card'>
        <h3>Помытые</h3>
        {inv.vegWashed.length===0?'Пусто':inv.vegWashed.map((i:any)=>
          <div key={i.id} className='shop-item'>
            <div className='shop-left'><img src={seedIcons[i.type]} alt=""/><div>{seedNames[i.type]}</div></div>
          </div>
        )}
      </div>
    </div>
  </div>
}

function Garden({onToast, seedIcons}:{onToast:(m:string)=>void; seedIcons:any}){
  const [plots,setPlots]=React.useState<any[]>([])
  const [inv,setInv]=React.useState<any>({seeds:[]})
  const [timer,setTimer]=React.useState(0)

  const load=async()=>{
    const p=await api.get('/garden/plots'); setPlots(p.data)
    const i=await api.get('/inventory'); setInv({seeds:i.data.seeds})
  }
  React.useEffect(()=>{ load() },[])

  React.useEffect(()=>{
    const t=setInterval(()=>setTimer(t=>t+1), 1000)
    return ()=>clearInterval(t)
  },[])

  const plant=async(slot:number, seedId:number)=>{ await api.post('/garden/plant',{slot, inventoryId:seedId}); onToast('Посажено'); load() }
  const harvest=async(slot:number)=>{ await api.post('/garden/harvest',{slot}); onToast('Собрано'); load() }
  const remaining = (plantedAt:string|null)=>{
    if(!plantedAt) return ''
    const planted = new Date(plantedAt).getTime()
    const now = Date.now()
    const total = 10*60*1000
    const passed = now - planted
    const left = Math.max(0, total - passed)
    const mm = Math.floor(left/60000); const ss = Math.floor((left%60000)/1000)
    return `${mm}:${String(ss).padStart(2,'0')}`
  }

  return <div className='grid'>
    <div className='grid grid-3'>
      {plots.map(p=>
        <div key={p.slot} className='slot card'>
           {!p.type || p.harvested? <div style={{textAlign:'center'}}>
            <div>Пустая грядка #{p.slot}</div>
            <SeedPicker seeds={inv.seeds} onPick={(id)=>plant(p.slot,id)} seedIcons={seedIcons}/>
          </div>:
          <div style={{textAlign:'center'}}>
            <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:8}}>
              <img src={seedIcons[p.type]} style={{width:32,height:32}}/> <div>Растёт: <b>{seedNames[p.type]}</b></div>
            </div>
            {p.matured? <button className='btn' onClick={()=>harvest(p.slot)}><img src={icPlant}/>Собрать</button>:
              <div>Созревание: {remaining(p.plantedAt)}</div>
            }
          </div>}
        </div>
      )}
    </div>
  </div>
}

function SeedPicker({seeds,onPick,seedIcons}:{seeds:any[];onPick:(id:number)=>void;seedIcons:any}){
  const [open,setOpen]=React.useState(false)
  if(!open) return <button className='btn' onClick={()=>setOpen(true)}><img src={icPlant}/>Посадить</button>
  return <div className='card' style={{background:'#fff'}}>
    {seeds.length===0? 'Нет семян' :
      seeds.map((s:any)=>
        <div key={s.id} className='shop-item'>
          <div className='shop-left'><img src={seedIcons[s.type]} alt=""/><div>{seedNames[s.type]}</div></div>
          <button className='btn' onClick={()=>onPick(s.id)}><img src={icPlant}/>Выбрать</button>
        </div>
      )
    }
  </div>
}
