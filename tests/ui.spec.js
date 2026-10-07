import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test('sample cleanup, explicit mapping, downloads and no outbound data',async({page})=>{
 const outbound=[];page.on('request',r=>{if(['POST','PUT','PATCH'].includes(r.method()))outbound.push(r.url());});
 await page.goto('/');await page.getByRole('button',{name:'Try sales sample'}).click();
 await expect(page.getByRole('button',{name:'Export cleaned CSV'})).toBeDisabled();
 await page.getByLabel('Trim header whitespace').check();await page.getByLabel('Remove blank rows').check();await page.getByLabel('Remove exact duplicates').check();await page.getByLabel('Protect spreadsheet formulas').check();
 await page.getByLabel('Format for column 3').selectOption('date:dmy');await page.getByLabel('Format for column 4').selectOption('number:us');
 await page.getByRole('button',{name:'Cleaned',exact:true}).click();await expect(page.getByText('4 output rows', {exact:false})).toBeVisible();await expect(page.getByRole('cell',{name:'2026-02-01',exact:true})).toBeVisible();
 await page.getByLabel('I reviewed the cleaned preview').check();
 const csvDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export cleaned CSV'}).click();const dl=await csvDownload;const csv=await fs.readFile(await dl.path(),'utf8');expect(csv).toContain('2026-02-01,1249.50');expect(csv).toContain("'=DEMO()");expect(csv.match(/SO-1002/g)).toHaveLength(1);
 const logDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Change log (JSON)'}).click();const ld=await logDownload;const log=JSON.parse(await fs.readFile(await ld.path(),'utf8'));expect(log.outputRows).toBe(4);expect(log.changes.length).toBeGreaterThan(3);expect(outbound).toEqual([]);
 await page.getByLabel('Remove exact duplicates').uncheck();await expect(page.getByLabel('I reviewed the cleaned preview')).not.toBeChecked();
});
test('invalid source blocks exports with row references',async({page})=>{await page.goto('/');await page.getByText('Or paste CSV text').click();await page.getByLabel('CSV input',{exact:true}).fill('A,B\n1');await expect(page.getByRole('alert')).toContainText('Row 2');await expect(page.getByRole('button',{name:'Export cleaned CSV'})).toBeDisabled();});
test('semicolon UTF-8 file import',async({page})=>{await page.goto('/');await page.locator('input[type=file]').setInputFiles({name:'sales.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFFA;B\nभारत;2')});await page.getByLabel('Delimiter',{exact:true}).selectOption(';');await expect(page.getByRole('cell',{name:'भारत',exact:true})).toBeVisible();await expect(page.getByRole('columnheader',{name:'B',exact:true})).toBeVisible();});
test('empty and large file import show useful errors',async({page})=>{await page.goto('/');await page.locator('input[type=file]').setInputFiles({name:'empty.csv',mimeType:'text/csv',buffer:Buffer.from('')});await expect(page.getByRole('alert')).toContainText('empty');await page.locator('input[type=file]').setInputFiles({name:'large.csv',mimeType:'text/csv',buffer:Buffer.alloc(2097153,'a')});await expect(page.getByRole('alert')).toContainText('2 MB');});
test('mobile no outer horizontal overflow',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Try sales sample'}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'/downloads/csv-doctor-mobile.png',fullPage:true});});
