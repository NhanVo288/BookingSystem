import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Home from './pages/Home'
import Auth from './pages/Auth'
import RoomDetail from './pages/RoomDetail'
import Dashboard from './pages/Dashboard'
import Auctions from './pages/Auctions'

function Protected({children}:{children:React.ReactNode}) {
  const {user,loading}=useAuth()
  if(loading) return <div className="page-loader"><span className="spinner"/>Đang mở cửa Roomly…</div>
  return user ? children : <Navigate to="/auth" replace />
}
export default function App(){return <Routes>
  <Route element={<Layout/>}>
    <Route index element={<Home/>}/>
    <Route path="rooms/:id" element={<RoomDetail/>}/>
    <Route path="auctions" element={<Auctions/>}/>
    <Route path="dashboard/*" element={<Protected><Dashboard/></Protected>}/>
  </Route>
  <Route path="auth" element={<Auth/>}/>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>}

