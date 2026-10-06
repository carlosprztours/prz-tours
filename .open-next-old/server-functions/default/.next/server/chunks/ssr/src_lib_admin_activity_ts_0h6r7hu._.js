module.exports=[15446,a=>{"use strict";var b=a.i(42116);async function c(a,c,d,e){await (0,b.execute)(`INSERT INTO activity_log (user_id, actor, action, detail)
     VALUES (?, ?, ?, ?)`,d??null,e??"staff",a,c??null).catch(a=>console.error("[activity] log error:",a))}async function d(a=100){return(0,b.query)(`SELECT a.id, a.user_id, a.actor, a.action, a.detail, a.created_at,
            u.email AS actor_email
     FROM activity_log a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.id DESC
     LIMIT ?`,Math.min(Math.max(a,1),200))}a.s(["listActivity",0,d,"logActivity",0,c])}];

//# sourceMappingURL=src_lib_admin_activity_ts_0h6r7hu._.js.map