import { toast } from 'sonner'
export const fail=(error:unknown)=>toast.error(error instanceof Error?error.message:'Không thể hoàn tất thao tác')
export const heading=(name:string,subtitle:string)=><header className="panel-title"><span className="eyebrow">KHÔNG GIAN CỦA BẠN</span><h1>{name}</h1><p>{subtitle}</p></header>
export const statusTone=(value:unknown):'green'|'orange'|'red'|'neutral'=>/confirm|paid|complete|publish|approve|visible|winning/i.test(String(value))?'green':/pending|await|draft|active/i.test(String(value))?'orange':/cancel|reject|fail|expire/i.test(String(value))?'red':'neutral'
