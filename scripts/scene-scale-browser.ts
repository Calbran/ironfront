import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {SCENE_WIDTH} from '../packages/game-core/src/cityScene.ts';
const families=['border','rural','industrial','port','metropolis'] as const;
const images=await Promise.all(families.map(async family=>({family,width:SCENE_WIDTH[family][0],url:`data:image/png;base64,${(await readFile(`apps/web/public/art/settlement-scenes/${family}-v1.png`)).toString('base64')}`})));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
try {
 const page=await browser.newPage({viewport:{width:1440,height:760},deviceScaleFactor:1});
 await page.setContent('<body style="margin:0;background:#a5ad95"><canvas width="1440" height="760"></canvas></body>');
 await page.evaluate(async images=>{
  const canvas=document.querySelector('canvas')!,ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#a5ad95';ctx.fillRect(0,0,1440,760);
  ctx.fillStyle='#263a35';ctx.font='28px Georgia';ctx.fillText('Settlement scale — one camera, different footprints',35,52);
  ctx.font='16px sans-serif';ctx.fillText('Scene widths follow the architecture inside the illustration. No shared icon-size box.',35,84);
  const scale=.57;let x=35;
  for(const item of images){
   const image=new Image();image.src=item.url;await image.decode();
   const cell=image.width/3,scratch=document.createElement('canvas');scratch.width=cell;scratch.height=image.height;
   const c=scratch.getContext('2d')!;c.drawImage(image,0,0);const data=c.getImageData(0,0,cell,image.height).data;
   let left=cell,top=image.height,right=0,bottom=0;
   for(let y=0;y<image.height;y++)for(let xx=0;xx<cell;xx++)if(data[(y*cell+xx)*4+3]>=32){left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   const sw=right-left+1,sh=bottom-top+1,w=item.width*scale,h=w*sh/sw;
   ctx.drawImage(image,left,top,sw,sh,x,660-h,w,h);
   ctx.fillStyle='#263a35';ctx.font='17px sans-serif';ctx.fillText(item.family,x,695);
   ctx.font='13px sans-serif';ctx.fillText(`${item.width} world units`,x,716);x+=w+28;
  }
 },images);
 await page.screenshot({path:'.impeccable/review/settlement-scene-scale.png'});
}finally{await browser.close();}
