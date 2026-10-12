import { createHmac, timingSafeEqual } from 'node:crypto';

export type ReplayCandle = { index:number; open:number; high:number; low:number; close:number };
const candles: ReplayCandle[] = [
 {index:0,open:100,high:104,low:98,close:103},
 {index:1,open:103,high:106,low:101,close:102},
 {index:2,open:102,high:105,low:99,close:100},
 {index:3,open:100,high:103,low:97,close:102},
 {index:4,open:102,high:108,low:101,close:107},
 {index:5,open:107,high:109,low:103,close:104},
 {index:6,open:104,high:106,low:100,close:101},
 {index:7,open:101,high:105,low:99,close:104},
 {index:8,open:104,high:110,low:103,close:109},
 {index:9,open:109,high:112,low:106,close:107},
 {index:10,open:107,high:108,low:102,close:103},
 {index:11,open:103,high:107,low:101,close:106}
];
type CursorPayload={scenarioId:'synthetic-basics';learnerId:string;nextIndex:number};
function sign(value:string,secret:string){return createHmac('sha256',secret).update(value).digest('base64url');}
function issueToken(payload:CursorPayload,secret:string){const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');return encoded+'.'+sign(encoded,secret);}
function readToken(token:string,secret:string,learnerId:string):CursorPayload|null{
 const parts=token.split('.');if(parts.length!==2)return null;
 const expected=Buffer.from(sign(parts[0],secret));const actual=Buffer.from(parts[1]);
 if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;
 try{const p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8')) as Partial<CursorPayload>;
  if(p.scenarioId!=='synthetic-basics'||p.learnerId!==learnerId||!Number.isInteger(p.nextIndex)||typeof p.nextIndex!=='number'||p.nextIndex<1||p.nextIndex>=candles.length)return null;
  return p as CursorPayload;
 }catch{return null;}
}
export function getReplayStep(input:{token?:string;secret:string;learnerId:string}){
 if(!input.secret||input.secret.length<32)throw new Error('Replay cursor signing secret is not configured securely.');
 let index=0;
 if(input.token){const payload=readToken(input.token,input.secret,input.learnerId);if(!payload)throw new Error('Replay cursor is invalid or belongs to another learner.');index=payload.nextIndex;}
 const candle=candles[index];
 const nextCursorToken=index<candles.length-1?issueToken({scenarioId:'synthetic-basics',learnerId:input.learnerId,nextIndex:index+1},input.secret):null;
 return {scenarioId:'synthetic-basics',label:'Synthetic replay · fictional units',index,totalCandles:candles.length,candle,nextCursorToken,complete:nextCursorToken===null};
}
