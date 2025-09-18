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

type Page = 'auth'|'main'

type SeedIconMap = Record<string,string>

type ToastFn = (message: string) => void

const seedNames: Record<string,string> = {
  radish:'Редис',
  carrot:'Морковь',
  cabbage:'Капуста',
  mango:'Манго',
  potato:'Картофель',
  eggplant:'Баклажан'
}

const seedIcons: SeedIconMap = {
  radish,
  carrot,
  cabbage,
  mango,
  potato,
  eggplant
}

function getStoredToken(){
  return localStorage.getItem('token')
}

function persistToken(token: string){
  localStorage.setItem('token', token)
  setToken(token)
}

export default function App(){
  const [token,setTok] = React.useState<string|null>(()=>getStoredToken())
  const [page,setPage] = React.useState<Page>(()=>getStoredToken()? 'main':'auth')
  const [toast,setToast] = React.useState<string|null>(null)

    const goTo = React.useCallback((next: Page, options?: { replace?: boolean })=>{
    setPage(next)
    if(typeof window !== 'undefined'){
      const path = next==='main'?'/app':'/'
      if(options?.replace){
        window.history.replaceState(null,'',path)
      }else{
        window.history.pushState(null,'',path)
      }
    }
  },[])

  React.useEffect(()=>{ setToken(token) },[token])

  React.useEffect(()=>{
    if(typeof window === 'undefined') return
    const sync = ()=>{
      const path = window.location.pathname
      if(path==='/app'){
        if(token){
          setPage('main')
        }else{
          goTo('auth', { replace: true })
        }
      }else{
        if(token){
          goTo('main', { replace: true })
        }else{
          if(path!=='/'){
            goTo('auth', { replace: true })
          }
          setPage('auth')
        }
      }
    }
    sync()
    window.addEventListener('popstate', sync)
    return ()=> window.removeEventListener('popstate', sync)
  },[token, goTo])

  const showToast: ToastFn = (message)=>{
    setToast(message)
    setTimeout(()=>setToast(null), 2500)
  }

  const handleLoginSuccess = (newToken: string)=>{
    showToast('Вход выполнен')
    persistToken(newToken)
    setTok(newToken)
    goTo('main', { replace: true })
  }

  const handleRegisterSuccess = (newToken: string)=>{
    showToast('Регистрация произошла успешно')
    persistToken(newToken)
    setTok(newToken)
  }

  const handleLogout = ()=>{
    localStorage.removeItem('token')
    setTok(null)
    goTo('auth', { replace: true })
  }

  return (
    <div className='app'>
      {token && page==='main' ? (
        <MainPage
          onLogout={handleLogout}
          onToast={showToast}
        />
      ) : (
        <AuthPage
          onLoginSuccess={handleLoginSuccess}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}
      {toast && <div className='toast'>{toast}</div>}
    </div>
  )
}

function MainPage({ onLogout, onToast }:{ onLogout:()=>void; onToast: ToastFn }){
  const [active,setActive] = React.useState<Tab>('Профиль')

  const tabs: { key: Tab; icon: string }[] = [
    { key:'Профиль', icon: icProfile },
    { key:'Магазин', icon: icShop },
    { key:'Грядка', icon: icGarden },
    { key:'Инвентарь', icon: icInv }
  ]

  return (
    <>
      <Header onLogout={onLogout} />
      <div className='tabs'>
        {tabs.map(tab=>(
          <button
            key={tab.key}
            className={'tab '+(active===tab.key?'active':'')}
            onClick={()=>setActive(tab.key)}
          >
            <img src={tab.icon} alt=''/> {tab.key}
          </button>
        ))}
      </div>
      <div style={{padding:20}}>
        {active==='Профиль' && <Profile onToast={onToast} />}
        {active==='Магазин' && <Shop onToast={onToast} seedIcons={seedIcons} />}
        {active==='Грядка' && <Garden onToast={onToast} seedIcons={seedIcons} />}
        {active==='Инвентарь' && <Inventory onToast={onToast} seedIcons={seedIcons} />}
      </div>
    </>
  )
}

function Header({onLogout}:{onLogout:()=>void}){
  return (
    <div className='header'>
      <div className='logo'>🥕</div>
      <div className='badge'>Ферма</div>
      <div style={{marginLeft:'auto', display:'flex', gap:8}}>
        <button className='btn danger' onClick={onLogout}>Выйти</button>
      </div>
    </div>
  )
}

function InputField({
  label,
  type='text',
  value,
  onChange,
  error,
  footer
}:{
  label: string
  type?: string
  value: string
  onChange: (value: string)=>void
  error?: string|null
  footer?: React.ReactNode
}){
  return (
    <div className='input'>
      <label>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} />
      {error ? <div className='err'>{error}</div> : null}
      {footer}
    </div>
  )
}

function AuthPage({
  onLoginSuccess,
  onRegisterSuccess
}:{
  onLoginSuccess:(token:string)=>void
  onRegisterSuccess:(token:string)=>void
}){
  const [mode,setMode] = React.useState<'login'|'register'>('login')

  return (
    <div className='auth-page'>
      <Modal title={mode==='login'?'Авторизация':'Регистрация'}>
        {mode==='login' ? (
          <LoginForm
            onSuccess={onLoginSuccess}
            onSwitchToRegister={()=>setMode('register')}
          />
        ) : (
          <RegisterForm
            onSuccess={onRegisterSuccess}
            onSwitchToLogin={()=>setMode('login')}
          />
        )}
              </Modal>
    </div>
  )
}

function Modal({ title, children }:{ title: string; children: React.ReactNode }){
  return (
    <div className='modal-backdrop auth-overlay'>
      <div className='card modal auth-modal'>
        <h3 className='modal-title'>{title}</h3>
        {children}
      </div>
    </div>
  )
}

function LoginForm({
  onSuccess,
  onSwitchToRegister
}:{
  onSuccess:(token:string)=>void
  onSwitchToRegister:()=>void
}){
  const [email,setEmail] = React.useState('')
  const [password,setPassword] = React.useState('')
  const [errEmail,setErrEmail] = React.useState<string|null>(null)
  const [errPassword,setErrPassword] = React.useState<string|null>(null)

  const submit = async ()=>{
    setErrEmail(null)
    setErrPassword(null)

    if(!email){ setErrEmail('Не заполнено поле'); return }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setErrEmail('Ошибка валидации'); return }
    if(!password){ setErrPassword('Не заполнено поле'); return }

    try {
      const { data } = await api.post('/auth/login', { email, password })
      onSuccess(data.token)
    } catch (err) {
      setErrPassword('Ошибка валидации')
    }
  }

  return (
    <div className='auth-content'>
      <div className='grid'>
        <InputField label='Email' value={email} onChange={setEmail} error={errEmail} />
        <InputField
          label='Пароль'
          type='password'
          value={password}
          onChange={setPassword}
          error={errPassword}
          footer={(
            <div className='auth-alt-column'>
              <span className='auth-question'>Нет аккаунта бродяга?</span>
              <button type='button' className='auth-secondary' onClick={onSwitchToRegister}>Зарегистрироваться</button>
            </div>
          )}
        />
      </div>
      <div className='auth-controls auth-controls--single'>
        <button className='btn' onClick={submit}>Войти</button>
      </div>
    </div>
  )
}

function RegisterForm({
  onSuccess,
  onSwitchToLogin
}:{
  onSuccess:(token:string)=>void
  onSwitchToLogin:()=>void
}){
  const [email,setEmail] = React.useState('')
  const [password,setPassword] = React.useState('')
  const [confirm,setConfirm] = React.useState('')
  const [errEmail,setErrEmail] = React.useState<string|null>(null)
  const [errPassword,setErrPassword] = React.useState<string|null>(null)
  const [errConfirm,setErrConfirm] = React.useState<string|null>(null)

  const submit = async ()=>{
    setErrEmail(null)
    setErrPassword(null)
    setErrConfirm(null)

    if(!email){ setErrEmail('Не заполнено поле'); return }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setErrEmail('Ошибка валидации'); return }
    if(!password){ setErrPassword('Не заполнено поле'); return }
    if(!/^(?=.*\d)[A-Za-z\d]{6,20}$/.test(password)){ setErrPassword('Ошибка валидации'); return }
    if(!confirm){ setErrConfirm('Не заполнено поле'); return }
    if(confirm!==password){ setErrConfirm('Ошибка валидации'); return }

    try {
      const { data } = await api.post('/auth/register', { email, password })
      onSuccess(data.token)
    } catch (err) {
      setErrEmail('Ошибка валидации')
    }
  }

  return (
    <div className='auth-content'>
      <div className='grid'>
        <InputField label='Email' value={email} onChange={setEmail} error={errEmail} />
        <InputField label='Пароль' type='password' value={password} onChange={setPassword} error={errPassword} />
        <InputField label='Подтверждение пароля' type='password' value={confirm} onChange={setConfirm} error={errConfirm} />
      </div>
      <div className='auth-controls'>
        <div className='auth-alt'>
          <span className='auth-question'>Уже есть аккаунт?</span>
          <button type='button' className='auth-secondary' onClick={onSwitchToLogin}>Войти</button>
        </div>
        <button className='btn' onClick={submit}>Зарегистрироваться</button>
      </div>
    </div>
  )
}

function Profile({ onToast }:{ onToast: ToastFn }){
  const [data,setData] = React.useState<any|null>(null)
  const [isCool,setIsCool] = React.useState(false)
  const [form,setForm] = React.useState<any>({})
  const [errs,setErrs] = React.useState<any>({})

  const load = async ()=>{
    const { data } = await api.get('/profile')
    setData(data)
    setIsCool(!!data.isCoolFarmer)
    if(data.isCoolFarmer){
      setForm({ nickname: data.nickname || '', passport: data.passport || '' })
    }else{
      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        middleName: data.middleName || ''
      })
    }
  }

  React.useEffect(()=>{ load() },[])

  const save = ()=>{
    setErrs({})
    const pushError = (key: string, message: string)=>{
      setErrs((prev:any)=>({ ...prev, [key]: message }))
    }

    if(isCool){
      if(!form.nickname) return pushError('nickname','Не заполнено поле')
      if(!/^[A-Za-z]{2,15}$/.test(form.nickname)) return pushError('nickname','Ошибка валидации')
      if(!form.passport) return pushError('passport','Не заполнено поле')
      if(!/^\d{6}$/.test(form.passport)) return pushError('passport','Ошибка валидации')
    }else{
      const ru = /^[А-ЯЁа-яё\-\s]{2,40}$/
      for (const key of ['firstName','lastName','middleName']){
        if(!form[key]) return pushError(key,'Не заполнено поле')
        if(!ru.test(form[key])) return pushError(key,'Ошибка валидации')
      }
    }

    api.put('/profile', { isCoolFarmer: isCool, ...form })
      .then(()=>{
        onToast('Данные сохранены')
        load()
      })
      .catch(()=>{
        onToast('Не удалось сохранить данные')
      })
  }

  if(!data) return <div className='card'>Загрузка...</div>
  const level = data.level

  return (
    <div className='grid'>
      <div className='row' style={{gap:8, justifyContent:'flex-end'}}>
        <div className='badge'>Уровень: {level}</div>
        <div className='badge'>Продано: {data.soldCount}</div>
        <div className='badge'>Баланс: <span className='money'>{data.balance} ₽</span></div>
      </div>
      <div className='card'>
        <label className='row' style={{gap:8}}>
          <input type='checkbox' checked={isCool} onChange={e=>setIsCool(e.target.checked)} />
          Ты крутой фермер?
        </label>
        {!isCool ? (
          <div className='grid grid-3' style={{marginTop:12}}>
            <InputField label='Имя' value={form.firstName || ''} onChange={value=>setForm({...form, firstName: value})} error={errs.firstName} />
            <InputField label='Фамилия' value={form.lastName || ''} onChange={value=>setForm({...form, lastName: value})} error={errs.lastName} />
            <InputField label='Отчество' value={form.middleName || ''} onChange={value=>setForm({...form, middleName: value})} error={errs.middleName} />
          </div>
        ) : (
          <div className='grid grid-2' style={{marginTop:12}}>
            <InputField label='Прозвище' value={form.nickname || ''} onChange={value=>setForm({...form, nickname: value})} error={errs.nickname} />
            <InputField label='Паспорт фермера' value={form.passport || ''} onChange={value=>setForm({...form, passport: value})} error={errs.passport} />
          </div>
        )}
        <div className='row' style={{justifyContent:'flex-end', marginTop:12}}>
          <button className='btn' onClick={save}>Сохранить</button>
        </div>
      </div>
    </div>
  )
}

function Shop({ onToast, seedIcons }:{ onToast: ToastFn; seedIcons: SeedIconMap }){
  const [sub,setSub] = React.useState<'Покупка'|'Продажа'>('Покупка')
  const [prices,setPrices] = React.useState<any>(null)
  const [profile,setProfile] = React.useState<any>(null)
  const [inventory,setInventory] = React.useState<any>({ seeds: [], vegRaw: [], vegWashed: [] })

  const load = async ()=>{
    const profileResponse = await api.get('/profile')
    setProfile(profileResponse.data)
    const priceResponse = await api.get('/shop/prices')
    setPrices(priceResponse.data)
    const inventoryResponse = await api.get('/inventory')
    setInventory(inventoryResponse.data)
  }

  React.useEffect(()=>{ load() },[])

  const buy = async (type: string)=>{
    await api.post('/shop/buy', { type })
    onToast('Куплено')
    load()
  }

  const sell = async (inventoryId: number)=>{
    await api.post('/shop/sell', { inventoryId })
    onToast('Продано')
    load()
  }

  if(!prices || !profile) return <div className='card'>Загрузка...</div>
  const level = profile.level

  return (
    <div className='grid'>
      <div className='row' style={{gap:8}}>
        <button className={'tab '+(sub==='Покупка'?'active':'')} onClick={()=>setSub('Покупка')}><img src={icBuy} alt='' />&nbsp;Покупка</button>
        <button className={'tab '+(sub==='Продажа'?'active':'')} onClick={()=>setSub('Продажа')}><img src={icSell} alt='' />&nbsp;Продажа</button>
      </div>

      {sub==='Покупка' ? (
        <div className='grid'>
          <div className='card grid'>
            <h3>Семена уровня 1 (по {prices.purchase.basePrice} ₽)</h3>
            {(['radish','carrot','cabbage'] as const).map(type=>(
              <div key={type} className='shop-item'>
                <div className='shop-left'>
                  <img src={seedIcons[type]} alt='' />
                  <div>{seedNames[type]}</div>
                </div>
                <button className='btn' onClick={()=>buy(type)}><img src={icBuy} alt='' />Купить</button>
              </div>
            ))}
          </div>
          <div className='card grid'>
            <h3>Семена уровня 2 (по {prices.purchase.advPrice} ₽) — открываются после 50 продаж</h3>
            {(['mango','potato','eggplant'] as const).map(type=>(
              <div key={type} className='shop-item' style={{opacity: level<2 ? 0.5 : 1}}>
                <div className='shop-left'>
                  <img src={seedIcons[type]} alt='' />
                  <div>{seedNames[type]}</div>
                </div>
                <button className='btn' disabled={level<2} onClick={()=>buy(type)}><img src={icBuy} alt='' />Купить</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className='card grid'>
          <h3>Помытые овощи к продаже</h3>
          {inventory.vegWashed.length===0 ? (
            <div>Пусто</div>
          ) : (
            inventory.vegWashed.map((item:any)=>(
              <div key={item.id} className='shop-item'>
                <div className='shop-left'>
                  <img src={seedIcons[item.type]} alt='' />
                  <div>{seedNames[item.type]}</div>
                </div>
                <button className='btn' onClick={()=>sell(item.id)}><img src={icSell} alt='' />Продать</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function Inventory({ onToast, seedIcons }:{ onToast: ToastFn; seedIcons: SeedIconMap }){
  const [inventory,setInventory] = React.useState<any>({ seeds: [], vegRaw: [], vegWashed: [] })

  const load = async ()=>{
    const { data } = await api.get('/inventory')
    setInventory(data)
  }

  React.useEffect(()=>{ load() },[])

  const wash = async (inventoryId: number)=>{
    await api.post('/inventory/wash', { inventoryId })
    onToast('Овощ помыт')
    load()
  }

  return (
    <div className='grid'>
      <div className='grid grid-3'>
        <div className='card'>
          <h3>Семена</h3>
          {inventory.seeds.length===0 ? 'Пусто' : inventory.seeds.map((item:any)=>(
            <div key={item.id} className='shop-item'>
              <div className='shop-left'>
                <img src={seedIcons[item.type]} alt='' />
                <div>{seedNames[item.type]}</div>
              </div>
            </div>
          ))}
        </div>
        <div className='card'>
          <h3>Собранные</h3>
          {inventory.vegRaw.length===0 ? 'Пусто' : inventory.vegRaw.map((item:any)=>(
            <div key={item.id} className='shop-item'>
              <div className='shop-left'>
                <img src={seedIcons[item.type]} alt='' />
                <div>{seedNames[item.type]}</div>
              </div>
              <button className='btn' onClick={()=>wash(item.id)}><img src={icWash} alt='' />Помыть</button>
            </div>
          ))}
        </div>
        <div className='card'>
          <h3>Помытые</h3>
          {inventory.vegWashed.length===0 ? 'Пусто' : inventory.vegWashed.map((item:any)=>(
            <div key={item.id} className='shop-item'>
              <div className='shop-left'>
                <img src={seedIcons[item.type]} alt='' />
                <div>{seedNames[item.type]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Garden({ onToast, seedIcons }:{ onToast: ToastFn; seedIcons: SeedIconMap }){
  const [plots,setPlots] = React.useState<any[]>([])
  const [inventory,setInventory] = React.useState<any>({ seeds: [] })

  const load = async ()=>{
    const plotsResponse = await api.get('/garden/plots')
    setPlots(plotsResponse.data)
    const inventoryResponse = await api.get('/inventory')
    setInventory({ seeds: inventoryResponse.data.seeds })
  }

  React.useEffect(()=>{ load() },[])

  const [,forceUpdate] = React.useReducer(x=>x+1,0)

  React.useEffect(()=>{
    const t = setInterval(()=>forceUpdate(), 1000)
    return ()=>clearInterval(t)
  },[])

  const plant = async (slot:number, inventoryId:number)=>{
    await api.post('/garden/plant', { slot, inventoryId })
    onToast('Посажено')
    load()
  }

  const harvest = async (slot:number)=>{
    await api.post('/garden/harvest', { slot })
    onToast('Собрано')
    load()
  }

  const remaining = (plantedAt: string|null)=>{
    if(!plantedAt) return ''
    const planted = new Date(plantedAt).getTime()
    const now = Date.now()
    const total = 10 * 60 * 1000
    const passed = now - planted
    const left = Math.max(0, total - passed)
    const mm = Math.floor(left/60000)
    const ss = Math.floor((left%60000)/1000)
    return `${mm}:${String(ss).padStart(2,'0')}`
  }

  return (
    <div className='grid'>
      <div className='grid grid-3'>
        {plots.map(plot=>(
          <div key={plot.slot} className='slot card'>
            {!plot.type || plot.harvested ? (
              <div style={{textAlign:'center'}}>
                <div>Пустая грядка #{plot.slot}</div>
                <SeedPicker
                  seeds={inventory.seeds}
                  onPick={seedId=>plant(plot.slot, seedId)}
                  seedIcons={seedIcons}
                />
              </div>
            ) : (
              <div style={{textAlign:'center'}}>
                <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:8}}>
                  <img src={seedIcons[plot.type]} style={{width:32,height:32}} alt='' />
                  <div>Растёт: <b>{seedNames[plot.type]}</b></div>
                </div>
                {plot.matured ? (
                  <button className='btn' onClick={()=>harvest(plot.slot)}><img src={icPlant} alt='' />Собрать</button>
                ) : (
                  <div>Созревание: {remaining(plot.plantedAt)}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SeedPicker({
  seeds,
  onPick,
  seedIcons
}:{
  seeds:any[]
  onPick:(id:number)=>void
  seedIcons:SeedIconMap
}){
  const [open,setOpen] = React.useState(false)

  if(!open) return <button className='btn' onClick={()=>setOpen(true)}><img src={icPlant} alt='' />Посадить</button>

  return (
    <div className='card' style={{background:'#fff'}}>
      {seeds.length===0 ? (
        'Нет семян'
      ) : (
        seeds.map((seed:any)=>(
          <div key={seed.id} className='shop-item'>
            <div className='shop-left'>
              <img src={seedIcons[seed.type]} alt='' />
              <div>{seedNames[seed.type]}</div>
            </div>
            <button className='btn' onClick={()=>{ onPick(seed.id); setOpen(false) }}><img src={icPlant} alt='' />Выбрать</button>
          </div>
        ))
      )}
    </div>
  )
}
