import { api } from './api'
import type { Auction, Bid, Booking, HostBooking, KycSubmission, Notification, Paged, Profile, Review, Room, RoomSummary, Transaction, Wallet } from '../types'

export type Address = { street:string; city:string; state:string; country:string; zipCode:string; houseNumber:string; roomNumber:string }
export type RoomFilters = { hostId?:string|null; roomType?:number|null; roomStatus?:number|null; minPrice?:number|null; maxPrice?:number|null; minRating?:number|null; maxRating?:number|null; location?:Partial<Address>|null; searchQuery?:string|null; checkIn?:string|null; checkOut?:string|null; page:number; pageSize:number }
export type CreateRoomRequest = { title:string; description:string; roomType:number; addressLine:Address; pricePerNight:number; maxGuests:number; checkInTime:string; checkOutTime:string; freeCancellation:boolean; amenityIds:string[] }
export type UpdateRoomRequest = Partial<Omit<CreateRoomRequest,'roomType'|'addressLine'>> & { bookingMode?:string }
export type PaymentUrls = { onSuccess?:string; onFailure?:string; onPending?:string }

const json=(value:unknown):RequestInit=>({headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})
const get=<T>(path:string)=>api<T>(path)
const post=<T=void>(path:string,value?:unknown)=>api<T>(path,{method:'POST',...(value===undefined?{}:json(value))})
const put=<T=void>(path:string,value:unknown)=>api<T>(path,{method:'PUT',...json(value)})
const del=<T=void>(path:string,value?:unknown)=>api<T>(path,{method:'DELETE',...(value===undefined?{}:json(value))})

export const roomlyApi={
  auth:{
    register:(value:{email:string;password:string;name:string;role:number})=>post<{message:string}>('/auth/register',value),
    verifyEmail:(email:string,otp:string)=>post('/auth/verify-email',{email,otp}),
    login:(email:string,password:string)=>post<{accessToken:string;refreshToken:string;message:string}>('/auth/login',{email,password}),
    refresh:(refreshToken:string)=>post<{accessToken:string;refreshToken:string}>('/auth/refresh-access-token',{refreshToken}),
    forgotPassword:(email:string)=>post('/auth/forgot-password',{email}),
    resetPassword:(email:string,otpCode:string,password:string)=>post('/auth/reset-password',{email,otpCode,password}),
    requestUnlock:(email:string)=>post('/auth/request-unlock',{email}),
    unlock:(email:string,otpCode:string)=>post('/auth/unlock-account',{email,otpCode}),
    google:(idToken:string)=>post<{accessToken:string;refreshToken:string}>('/auth/google',{idToken}),
    logout:()=>post('/auth/logout')
  },
  users:{profile:()=>get<Profile>('/users/profile'),update:(value:{name:string;bio?:string;phoneNumber?:string;profilePhotoUrl?:string})=>put<Profile>('/users/profile',value)},
  rooms:{
    search:(filters:RoomFilters)=>post<Paged<RoomSummary>|RoomSummary[]>('/rooms/search',filters), get:(id:string)=>get<Room>(`/rooms/${id}`),
    create:(value:CreateRoomRequest)=>post<Room>('/rooms',value), update:(id:string,value:UpdateRoomRequest)=>put<Room>(`/rooms/${id}`,value), remove:(id:string)=>del(`/rooms/${id}`),
    submit:(id:string)=>post(`/rooms/${id}/submit-for-review`), activate:(id:string)=>post(`/rooms/${id}/activate`), deactivate:(id:string)=>post(`/rooms/${id}/deactivate`),
    addPhoto:(id:string,url:string,description:string)=>post(`/rooms/${id}/photos`,{url,description}), removePhoto:(id:string,photoId:string)=>del(`/rooms/${id}/photos/${photoId}`),
    availability:(id:string,year:number,month:number)=>get<{roomId:string;blockedDates:string[]}>(`/rooms/${id}/availability?year=${year}&month=${month}`),
    block:(id:string,from:string,to:string)=>post(`/rooms/${id}/block-dates`,{from,to}), unblock:(id:string,from:string,to:string)=>del(`/rooms/${id}/block-dates`,{from,to}),
    pending:()=>get<Array<{id:string;hostId:string;submittedAt:string;room:Room}>>('/rooms/moderation/pending'), approve:(id:string)=>post(`/rooms/moderation/${id}/approve`), reject:(id:string,reason:string)=>post(`/rooms/moderation/${id}/reject`,{reason})
  },
  bookings:{
    mine:()=>get<Booking[]>('/bookings/my'), get:(id:string)=>get<Booking>(`/bookings/${id}`), create:(roomId:string,startDate:string,endDate:string)=>post<{bookingId:string;status:number}>(`/bookings`,{roomId,startDate,endDate}),
    update:(id:string,value:{bookingId:string;userId:string;roomId:string;startDate:string;endDate:string})=>put(`/bookings/${id}`,value), cancel:(id:string)=>post(`/bookings/${id}/cancel`),
    hostRequests:()=>get<HostBooking[]>('/bookings/host/requests'), calendar:(roomId:string,from:string,to:string)=>get<Booking[]>(`/bookings/host/rooms/${roomId}/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    approve:(id:string)=>post(`/bookings/${id}/approve`), reject:(id:string)=>post(`/bookings/${id}/reject`), pay:(id:string,paymentMethodId:number,redirectionUrls:PaymentUrls)=>post<{paymentUrl:string;checkoutMethod:string;checkoutFields:Record<string,string>}>(`/bookings/${id}/pay`,{paymentMethodId,redirectionUrls})
  },
  payments:{methods:()=>get<Array<{id:number;nameEn?:string;name?:string;logo?:string}>>('/payments/methods'),invoice:(bookingId:string,paymentMethodId:number,redirectionUrls:PaymentUrls)=>post('/payments/create-invoice',{bookingId,paymentMethodId,redirectionUrls}),status:(id:string)=>get<{bookingId:string;bookingStatus:number;paymentStatus:string}>(`/payments/bookings/${id}/status`),refund:(id:string)=>post(`/payments/bookings/${id}/refund`)},
  auctions:{active:(page=1,pageSize=20)=>get<Paged<Auction>|Auction[]>(`/auctions?page=${page}&pageSize=${pageSize}`),get:(id:string)=>get<Auction>(`/auctions/${id}`),create:(value:{roomId:string;checkInDate:string;checkOutDate:string;startingPrice:number;minBidIncrementType:string;minBidIncrementValue:number;duration:string})=>post<Auction>('/auctions',value),bid:(id:string,amount:number)=>post(`/auctions/${id}/bids`,{auctionId:id,amount}),cancel:(id:string)=>post(`/auctions/${id}/cancel`),pay:(id:string)=>post(`/auctions/${id}/pay`),myBids:()=>get<Bid[]>('/auctions/my-bids'),mine:()=>get<Auction[]>('/auctions/my-auctions')},
  wallet:{get:()=>get<Wallet>('/wallet'),history:(page=1,pageSize=20)=>get<{wallet:Wallet;transactions:Paged<Transaction>}>(`/wallet/history?page=${page}&pageSize=${pageSize}`),topUp:(amount:number,paymentMethod:string,externalRef?:string)=>post('/wallet/top-up',{amount,paymentMethod,externalRef}),withdraw:(amount:number)=>post('/wallet/withdraw',{amount})},
  reviews:{room:(id:string,page=1,pageSize=10)=>get<Paged<Review>|Review[]>(`/reviews/rooms/${id}?page=${page}&pageSize=${pageSize}`),user:(id:string,page=1,pageSize=10)=>get<Paged<Review>|Review[]>(`/reviews/users/${id}?page=${page}&pageSize=${pageSize}`),submit:(value:{bookingId:string;reviewType:string;subjectId?:string|null;subjectRoomId?:string|null;rating:number;comment?:string})=>post<Review>('/reviews',value),flag:(id:string,reason:string)=>post(`/reviews/${id}/flag`,{reason}),remove:(id:string)=>del(`/reviews/${id}`)},
  notifications:{unread:()=>get<Notification[]>('/notifications/unread'),count:()=>get<number|{count:number}>('/notifications/unread/count'),readAll:()=>post('/notifications/read-all'),preference:(category:number,channel:number,isEnabled:boolean)=>put('/notifications/preferences',{category,channel,isEnabled})},
  kyc:{submit:(value:{documentType:number;frontImageUrl:string;backImageUrl?:string;selfieUrl:string})=>post<KycSubmission>('/kyc/submit',value),pending:()=>get<KycSubmission[]>('/kyc/pending'),review:(submissionId:string,approved:boolean,rejectionReason?:string)=>post('/kyc/review',{submissionId,approved,rejectionReason})}
}
