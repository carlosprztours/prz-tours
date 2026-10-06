module.exports=[26805,a=>{"use strict";var b=a.i(42116);let c="status IN ('pending','confirmed')";async function d(a,d){let e=await (0,b.query)(`SELECT SUM(guests) AS total FROM bookings
     WHERE tour_id = ? AND booked_for = ? AND ${c}`,a,d);return e[0]?.total??0}async function e(a,c){if(!c||!/^\d{4}-\d{2}-\d{2}$/.test(c)||!Number.isInteger(a)||a<=0)return null;let e=await (0,b.query)("SELECT max_group FROM tours WHERE id = ?",a),f=Math.max(1,e[0]?.max_group??20),g=await d(a,c),h=Math.max(0,f-g);return{maxGroup:f,booked:g,remaining:h,low:h<=5}}async function f(a){return/^\d{4}-\d{2}$/.test(a)?(0,b.query)(`SELECT booked_for AS date, SUM(guests) AS guests, COUNT(*) AS bookings
     FROM bookings
     WHERE ${c}
       AND booked_for LIKE ? || '-%'
     GROUP BY booked_for
     ORDER BY booked_for ASC`,a):[]}async function g(a){return/^\d{4}-\d{2}-\d{2}$/.test(a)?(0,b.query)(`SELECT tour_id,
            COALESCE(NULLIF(tour_title, ''), transfer_label, '-') AS tour_title,
            SUM(guests) AS guests,
            COUNT(*) AS bookings
     FROM bookings
     WHERE ${c} AND booked_for = ?
     GROUP BY tour_id, tour_title, transfer_label
     ORDER BY guests DESC`,a):[]}a.s(["getAvailability",0,e,"getBookedGuests",0,d,"getDayBreakdown",0,g,"getMonthOccupancy",0,f])}];

//# sourceMappingURL=src_lib_db_availability_ts_10205a0._.js.map