import { describe, expect, it } from 'vitest';
import { parseLearningImport, restoreLearningImport } from './learningImport';
const validExport = { product:'TradeQuest', formatVersion:1, exportedAt:'2026-10-12T12:00:00.000Z', scope:'Browser-local learning records only.', data:{
 'tradequest-weekly-practice-plan-v1':{week:'2026-10-12',target:5,completedDates:['2026-10-12']},
 'tradequest-adaptive-practice-v1':[{variantId:'risk-definition-a'}], 'tradequest-decision-journal-v1':[{title:'Review'}],
 'supabase.auth.token':{access_token:'must-not-import'} } };
describe('browser-local learning import',()=>{
 it('accepts supported exports and ignores non-allowlisted keys',()=>{const result=parseLearningImport(JSON.stringify(validExport));expect(Object.keys(result.data)).toHaveLength(3);expect(JSON.stringify(result)).not.toContain('must-not-import');});
 it('rejects unsupported formats, malformed JSON and oversized files',()=>{expect(()=>parseLearningImport('{bad json')).toThrow('not valid JSON');expect(()=>parseLearningImport(JSON.stringify({...validExport,product:'Other'}))).toThrow('not a supported TradeQuest');expect(()=>parseLearningImport(' '.repeat(1_000_001))).toThrow('too large');});
 it('rejects malformed allowlisted records',()=>{expect(()=>parseLearningImport(JSON.stringify({...validExport,data:{...validExport.data,'tradequest-weekly-practice-plan-v1':{target:4}}}))).toThrow('weekly practice plan');});
 it('restores only included allowlisted keys',()=>{const result=parseLearningImport(JSON.stringify(validExport));const written:Record<string,string>={};const keys=restoreLearningImport(result,(key,value)=>{written[key]=value;});expect(keys).toHaveLength(3);expect(written['supabase.auth.token']).toBeUndefined();expect(JSON.parse(written['tradequest-weekly-practice-plan-v1'])).toEqual(validExport.data['tradequest-weekly-practice-plan-v1']);});
});