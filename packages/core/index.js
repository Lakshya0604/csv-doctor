import Papa from 'papaparse';
export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_ROWS = 10000;
export const SAMPLE = ' Order ID ,Customer,Date,Amount,Status\nSO-1001,Asha,01/02/2026,"1,249.50",Paid\nSO-1002,Ravi,03/02/2026,"2,100.00",Pending\nSO-1002,Ravi,03/02/2026,"2,100.00",Pending\n,,,,\nSO-1003,Meera,08/02/2026,850.00,Paid\nSO-1004,=DEMO(),10/02/2026,399.00,Pending';
export const blank = row => row.every(v => v.trim() === '');
export function parseCSV(text, delimiter = ',') {
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('File exceeds 2 MB. Split it into smaller files before importing.');
  if (!text.trim()) throw new Error('This file is empty. Choose another CSV or try the sample.');
  const p = Papa.parse(text.replace(/^\uFEFF/, ''), {delimiter, skipEmptyLines:false});
  if (p.data.length > MAX_ROWS + 1) throw new Error('More than 10,000 rows. Split this file before importing.');
  const [headers, ...rows] = p.data;
  const errors = p.errors.map(e => ({row:(e.row ?? 0)+1,column:null,message:e.message}));
  rows.forEach((r,i) => {if (!blank(r) && r.length !== headers.length) errors.push({row:i+2,column:null,message:`Expected ${headers.length} cells; found ${r.length}. Fix the original row.`});});
  return {headers,rows,errors};
}
export function headerErrors(headers) {
  const seen = new Map(), errors = [];
  headers.forEach((h,i) => {
    if (!h.trim()) errors.push({row:1,column:i+1,message:'Header is empty. Edit the original header.'});
    if (seen.has(h)) errors.push({row:1,column:i+1,message:`Duplicate header "${h}" in columns ${seen.get(h)+1} and ${i+1}. Edit the original headers.`});
    seen.set(h,i);
  });
  return errors;
}
export function stats(data) {
  const seen = new Set(); let duplicates = 0, blanks = 0, formulas = 0;
  data.rows.forEach(r => {if(blank(r)) {blanks++;return;} const k=JSON.stringify(r); if(seen.has(k)) duplicates++;seen.add(k); r.forEach(v=>{if(isFormula(v)) formulas++;});});
  return {duplicates,blanks,formulas,headers:data.headers.filter(h=>h!==h.trim()).length};
}
export function isFormula(v) {return /^[=+\-@\t\r\n]/.test(v.trimStart()) || /^[\t\r\n]/.test(v);}
export function dateValue(value, format) {
  const s=value.trim(); let y,m,d;
  if(format==='ymd') {const a=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);if(!a)return null;[,y,m,d]=a;}
  else {const a=/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);if(!a)return null;if(format==='dmy')[,d,m,y]=a;else [,m,d,y]=a;}
  y=Number(y);m=Number(m);d=Number(d);if(y<1000||m<1||m>12||d<1||d>31)return null;
  const dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
export function numberValue(value, format) {
  const s=value.trim(); const re=format==='us'?/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/:/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/;
  if(!re.test(s))return null;
  return format==='us'?s.replaceAll(',',''):s.replaceAll('.','').replace(',','.');
}
export function transform(data, options={}) {
  const log=[],errors=[...data.errors],seen=new Set();
  const headers=data.headers.map((v,i)=> {const to=options.trimHeaders?v.trim():v;if(to!==v)log.push({row:1,column:i+1,before:v,after:to,action:'Trim header'});return to;});
  errors.push(...headerErrors(headers));
  const rows=[];
  data.rows.forEach((row,idx)=>{
    const rowNumber=idx+2;
    if(options.removeBlank && blank(row)){log.push({row:rowNumber,action:'Remove blank row',before:row,after:null});return;}
    const k=JSON.stringify(row);
    if(options.removeDuplicates && !blank(row) && seen.has(k)){log.push({row:rowNumber,action:'Remove exact duplicate',before:row,after:null});return;}seen.add(k);
    rows.push(row.map((v,col)=>{
      let to=v; const rule=options.columns?.[col];
      if(rule && v.trim() && !blank(row)) {
        to=rule.startsWith('date:')?dateValue(v,rule.split(':')[1]):numberValue(v,rule.split(':')[1]);
        if(to===null){errors.push({row:rowNumber,column:col+1,message:`Cannot interpret "${v}" using selected format. Fix input or keep this column unchanged.`});to=v;}
        if(to!==v)log.push({row:rowNumber,column:col+1,action:'Normalize value',before:v,after:to});
      }
      if(options.formulaSafe && isFormula(to)){const before=to;to="'"+to;log.push({row:rowNumber,column:col+1,action:'Spreadsheet formula protection',before,after:to});}
      return to;
    }));
  });
  const outputHeaders=headers.map((h,i)=>{if(options.formulaSafe && isFormula(h)){const to="'"+h;log.push({row:1,column:i+1,action:'Spreadsheet formula protection',before:h,after:to});return to;}return h;});
  return {headers:outputHeaders,rows,log,errors};
}
export function exportCSV(data, delimiter=',') {
  if(data.errors?.length)throw new Error('Resolve all errors before exporting.');
  return Papa.unparse([data.headers,...data.rows],{delimiter,newline:'\r\n'});
}
