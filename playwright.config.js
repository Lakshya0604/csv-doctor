import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests',use:{baseURL:process.env.TEST_URL||'http://127.0.0.1:5173',headless:true},webServer:process.env.TEST_URL?undefined:{command:'npm run dev',port:5173,reuseExistingServer:true},reporter:'list'});
