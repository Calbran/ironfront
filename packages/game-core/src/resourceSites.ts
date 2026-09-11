/** Provisional economy sandbox; not wired to campaign saves or production ticks. */
export type ResourceKind='fuel'|'industry'|'agriculture'|'city'|'settlement';
export type Resources={industry:number;fuel:number;manpower:number};
export const HOME_INCOME:Resources={industry:2,fuel:1,manpower:1};
export const SITE_RULES:Record<ResourceKind,{name:string;building:string;cost:number;hours:number;income:Resources;color:string}>={
 fuel:{name:'Fuel deposit',building:'Drilling rig',cost:36,hours:12,income:{industry:0,fuel:2,manpower:0},color:'#e5a356'},
 industry:{name:'Industrial site',building:'Factory',cost:36,hours:12,income:{industry:2,fuel:0,manpower:0},color:'#9cc4e4'},
 agriculture:{name:'Agricultural site',building:'Agricultural works',cost:24,hours:8,income:{industry:0,fuel:0,manpower:1},color:'#abd075'},
 city:{name:'Regional city',building:'Restore city works',cost:48,hours:12,income:{industry:4,fuel:1,manpower:1},color:'#d5a5e5'},
 settlement:{name:'Expansion hamlet',building:'Local workshop',cost:18,hours:6,income:{industry:1,fuel:0,manpower:0},color:'#8cddd3'},
};
export type SiteOperation={id:string;kind:ResourceKind;controlled:boolean;connected:boolean;readyAt:number|null};
export type EconomyStudy={hour:number;stock:Resources;sites:SiteOperation[]};
export function createEconomyStudy(sites:{id:string;resourceKind:ResourceKind}[]):EconomyStudy{
 return {hour:0,stock:{industry:80,fuel:40,manpower:40},sites:sites.map(s=>({id:s.id,kind:s.resourceKind,controlled:false,connected:true,readyAt:null}))};
}
export function buildResourceSite(state:EconomyStudy,id:string):EconomyStudy{
 const site=state.sites.find(s=>s.id===id);if(!site)throw Error('Unknown site');
 if(!site.controlled)throw Error('Secure the site before construction');
 if(!site.connected)throw Error('Site needs a supply connection');
 if(site.readyAt!==null)throw Error('Site already built or under construction');
 const rule=SITE_RULES[site.kind];if(state.stock.industry<rule.cost)throw Error('Not enough industry');
 return {...state,stock:{...state.stock,industry:state.stock.industry-rule.cost},sites:state.sites.map(s=>s.id===id?{...s,readyAt:state.hour+rule.hours}:s)};
}
export function siteIncome(state:EconomyStudy):Resources{
 const income={...HOME_INCOME};for(const s of state.sites)if(s.controlled&&s.connected&&s.readyAt!==null&&s.readyAt<=state.hour){const r=SITE_RULES[s.kind].income;for(const k of ['industry','fuel','manpower'] as const)income[k]+=r[k];}return income;
}
export function advanceEconomy(state:EconomyStudy,hours:number):EconomyStudy{
 if(!Number.isFinite(hours)||hours<0)throw Error('Invalid time interval');
 const end=state.hour+hours,stock={...state.stock};
 for(const k of ['industry','fuel','manpower'] as const)stock[k]+=HOME_INCOME[k]*hours;
 for(const s of state.sites)if(s.controlled&&s.connected&&s.readyAt!==null){
 const duration=Math.max(0,end-Math.max(state.hour,s.readyAt));
 for(const k of ['industry','fuel','manpower'] as const)stock[k]+=SITE_RULES[s.kind].income[k]*duration;
 }
 return {...state,hour:end,stock};
}
