import {describe,expect,it} from 'vitest';
import {getReplayStep} from './replay.js';
const secret='test-only-secret-that-is-at-least-32-chars';
describe('synthetic replay cursor',()=>{
 it('reveals only one candle at a time and advances with a signed token',()=>{
  const first=getReplayStep({secret,learnerId:'learner-a'});
  expect(first.index).toBe(0);expect(first.candle.index).toBe(0);expect(first).not.toHaveProperty('candles');
  expect(first.nextCursorToken).toBeTruthy();
  const second=getReplayStep({secret,learnerId:'learner-a',token:first.nextCursorToken!});
  expect(second.index).toBe(1);expect(second.candle.index).toBe(1);expect(second.candle.index).toBe(first.candle.index+1);
 });
 it('rejects a tampered token and tokens issued to another learner',()=>{
  const first=getReplayStep({secret,learnerId:'learner-a'});
  expect(()=>getReplayStep({secret,learnerId:'learner-b',token:first.nextCursorToken!})).toThrow(/invalid or belongs/);
  expect(()=>getReplayStep({secret,learnerId:'learner-a',token:first.nextCursorToken!.replace(/.$/,'x')})).toThrow(/invalid or belongs/);
 });
 it('never accepts arbitrary numeric future indices and requires a strong secret',()=>{
  expect(()=>getReplayStep({secret,learnerId:'learner-a',token:'11'})).toThrow(/invalid or belongs/);
  expect(()=>getReplayStep({secret:'weak',learnerId:'learner-a'})).toThrow(/not configured securely/);
 });
});
