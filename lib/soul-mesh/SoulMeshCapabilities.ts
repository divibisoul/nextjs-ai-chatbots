export type SoulMeshCapability={id:string;version:string;description:string;request:boolean;response:boolean;events:boolean;remote:boolean;owner?:'N02'|'N03'|'N04'|'N06';fallback?:'N01'|'N05'|'N06'};
export const SOUL_MESH_CAPABILITIES:SoulMeshCapability[]=[
{id:'mesh.handshake',version:'1.1',description:'N04 canonical Mesh handshake and capability discovery',request:true,response:true,events:false,remote:true,owner:'N04'},
{id:'ai-pilot',version:'1.1',description:'Provider-neutral AI inference boundary backed by the configured N04 pilot.',request:true,response:true,events:false,remote:true,owner:'N04'},
{id:'conversation',version:'1.1',description:'Conversational inference through the provider-neutral pilot boundary.',request:true,response:true,events:false,remote:true,owner:'N04',fallback:'N02'},
{id:'tool-execution',version:'1.1',description:'Execute a registered N04 tool through the controlled tool boundary.',request:true,response:true,events:true,remote:true,owner:'N04',fallback:'N06'},
{id:'artifact-processing',version:'1.1',description:'Create or process application artifacts using existing N04 handlers.',request:true,response:true,events:true,remote:true,owner:'N04',fallback:'N06'},
{id:'document-processing',version:'1.1',description:'Read or update persisted documents using existing N04 handlers.',request:true,response:true,events:true,remote:true,owner:'N04',fallback:'N06'},
{id:'context-orchestration',version:'1.1',description:'Exchange structured context between heterogeneous nuclei.',request:true,response:true,events:true,remote:true,owner:'N04'},
{id:'streaming',version:'1.1',description:'Streaming remains on the native chat transport and is not exposed as a remote Mesh executor.',request:true,response:true,events:true,remote:false,owner:'N04'},
{id:'mesh-communication',version:'1.1',description:'N04 outbound request/response bridge to the other nuclei.',request:true,response:true,events:true,remote:true,owner:'N04'},
{id:'mesh.ping',version:'1.0',description:'Liveness and correlation probe.',request:true,response:true,events:false,remote:true},
{id:'mesh.describe',version:'1.0',description:'Runtime capability, agent, tool, model and peer discovery.',request:true,response:true,events:false,remote:true},
{id:'core.health',version:'1.0',description:'N04 runtime health status.',request:true,response:true,events:false,remote:true},
{id:'environment.weather',version:'1.0',description:'Weather lookup from the existing N04 tool.',request:true,response:true,events:false,remote:true,owner:'N04'},
];
