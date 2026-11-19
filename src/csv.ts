import { exercise, exerciseType, library, recordsFor, progressMetric, storedWeight, displayWeight, validSet, type Unit, type Workout, type ExerciseType } from './training.ts';
export const csvHeaders = ['Workout ID','Date','Started at','Workout','Exercise ID','Exercise','Type','Set ID','Set number','Weight','Unit','Reps','Seconds','Is record'];
function cell(value: unknown) { let text=String(value ?? ''); if (/^[=+@\-\t\r']/.test(text)) text="'"+text; return /[",\r\n]/.test(text) ? '"'+text.replaceAll('"','""')+'"' : text; }
const unescape = (value: string) => value.startsWith("'") ? value.slice(1) : value;
export function exportCsv(history: Workout[], unit: Unit = 'kg') {
 const rows: unknown[][]=[csvHeaders];
 for (const workout of history) {
  const records=recordsFor(workout,history);
  for (const lift of workout.lifts) lift.sets.forEach((set,index)=>{
   if (!set.done || !validSet(set,exerciseType(lift))) return;
   const metric=progressMetric([workout],lift.exerciseId);const score=Number(metric==='weight'?set.weight:metric==='seconds'?set.seconds:set.reps);
   rows.push([workout.id,new Date(workout.finishedAt).toISOString(),new Date(workout.startedAt).toISOString(),workout.name,lift.exerciseId,exercise(lift.exerciseId).name,exerciseType(lift),set.id,index+1,displayWeight(Number(set.weight||0),unit),unit,set.reps,set.seconds??'',records.some(r=>r.exerciseId===lift.exerciseId && r.weight===score)]);
  });
 }
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
export function parseCsv(text: string): string[][] {
 const rows:string[][]=[];let row:string[]=[];let value='';let quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++) {
  const c=text[i];
  if(c==='"') { if(quoted&&text[i+1]==='"'){value+='"';i++;} else if(!quoted&&value!=='')throw new Error('Unexpected quote in CSV field');else quoted=!quoted; }
  else if(c===','&&!quoted){row.push(unescape(value));value='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(unescape(value));if(row.some(Boolean))rows.push(row);row=[];value='';}
  else value+=c;
 }
 if(quoted)throw new Error('Unclosed quoted field');row.push(unescape(value));if(row.some(Boolean))rows.push(row);return rows;
}
export function importCsv(text: string, existing: Workout[]) {
 const errors:string[]=[];let rows:string[][];
 try{rows=parseCsv(text);}catch(error){return {workouts:[],errors:[error instanceof Error?error.message:'Invalid spreadsheet'],duplicates:0,sets:0};}
 if(!rows.length || csvHeaders.some((h,i)=>rows[0][i]!==h) || rows[0].length!==csvHeaders.length)return {workouts:[],errors:['The CSV headers do not match a SetTrack spreadsheet. Export a spreadsheet to see the required columns.'],duplicates:0,sets:0};
 const groups=new Map<string,Workout>();const duplicateIds=new Set<string>();const ids=new Set(existing.map(w=>w.id));const setIds=new Set<string>();
 rows.slice(1).forEach((r,index)=>{
  const row=index+2;const fail=(message:string)=>errors.push(`Row ${row}: ${message}`);
  if(r.length!==csvHeaders.length){fail('wrong number of columns');return;}
  const [id,date,start,name,exerciseId,label,type,setId,order,weight,unit,reps,seconds,record]=r;
  const known=library.find(e=>e.id===exerciseId);
  if(!id.trim()||!name.trim()||!setId.trim()){fail('workout ID, workout name and set ID are required');return;}
  const finishedAt=Date.parse(date),startedAt=Date.parse(start);
  if(!Number.isFinite(finishedAt)||!Number.isFinite(startedAt)||startedAt<0||finishedAt<startedAt){fail('invalid date or start time');return;}
  if(!known||known.name!==label){fail('unknown or mismatched exercise');return;}
  if(!['weight','bodyweight','timed'].includes(type)||!['kg','lb'].includes(unit)||!['true','false'].includes(record)){fail('invalid tracking type, unit or record flag');return;}
  if(!/^\d+$/.test(order)||Number(order)<1){fail('set number must be a positive integer');return;}
  if(!/^\d+(\.\d+)?$/.test(weight)){fail('weight must be a non-negative number');return;}
  const set={id:setId,weight:storedWeight(weight,unit as Unit),reps,seconds:seconds||undefined,done:true};
  if(!validSet(set,type as ExerciseType)){fail('invalid completed set values');return;}
  if(ids.has(id)){duplicateIds.add(id);return;}
  const setKey=id+':'+setId;if(setIds.has(setKey)){fail('duplicate set ID');return;}setIds.add(setKey);
  let workout=groups.get(id);
  if(!workout){workout={id,name,startedAt,finishedAt,lifts:[]};groups.set(id,workout);}
  if(workout.name!==name||workout.startedAt!==startedAt||workout.finishedAt!==finishedAt){fail('conflicting metadata for this workout ID');return;}
  let lift=workout.lifts.find(l=>l.exerciseId===known.id);
  if(!lift){lift={exerciseId:known.id,type:type as ExerciseType,sets:[]};workout.lifts.push(lift);}
  if(lift.type!==type){fail('conflicting tracking type');return;}
  if(lift.sets.some(s=>(s as typeof s & {csvOrder?:number}).csvOrder===Number(order))){fail('duplicate set number');return;}
  Object.assign(set,{csvOrder:Number(order)});lift.sets.push(set);
 });
 const workouts=errors.length?[]:[...groups.values()].sort((a,b)=>b.finishedAt-a.finishedAt);
 for(const w of workouts)for(const l of w.lifts){l.sets.sort((a,b)=>Number((a as unknown as {csvOrder:number}).csvOrder)-Number((b as unknown as {csvOrder:number}).csvOrder));l.sets.forEach(s=>delete (s as unknown as {csvOrder?:number}).csvOrder);}
 return {workouts,errors,duplicates:duplicateIds.size,sets:workouts.reduce((n,w)=>n+w.lifts.reduce((a,l)=>a+l.sets.length,0),0)};
}
