import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'*.spec.ts',use:{headless:true,launchOptions:{channel:'msedge'}},workers:1,reporter:'list'});
