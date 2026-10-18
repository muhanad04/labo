import { formatQuantity, parseExperiment, ports, settings } from './circuit'
import type { Device, Experiment, Point } from './circuit'

export type ResistorStyle = 'ansi' | 'iec'
export interface SchematicOptions { title: boolean; values: boolean; modelNotes: boolean }
const xml=(value:unknown)=>String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'�').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;')
const text=(x:number,y:number,value:string,size=15,anchor='middle')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="#111" stroke="none">${xml(value)}</text>`
const path=(d:string)=>`<path d="${d}"/>`
function windingDots(left:number,right:number,top:number){
  return `<g class="winding-polarity"><title>Corresponding induced-voltage polarity: P+ and S+. Not wire junctions.</title><circle cx="${left-10}" cy="${top+4}" r="3.2" fill="#111" stroke="none"/><circle cx="${right+10}" cy="${top+4}" r="3.2" fill="#111" stroke="none"/></g>`
}
interface Segment {a:Point;b:Point;net:string}
interface Edge {device:Device;from:string;to:string}

/** Topology, not bench coordinates. A connection exists only at an explicit electrical node. */
class Drawing {
  parents=new Map<string,string>();segments:Segment[]=[];symbols:string[]=[];used=new Set<string>();anchors=new Map<string,Point>();width=1180;height=490
  constructor(readonly doc:Experiment,readonly style:ResistorStyle,readonly showValues=true){
    for(const d of doc.devices)for(const p of ports(d))this.parents.set(`${d.id}:${p}`,`${d.id}:${p}`)
    for(const w of doc.wires){const a=this.net(w.from),b=this.net(w.to);if(a!==b)this.parents.set(b,a)}
  }
  net(end:string):string{const p=this.parents.get(end);if(!p||p===end)return end;const root=this.net(p);this.parents.set(end,root);return root}
  port(d:Device,p='p'){return this.net(`${d.id}:${p}`)}
  line(a:Point,b:Point,net:string){if(a.x!==b.x&&a.y!==b.y)throw new Error('Non-orthogonal schematic segment.');if(a.x!==b.x||a.y!==b.y)this.segments.push({a,b,net});this.anchors.set(net,b)}
  edge(d:Device,a:Point,b:Point,from=this.port(d)){
    const p=this.port(d),forward=p===from,first=forward?a:b,last=forward?b:a,cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,horizontal=a.y===b.y,dx=horizontal?(b.x>a.x?1:-1):0,dy=horizontal?0:(b.y>a.y?1:-1),half=d.kind==='source'?25:d.kind==='ammeter'||d.kind==='voltmeter'?(horizontal?22:18):32
    this.line(a,{x:cx-dx*half,y:cy-dy*half},from)
    this.line({x:cx+dx*half,y:cy+dy*half},b,this.port(d,forward?'n':'p'))
    const angle=Math.atan2(last.y-first.y,last.x-first.x)*180/Math.PI
    let symbol=''
    if(d.kind==='ammeter'||d.kind==='voltmeter'){
      symbol=`<rect x="${cx-22}" y="${cy-18}" width="44" height="36" fill="white"/>`+text(cx,cy+5,d.label.length<=5?d.label:d.kind==='ammeter'?'A':'V')
      symbol+=text(horizontal?cx+(forward?-30:30):cx-12,horizontal?cy-13:cy+(forward?-25:34),'+',12)
      if(d.label.length>5)symbol+=text(horizontal?cx:cx+34,horizontal?cy-30:cy,d.label,12,horizontal?'middle':'start')
      if(d.kind==='ammeter'){
        const dir=forward?1:-1
        symbol+=horizontal?path(`M${cx-25*dir} ${cy-40}h${50*dir}m${-8*dir} -4 ${8*dir} 4 ${-8*dir} 4`):path(`M${cx-42} ${cy-25*dir}v${50*dir}m-4 ${-8*dir} 4 ${8*dir} 4 ${-8*dir}`)
      }
    }else{
      if(d.kind==='source')symbol=`<circle cx="${cx}" cy="${cy}" r="25" fill="white"/>`+(settings(this.doc).mode==='ac'?path(`M${cx-15} ${cy}c7-24 23 24 30 0`):`<g transform="translate(${cx} ${cy}) rotate(${angle})">${path('M-14 0h9m-4.5-4.5v9M5 0h9')}</g>`)
      else{
        let shape=''
        if(d.kind==='resistor')shape=this.style==='iec'?path('M-32 0h10M22 0h10')+'<rect x="-22" y="-8" width="44" height="16"/>':path('M-32 0h8l4-8 8 16 8-16 8 16 8-16 8 16 4-8h8')
        if(d.kind==='inductor')shape=path('M-32 0h4c0-20 14-20 14 0c0-20 14-20 14 0c0-20 14-20 14 0c0-20 14-20 14 0h4')
        if(d.kind==='capacitor')shape=path('M-32 0h26M-6-16v32M6-16v32M6 0h26')
        if(d.kind==='switch')shape=path(`M-32 0h12M20 0h12M-20 0L${d.closed?'20 0':'16 -19'}`)+'<circle cx="-20" cy="0" r="2.5"/><circle cx="20" cy="0" r="2.5"/>'
        symbol=`<g transform="translate(${cx} ${cy}) rotate(${angle})">${shape}</g>`
      }
      const value=d.kind==='source'?`${formatQuantity(d.value,'V')}${settings(this.doc).mode==='ac'?` RMS ∠${d.phase??0}°`:''}`:d.kind==='resistor'?formatQuantity(d.value,'Ω'):d.kind==='inductor'?formatQuantity(d.value,'H'):d.kind==='capacitor'?formatQuantity(d.value,'F'):''
      const labelX=horizontal?cx:d.kind==='source'?cx-39:cx+40,anchor=horizontal?'middle':d.kind==='source'?'end':'start'
      symbol+=text(labelX,horizontal?cy-40:cy-7,d.label,15,anchor)+(this.showValues&&value?text(labelX,horizontal?cy-21:cy+15,value,13,anchor):'')
    }
    this.used.add(d.id);this.symbols.push(`<g data-device="${xml(d.id)}">${symbol}</g>`)
  }
  edges(){return this.doc.devices.filter(d=>!['source','transformer','ground','voltmeter'].includes(d.kind)).map(d=>({device:d,from:this.port(d),to:this.port(d,'n')}))}
  findPath(from:string,to:string,edges:Edge[]):Edge[]|null{
    const queue:{node:string;path:Edge[]}[]=[{node:from,path:[]}],seen=new Set([from])
    while(queue.length){const current=queue.shift()!;if(current.node===to)return current.path;for(const e of edges){const next=e.from===current.node?e.to:e.to===current.node?e.from:null;if(next!==null&&!seen.has(next)){seen.add(next);queue.push({node:next,path:[...current.path,{...e,from:current.node,to:next}]})}}}return null
  }
  rail(edges:Edge[],a:Point,b:Point,net:string){
    let cursor=a,current=net
    edges.forEach((e,i)=>{const end={x:a.x+(b.x-a.x)*(i+1)/edges.length,y:a.y+(b.y-a.y)*(i+1)/edges.length};this.edge(e.device,cursor,end,current);current=e.to;cursor=end})
    if(!edges.length)this.line(a,b,net)
  }
  meter(d:Device,a:Point,b:Point,branch:number){
    const na=this.port(d),nb=this.port(d,'n')
    if(a.y===b.y){const row=a.y===100?180+branch*76:350-branch*65;this.line(a,{x:a.x,y:row},na);this.edge(d,{x:a.x,y:row},{x:b.x,y:row},na);this.line({x:b.x,y:row},b,nb)}
    else{const x=branch;this.line(a,{x,y:a.y},na);this.edge(d,{x,y:a.y},{x,y:b.y},na);this.line({x,y:b.y},b,nb)}
  }
  transformer(t:Device):boolean{
    const source=this.doc.devices.find(d=>d.kind==='source');if(!source||this.doc.devices.filter(d=>d.kind==='transformer').length!==1||this.doc.devices.filter(d=>d.kind==='source').length!==1)return false
    const tp=this.port(t),tn=this.port(t,'n'),sp=this.port(t,'s'),sn=this.port(t,'t');if(tp===tn||sp===sn||this.port(source)===this.port(source,'n'))return false
    const edges=this.edges(),primaryTop=this.findPath(this.port(source),tp,edges),primaryBottom=this.findPath(this.port(source,'n'),tn,edges)
    if(!primaryTop||!primaryBottom)return false
    this.edge(source,{x:100,y:100},{x:100,y:420})
    this.rail(primaryTop,{x:100,y:100},{x:400,y:100},this.port(source));this.line({x:400,y:100},{x:520,y:100},tp)
    this.rail(primaryBottom,{x:100,y:420},{x:400,y:420},this.port(source,'n'));this.line({x:400,y:420},{x:520,y:420},tn)
    const remaining=edges.filter(e=>!this.used.has(e.device.id));let upper=sp,lower=sn
    const take=(start:string)=>{const chain:Edge[]=[];let node=start;for(let i=0;i<remaining.length;i++){const incident=remaining.filter(e=>!this.used.has(e.device.id)&&!chain.some(c=>c.device.id===e.device.id)&&(e.from===node||e.to===node));if(incident.length!==1||incident[0].device.kind!=='ammeter')break;const e=incident[0],next=e.from===node?e.to:e.from;if(next===sp||next===sn)break;chain.push({...e,from:node,to:next});node=next}return {chain,node}}
    const top=take(sp);this.rail(top.chain,{x:630,y:100},{x:840,y:100},sp);upper=top.node
    const bottom=take(sn);this.rail(bottom.chain,{x:630,y:420},{x:840,y:420},sn);lower=bottom.node
    const loads=remaining.filter(e=>!this.used.has(e.device.id));if(loads.some(e=>!((e.from===upper&&e.to===lower)||(e.from===lower&&e.to===upper))))return false
    loads.forEach((e,i)=>{const x=1000+i*130;this.line({x:840,y:100},{x,y:100},upper);this.edge(e.device,{x,y:100},{x,y:420},upper);this.line({x,y:420},{x:840,y:420},lower)})
    this.width=Math.max(1140,1140+Math.max(0,loads.length-1)*130)
    const tShape=path('M520 100V200c24 0 24 30 0 30c24 0 24 30 0 30c24 0 24 30 0 30c24 0 24 30 0 30V420M630 100V200c-24 0-24 30 0 30c-24 0-24 30 0 30c-24 0-24 30 0 30c-24 0-24 30 0 30V420M568 193v134M582 193v134')
    this.symbols.push(`<g data-device="${xml(t.id)}">${tShape}${text(575,150,t.label)}${this.showValues?text(575,171,`${Number(t.value.toPrecision(5))}:1`,13):''}${[[520,100,'P+'],[520,420,'P−'],[630,100,'S+'],[630,420,'S−']].map(([x,y,label])=>`<circle cx="${x}" cy="${y}" r="5" fill="white"/>${text(Number(x)+16,Number(y)+(Number(y)===100?-10:24),String(label),12,'start')}`).join('')}${windingDots(520,630,200)}</g>`);this.used.add(t.id)
    if(tn===sn)this.line({x:520,y:420},{x:630,y:420},tn)
    const primaryNodes=new Map<string,Point>([[this.port(source),{x:100,y:100}],[this.port(source,'n'),{x:100,y:420}],[tp,{x:520,y:100}],[tn,{x:520,y:420}]]),secondaryNodes=new Map<string,Point>([[sp,{x:630,y:100}],[sn,{x:630,y:420}],[upper,{x:840,y:100}],[lower,{x:840,y:420}]])
    let horizontalMeters=0
    for(const d of this.doc.devices.filter(d=>d.kind==='voltmeter')){
      const p=this.port(d),n=this.port(d,'n'),side=primaryNodes.has(p)&&primaryNodes.has(n)?primaryNodes:secondaryNodes,a=side.get(p),b=side.get(n)
      if(!a||!b||p===n)return false
      const primary=side===primaryNodes
      const preTop=top.chain.length>0&&(p===sp||n===sp),preBottom=bottom.chain.length>0&&(p===sn||n===sn)
      if(!primary&&top.chain.length>0&&bottom.chain.length>0&&preTop!==preBottom)return false
      const x=primary?(p===tp||n===tp?460:170):(preTop||preBottom?675:900)
      this.meter(d,a,b,a.y===b.y?horizontalMeters++:x)
    }
    this.anchors.set(tn,{x:100,y:420});this.anchors.set(sn,{x:630,y:420});return true
  }
  simple():boolean{
    const sources=this.doc.devices.filter(d=>d.kind==='source');if(sources.length!==1||this.doc.devices.some(d=>d.kind==='transformer'))return false
    const s=sources[0],start=this.port(s),end=this.port(s,'n'),chain=this.findPath(start,end,this.edges());if(!chain?.length)return false
    this.edge(s,{x:100,y:100},{x:100,y:420});const last=chain.at(-1)!,top=chain.slice(0,-1),right=Math.max(600,300+top.length*220)
    this.rail(top,{x:100,y:100},{x:right,y:100},start);this.edge(last.device,{x:right,y:100},{x:right,y:420},last.from);this.line({x:right,y:420},{x:100,y:420},end)
    const nodes=new Map<string,Point>([[start,{x:100,y:100}],[end,{x:right,y:420}]])
    top.forEach((e,i)=>nodes.set(e.to,{x:100+(right-100)*(i+1)/top.length,y:100}))
    let row=0,column=0
    for(const d of this.doc.devices.filter(d=>!this.used.has(d.id)&&d.kind!=='ground')){const a=nodes.get(this.port(d)),b=nodes.get(this.port(d,'n'));if(!a||!b||this.port(d)===this.port(d,'n'))return false;this.meter(d,a,b,a.y===b.y?row++:200+column++*100)}
    this.width=right+170;this.anchors.set(end,{x:100,y:420});return true
  }
  labeled(){
    // Arbitrary meshes/multiple sources remain exact via explicit net labels, not invented wires.
    this.segments=[];this.symbols=[];this.used.clear();this.anchors.clear()
    const nodes=[...new Set(this.doc.devices.flatMap(d=>ports(d).map(p=>this.port(d,p))))].sort(),names=new Map(nodes.map((n,i)=>[n,`N${i+1}`]))
    const devices=this.doc.devices.filter(d=>d.kind!=='ground'),columns=Math.max(1,Math.min(4,devices.length))
    this.width=Math.max(700,columns*290);this.height=Math.max(1,Math.ceil(devices.length/columns))*290+60
    devices.forEach((d,i)=>{const x=80+(i%columns)*290,y=80+Math.floor(i/columns)*290
      if(d.kind==='transformer'){
        this.symbols.push(`<g data-device="${xml(d.id)}">${text(x+50,y,d.label)}${this.showValues?text(x+50,y+24,`${d.value}:1`):''}${path(`M${x} ${y+60}v20c18 0 18 20 0 20c18 0 18 20 0 20v20M${x+100} ${y+60}v20c-18 0-18 20 0 20c-18 0-18 20 0 20v20M${x+45} ${y+75}v50M${x+55} ${y+75}v50`)}${windingDots(x,x+100,y+80)}${(['p','n','s','t'] as const).map((p,j)=>text(x+(j<2?0:100),y+(j%2?163:48),`${({p:'P+',n:'P−',s:'S+',t:'S−'})[p]}: ${names.get(this.port(d,p))}`,12)).join('')}</g>`);this.used.add(d.id)
      }else{this.edge(d,{x:x+70,y:y+40},{x:x+70,y:y+210});this.symbols.push(text(x+70,y+28,names.get(this.port(d))!,12)+text(x+70,y+229,names.get(this.port(d,'n'))!,12))}
    })
  }
  render(){
    let ok=false;const t=this.doc.devices.find(d=>d.kind==='transformer');if(t)ok=this.transformer(t);else ok=this.simple();if(!ok)this.labeled()
    for(const d of this.doc.devices.filter(d=>d.kind==='ground')){const p=this.anchors.get(this.port(d));this.symbols.push(`<g data-device="${xml(d.id)}">${p?text(p.x,p.y+30,'0 V',12):text(80,this.height-30,'0 V reference',12,'start')}</g>`)}
    const points=new Map<string,Point>()
    for(const s of this.segments)for(const p of [s.a,s.b])points.set(`${p.x},${p.y}`,p)
    for(const a of this.segments)for(const b of this.segments)if(a.net===b.net&&a.a.y===a.b.y&&b.a.x===b.b.x){const p={x:b.a.x,y:a.a.y};if(on(a,p)&&on(b,p))points.set(`${p.x},${p.y}`,p)}
    const dots=[...points.values()].filter(p=>{const directions=new Set<string>();for(const s of this.segments.filter(s=>on(s,p))){if(s.a.x<p.x||s.b.x<p.x)directions.add('l');if(s.a.x>p.x||s.b.x>p.x)directions.add('r');if(s.a.y<p.y||s.b.y<p.y)directions.add('u');if(s.a.y>p.y||s.b.y>p.y)directions.add('d')}const nets=new Set(this.segments.filter(s=>on(s,p)).map(s=>s.net));return directions.size>2&&nets.size===1})
    const strokes=this.segments.map(s=>path(`M${s.a.x} ${s.a.y}L${s.b.x} ${s.b.y}`)).join('')
    return {body:strokes+this.symbols.join('')+dots.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#111"/>`).join(''),labeled:!ok}
  }
}
function on(s:Segment,p:Point){return (s.a.x===s.b.x?p.x===s.a.x:p.y===s.a.y)&&p.x>=Math.min(s.a.x,s.b.x)&&p.x<=Math.max(s.a.x,s.b.x)&&p.y>=Math.min(s.a.y,s.b.y)&&p.y<=Math.max(s.a.y,s.b.y)}
function wrap(value:string,width:number){const out:string[]=[];let current='';for(const word of value.split(' ')){if(current.length+word.length+1>width&&current){out.push(current);current=''}current+=(current?' ':'')+word}if(current)out.push(current);return out}

export function schematicSvg(input:Experiment,style:ResistorStyle='ansi',options:Partial<SchematicOptions>={}):string{
  const doc=parseExperiment(input);if(!doc.devices.length)throw new Error('Add a component before exporting a drawing.');if(style!=='ansi'&&style!=='iec')throw new Error('Unsupported resistor style.')
  const flags:SchematicOptions={title:options.title!==false,values:options.values!==false,modelNotes:options.modelNotes!==false}
  const drawing=new Drawing(doc,style,flags.values),{body,labeled}=drawing.render(),notes:string[]=[]
  for(const d of doc.devices){
    if(d.seriesResistance)notes.push(`${d.label}: ${d.kind==='source'?'Thevenin internal R':d.kind==='capacitor'?'ESR':'winding R'} = ${formatQuantity(d.seriesResistance,'Ω')}.`)
    if(d.transformer){const m=d.transformer;notes.push(`${d.label}: Lp ${formatQuantity(m.primaryInductance,'H')}; k ${m.coupling}; Rp ${formatQuantity(m.primaryResistance,'Ω')}; Rs ${formatQuantity(m.secondaryResistance,'Ω')}; Rc ${m.coreResistance===null?'off':formatQuantity(m.coreResistance,'Ω')} (primary-terminal shunt).`)}
  }
  const hasModel=notes.length>0
  const visibleNotes=flags.modelNotes?[...notes]:[]
  if(doc.devices.some(d=>d.kind==='transformer'))visibleNotes.unshift('Winding dots: corresponding induced-voltage polarity (P+, S+), not wire junctions.')
  if(labeled)visibleNotes.unshift('Net-label layout: matching N labels are electrically connected; different labels are not.')
  const foot=visibleNotes.flatMap(n=>wrap(n,Math.floor(drawing.width/7))),mode=settings(doc).mode==='ac'?`AC RMS · ${settings(doc).frequency} Hz`:'DC steady state',height=drawing.height+foot.length*18+45
  const caption=mode+(flags.values?' · Nominal values':'')+(hasModel?(flags.modelNotes?' · Model parameters below':' · Non-ideal/linear model; parameters in metadata'):'')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 0 ${drawing.width+80} ${height}" width="${drawing.width+80}" height="${height}" role="img" aria-labelledby="drawing-title"><title id="drawing-title">${xml(doc.title)}</title><desc>Topology-based electrical schematic, independent of bench placement. Dots on wires denote joined branches. Dots beside transformer windings indicate corresponding induced-voltage polarity at P+ and S+, not wire junctions. Crossings without junction dots do not connect. Displayed values are nominal model parameters. Complete circuit parameters are retained in metadata even when values or notes are hidden.</desc><metadata>${xml(JSON.stringify({format:'labo-schematic',version:3,resistorStyle:style,options:flags,layout:labeled?'net-labels':'orthogonal',experiment:doc}))}</metadata><rect x="-80" width="${drawing.width+80}" height="${height}" fill="white"/><g fill="none" stroke="#111" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" font-family="Arial, Helvetica, sans-serif">${flags.title?text(-35,28,doc.title,19,'start'):''}${body}</g><g font-family="Arial, Helvetica, sans-serif">${text(-35,drawing.height+2,caption,12,'start')}${foot.map((line,i)=>text(-35,drawing.height+25+i*18,line,12,'start')).join('')}</g><g id="wire-metadata">${doc.wires.map(w=>`<g data-wire="${xml(w.id)}" data-from="${xml(w.from)}" data-to="${xml(w.to)}"/>`).join('')}</g></svg>`
}
