import { exportBackup } from './backup.ts';
import { exercise, exerciseType, recordsFor, type Journal, type Workout, type Unit, displayWeight } from './training.ts';
export function downloadFile(file: File) { const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
export function backupFiles(journal: Journal, now = new Date()) {
 const base=`SetTrack-backup-${now.toISOString().slice(0,10)}`;const body=exportBackup(journal);
 return [new File([body],base+'.settrack',{type:'application/octet-stream'}),new File([body],base+'.json',{type:'application/json'}),new File([body],base+'.txt',{type:'text/plain'})];
}
export async function shareBackup(journal: Journal) {
 const files=backupFiles(journal);
 if(navigator.share&&navigator.canShare){for(const file of files){let supported=false;try{supported=navigator.canShare({files:[file]});}catch{/*Try interoperable extension.*/}if(!supported)continue;try{await navigator.share({files:[file],title:'SetTrack journal backup'});return {saved:true,name:file.name,method:'shared'};}catch(error){if(error instanceof Error&&error.name==='AbortError')return {saved:false,name:file.name,method:'cancelled'};}}}
 downloadFile(files[0]);return {saved:true,name:files[0].name,method:'downloaded'};
}
export function workoutText(workout: Workout, history: Workout[], unit: Unit = 'kg') {
 const records=recordsFor(workout,history);
 return [`${workout.name} · ${new Date(workout.finishedAt).toLocaleDateString()}`,...workout.lifts.map(l=>`${exercise(l.exerciseId).name}${records.some(r=>r.exerciseId===l.exerciseId)?' [PR]':''}: ${l.sets.map(s=>exerciseType(l)==='timed'?`${s.seconds} sec`:Number(s.weight)===0?`${s.reps} reps`:`${displayWeight(Number(s.weight),unit)} ${unit} x ${s.reps}`).join(', ')}`),'Logged with SetTrack'].join('\n');
}
export async function shareWorkout(text: string) {
 if(navigator.share){try{await navigator.share({text,title:'My SetTrack workout'});return 'Workout shared.';}catch(error){if(error instanceof Error&&error.name==='AbortError')return 'Sharing cancelled.';}}
 try{await navigator.clipboard.writeText(text);return 'Workout copied. Paste it into your message.';}catch{return 'Copy is unavailable. Select and copy the workout summary below.';}
}
