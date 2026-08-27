import type { SoulMeshMessage } from './SoulMeshProtocol';

export interface HttpTransportOptions { endpoint:string; timeoutMs?:number; headers?:Record<string,string>; }

export class SoulMeshHttpTransport {
  private readonly endpoint:string;
  private readonly timeoutMs:number;
  private readonly headers:Record<string,string>;
  constructor(options:HttpTransportOptions){this.endpoint=options.endpoint;this.timeoutMs=options.timeoutMs??15000;this.headers={'content-type':'application/json',...(options.headers??{})};}
  async send(message:SoulMeshMessage):Promise<SoulMeshMessage>{
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
    try{
      const response=await fetch(this.endpoint,{method:'POST',headers:this.headers,body:JSON.stringify(message),signal:controller.signal});
      const body=await response.json() as SoulMeshMessage;
      if(!response.ok) throw new Error(`SOUL_MESH_HTTP_${response.status}`);
      if(body.correlationId!==message.correlationId) throw new Error('SOUL_MESH_CORRELATION_MISMATCH');
      return body;
    } finally { clearTimeout(timer); }
  }
}
