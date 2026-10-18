import { defaultTransformer } from './circuit'
import type { Device, Experiment, Kind } from './circuit'

// Explicit educational starting points, not measured specifications for a named instrument.
export const typicalSeriesResistance:Partial<Record<Kind,number>>={source:0.5,inductor:5,capacitor:0.5}
export function deviceModelDefaults(kind:Kind,losses=true):Partial<Device>{
  if(kind==='transformer')return {transformer:losses?{...defaultTransformer}:{...defaultTransformer,coupling:1,primaryResistance:0,secondaryResistance:0,coreResistance:null}}
  const resistance=typicalSeriesResistance[kind]
  return resistance===undefined?{}:{seriesResistance:losses?resistance:0}
}
/** Explicit new-circuit/reset operation only. Never use on imports or restored work. */
export function withModelDefaults(doc:Experiment,losses=true,overwrite=false):Experiment{
  if(!doc.devices.length)return doc
  return {...doc,version:doc.version===4?4:3,devices:doc.devices.map(d=>{
    if(d.kind==='transformer'){
      if(losses&&!overwrite&&d.transformer)return d
      return {...d,transformer:losses?{...(d.transformer??defaultTransformer),coupling:defaultTransformer.coupling,primaryResistance:defaultTransformer.primaryResistance,secondaryResistance:defaultTransformer.secondaryResistance,coreResistance:defaultTransformer.coreResistance}: {...(d.transformer??defaultTransformer),coupling:1,primaryResistance:0,secondaryResistance:0,coreResistance:null}}
    }
    if(typicalSeriesResistance[d.kind]===undefined||(losses&&!overwrite&&d.seriesResistance!==undefined))return d
    return {...d,...deviceModelDefaults(d.kind,losses)}
  })}
}
