import { Heart, MapPin, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { RoomSummary } from '../types'
import { money } from '../types'

const fallback=['linear-gradient(135deg,#d7bfa9,#806a58)','linear-gradient(135deg,#a9b8ac,#40584a)','linear-gradient(135deg,#d8c7aa,#9f7c4e)','linear-gradient(135deg,#bbc6cb,#536873)']
export function RoomCard({room,index=0}:{room:RoomSummary;index?:number}){return <article className="room-card"><Link to={`/rooms/${room.id}`} className="room-image" style={!room.thumbnailUrl?{background:fallback[index%fallback.length]}:undefined}>{room.thumbnailUrl&&<img src={room.thumbnailUrl} alt={room.title}/>}<button aria-label="Yêu thích" onClick={e=>e.preventDefault()}><Heart/></button>{room.freeCancellation&&<span>Hủy miễn phí</span>}</Link><Link to={`/rooms/${room.id}`} className="room-info"><div><h3>{room.title}</h3><p><MapPin/> {room.city||'Việt Nam'}</p></div><strong>{money(room.pricePerNight)} <small>/ đêm</small></strong><span className="rating"><Star/> {room.averageRating?.toFixed(1)||'Mới'}</span></Link></article>}
export function Loading(){return <div className="loading"><span className="spinner"/><p>Đang tìm những nơi thật đẹp…</p></div>}
export function Empty({title,text}:{title:string;text?:string}){return <div className="empty"><div>⌂</div><h3>{title}</h3>{text&&<p>{text}</p>}</div>}
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'green'|'orange'|'red'|'neutral'}){return <span className={`badge ${tone}`}>{children}</span>}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</section></div>}
