import {test,expect} from '@playwright/test';
test('desktop browsing, slideshow, wishlist and persistent cart',async({page})=>{
await page.goto('http://localhost:3000');await expect(page.getByRole('heading',{level:1})).toHaveAttribute('aria-label','MAKE EVERY SECOND SIGNATURE.');
await page.getByRole('button',{name:'Next slide'}).click();await expect(page.getByRole('heading',{level:1})).toHaveAttribute('aria-label','STEP INTO YOUR OWN RHYTHM.');
await page.locator('.hero-object img:visible').first().evaluate((img:HTMLImageElement)=>img.decode());await page.screenshot({path:'tests/desktop.png',fullPage:false,animations:'disabled'});
await page.goto('http://localhost:3000/product/the-meridian');await page.getByRole('button',{name:'Save to wishlist'}).click();await page.locator('.detail-info').getByRole('button',{name:'Add to bag',exact:true}).click();
await page.goto('http://localhost:3000/cart');await expect(page.getByRole('heading',{name:'The Meridian'})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'The Meridian'})).toBeVisible();
await page.goto('http://localhost:3000/wishlist');await expect(page.getByRole('heading',{name:'The Meridian'})).toBeVisible();
await page.goto('http://localhost:3000/checkout');await page.getByLabel('Full name',{exact:true}).fill('Test Customer');await page.getByLabel('Mobile number',{exact:true}).fill('03001234567');await page.getByLabel('City',{exact:true}).fill('Lahore');await page.getByLabel('Complete delivery address').fill('123 Example Street, Lahore');await page.getByRole('button',{name:/Verify availability/}).click();await expect(page.locator('main').getByRole('alert')).toContainText('preview mode');await expect(page.getByRole('button',{name:/Place order/})).toHaveCount(0);
});
test('mobile layout, filters and size selection',async({page})=>{
await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:3000');await page.locator('.hero-object img:visible').first().evaluate((img:HTMLImageElement)=>img.decode());await page.screenshot({path:'tests/mobile.png',fullPage:false,animations:'disabled'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('navigation').getByRole('link',{name:'Shoes',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toContainText('shoes');await page.getByRole('textbox',{name:'Search products',exact:true}).fill('Everyday Court');await expect(page.locator('.product-card')).toHaveCount(1);await page.getByRole('heading',{name:'Everyday Court'}).click();await expect(page.locator('.detail-info').getByRole('button',{name:'Add to bag',exact:true})).toBeDisabled();await page.getByRole('button',{name:'40',exact:false}).click();await expect(page.locator('.detail-info').getByRole('button',{name:'Add to bag',exact:true})).toBeEnabled();
});



