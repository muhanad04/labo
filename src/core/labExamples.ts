import type { Device, Experiment, Terminal } from './circuit'

export const transformerInvestigations={
  ratio:'Voltage ratio · 1:1',
  stepup:'Voltage ratio · 1:1.73',
  short:'Short circuit · 1:1',
  shortstepup:'Short circuit · 1:1.73',
  sensing:'Excitation sensing · linear model',
  resistive:'Regulation · resistive bank',
  inductive:'Regulation · inductive bank',
  capacitive:'Regulation · capacitive bank',
} as const
export type TransformerInvestigation=keyof typeof transformerInvestigations

/** Original generic teaching circuits. Estimated 240 V model; not a vendor calibration. */
export function transformerInvestigation(key:TransformerInvestigation):Experiment{
  const stepup=key==='stepup'||key==='shortstepup',short=key==='short'||key==='shortstepup',sensing=key==='sensing'
  const loaded=['resistive','inductive','capacitive'].includes(key),frequency=50,omega=2*Math.PI*frequency
  const devices:Device[]=[
    {id:'s1',kind:'source',label:'Supply',value:short?(stepup?48:28):sensing?20:240,closed:true,seriesResistance:0.5},
    {id:'t1',kind:'transformer',label:'T1',value:stepup?500/865:sensing?2.15:1,closed:true,transformer:{primaryInductance:sensing?5000/omega:60,coupling:0.997,primaryResistance:sensing?22.5:45,secondaryResistance:stepup?77.85:sensing?10.5:45,coreResistance:sensing?15000:60000}},
    {id:'a1',kind:sensing?'resistor':'ammeter',label:sensing?'Rsense':'I1',value:sensing?400:0,closed:true},
    {id:'v1',kind:'voltmeter',label:sensing?'E2':'E1',value:0,closed:true},
    {id:'v2',kind:'voltmeter',label:sensing?'E3':'E2',value:0,closed:true},
    {id:'g1',kind:'ground',label:'Primary reference',value:0,closed:true},
    {id:'g2',kind:'ground',label:'Secondary reference',value:0,closed:true},
  ]
  const links:[Terminal,Terminal][]=[['s1:p','a1:p'],['a1:n','t1:p'],['s1:n','t1:n'],['t1:n','g1:p'],['t1:t','g2:p'],['v1:p','t1:p'],['v1:n','t1:n'],['v2:p','t1:s'],['v2:n','t1:t']]
  const positions:Experiment['positions']={s1:{x:30,y:30},t1:{x:350,y:30},a1:{x:680,y:30},v1:{x:30,y:250},v2:{x:350,y:250},g1:{x:30,y:470},g2:{x:350,y:470}}
  if(sensing){devices.push({id:'v3',kind:'voltmeter',label:'E1',value:0,closed:true});positions.v3={x:680,y:250};links.push(['v3:p','a1:p'],['v3:n','a1:n'])}
  if(short||loaded){
    devices.push({id:'a2',kind:'ammeter',label:'I2',value:0,closed:true});positions.a2={x:930,y:30};links.push(['t1:s','a2:p'])
    if(short)links.push(['a2:n','t1:t'])
    else{
      // Three identical parallel branches: |Zeq| = |Zbranch|/3 at the stated frequency.
      for(let i=0;i<3;i++){
        const kind=key==='inductive'?'inductor':key==='capacitive'?'capacitor':'resistor',id=`load${i+1}`
        devices.push({id,kind,label:`${kind==='inductor'?'L':kind==='capacitor'?'C':'R'}${i+1}`,value:kind==='inductor'?4800/omega:kind==='capacitor'?1/(omega*4800):4800,closed:true,...(kind==='inductor'?{seriesResistance:30}:kind==='capacitor'?{seriesResistance:0.5}:{})})
        positions[id]=[{x:680,y:250},{x:930,y:250},{x:680,y:470}][i]
        links.push(['a2:n',`${id}:p`],[`${id}:n`,'t1:t'])
      }
      // Meter observes load voltage after the ideal current meter.
      links[7]=['v2:p','a2:n']
    }
  }
  return {version:3,title:`Transformer · ${transformerInvestigations[key]}`,analysis:{mode:'ac',frequency},devices,positions,wires:links.map(([from,to],i)=>({id:`lab${i}`,from,to,color:'#345c94'}))}
}
