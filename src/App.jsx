import { useState, useCallback, useRef } from "react";
import * as mammoth from "mammoth";

const C = {
  dark:"#0e1117", darker:"#080b0f", navy:"#141923", card:"#1a2233",
  border:"#242f45", accent:"#2ec4a0", green:"#22c55e",
  text:"#e8edf5", muted:"#7a8aaa", white:"#ffffff",
};

const LANGS = [
  "Русский","Казахский","Английский","Немецкий","Французский","Испанский",
  "Итальянский","Китайский","Японский","Арабский","Португальский",
  "Турецкий","Польский","Нидерландский","Корейский"
];

const STEPS = ["Загрузка","Анализ","Промты готовы"];

const FILE_ICONS = {
  txt:"📄", md:"📄", pdf:"📕", doc:"📘", docx:"📘",
  xls:"📗", xlsx:"📗", csv:"📊", png:"🖼️", jpg:"🖼️",
  jpeg:"🖼️", gif:"🖼️", webp:"🖼️", bmp:"🖼️"
};

function ext(name) { return name.split(".").pop().toLowerCase(); }
function fileIcon(name) { return FILE_ICONS[ext(name)] || "📎"; }

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.slice(0, 200).map(l => {
    const cols = l.split(/[,;\t]+/);
    return cols.length >= 2 ? cols.join(" | ") : l.trim();
  }).join("\n");
}

function toBase64(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = e => res(e.target.result.split(",")[1]);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

function readAsText(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = e => res(e.target.result || "");
    fr.onerror = rej;
    fr.readAsText(file, "UTF-8");
  });
}

async function extractFileContent(file) {
  const e = ext(file.name);
  const isImage = ["png","jpg","jpeg","gif","webp","bmp"].includes(e);
  const isDoc   = ["doc","docx"].includes(e);
  const isPDF   = e === "pdf";
  const isCSV   = ["csv","tsv"].includes(e);
  const isXLS   = ["xls","xlsx"].includes(e);

  if (isImage) {
    const b64 = await toBase64(file);
    return { type:"image", b64, mediaType: file.type || "image/jpeg", name: file.name };
  }
  if (isPDF) {
    const b64 = await toBase64(file);
    return { type:"pdf", b64, name: file.name };
  }
  if (isDoc) {
    const ab = await file.arrayBuffer();
    const r  = await mammoth.extractRawText({ arrayBuffer: ab });
    return { type:"text", content: r.value.substring(0, 6000), name: file.name };
  }
  if (isCSV) {
    const t = await readAsText(file);
    return { type:"text", content: parseCSV(t).substring(0, 4000), name: file.name };
  }
  if (isXLS) {
    // Read as text (basic CSV fallback for xlsx saved as csv)
    const t = await readAsText(file);
    return { type:"text", content: t.substring(0, 4000), name: file.name };
  }
  // txt, md, etc.
  const t = await readAsText(file);
  return { type:"text", content: t.substring(0, 6000), name: file.name };
}

function Stepper({ current }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:36}}>
      {STEPS.map((s, i) => (
        <div key={i} style={{display:"flex",alignItems:"center"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
            <div style={{width:38,height:38,borderRadius:"50%",display:"flex",alignItems:"center",
              justifyContent:"center",
              background: i<current?C.green : i===current?C.accent:"#1e2a3a",
              color: i<=current?C.dark:C.muted,fontWeight:800,fontSize:14,
              boxShadow: i===current?`0 0 0 4px ${C.accent}44`:"none",transition:"all .3s"}}>
              {i<current?"✓":i+1}
            </div>
            <span style={{fontSize:11,marginTop:6,color:i<=current?C.accent:C.muted,
              fontWeight:i===current?700:400,whiteSpace:"nowrap"}}>{s}</span>
          </div>
          {i<STEPS.length-1&&(
            <div style={{width:72,height:2,background:i<current?C.accent:"#1e2a3a",
              margin:"0 8px",marginBottom:18,transition:"all .3s"}}/>
          )}
        </div>
      ))}
    </div>
  );
}

function CopyBtn({ text, label }) {
  const [ok,setOk]=useState(false);
  return (
    <button onClick={()=>{navigator.clipboard.writeText(text);setOk(true);setTimeout(()=>setOk(false),2000)}}
      style={{padding:"6px 16px",borderRadius:8,border:`1px solid ${ok?"#22c55e44":C.border}`,
        background:ok?"#0f2a1a":C.navy,color:ok?C.green:C.muted,
        cursor:"pointer",fontSize:12,fontWeight:700,transition:"all .2s"}}>
      {ok?"✓ Скопировано":(label||"⧉ Копировать")}
    </button>
  );
}

function PromptCard({ title, icon, color, content, badge }) {
  const [open,setOpen]=useState(true);
  return (
    <div style={{border:`1.5px solid ${color}44`,borderRadius:16,overflow:"hidden",marginBottom:24}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",
          background:`${color}15`,cursor:"pointer",borderBottom:`1px solid ${color}33`}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>{icon}</span>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:C.text}}>{title}</div>
            {badge&&<span style={{fontSize:11,background:color,color:C.dark,borderRadius:20,
              padding:"2px 10px",fontWeight:700}}>{badge}</span>}
          </div>
        </div>
        <span style={{fontSize:18,color,transform:open?"rotate(180deg)":"rotate(0deg)",transition:".2s"}}>▾</span>
      </div>
      {open&&(
        <div style={{padding:20,background:C.card}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
            <CopyBtn text={content}/>
          </div>
          <pre style={{whiteSpace:"pre-wrap",fontFamily:"'Segoe UI',sans-serif",fontSize:13,lineHeight:1.85,
            color:"#c8d6e8",background:C.darker,borderRadius:10,padding:18,margin:0,
            maxHeight:440,overflowY:"auto",border:`1px solid ${C.border}`}}>
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

function FileTag({ name, status, onRemove }) {
  const colors = { ready:"#22c55e", loading:C.accent, error:"#ef4444" };
  const col = colors[status] || C.muted;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:6,background:C.navy,
      border:`1px solid ${col}55`,borderRadius:8,padding:"5px 10px",fontSize:12,color:col}}>
      {fileIcon(name)} {name}
      {status==="loading" && <span style={{fontSize:10}}>⏳</span>}
      {status==="error"   && <span style={{fontSize:10}}>⚠</span>}
      {status==="ready"   && <span style={{fontSize:10}}>✓</span>}
      <span onClick={onRemove}
        style={{cursor:"pointer",color:"#ef4444",fontWeight:700,fontSize:14,lineHeight:1,marginLeft:2}}>×</span>
    </span>
  );
}

function GlossFileTag({ name, onRemove }) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:6,background:C.navy,
      border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",fontSize:12,color:C.muted}}>
      {fileIcon(name)} {name}
      <span onClick={onRemove}
        style={{cursor:"pointer",color:"#ef4444",fontWeight:700,fontSize:14,lineHeight:1}}>×</span>
    </span>
  );
}

export default function App() {
  const [step,setStep]         = useState(0);
  const [manualText,setManual] = useState("");
  const [srcFiles,setSrcFiles] = useState([]); // [{name,status,data}]
  const [srcLang,setSrcLang]   = useState("Английский");
  const [tgtLang,setTgtLang]   = useState("Русский");
  const [docType,setDocType]   = useState("auto");
  const [loading,setLoading]   = useState(false);
  const [error,setError]       = useState("");
  const [result,setResult]     = useState(null);
  const [apiKey,setApiKey]     = useState("");
  const [showKey,setShowKey]   = useState(false);
  const [glossText,setGlossText]   = useState("");
  const [glossFiles,setGlossFiles] = useState([]);
  const [glossLinks,setGlossLinks] = useState("");
  const [userComment,setUserComment] = useState("");
  const [dragOver,setDragOver]     = useState(false);
  const [dragGloss,setDragGloss]   = useState(false);
  const srcRef   = useRef();
  const glossRef = useRef();

  const addSrcFiles = async (newFiles) => {
    const arr = Array.from(newFiles);
    const total = srcFiles.length + arr.length;
    if (total > 10) { setError(`Максимум 10 файлов. Сейчас: ${srcFiles.length}, добавляете: ${arr.length}`); return; }
    const placeholders = arr.map(f => ({ name:f.name, status:"loading", data:null }));
    setSrcFiles(prev => [...prev, ...placeholders]);
    for (const f of arr) {
      try {
        const data = await extractFileContent(f);
        setSrcFiles(prev => prev.map(p => p.name===f.name && p.status==="loading"
          ? { name:f.name, status:"ready", data }
          : p
        ));
      } catch(e) {
        setSrcFiles(prev => prev.map(p => p.name===f.name && p.status==="loading"
          ? { name:f.name, status:"error", data:null }
          : p
        ));
      }
    }
  };

  const readGlossFile = f => {
    if (!f) return;
    const name = f.name;
    if (["pdf"].includes(ext(name))) {
      setGlossFiles(g => [...g, { name, content:"[PDF: "+name+"]" }]); return;
    }
    const fr = new FileReader();
    fr.onload = e => {
      let content = e.target.result || "";
      if (["csv","tsv"].includes(ext(name))) content = parseCSV(content);
      setGlossFiles(g => [...g, { name, content: content.substring(0,3000) }]);
    };
    fr.readAsText(f, "UTF-8");
  };

  const onDropSrc = useCallback(e => {
    e.preventDefault(); setDragOver(false);
    addSrcFiles(e.dataTransfer.files);
  }, [srcFiles]);

  const onDropGloss = useCallback(e => {
    e.preventDefault(); setDragGloss(false);
    Array.from(e.dataTransfer.files).forEach(readGlossFile);
  }, []);

  // Build the messages array for the API call
  const buildMessages = () => {
    const readyFiles = srcFiles.filter(f => f.status==="ready");
    const textContent = manualText.trim();
    const contentParts = [];

    // Add text instruction
    const glossaryBlock = [
      glossText.trim() ? "РУЧНОЙ ГЛОССАРИЙ:\n"+glossText : "",
      ...glossFiles.map(g => `ГЛОССАРИЙ (${g.name}):\n${g.content}`),
      glossLinks.trim() ? "ССЫЛКИ НА ИСТОЧНИКИ:\n"+glossLinks : "",
    ].filter(Boolean).join("\n\n---\n\n");

    const instruction = `Проанализируй прикреплённые материалы и создай два профессиональных промта.

ПАРАМЕТРЫ:
- Исходный язык: ${srcLang}
- Целевой язык: ${tgtLang}
- Тип документа: ${docType==="auto"?"определить автоматически":docType}

${textContent ? `ДОПОЛНИТЕЛЬНЫЙ ТЕКСТ:\n"""\n${textContent.substring(0,2000)}\n"""` : ""}
${userComment.trim() ? `\nКОММЕНТАРИИ ПОЛЬЗОВАТЕЛЯ:\n${userComment.trim()}` : ""}
${glossaryBlock ? `\nГЛОССАРИИ И ИСТОЧНИКИ:\n${glossaryBlock}` : ""}

Верни ТОЛЬКО валидный JSON без markdown:
{
  "analysis":{
    "docType":"тип документа",
    "domain":"отрасль",
    "style":"стиль",
    "audience":"аудитория",
    "tone":"тональность",
    "company":"компания если определяется иначе пустая строка",
    "keyTerms":["термин → перевод"],
    "numberFormats":{"dates":"правило","thousands":"разделитель","decimals":"десятичный","currency":"валюта","units":"система мер","time":"формат"},
    "risks":["риск1"]
  },
  "translationPrompt":"подробный промт для переводчика на русском: стиль, тональность, глоссарий, правила форматов для ${tgtLang}, культурная адаптация, что не переводить, предупреждения",
  "reviewPrompt":"подробный промт-чеклист самопроверки на русском: точность, терминология, числа/даты в формате ${tgtLang}, стиль, грамматика, форматирование"
}`;

    // Build content array with images/pdfs + text
    const msgContent = [];

    for (const f of readyFiles) {
      if (f.data.type === "image") {
        msgContent.push({ type:"image", source:{ type:"base64", media_type: f.data.mediaType, data: f.data.b64 }});
      } else if (f.data.type === "pdf") {
        msgContent.push({ type:"document", source:{ type:"base64", media_type:"application/pdf", data: f.data.b64 }});
      } else {
        // prepend text content inline
        msgContent.push({ type:"text", text:`--- ФАЙЛ: ${f.data.name} ---\n${f.data.content}\n` });
      }
    }

    msgContent.push({ type:"text", text: instruction });
    return [{ role:"user", content: msgContent }];
  };

  const buildPrompt = async () => {
    const hasFiles = srcFiles.filter(f=>f.status==="ready").length > 0;
    const hasText  = manualText.trim().length > 0;
    if (!hasFiles && !hasText) { setError("Загрузите файл или введите текст."); return; }
    if (srcLang===tgtLang) { setError("Языки должны различаться."); return; }
    if (!apiKey||apiKey.length<20) { setError("Укажите корректный API-ключ."); return; }
    setError(""); setLoading(true); setStep(1);

    try {
      const messages = buildMessages();
      const res = await fetch("/api/messages", {
        method:"POST",
        headers:{
          "content-type":"application/json",
          "x-api-key": apiKey.trim(),
        },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:4000,
          system:"Ты — эксперт по переводу и лингвистическому анализу. Отвечай строго JSON без markdown.",
          messages
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const raw   = data.content.map(b=>b.text||"").join("");
      const clean = raw.replace(/```json|```/g,"").trim();
      setResult(JSON.parse(clean));
      setStep(2);
    } catch(e) {
      setError("Ошибка: "+e.message);
      setStep(0);
    } finally { setLoading(false); }
  };

  const reset = () => { setStep(0); setResult(null); setManual(""); setSrcFiles([]); setError(""); setUserComment(""); };

  const inp = {
    width:"100%",padding:"10px 14px",borderRadius:10,
    border:`1.5px solid ${C.border}`,fontSize:14,color:C.text,
    background:C.darker,outline:"none",boxSizing:"border-box",fontFamily:"inherit"
  };
  const lbl = {
    fontSize:12,fontWeight:700,color:C.muted,display:"block",
    marginBottom:6,textTransform:"uppercase",letterSpacing:.5
  };
  const card = {
    background:C.card,borderRadius:16,padding:28,
    border:`1px solid ${C.border}`,marginBottom:20
  };

  const readyCount   = srcFiles.filter(f=>f.status==="ready").length;
  const loadingCount = srcFiles.filter(f=>f.status==="loading").length;
  const canSubmit    = (readyCount>0||manualText.trim().length>0) && loadingCount===0;

  return (
    <div style={{minHeight:"100vh",background:C.dark,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text}}>

      {/* HEADER */}
      <div style={{background:C.darker,borderBottom:`1px solid ${C.border}`,padding:"0 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",alignItems:"center",
          justifyContent:"space-between",height:68}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{background:C.accent,borderRadius:10,width:42,height:42,display:"flex",
              alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:16,color:C.dark}}>TW</div>
            <div>
              <div style={{fontWeight:900,fontSize:19,letterSpacing:.5,color:C.white,lineHeight:1}}>
                THE WORDS <span style={{color:C.accent}}>PROMT</span>
              </div>
              <div style={{fontSize:11,color:C.muted}}>AI-система генерации промтов для переводчиков</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <a href="https://thewords.info" target="_blank" rel="noreferrer"
              style={{color:C.muted,fontSize:13,textDecoration:"none",fontWeight:600}}>← thewords.info</a>
            {step>0&&(
              <button onClick={reset}
                style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,
                  padding:"7px 18px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>
                Новый текст
              </button>
            )}
          </div>
        </div>
      </div>

      {/* API KEY BAR */}
      <div style={{background:"#0a1020",borderBottom:`1px solid ${C.border}`,padding:"10px 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:C.muted,fontWeight:700,whiteSpace:"nowrap"}}>🔑 API КЛЮЧ:</span>
          <div style={{position:"relative",flex:1,minWidth:260,maxWidth:480}}>
            <input type={showKey?"text":"password"} value={apiKey} onChange={e=>setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{...inp,padding:"7px 90px 7px 12px",fontSize:13,borderRadius:8,width:"100%"}}/>
            <button onClick={()=>setShowKey(s=>!s)}
              style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:12,fontWeight:700}}>
              {showKey?"Скрыть":"Показать"}
            </button>
          </div>
          <span style={{fontSize:11,color:"#2a3a55"}}>Ключ хранится только в сессии браузера</span>
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"32px 16px"}}>
        <Stepper current={step}/>

        {/* ── STEP 0 ── */}
        {step===0&&(
          <>
            <div style={{textAlign:"center",marginBottom:32}}>
              <h1 style={{fontSize:28,fontWeight:900,margin:"0 0 8px",letterSpacing:-1,color:C.white}}>
                Загрузите текст для <span style={{color:C.accent}}>создания промта</span>
              </h1>
              <p style={{color:C.muted,fontSize:14,margin:0}}>
                Поддерживаются изображения, PDF, Word, Excel, CSV, TXT — до 10 файлов одновременно
              </p>
            </div>

            <div style={card}>
              {/* Lang + doctype */}
              <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:155}}>
                  <label style={lbl}>Язык оригинала</label>
                  <select value={srcLang} onChange={e=>setSrcLang(e.target.value)} style={inp}>
                    {LANGS.map(l=><option key={l}>{l}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",alignItems:"flex-end",paddingBottom:2}}>
                  <button onClick={()=>{const t=srcLang;setSrcLang(tgtLang);setTgtLang(t);}}
                    style={{background:C.navy,border:`1px solid ${C.border}`,borderRadius:8,
                      padding:"10px 14px",cursor:"pointer",fontSize:18,color:C.accent}}>⇄</button>
                </div>
                <div style={{flex:1,minWidth:155}}>
                  <label style={lbl}>Целевой язык</label>
                  <select value={tgtLang} onChange={e=>setTgtLang(e.target.value)} style={inp}>
                    {LANGS.map(l=><option key={l}>{l}</option>)}
                  </select>
                </div>
                <div style={{flex:1,minWidth:200}}>
                  <label style={lbl}>Тип документа</label>
                  <select value={docType} onChange={e=>setDocType(e.target.value)} style={inp}>
                    <option value="auto">Определить автоматически</option>
                    <option value="contract">Контракт / договор</option>
                    <option value="technical">Техническая документация</option>
                    <option value="marketing">Маркетинговые материалы</option>
                    <option value="legal">Юридический документ</option>
                    <option value="medical">Медицинский документ</option>
                    <option value="press">Пресс-релиз / статья</option>
                    <option value="financial">Финансовый отчёт</option>
                    <option value="email">Деловая переписка</option>
                    <option value="instructions">Инструкция / руководство</option>
                  </select>
                </div>
              </div>

              {/* COMMENTS */}
              <div style={{background:C.darker,borderRadius:12,padding:20,border:`1px solid ${C.border}`,marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <span style={{fontSize:18}}>💬</span>
                  <span style={{fontWeight:800,fontSize:14,color:C.accent}}>Комментарии для создания промта</span>
                  <span style={{fontSize:11,color:C.muted,background:C.navy,borderRadius:20,
                    padding:"2px 10px",border:`1px solid ${C.border}`}}>необязательно</span>
                </div>
                <textarea value={userComment} onChange={e=>setUserComment(e.target.value)}
                  placeholder={"Укажите особые пожелания, контекст или уточнения для промта.\nНапример: «Перевод для буклета, целевая аудитория — инвесторы из ОАЭ», «Сохранить формальный стиль», «Не переводить названия брендов»"}
                  style={{...inp,minHeight:90,resize:"vertical",lineHeight:1.7,fontSize:13}}/>
              </div>

              {/* GLOSSARY */}
              <div style={{background:C.darker,borderRadius:12,padding:20,border:`1px solid ${C.border}`,marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <span style={{fontSize:18}}>📚</span>
                  <span style={{fontWeight:800,fontSize:14,color:C.accent}}>Глоссарии и источники</span>
                  <span style={{fontSize:11,color:C.muted,background:C.navy,borderRadius:20,
                    padding:"2px 10px",border:`1px solid ${C.border}`}}>влияет на качество промта</span>
                </div>
                <div onDrop={onDropGloss} onDragOver={e=>{e.preventDefault();setDragGloss(true);}}
                  onDragLeave={()=>setDragGloss(false)} onClick={()=>glossRef.current.click()}
                  style={{border:`2px dashed ${dragGloss?C.accent:C.border}`,borderRadius:10,padding:14,
                    textAlign:"center",cursor:"pointer",background:dragGloss?`${C.accent}0d`:"transparent",
                    transition:"all .2s",marginBottom:12}}>
                  <div style={{fontSize:13,color:dragGloss?C.accent:C.muted}}>
                    📎 Перетащите или <span style={{color:C.accent,fontWeight:700}}>выберите файлы глоссария</span>
                  </div>
                  <div style={{fontSize:11,color:"#3a4a66",marginTop:4}}>.txt · .csv · .pdf</div>
                  <input ref={glossRef} type="file" multiple accept=".txt,.md,.csv,.tsv,.pdf"
                    style={{display:"none"}} onChange={e=>Array.from(e.target.files).forEach(readGlossFile)}/>
                </div>
                {glossFiles.length>0&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                    {glossFiles.map((f,i)=>(
                      <GlossFileTag key={i} name={f.name} onRemove={()=>setGlossFiles(g=>g.filter((_,j)=>j!==i))}/>
                    ))}
                  </div>
                )}
                <div style={{marginBottom:12}}>
                  <label style={lbl}>🔗 Ссылки на онлайн-источники</label>
                  <textarea value={glossLinks} onChange={e=>setGlossLinks(e.target.value)}
                    placeholder={"https://company.com/glossary\nhttps://termbase.org/..."}
                    style={{...inp,minHeight:52,resize:"vertical",fontSize:13}}/>
                </div>
                <div>
                  <label style={lbl}>✍️ Термины вручную (термин → перевод, по одному в строку)</label>
                  <textarea value={glossText} onChange={e=>setGlossText(e.target.value)}
                    placeholder={"Due diligence → Должная осмотрительность\nLetter of Credit → Аккредитив"}
                    style={{...inp,minHeight:76,resize:"vertical",fontSize:13}}/>
                </div>
              </div>

              {/* SOURCE FILES DROP ZONE */}
              <div onDrop={onDropSrc} onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)} onClick={()=>srcRef.current.click()}
                style={{border:`2px dashed ${dragOver?C.accent:C.border}`,borderRadius:12,padding:"24px 16px",
                  textAlign:"center",cursor:"pointer",background:dragOver?`${C.accent}0d`:"transparent",
                  transition:"all .2s",marginBottom:12}}>
                <div style={{fontSize:36,marginBottom:8}}>📂</div>
                <div style={{fontWeight:700,color:dragOver?C.accent:C.muted,fontSize:15,marginBottom:6}}>
                  Перетащите файлы или нажмите для выбора
                </div>
                <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:8,marginBottom:6}}>
                  {["🖼️ Картинки","📕 PDF","📘 Word","📗 Excel","📊 CSV","📄 TXT"].map(f=>(
                    <span key={f} style={{background:C.navy,border:`1px solid ${C.border}`,borderRadius:20,
                      padding:"3px 12px",fontSize:12,color:C.muted}}>{f}</span>
                  ))}
                </div>
                <div style={{fontSize:12,color:"#3a4a66"}}>До 10 файлов · {srcFiles.length}/10 загружено</div>
                <input ref={srcRef} type="file" multiple
                  accept=".txt,.md,.pdf,.doc,.docx,.xls,.xlsx,.csv,.tsv,.png,.jpg,.jpeg,.gif,.webp,.bmp"
                  style={{display:"none"}} onChange={e=>addSrcFiles(e.target.files)}/>
              </div>

              {/* File list */}
              {srcFiles.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
                  {srcFiles.map((f,i)=>(
                    <FileTag key={i} name={f.name} status={f.status}
                      onRemove={()=>setSrcFiles(s=>s.filter((_,j)=>j!==i))}/>
                  ))}
                </div>
              )}

              {/* Manual text */}
              <div style={{marginBottom:4}}>
                <label style={lbl}>✍️ Или вставьте текст вручную</label>
                <textarea value={manualText} onChange={e=>setManual(e.target.value)}
                  placeholder="Вставьте исходный текст сюда..."
                  style={{...inp,minHeight:140,resize:"vertical",lineHeight:1.7}}/>
              </div>

              {/* Stats + submit */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                flexWrap:"wrap",gap:12,marginTop:14}}>
                <div style={{fontSize:13,color:"#3a4a66"}}>
                  {readyCount>0&&`${readyCount} файл(ов) готово`}
                  {loadingCount>0&&` · ⏳ обработка ${loadingCount}...`}
                  {manualText.length>0&&` · ${manualText.length} симв.`}
                </div>
                {error&&<div style={{color:"#ef4444",fontSize:13,fontWeight:700}}>⚠ {error}</div>}
                <button onClick={buildPrompt} disabled={!canSubmit}
                  style={{padding:"13px 32px",borderRadius:12,border:"none",
                    background:canSubmit?`linear-gradient(135deg,${C.accent},#34d8b0)`:"#1a2233",
                    color:canSubmit?C.dark:C.muted,fontWeight:800,fontSize:15,
                    cursor:canSubmit?"pointer":"not-allowed",
                    boxShadow:canSubmit?`0 4px 18px ${C.accent}55`:"none",transition:"all .2s"}}>
                  Создать промты →
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 1 ── */}
        {step===1&&loading&&(
          <div style={{...card,textAlign:"center",padding:56}}>
            <div style={{fontSize:52,marginBottom:20,display:"inline-block",animation:"spin 1.4s linear infinite"}}>⚙️</div>
            <div style={{fontWeight:800,fontSize:20,color:C.accent,marginBottom:16}}>Анализируем материалы...</div>
            {[`Обрабатываем ${srcFiles.filter(f=>f.status==="ready").length} файл(ов)`,
              "Определяем тип документа и отрасль",
              "Формируем глоссарий из ваших источников",
              `Настраиваем числовые форматы для ${tgtLang}`,
              "Генерируем промты для перевода и самопроверки"
            ].map((t,i)=>(
              <div key={i} style={{color:C.muted,fontSize:13,marginBottom:6,
                display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <span style={{color:C.accent,fontSize:10}}>●</span>{t}
              </div>
            ))}
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step===2&&result&&(
          <>
            <div style={card}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                <span style={{fontSize:22}}>🔍</span>
                <h3 style={{margin:0,fontWeight:800,fontSize:18,color:C.white}}>Результаты анализа</h3>
                <span style={{marginLeft:"auto",fontSize:12,color:C.muted,background:C.darker,
                  border:`1px solid ${C.border}`,borderRadius:20,padding:"3px 12px"}}>
                  {srcLang} → {tgtLang}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:10,marginBottom:20}}>
                {[
                  {l:"Тип документа",v:result.analysis.docType,ic:"📄"},
                  {l:"Отрасль",v:result.analysis.domain,ic:"🏢"},
                  {l:"Стиль",v:result.analysis.style,ic:"✍️"},
                  {l:"Аудитория",v:result.analysis.audience,ic:"👥"},
                  {l:"Тональность",v:result.analysis.tone,ic:"🎭"},
                  {l:"Заказчик",v:result.analysis.company||"Не определён",ic:"🏷️"},
                ].map(({l,v,ic})=>(
                  <div key={l} style={{background:C.darker,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:11,color:"#3a4a66",fontWeight:700,marginBottom:4}}>{ic} {l.toUpperCase()}</div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{v}</div>
                  </div>
                ))}
              </div>
              {result.analysis.numberFormats&&(
                <div style={{background:`${C.accent}0d`,borderRadius:10,padding:14,marginBottom:16,border:`1px solid ${C.accent}33`}}>
                  <div style={{fontWeight:800,fontSize:12,color:C.accent,marginBottom:10}}>
                    📊 АДАПТАЦИЯ ФОРМАТОВ → {tgtLang}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {Object.entries(result.analysis.numberFormats).map(([k,v])=>(
                      <span key={k} style={{background:C.darker,border:`1px solid ${C.border}`,
                        borderRadius:8,padding:"4px 12px",fontSize:12,color:C.muted}}>
                        <b style={{color:C.text}}>{k}:</b> {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.analysis.keyTerms?.length>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{fontWeight:800,fontSize:12,color:C.muted,marginBottom:8}}>📚 ГЛОССАРИЙ</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {result.analysis.keyTerms.map((t,i)=>(
                      <span key={i} style={{background:"#0a1f1a",border:"1px solid #1a4a3a",
                        borderRadius:8,padding:"4px 12px",fontSize:12,color:"#2ec4a0",fontFamily:"monospace"}}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.analysis.risks?.length>0&&(
                <div style={{background:"#1a0a00",borderRadius:10,padding:14,border:"1px solid #4a2000"}}>
                  <div style={{fontWeight:800,fontSize:12,color:"#f97316",marginBottom:8}}>⚠️ ПРЕДУПРЕЖДЕНИЯ</div>
                  {result.analysis.risks.map((r,i)=>(
                    <div key={i} style={{fontSize:13,color:"#fb923c",marginBottom:4}}>• {r}</div>
                  ))}
                </div>
              )}
            </div>

            <PromptCard title="Промт для переводчика" icon="📝"
              color={C.accent} badge={`${srcLang} → ${tgtLang}`} content={result.translationPrompt}/>
            <PromptCard title="Промт для самопроверки" icon="✅"
              color={C.green} badge="Редакторский чек-лист" content={result.reviewPrompt}/>

            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginTop:8}}>
              <button onClick={reset}
                style={{padding:"12px 28px",borderRadius:12,border:`1px solid ${C.border}`,
                  background:C.card,color:C.muted,fontWeight:700,fontSize:14,cursor:"pointer"}}>
                ← Новый текст
              </button>
              <CopyBtn label="⧉ Скопировать всё"
                text={`=== АНАЛИЗ ===\nТип: ${result.analysis.docType}\nОтрасль: ${result.analysis.domain}\nЗаказчик: ${result.analysis.company||"—"}\n\n=== ПРОМТ ДЛЯ ПЕРЕВОДЧИКА ===\n${result.translationPrompt}\n\n=== ПРОМТ ДЛЯ САМОПРОВЕРКИ ===\n${result.reviewPrompt}`}/>
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div style={{borderTop:`1px solid ${C.border}`,padding:"20px 32px",marginTop:40,textAlign:"center"}}>
        <span style={{fontSize:12,color:"#2a3a55"}}>© 2012–2025 </span>
        <a href="https://thewords.info" target="_blank" rel="noreferrer"
          style={{fontSize:12,color:C.accent,textDecoration:"none",fontWeight:700}}>The Words</a>
        <span style={{fontSize:12,color:"#2a3a55"}}> · Бюро переводов · Алматы</span>
      </div>
    </div>
  );
}