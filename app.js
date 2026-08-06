import { firebaseConfig } from './firebase-config.js';

const FIREBASE_VERSION = '12.16.0';
let fb = null;
let remote = false;
let currentUser = null;
let currentPlanResult = null;

const state = {
  courses: [], materials: [], prices: [], movements: [], practices: [], practiceMaterials: [],
  plans: [], executions: [], settings: { students:35, studentsPerGroup:5, quoteValidity:30, waste:10, defaultLifeClasses:4 }
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const brl = v => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = v => Number(v||0);
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const round = (v,d=2) => Number(Number(v||0).toFixed(d));
const ceilPack = (qty,pack=1) => Math.ceil(qty/Math.max(1,pack))*Math.max(1,pack);
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function upsert(arr,obj){const i=arr.findIndex(x=>x.id===obj.id);if(i>=0)arr[i]=obj;else arr.push(obj)}

async function initFirebase(){
  if(!firebaseConfig?.apiKey || !firebaseConfig?.projectId) return false;
  try{
    const appMod=await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);
    const authMod=await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    const fsMod=await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`);
    const app=appMod.initializeApp(firebaseConfig), auth=authMod.getAuth(app), db=fsMod.getFirestore(app);
    fb={...authMod,...fsMod,auth,db}; remote=true;
    fb.onAuthStateChanged(auth,async user=>{if(user){currentUser=user;await loadRemote();openApp(user.email)}else showLogin()});
    return true;
  }catch(e){console.error(e);toast('Firebase indisponível. Use o modo demonstração.');return false}
}
function showLogin(){$('#loginView').classList.remove('hidden');$('#appView').classList.add('hidden')}
function openApp(label='Modo demonstração'){$('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');$('#userBadge').textContent=label;renderAll()}
async function login(e){e.preventDefault();if(!remote)return toast('Configure o Firebase ou use demonstração.');try{await fb.signInWithEmailAndPassword(fb.auth,$('#loginEmail').value,$('#loginPassword').value)}catch(e){toast('Falha no acesso: '+(e.code||e.message))}}
async function logout(){if(remote&&currentUser)await fb.signOut(fb.auth);currentUser=null;showLogin()}

const LOCAL_KEY='lm-eletrica-inteligente-v2';
function loadLocal(){const raw=localStorage.getItem(LOCAL_KEY);if(raw)Object.assign(state,JSON.parse(raw))}
function saveLocal(){localStorage.setItem(LOCAL_KEY,JSON.stringify(state))}
async function loadCollection(name){const snap=await fb.getDocs(fb.collection(fb.db,name));return snap.docs.map(d=>({id:d.id,...d.data()}))}
async function loadRemote(){
  for(const n of ['courses','materials','prices','movements','practices','practiceMaterials','plans','executions']) state[n]=await loadCollection(n);
  let s=await fb.getDoc(fb.doc(fb.db,'settings','general'));
  if(!s.exists()) s=await fb.getDoc(fb.doc(fb.db,'config','general'));
  if(s.exists()) state.settings={...state.settings,...s.data(),students:s.data().standardStudents??s.data().students??state.settings.students,studentsPerGroup:s.data().studentsPerGroup??state.settings.studentsPerGroup,quoteValidity:s.data().quotationValidityDays??s.data().quoteValidity??state.settings.quoteValidity,waste:s.data().reservePercent??s.data().waste??state.settings.waste};
}
async function persist(collection,obj){if(remote&&currentUser)await fb.setDoc(fb.doc(fb.db,collection,obj.id),{...obj,updatedAt:now()},{merge:true});else saveLocal()}
async function persistMany(collection,items){for(const item of items)await persist(collection,item)}

const CATEGORIES=['Insumo consumível','Componente reutilizável','Ferramenta','Instrumento de medição','Equipamento permanente','EPI','EPC','Material didático','Logística'];
const CALC_MODES=['por_grupo','por_aluno','por_turma','por_pratica','por_conexao'];

const seedCourses=[
['tec-ser-1560','Técnico em Sistemas de Energias Renováveis','Habilitação Técnica',1560,'2024 • Híbrido'],['tec-eletro-1200','Técnico em Eletrotécnica','Habilitação Técnica',1200,'2025 • Presencial'],['tec-eletro-1560','Técnico em Eletrotécnica NEM','Habilitação Técnica',1560,'2023 • Híbrido'],['inst-fv-216','Instalador de Sistemas Fotovoltaicos','Qualificação',216,'On-grid, off-grid e híbrido'],['mont-fv-80','Montador de Sistemas Fotovoltaicos','Qualificação',80,'Montagem mecânica e segurança'],['elet-industrial-200','Eletricista Industrial','Qualificação',200,'Instalação e manutenção'],['elet-industrial-240','Eletricista Industrial 4.0','Qualificação',240,'Integração 4.0'],['elet-predial-264','Eletricista de Instalações Prediais','Aprendizagem',264,'Instalações prediais'],['inv-soft-40','Inversor de Frequência e Soft Starter','Aperfeiçoamento',40,'Acionamentos elétricos'],['redes-350','Eletricista de Redes de Distribuição','Qualificação',350,'Redes BT e MT'],['comandos-120','Comandos Elétricos','Qualificação',120,'Quadros e partidas'],['predial-80','Instalação de Sistemas Elétricos Prediais','Aperfeiçoamento',80,'Baixa tensão, aterramento e SPDA']
].map(x=>({id:x[0],name:x[1],modality:x[2],hours:x[3],description:x[4],students:35,active:true}));

const seedMaterials=[
['CAB-15','Fio flexível 1,5 mm² 750 V','Insumo consumível','m',0,300,'Condutor padrão didático',0,1,0,10],
['FITA-19','Fita isolante 19 mm x 20 m','Insumo consumível','rolo',0,20,'Isolação e acabamento',0,1,0,10],
['TERM-15','Terminal tubular 1,5 mm²','Insumo consumível','un',0,2000,'Crimpagem de conexões',0,1,0,15],
['ABR-100','Abraçadeira de nylon 100 mm','Insumo consumível','un',0,1000,'Organização e fixação',0,1,0,15],
['PARAF-4','Parafuso e bucha 4 mm','Insumo consumível','conj',0,400,'Fixação de infraestrutura',0,1,0,10],
['ELET-20','Eletroduto PVC 20 mm','Insumo consumível','m',0,120,'Infraestrutura predial',0,1,0,10],
['CX-4X2','Caixa 4x2 PVC','Componente reutilizável','un',0,42,'Montagem predial',4,1,5,10],
['INT-1S','Interruptor simples 10 A','Componente reutilizável','un',0,21,'Circuitos de iluminação',4,1,7,10],
['INT-3W','Interruptor paralelo 10 A','Componente reutilizável','un',0,14,'Circuito three-way',4,1,7,10],
['TOM-10','Tomada 2P+T 10 A','Componente reutilizável','un',0,35,'Circuitos de tomadas',4,1,7,10],
['SOQ-E27','Soquete E27','Componente reutilizável','un',0,21,'Pontos de iluminação',4,1,7,10],
['LAMP-LED','Lâmpada LED 9 W','Componente reutilizável','un',0,21,'Iluminação',6,1,4,10],
['DISJ-1P10','Disjuntor DIN monopolar 10 A','Componente reutilizável','un',0,14,'Proteção iluminação',4,1,6,10],
['DISJ-1P20','Disjuntor DIN monopolar 20 A','Componente reutilizável','un',0,14,'Proteção tomadas',4,1,6,10],
['DR-2P40','Interruptor DR 2P 40 A 30 mA','Componente reutilizável','un',0,7,'Proteção diferencial',6,1,4,10],
['DPS-275','DPS classe II 275 V','Componente reutilizável','un',0,14,'Proteção contra surtos',6,1,4,10],
['QD-12','Quadro de distribuição 12 módulos','Componente reutilizável','un',0,7,'Quadro didático',8,1,2,10],
['BARR-N','Barramento neutro/terra','Componente reutilizável','un',0,14,'Distribuição',8,1,2,10],
['KIT-FERR','Kit de ferramentas isoladas','Ferramenta','kit',0,7,'Alicate, chaves, decapador',30,1,2,5],
['ALIC-CRIMP','Alicate crimpador tubular','Ferramenta','un',0,7,'Crimpagem',25,1,3,5],
['MULT','Multímetro CAT III','Instrumento de medição','un',0,7,'Medições elétricas',40,1,2,5],
['MEG-1K','Megômetro 1 kV','Instrumento de medição','un',0,2,'Resistência de isolação',60,1,1,5],
['CAP-CLB','Capacete classe B','EPI','un',0,35,'Proteção da cabeça',20,1,2,5],
['OCULOS','Óculos de segurança','EPI','un',0,35,'Proteção ocular',8,1,5,10],
['LUVA-MEC','Luva de proteção mecânica','EPI','par',0,35,'Montagem e manuseio',4,1,10,10],
['LUVA-BT','Luva isolante BT com sobreluva','EPI','par',0,14,'Práticas energizadas controladas',12,1,3,10],
['TAP-ISO','Tapete isolante','EPC','un',0,7,'Proteção coletiva',30,1,2,5],
['BLOQ','Kit LOTO','EPC','kit',0,7,'Bloqueio e etiquetagem',30,1,2,5],
['CONE','Cone de sinalização','EPC','un',0,8,'Isolamento da área',30,1,2,5],
['PLACA','Placa de sinalização elétrica','EPC','un',0,8,'Sinalização',30,1,2,5]
].map(x=>({id:x[0],code:x[0],name:x[1],category:x[2],unit:x[3],stock:x[4],minStock:x[5],spec:x[6],lifeClasses:x[7],packQty:x[8],failurePercent:x[9],reservePercent:x[10],active:true}));

const seedPractices=[
['p80-01','predial-80','Segurança, APR e preparação da área',6,1,'normal'],
['p80-02','predial-80','Montagem de infraestrutura com eletrodutos e caixas',12,2,'alta'],
['p80-03','predial-80','Circuito de iluminação com interruptor simples',10,2,'alta'],
['p80-04','predial-80','Circuito de iluminação com interruptores paralelos',10,2,'alta'],
['p80-05','predial-80','Circuitos de tomadas 2P+T',10,2,'alta'],
['p80-06','predial-80','Montagem de quadro com disjuntores, DR e DPS',12,2,'alta'],
['p80-07','predial-80','Aterramento, equipotencialização e testes',8,1,'normal'],
['p80-08','predial-80','Pré-comissionamento, continuidade e isolação',8,1,'alta'],
['p80-09','predial-80','Organização, desmontagem e inventário final',4,1,'normal']
].map(x=>({id:x[0],courseId:x[1],name:x[2],hours:x[3],assembliesPerGroup:x[4],severity:x[5],active:true}));

const PM=[];
function pm(id,practiceId,materialId,mode,qty,opts={}){PM.push({id,practiceId,materialId,mode,quantity:qty,connections:opts.connections||0,reusePercent:opts.reusePercent||0,lossPercent:opts.lossPercent||0,requiredExternal:opts.requiredExternal??true,notes:opts.notes||''})}
pm('pm01','p80-01','CAP-CLB','por_aluno',1,{reusePercent:100});pm('pm02','p80-01','OCULOS','por_aluno',1,{reusePercent:100});pm('pm03','p80-01','LUVA-MEC','por_aluno',1,{reusePercent:100});pm('pm04','p80-01','CONE','por_turma',4,{reusePercent:100});pm('pm05','p80-01','PLACA','por_turma',4,{reusePercent:100});pm('pm06','p80-01','BLOQ','por_grupo',1,{reusePercent:100});
pm('pm10','p80-02','ELET-20','por_grupo',6,{lossPercent:15});pm('pm11','p80-02','CX-4X2','por_grupo',4,{reusePercent:80,lossPercent:5});pm('pm12','p80-02','PARAF-4','por_grupo',16,{lossPercent:15});pm('pm13','p80-02','ABR-100','por_grupo',20,{lossPercent:20});pm('pm14','p80-02','KIT-FERR','por_grupo',1,{reusePercent:100});
pm('pm20','p80-03','CAB-15','por_grupo',18,{reusePercent:20,lossPercent:12});pm('pm21','p80-03','INT-1S','por_grupo',2,{reusePercent:100});pm('pm22','p80-03','SOQ-E27','por_grupo',2,{reusePercent:100});pm('pm23','p80-03','LAMP-LED','por_grupo',2,{reusePercent:100});pm('pm24','p80-03','TERM-15','por_conexao',0,{connections:28,lossPercent:15});pm('pm25','p80-03','FITA-19','por_grupo',0.25,{lossPercent:10});
pm('pm30','p80-04','CAB-15','por_grupo',24,{reusePercent:20,lossPercent:12});pm('pm31','p80-04','INT-3W','por_grupo',2,{reusePercent:100});pm('pm32','p80-04','SOQ-E27','por_grupo',1,{reusePercent:100});pm('pm33','p80-04','LAMP-LED','por_grupo',1,{reusePercent:100});pm('pm34','p80-04','TERM-15','por_conexao',0,{connections:34,lossPercent:15});pm('pm35','p80-04','FITA-19','por_grupo',0.25,{lossPercent:10});
pm('pm40','p80-05','CAB-15','por_grupo',20,{reusePercent:20,lossPercent:12});pm('pm41','p80-05','TOM-10','por_grupo',3,{reusePercent:100});pm('pm42','p80-05','TERM-15','por_conexao',0,{connections:36,lossPercent:15});pm('pm43','p80-05','FITA-19','por_grupo',0.25,{lossPercent:10});
pm('pm50','p80-06','QD-12','por_grupo',1,{reusePercent:100});pm('pm51','p80-06','DISJ-1P10','por_grupo',1,{reusePercent:100});pm('pm52','p80-06','DISJ-1P20','por_grupo',2,{reusePercent:100});pm('pm53','p80-06','DR-2P40','por_grupo',1,{reusePercent:100});pm('pm54','p80-06','DPS-275','por_grupo',2,{reusePercent:100});pm('pm55','p80-06','BARR-N','por_grupo',2,{reusePercent:100});pm('pm56','p80-06','CAB-15','por_grupo',12,{reusePercent:20,lossPercent:12});pm('pm57','p80-06','TERM-15','por_conexao',0,{connections:42,lossPercent:15});pm('pm58','p80-06','ALIC-CRIMP','por_grupo',1,{reusePercent:100});
pm('pm60','p80-07','CAB-15','por_grupo',6,{reusePercent:10,lossPercent:10});pm('pm61','p80-07','MULT','por_grupo',1,{reusePercent:100});pm('pm62','p80-07','TAP-ISO','por_grupo',1,{reusePercent:100});
pm('pm70','p80-08','MULT','por_grupo',1,{reusePercent:100});pm('pm71','p80-08','MEG-1K','por_turma',2,{reusePercent:100});pm('pm72','p80-08','LUVA-BT','por_grupo',2,{reusePercent:100});
pm('pm80','p80-09','ABR-100','por_grupo',10,{lossPercent:20});
const seedPracticeMaterials=PM;

function latestPrice(materialId){
  const valid=state.prices.filter(p=>p.materialId===materialId&&p.available!==false).sort((a,b)=>String(b.consultedAt).localeCompare(String(a.consultedAt)));
  return valid[0]||null;
}
function quoteStatus(p){if(!p)return'Pendente';const age=(Date.now()-new Date(p.consultedAt+'T12:00:00'))/86400000;return age<=num(state.settings.quoteValidity)?'Válida':'Vencida'}
function severityFactor(s){return({baixa:.5,normal:1,alta:1.5,muito_alta:2})[s]||1}
function materialType(m){if(m.category==='Insumo consumível')return'consumable';if(['Componente reutilizável','EPI','EPC','Ferramenta','Instrumento de medição','Equipamento permanente'].includes(m.category))return'reusable';return'other'}
function baseQty(pm,practice,ctx){
  const groups=ctx.groups,students=ctx.students,assemblies=num(practice.assembliesPerGroup||1),q=num(pm.quantity);
  if(pm.mode==='por_aluno')return q*students;
  if(pm.mode==='por_turma')return q;
  if(pm.mode==='por_pratica')return q*assemblies;
  if(pm.mode==='por_conexao')return num(pm.connections)*groups*assemblies;
  return q*groups*assemblies;
}
function calculatePlan(input){
  const course=state.courses.find(c=>c.id===input.courseId); if(!course)return null;
  const groups=Math.ceil(input.students/Math.max(1,input.groupSize));
  const ctx={...input,groups}; const rows=[];
  const coursePractices=state.practices.filter(p=>p.courseId===course.id&&p.active!==false);
  for(const practice of coursePractices){
    for(const rel of state.practiceMaterials.filter(r=>r.practiceId===practice.id)){
      const m=state.materials.find(x=>x.id===rel.materialId); if(!m)continue;
      let raw=baseQty(rel,practice,ctx); const sev=severityFactor(practice.severity);
      const type=materialType(m); const reuse=num(rel.reusePercent)/100;
      let operationalQty=raw;
      if(type==='consumable') operationalQty=raw*(1-reuse)*(1+num(rel.lossPercent)/100)*(1+input.reserve/100);
      else operationalQty=raw;
      let buyQty=0,wearQty=0,mobilizeQty=0;
      const localProvides=(m.category==='Ferramenta'&&input.hasTools)||(m.category==='Instrumento de medição'&&input.hasInstruments)||((m.category==='EPI'||m.category==='EPC')&&input.hasPpe);
      if(!localProvides){
        mobilizeQty=type==='reusable'?raw:0;
        if(type==='consumable') buyQty=Math.max(0,operationalQty-(input.takeStock?num(m.stock):0));
        else {
          const life=Math.max(1,num(m.lifeClasses||state.settings.defaultLifeClasses));
          wearQty=raw/life*sev*(1+num(m.failurePercent)/100)*(1+input.reserve/100)*input.classes;
          const requiredInventory=raw;
          const available=input.takeStock?num(m.stock):0;
          buyQty=Math.max(0,requiredInventory-available);
        }
      }
      const p=latestPrice(m.id),unitPrice=p?num(p.unitPrice||p.price/Math.max(1,p.packQty)):0;
      const immediateCost=buyQty*unitPrice;
      const wearCost=wearQty*unitPrice;
      rows.push({practiceId:practice.id,practice:practice.name,materialId:m.id,code:m.code,name:m.name,category:m.category,unit:m.unit,raw:round(raw,3),needed:round(operationalQty,3),mobilize:round(mobilizeQty,3),stock:num(m.stock),buy:round(buyQty,3),wearQty:round(wearQty,3),unitPrice,quoteStatus:quoteStatus(p),immediateCost,wearCost,notes:rel.notes||''});
    }
  }
  const merged={};
  for(const r of rows){const k=r.materialId;if(!merged[k])merged[k]={...r,practices:new Set([r.practice])};else{merged[k].raw+=r.raw;merged[k].needed+=r.needed;merged[k].mobilize=Math.max(merged[k].mobilize,r.mobilize);merged[k].buy+=r.buy;merged[k].wearQty+=r.wearQty;merged[k].immediateCost+=r.immediateCost;merged[k].wearCost+=r.wearCost;merged[k].practices.add(r.practice)}}
  const items=Object.values(merged).map(r=>({...r,raw:round(r.raw,2),needed:round(r.needed,2),buy:round(r.buy,2),wearQty:round(r.wearQty,2),immediateCost:round(r.immediateCost,2),wearCost:round(r.wearCost,2),practices:[...r.practices]}));
  const logistics=input.includeLogistics?num(input.transport)+num(input.lodging)+num(input.meals)+num(input.freight):0;
  const immediate=items.reduce((s,r)=>s+r.immediateCost,0)+logistics;
  const wear=items.reduce((s,r)=>s+r.wearCost,0);
  const total=immediate+wear;
  const pending=items.filter(r=>(r.buy>0||r.wearQty>0)&&!r.unitPrice).length;
  return {id:input.id||uid(),createdAt:input.createdAt||now(),courseId:course.id,courseName:course.name,hours:course.hours,...input,groups,items,logistics,immediate:round(immediate,2),wear:round(wear,2),total:round(total,2),perStudent:round(total/input.students,2),perHour:round(total/course.hours,2),pending};
}

async function seed(){
  const additions=[];
  for(const [key,data] of [['courses',seedCourses],['materials',seedMaterials],['practices',seedPractices],['practiceMaterials',seedPracticeMaterials]]){
    for(const item of data){if(!state[key].some(x=>x.id===item.id)){state[key].push(item);additions.push([key,item])}else{upsert(state[key],{...state[key].find(x=>x.id===item.id),...item})}}
  }
  if(remote&&currentUser){for(const [c,o] of additions)await persist(c,o)}else saveLocal();
  renderAll();toast('Base inteligente carregada/atualizada.');
}

function renderAll(){
  fillSelects(); renderDashboard(); renderCourses(); renderPractices(); renderMaterials(); renderPrices(); renderStock(); renderHistory(); renderPlanList();
  $('#defaultStudents').value=state.settings.students;$('#studentsPerGroup').value=state.settings.studentsPerGroup;$('#quoteValidity').value=state.settings.quoteValidity;$('#defaultWaste').value=state.settings.waste;$('#defaultLifeClasses').value=state.settings.defaultLifeClasses;
  if(!$('#plannerStudents').dataset.touched){$('#plannerStudents').value=state.settings.students;$('#plannerGroupSize').value=state.settings.studentsPerGroup;$('#plannerReserve').value=state.settings.waste}
}
function fillSelects(){
  const courseOpts=state.courses.map(c=>`<option value="${c.id}">${esc(c.name)} (${c.hours}h)</option>`).join('');
  for(const id of ['plannerCourse','practiceCourseFilter']){const el=$('#'+id);const v=el.value;el.innerHTML=(id==='practiceCourseFilter'?'<option value="">Todos os cursos</option>':'')+courseOpts;if(v)el.value=v}
  const matOpts=state.materials.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join(''); const sm=$('#stockMaterial');const sv=sm.value;sm.innerHTML=matOpts;if(sv)sm.value=sv;
  const cat=$('#materialCategory');const cv=cat.value;cat.innerHTML='<option value="">Todas as categorias</option>'+CATEGORIES.map(c=>`<option>${c}</option>`).join('');cat.value=cv;
}
function renderDashboard(){
  const stockRisk=state.materials.filter(m=>num(m.stock)<num(m.minStock)).length;
  const pendingQuotes=state.materials.filter(m=>!latestPrice(m.id)).length;
  const activePlans=state.plans.length;
  const planned=state.plans.reduce((s,p)=>s+num(p.total),0);
  $('#kpis').innerHTML=[['Cursos',state.courses.length,'matrizes cadastradas'],['Práticas',state.practices.length,'roteiros vinculados'],['Materiais em risco',stockRisk,'abaixo do mínimo'],['Custo planejado',brl(planned),`${activePlans} planejamentos`]].map(x=>`<div class="kpi"><small>${x[0]}</small><strong>${x[1]}</strong><em>${x[2]}</em></div>`).join('');
  const plans=[...state.plans].sort((a,b)=>num(b.total)-num(a.total)).slice(0,8),max=Math.max(1,...plans.map(p=>num(p.total)));
  $('#planCostChart').innerHTML=plans.length?plans.map(p=>`<div class="bar-row"><span>${esc(p.courseName||'Curso')}</span><div class="bar"><span style="width:${num(p.total)/max*100}%"></span></div><b>${brl(p.total)}</b></div>`).join(''):'<p class="muted">Nenhum planejamento salvo.</p>';
  const all=Math.max(1,state.materials.length);$('#riskSummary').innerHTML=`<div class="risk-meter"><div class="risk-line"><div><b>Estoque abaixo do mínimo</b><div class="risk-track"><span style="width:${stockRisk/all*100}%"></span></div></div><strong>${stockRisk}</strong></div><div class="risk-line"><div><b>Sem cotação válida</b><div class="risk-track"><span style="width:${pendingQuotes/all*100}%"></span></div></div><strong>${pendingQuotes}</strong></div></div>`;
  const alerts=[];
  if(stockRisk)alerts.push(['bad',`${stockRisk} materiais estão abaixo do estoque mínimo.`]);
  if(pendingQuotes)alerts.push(['',`${pendingQuotes} materiais ainda não possuem cotação verificável.`]);
  const highVar=state.executions.filter(e=>Math.abs(num(e.realCost)-num(e.plannedCost))>num(e.plannedCost)*.15).length;if(highVar)alerts.push(['bad',`${highVar} execuções tiveram variação superior a 15% entre previsto e realizado.`]);
  if(!alerts.length)alerts.push(['ok','Nenhuma pendência crítica identificada.']);
  $('#alerts').innerHTML=`<div class="alert-list">${alerts.map(a=>`<div class="alert-item ${a[0]}">${a[1]}</div>`).join('')}</div>`;
}
function renderCourses(){const q=$('#courseSearch').value.toLowerCase();$('#courseGrid').innerHTML=state.courses.filter(c=>c.name.toLowerCase().includes(q)).map(c=>{const pc=state.practices.filter(p=>p.courseId===c.id).length;return`<article class="course-card"><h3>${esc(c.name)}</h3><p>${esc(c.description||'')}</p><div class="card-meta"><span class="chip">${c.hours} h</span><span class="chip">${esc(c.modality)}</span><span class="chip">${pc} práticas</span></div><div class="card-actions"><button class="action-btn" data-plan-course="${c.id}">Planejar turma</button><button class="action-btn" data-edit-course="${c.id}">Editar</button></div></article>`}).join('')}
function renderPractices(){const q=$('#practiceSearch').value.toLowerCase(),cid=$('#practiceCourseFilter').value;$('#practiceGrid').innerHTML=state.practices.filter(p=>(!cid||p.courseId===cid)&&p.name.toLowerCase().includes(q)).map(p=>{const c=state.courses.find(x=>x.id===p.courseId),rels=state.practiceMaterials.filter(r=>r.practiceId===p.id).length;return`<article class="course-card"><h3>${esc(p.name)}</h3><p>${esc(c?.name||'')}</p><div class="card-meta"><span class="chip">${p.hours} h</span><span class="chip">${p.assembliesPerGroup||1} montagem(ns)/grupo</span><span class="chip">Severidade ${esc(p.severity)}</span><span class="chip">${rels} recursos</span></div><div class="card-actions"><button class="action-btn" data-edit-practice="${p.id}">Editar</button><button class="action-btn" data-link-material="${p.id}">Vincular material</button></div></article>`}).join('')}
function renderMaterials(){const q=$('#materialSearch').value.toLowerCase(),cat=$('#materialCategory').value;$('#materialsBody').innerHTML=state.materials.filter(m=>(!cat||m.category===cat)&&(`${m.code} ${m.name} ${m.spec}`).toLowerCase().includes(q)).map(m=>{const p=latestPrice(m.id),st=num(m.stock)<num(m.minStock)?'bad':num(m.stock)===num(m.minStock)?'warn':'ok';return`<tr><td>${esc(m.code)}</td><td><b>${esc(m.name)}</b><br><small>${esc(m.spec||'')}</small></td><td>${esc(m.category)}</td><td>${esc(m.unit)}</td><td>${num(m.stock)} / mín. ${num(m.minStock)}</td><td>${num(m.lifeClasses)?`${m.lifeClasses} turmas`:'Consumo direto'}</td><td>${p?brl(p.unitPrice):'Pendente'}</td><td><span class="status ${st}">${st==='bad'?'Repor':st==='warn'?'No mínimo':'Adequado'}</span></td><td><button class="action-btn" data-edit-material="${m.id}">Editar</button></td></tr>`}).join('')}
function renderPrices(){const q=$('#priceSearch').value.toLowerCase();$('#pricesBody').innerHTML=state.prices.filter(p=>{const m=state.materials.find(x=>x.id===p.materialId);return(`${m?.name||''} ${p.supplier}`).toLowerCase().includes(q)}).map(p=>{const m=state.materials.find(x=>x.id===p.materialId),st=quoteStatus(p);return`<tr><td>${esc(m?.name||p.materialId)}</td><td>${esc(p.supplier)}</td><td>${esc(p.pack)}</td><td>${brl(p.price)}</td><td>${brl(p.unitPrice)}</td><td>${new Date(p.consultedAt+'T12:00:00').toLocaleDateString('pt-BR')}</td><td><span class="status ${st==='Válida'?'ok':st==='Vencida'?'bad':'warn'}">${st}</span></td><td><a href="${esc(p.url)}" target="_blank" rel="noopener">Abrir fonte</a></td></tr>`}).join('')}
function renderStock(){$('#stockBody').innerHTML=[...state.movements].sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(x=>`<tr><td>${new Date(x.date).toLocaleString('pt-BR')}</td><td>${esc(state.materials.find(m=>m.id===x.materialId)?.name||x.materialId)}</td><td>${esc(x.type)}</td><td>${x.qty}</td><td>${esc(x.reason||'')}</td></tr>`).join('')}
function renderHistory(){const total=state.executions.length,planned=state.executions.reduce((s,e)=>s+num(e.plannedCost),0),real=state.executions.reduce((s,e)=>s+num(e.realCost),0),variance=real-planned;$('#historySummary').innerHTML=[['Execuções',total,'registradas'],['Previsto',brl(planned),'somatório'],['Real',brl(real),'somatório'],['Variação',brl(variance),planned?`${round(variance/planned*100,1)}%`:'0%']].map(x=>`<div class="kpi"><small>${x[0]}</small><strong>${x[1]}</strong><em>${x[2]}</em></div>`).join('');$('#historyBody').innerHTML=[...state.executions].sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(e=>{const v=num(e.realCost)-num(e.plannedCost);return`<tr><td>${new Date(e.date).toLocaleDateString('pt-BR')}</td><td>${esc(e.courseName)}</td><td>${esc(e.className)}</td><td>${brl(e.plannedCost)}</td><td>${brl(e.realCost)}</td><td class="${v>0?'negative':'positive'}">${brl(v)}</td><td>${esc(e.occurrences||'')}</td></tr>`}).join('')}
function renderPlanList(){const opts=state.plans.map(p=>`<option value="${p.id}">${esc(p.courseName)} • ${new Date(p.createdAt).toLocaleDateString('pt-BR')} • ${brl(p.total)}</option>`).join('');$('#reportPlan').innerHTML=opts}

function plannerInput(){return{courseId:$('#plannerCourse').value,location:$('#plannerLocation').value,city:$('#plannerCity').value,students:num($('#plannerStudents').value),groupSize:num($('#plannerGroupSize').value),reserve:num($('#plannerReserve').value),classes:num($('#plannerClasses').value),hasBenches:$('#hasBenches').checked,hasTools:$('#hasTools').checked,hasInstruments:$('#hasInstruments').checked,hasPpe:$('#hasPpe').checked,takeStock:$('#takeStock').checked,includeLogistics:$('#includeLogistics').checked,transport:num($('#logTransport').value),lodging:num($('#logLodging').value),meals:num($('#logMeals').value),freight:num($('#logFreight').value)}}
function renderPlanner(result){if(!result){$('#plannerOutput').innerHTML='<article class="panel"><h3>Como usar</h3><p>Selecione o curso e as condições de execução. O sistema calculará compra imediata, mobilização, desgaste, custo econômico, itens sem cotação e lista de retorno.</p></article>';return}currentPlanResult=result;const buy=result.items.filter(r=>r.buy>0),mob=result.items.filter(r=>r.mobilize>0),pending=result.items.filter(r=>(r.buy>0||r.wearQty>0)&&!r.unitPrice);$('#plannerOutput').innerHTML=`<div class="summary-banner"><h2>${esc(result.courseName)}</h2><p>${result.location==='externo'?'Execução externa':'Execução interna'} • ${result.students} alunos • ${result.groups} grupos • ${result.classes} turma(s)</p><div class="summary-grid"><div class="summary-item"><small>Desembolso imediato</small><strong>${brl(result.immediate)}</strong></div><div class="summary-item"><small>Custo de desgaste</small><strong>${brl(result.wear)}</strong></div><div class="summary-item"><small>Custo total econômico</small><strong>${brl(result.total)}</strong></div><div class="summary-item"><small>Custo por aluno</small><strong>${brl(result.perStudent)}</strong></div></div></div><article class="panel"><h3>Diagnóstico</h3><div class="alert-list"><div class="alert-item ${buy.length?'bad':'ok'}">${buy.length} itens precisam de compra ou complementação de estoque.</div><div class="alert-item">${mob.length} itens reutilizáveis precisam ser mobilizados.</div><div class="alert-item ${pending.length?'bad':'ok'}">${pending.length} itens com necessidade financeira estão sem cotação verificável.</div>${result.location==='externo'&&!result.hasBenches?'<div class="alert-item bad">O local externo não possui bancadas. Inclua painéis/bancadas na mobilização ou locação.</div>':''}</div></article><article class="panel"><h3>Necessidade consolidada</h3>${planTable(result.items)}</article>`}
function planTable(items){return`<div class="table-wrap"><table><thead><tr><th>Material</th><th>Categoria</th><th>Necessário</th><th>Estoque</th><th>Levar</th><th>Comprar</th><th>Desgaste eq.</th><th>Preço</th><th>Custo imediato</th></tr></thead><tbody>${items.map(r=>`<tr><td><b>${esc(r.name)}</b><br><small>${esc(r.practices.join(', '))}</small></td><td>${esc(r.category)}</td><td>${r.needed} ${esc(r.unit)}</td><td>${r.stock}</td><td>${r.mobilize} ${esc(r.unit)}</td><td>${r.buy} ${esc(r.unit)}</td><td>${r.wearQty} ${esc(r.unit)}</td><td>${r.unitPrice?brl(r.unitPrice):'Pendente'}</td><td>${brl(r.immediateCost)}</td></tr>`).join('')}</tbody></table></div>`}

function showPage(name){$$('.page').forEach(p=>p.classList.remove('active'));$('#'+name+'Page').classList.add('active');$$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===name));const t={dashboard:['Dashboard','Visão gerencial da operação'],planner:['Planejar turma','Custo, mobilização e reposição'],practices:['Práticas','Roteiros e recursos por curso'],courses:['Cursos','Matrizes cadastradas'],materials:['Materiais','Catálogo, vida útil e estoque'],prices:['Cotações','Fontes verificáveis'],stock:['Estoque','Movimentações e baixas'],history:['Histórico','Previsto versus realizado'],reports:['Relatórios','PDF e listas operacionais'],settings:['Configurações','Parâmetros e backup']};$('#pageTitle').textContent=t[name][0];$('#pageSubtitle').textContent=t[name][1];$('.sidebar').classList.remove('open')}

function field(n,l,v='',type='text',req=false,extra=''){return`<label>${l}<input name="${n}" type="${type}" value="${esc(v)}" ${req?'required':''} ${type==='number'?'step="0.01"':''} ${extra}></label>`}
function selectField(n,l,opts,val){return`<label>${l}<select name="${n}">${opts.map(o=>typeof o==='string'?`<option ${o===val?'selected':''}>${esc(o)}</option>`:`<option value="${o.value}" ${o.value===val?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`}
function openModal(type,obj={}){const f=$('#modalFields');f.dataset.type=type;f.dataset.id=obj.id||'';$('#modalTitle').textContent={course:'Curso',material:'Material',price:'Cotação',practice:'Prática',link:'Vincular material',execution:'Consumo real'}[type]||'Cadastro';
  if(type==='course')f.innerHTML=field('name','Nome',obj.name,'text',true)+field('modality','Modalidade',obj.modality)+field('hours','Carga horária',obj.hours,'number',true)+field('description','Descrição',obj.description)+field('students','Alunos padrão',obj.students||35,'number');
  if(type==='material')f.innerHTML=field('code','Código',obj.code,'text',true)+field('name','Material',obj.name,'text',true)+selectField('category','Categoria',CATEGORIES,obj.category)+field('unit','Unidade',obj.unit||'un')+field('stock','Estoque atual',obj.stock||0,'number')+field('minStock','Estoque mínimo',obj.minStock||0,'number')+field('lifeClasses','Vida útil pedagógica (turmas)',obj.lifeClasses||0,'number')+field('failurePercent','Falha/desgaste adicional (%)',obj.failurePercent||0,'number')+field('reservePercent','Reserva específica (%)',obj.reservePercent||10,'number')+field('spec','Especificação',obj.spec);
  if(type==='price')f.innerHTML=selectField('materialId','Material',state.materials.map(m=>({value:m.id,label:m.name})),obj.materialId)+field('supplier','Fornecedor',obj.supplier,'text',true)+field('pack','Embalagem',obj.pack,'text',true)+field('packQty','Quantidade na embalagem',obj.packQty||1,'number',true)+field('price','Preço da embalagem',obj.price||0,'number',true)+field('consultedAt','Data da consulta',obj.consultedAt||new Date().toISOString().slice(0,10),'date',true)+field('url','Link da fonte',obj.url,'url',true);
  if(type==='practice')f.innerHTML=selectField('courseId','Curso',state.courses.map(c=>({value:c.id,label:c.name})),obj.courseId)+field('name','Nome da prática',obj.name,'text',true)+field('hours','Carga horária',obj.hours||4,'number')+field('assembliesPerGroup','Montagens por grupo',obj.assembliesPerGroup||1,'number')+selectField('severity','Severidade',['baixa','normal','alta','muito_alta'],obj.severity||'normal');
  if(type==='link'){f.dataset.practiceId=obj.practiceId;f.innerHTML=selectField('materialId','Material',state.materials.map(m=>({value:m.id,label:`${m.code} - ${m.name}`})),obj.materialId)+selectField('mode','Modo de cálculo',CALC_MODES,obj.mode||'por_grupo')+field('quantity','Quantidade base',obj.quantity||1,'number')+field('connections','Conexões por montagem',obj.connections||0,'number')+field('reusePercent','Reaproveitamento (%)',obj.reusePercent||0,'number')+field('lossPercent','Perda (%)',obj.lossPercent||0,'number')+field('notes','Observação',obj.notes||'');}
  if(type==='execution')f.innerHTML=selectField('planId','Planejamento',state.plans.map(p=>({value:p.id,label:`${p.courseName} - ${new Date(p.createdAt).toLocaleDateString('pt-BR')}`})),obj.planId)+field('className','Identificação da turma',obj.className||'Turma 1','text',true)+field('date','Data de encerramento',obj.date||new Date().toISOString().slice(0,10),'date',true)+field('realCost','Custo real total',obj.realCost||0,'number',true)+field('occurrences','Ocorrências, danos e perdas',obj.occurrences||'');
  $('#modal').showModal();}
async function saveModal(e){e.preventDefault();const f=$('#modalFields'),data=Object.fromEntries(new FormData($('#modalForm')).entries()),type=f.dataset.type,idv=f.dataset.id||uid();
  if(type==='course'){const o={id:idv,...data,hours:num(data.hours),students:num(data.students),active:true};upsert(state.courses,o);await persist('courses',o)}
  if(type==='material'){const o={id:idv,...data,stock:num(data.stock),minStock:num(data.minStock),lifeClasses:num(data.lifeClasses),failurePercent:num(data.failurePercent),reservePercent:num(data.reservePercent),active:true};upsert(state.materials,o);await persist('materials',o)}
  if(type==='price'){const o={id:idv,...data,packQty:num(data.packQty),price:num(data.price),unitPrice:num(data.price)/Math.max(1,num(data.packQty)),available:true};upsert(state.prices,o);await persist('prices',o)}
  if(type==='practice'){const o={id:idv,...data,hours:num(data.hours),assembliesPerGroup:num(data.assembliesPerGroup),active:true};upsert(state.practices,o);await persist('practices',o)}
  if(type==='link'){const o={id:idv,practiceId:f.dataset.practiceId,...data,quantity:num(data.quantity),connections:num(data.connections),reusePercent:num(data.reusePercent),lossPercent:num(data.lossPercent)};upsert(state.practiceMaterials,o);await persist('practiceMaterials',o)}
  if(type==='execution'){const p=state.plans.find(x=>x.id===data.planId);const o={id:idv,...data,courseId:p?.courseId,courseName:p?.courseName,plannedCost:num(p?.total),realCost:num(data.realCost)};upsert(state.executions,o);await persist('executions',o)}
  $('#modal').close();renderAll();toast('Registro salvo.');}

async function registerStock(){const mid=$('#stockMaterial').value,qty=num($('#stockQty').value),type=$('#stockType').value,reason=$('#stockReason').value;if(!mid||!qty)return toast('Informe material e quantidade.');const m=state.materials.find(x=>x.id===mid);if(type==='entrada')m.stock+=qty;else if(type==='ajuste')m.stock=qty;else m.stock=Math.max(0,m.stock-qty);const mov={id:uid(),materialId:mid,qty,type,reason,date:now()};state.movements.push(mov);await persist('materials',m);await persist('movements',mov);renderAll();toast('Movimentação registrada.')}
async function savePlan(){if(!currentPlanResult)return toast('Calcule o planejamento primeiro.');const existing={...currentPlanResult,id:currentPlanResult.id||uid(),createdAt:currentPlanResult.createdAt||now()};upsert(state.plans,existing);await persist('plans',existing);renderAll();toast('Planejamento salvo.')}
function generateReport(){const p=state.plans.find(x=>x.id===$('#reportPlan').value);if(!p)return toast('Salve um planejamento primeiro.');const type=$('#reportType').value;let items=p.items;if(type==='purchase')items=items.filter(r=>r.buy>0);if(type==='mobilization')items=items.filter(r=>r.mobilize>0);const title={complete:'Orçamento completo da turma',purchase:'Lista de materiais para compra',mobilization:'Lista de mobilização',return:'Checklist de retorno'}[type];$('#reportOutput').innerHTML=`<div class="report-brand"><img src="assets/logo-senai-hub.webp" alt="SENAI Hub"></div><div class="report-title"><h2>${title}</h2><b>${esc(p.courseName)} — ${p.hours} h</b><p>${p.students} alunos • ${p.groups} grupos • ${p.location==='externo'?'Execução externa':'Execução interna'} • ${esc(p.city||'')}</p></div><div class="report-totals"><div class="report-total">Desembolso imediato<strong>${brl(p.immediate)}</strong></div><div class="report-total">Desgaste<strong>${brl(p.wear)}</strong></div><div class="report-total">Custo total<strong>${brl(p.total)}</strong></div><div class="report-total">Custo/aluno<strong>${brl(p.perStudent)}</strong></div></div><div class="table-wrap"><table><thead><tr><th>Item</th><th>Un.</th><th>Necessário</th><th>Levar</th><th>Comprar</th><th>Retorno/baixa</th><th>Preço</th><th>Total</th></tr></thead><tbody>${items.map(r=>`<tr><td><b>${esc(r.name)}</b><br><small>${esc(r.practices.join(', '))}</small></td><td>${esc(r.unit)}</td><td>${r.needed}</td><td>${r.mobilize}</td><td>${r.buy}</td><td>${type==='return'?'___ devolvido / ___ danificado / ___ consumido':r.wearQty}</td><td>${r.unitPrice?brl(r.unitPrice):'Pendente'}</td><td>${brl(r.immediateCost)}</td></tr>`).join('')}</tbody></table></div><p><small>Itens sem cotação verificável não compõem o total financeiro. Validar disponibilidade, frete e especificações antes da aquisição.</small></p><p style="text-align:right;margin-top:28px"><b>Joelson M. Mendes – Esp. em Energia e IoT</b></p>`;showPage('reports')}
function exportData(){const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`lista-mestre-inteligente-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)}
function importData(file){const r=new FileReader();r.onload=()=>{try{Object.assign(state,JSON.parse(r.result));saveLocal();renderAll();toast('Backup importado.')}catch{toast('Arquivo inválido.')}};r.readAsText(file)}

$('#loginForm').addEventListener('submit',login);$('#demoBtn').onclick=()=>{remote=false;loadLocal();openApp()};$('#logoutBtn').onclick=logout;$('#seedBtn').onclick=seed;$('#printBtn').onclick=()=>{if(!$('#reportsPage').classList.contains('active'))generateReport();setTimeout(()=>print(),120)};$('#menuBtn').onclick=()=>$('.sidebar').classList.toggle('open');
$$('#nav button').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$('#courseSearch').oninput=renderCourses;$('#materialSearch').oninput=renderMaterials;$('#materialCategory').onchange=renderMaterials;$('#priceSearch').oninput=renderPrices;$('#practiceSearch').oninput=renderPractices;$('#practiceCourseFilter').onchange=renderPractices;
$('#newCourseBtn').onclick=()=>openModal('course');$('#newMaterialBtn').onclick=()=>openModal('material');$('#newPriceBtn').onclick=()=>openModal('price');$('#newPracticeBtn').onclick=()=>openModal('practice');$('#newExecutionBtn').onclick=()=>openModal('execution');$('#modalForm').addEventListener('submit',saveModal);
$('#courseGrid').onclick=e=>{const p=e.target.dataset.planCourse,ed=e.target.dataset.editCourse;if(p){$('#plannerCourse').value=p;showPage('planner');currentPlanResult=calculatePlan(plannerInput());renderPlanner(currentPlanResult)}if(ed)openModal('course',state.courses.find(x=>x.id===ed))};
$('#practiceGrid').onclick=e=>{const ed=e.target.dataset.editPractice,ln=e.target.dataset.linkMaterial;if(ed)openModal('practice',state.practices.find(x=>x.id===ed));if(ln)openModal('link',{practiceId:ln})};
$('#materialsBody').onclick=e=>{const ed=e.target.dataset.editMaterial;if(ed)openModal('material',state.materials.find(x=>x.id===ed))};
$('#stockSaveBtn').onclick=registerStock;$('#calculatePlanBtn').onclick=()=>{currentPlanResult=calculatePlan(plannerInput());renderPlanner(currentPlanResult)};$('#savePlanBtn').onclick=savePlan;$('#includeLogistics').onchange=e=>$('#logisticsFields').classList.toggle('hidden',!e.target.checked);$('#plannerStudents').oninput=e=>e.target.dataset.touched='1';
$('#generateReportBtn').onclick=generateReport;
$('#saveSettingsBtn').onclick=async()=>{state.settings={students:num($('#defaultStudents').value),studentsPerGroup:num($('#studentsPerGroup').value),quoteValidity:num($('#quoteValidity').value),waste:num($('#defaultWaste').value),defaultLifeClasses:num($('#defaultLifeClasses').value)};const o={id:'general',standardStudents:state.settings.students,studentsPerGroup:state.settings.studentsPerGroup,quotationValidityDays:state.settings.quoteValidity,reservePercent:state.settings.waste,defaultLifeClasses:state.settings.defaultLifeClasses};if(remote&&currentUser)await persist('settings',o);else saveLocal();renderAll();toast('Configurações salvas.')};
$('#exportBtn').onclick=exportData;$('#importInput').onchange=e=>e.target.files[0]&&importData(e.target.files[0]);$('#clearBtn').onclick=()=>{if(confirm('Apagar toda a base local?')){localStorage.removeItem(LOCAL_KEY);location.reload()}};

loadLocal();renderPlanner(null);initFirebase().then(ok=>{if(!ok)showLogin()});
