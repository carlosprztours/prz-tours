module.exports=[2162,t=>{"use strict";var o=t.i(64375);async function e(t,e){let s=await (0,o.query)(`SELECT SUM(guests) AS total FROM bookings
     WHERE tour_id = ? AND booked_for = ? AND status IN ('pending','confirmed')`,t,e);return s[0]?.total??0}t.s(["getBookedGuests",0,e])}];

//# sourceMappingURL=src_lib_db_availability_ts_00cx7hi._.js.map