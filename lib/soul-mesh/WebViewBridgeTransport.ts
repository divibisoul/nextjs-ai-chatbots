import type { SoulMeshMessage } from './SoulMeshProtocol';

export class WebViewBridgeTransport {
  private readonly target: Window;
  private readonly origin: string;
  constructor(target:Window = window, origin='*'){this.target=target;this.origin=origin;}
  send(message:SoulMeshMessage):Promise<void>{this.target.postMessage({type:'SOUL_MESH',message},this.origin);return Promise.resolve();}
  onMessage(handler:(message:SoulMeshMessage)=>void|Promise<void>):()=>void{const listener=(event:MessageEvent)=>{if(event.data?.type==='SOUL_MESH'&&event.data.message)void handler(event.data.message as SoulMeshMessage);};window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);}
}
