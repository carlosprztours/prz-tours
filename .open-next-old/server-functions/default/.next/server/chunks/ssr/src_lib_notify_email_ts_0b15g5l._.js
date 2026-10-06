module.exports=[32286,a=>{"use strict";var b=a.i(42116),c=a.i(69227),d=a.i(96835);async function e(a){let[c,d,e]=await Promise.all([(0,b.getEnvVar)("RESEND_API_TOKEN"),(0,b.getEnvVar)("RESEND_FROM"),(0,b.getEnvVar)("NOTIFY_EMAIL")]);if(!c||!d)return console.warn("[email] RESEND_API_TOKEN o RESEND_FROM sin configurar; correo no enviado.",{to:a.to,subject:a.subject}),{sent:!1,skipped:"missing-config"};let h=f(Array.isArray(a.to)?a.to:[a.to]),i=f(Array.isArray(a.bcc)?a.bcc:a.bcc?[a.bcc]:[]);if(!1!==a.copyToInternal){let a=await g(),b=new Set(h.map(a=>a.toLowerCase()));for(let c of a)b.has(c.toLowerCase())||(i.push(c),b.add(c.toLowerCase()))}if(0===h.length)return{sent:!1,skipped:"no-recipients"};let j=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${c}`,"Content-Type":"application/json"},body:JSON.stringify({from:d,to:h,...i.length>0?{bcc:i}:{},subject:a.subject,html:a.html,text:a.text,reply_to:a.replyTo??e??void 0})});if(!j.ok){let a=await j.text().catch(()=>"");return console.error("[email] Resend respondió con error:",j.status,a),{sent:!1,skipped:`resend-${j.status}`}}return{sent:!0,id:(await j.json().catch(()=>({}))).id}}function f(a){return[...new Set(a.map(a=>a.trim()).filter(Boolean))]}async function g(){let[a,b]=await Promise.all([(0,c.getSetting)("notify_emails",""),(0,c.getSetting)("email","")]),d=a.trim()||b.trim();return d?[...new Set(d.split(/[,;\s]+/).map(a=>a.trim()).filter(a=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a)))]:[]}function h(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}a.s(["definitionRow",0,function(a,b){return`<p style="margin:6px 0;font-size:14px;color:#334155;"><strong>${h(a)}:</strong> ${h(b)}</p>`},"emailLayout",0,function(a,b,c="Perez Tours & Transfers"){return`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>${h(a)}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#0e7490;color:#ffffff;padding:20px 24px;">
      <h1 style="margin:0;font-size:20px;">${h(a)}</h1>
      <p style="margin:4px 0 0;font-size:14px;opacity:.9;">${h(c)}</p>
    </div>
    <div style="padding:24px;">${b}</div>
    <div style="padding:16px 24px;background:#f4f6f8;font-size:12px;color:#64748b;">
      Puerto Plata, Rep\xfablica Dominicana \xb7 ${h(d.DEFAULT_PHONE_DISPLAY)}
    </div>
  </div>
</body>
</html>`},"escapeHtml",0,h,"getInternalRecipients",0,g,"sendEmail",0,e])}];

//# sourceMappingURL=src_lib_notify_email_ts_0b15g5l._.js.map