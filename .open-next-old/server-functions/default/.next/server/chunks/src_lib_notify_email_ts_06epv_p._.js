module.exports=[3886,e=>{"use strict";var t=e.i(64375);async function a(e,r=""){let i=await (0,t.queryOne)("SELECT value FROM settings WHERE key = ?",e);return i?.value??r}async function r(e){let[a,r,o]=await Promise.all([(0,t.getEnvVar)("RESEND_API_TOKEN"),(0,t.getEnvVar)("RESEND_FROM"),(0,t.getEnvVar)("NOTIFY_EMAIL")]);if(!a||!r)return console.warn("[email] RESEND_API_TOKEN o RESEND_FROM sin configurar; correo no enviado.",{to:e.to,subject:e.subject}),{sent:!1,skipped:"missing-config"};let s=i(Array.isArray(e.to)?e.to:[e.to]),l=i(Array.isArray(e.bcc)?e.bcc:e.bcc?[e.bcc]:[]);if(!1!==e.copyToInternal){let e=await n(),t=new Set(s.map(e=>e.toLowerCase()));for(let a of e)t.has(a.toLowerCase())||(l.push(a),t.add(a.toLowerCase()))}if(0===s.length)return{sent:!1,skipped:"no-recipients"};let c=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json"},body:JSON.stringify({from:r,to:s,...l.length>0?{bcc:l}:{},subject:e.subject,html:e.html,text:e.text,reply_to:e.replyTo??o??void 0})});if(!c.ok){let e=await c.text().catch(()=>"");return console.error("[email] Resend respondió con error:",c.status,e),{sent:!1,skipped:`resend-${c.status}`}}return{sent:!0,id:(await c.json().catch(()=>({}))).id}}function i(e){return[...new Set(e.map(e=>e.trim()).filter(Boolean))]}async function n(){let[e,t]=await Promise.all([a("notify_emails",""),a("email","")]),r=e.trim()||t.trim();return r?[...new Set(r.split(/[,;\s]+/).map(e=>e.trim()).filter(e=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)))]:[]}function o(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}e.s(["emailLayout",0,function(e,t,a="Perez Tours & Transfers"){return`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>${o(e)}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#0e7490;color:#ffffff;padding:20px 24px;">
      <h1 style="margin:0;font-size:20px;">${o(e)}</h1>
      <p style="margin:4px 0 0;font-size:14px;opacity:.9;">${o(a)}</p>
    </div>
    <div style="padding:24px;">${t}</div>
    <div style="padding:16px 24px;background:#f4f6f8;font-size:12px;color:#64748b;">
      Puerto Plata, Rep\xfablica Dominicana \xb7 ${o("+1 (809) 835-4101")}
    </div>
  </div>
</body>
</html>`},"sendEmail",0,r],3886)}];

//# sourceMappingURL=src_lib_notify_email_ts_06epv_p._.js.map