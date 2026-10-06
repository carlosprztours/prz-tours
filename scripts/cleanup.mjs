/**
 * Limpieza de los datos que crean las pruebas.
 *
 * Las pruebas de extremo a extremo reservan, se registran y mandan mensajes de
 * contacto de verdad, porque para comprobar que la web funciona hay que usar la
 * web. Sin mÃƒÂ¡s, cada ejecuciÃƒÂ³n deja basura en producciÃƒÂ³n.
 *
 * Este mÃƒÂ³dulo apunta a lo que una prueba acaba de crear (por referencia de
 * reserva, correo de usuario, etiqueta de categorÃƒÂ­aÃ¢â‚¬Â¦) y lo borra al terminar.
 *
 * Reglas (no relajar):
 * - **Nunca** `DROP TABLE`, y nunca borrar Ã‚Â«todo lo de la tablaÃ‚Â». Se borra
 *   solo lo que el propio script ha apuntado, con su identificador.
 * - Los hijos antes que los padres, para no dejar filas huÃƒÂ©rfanas.
 * - Si no hay nada apuntado, no se ejecuta ninguna sentencia.
 * - Si la limpieza falla, la prueba sigue contando como correcta: la
 *   verificaciÃƒÂ³n va antes que la limpieza. Avisa por pantalla para poder
 *   borrarlo a mano.
 */
import { execFileSync } from "node:child_process";

/** RaÃƒÂ­z del repositorio, para lanzar wrangler desde el sitio correcto. */
const REPO = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * En Windows los `.cmd` de npm necesitan shell, y Node concatena los
 * argumentos sin escaparlos (DEP0190): el SQL, que lleva comillas y espacios,
 * llega roto. Los entrecomillamos a mano como hace `with-secrets.mjs`.
 */
function preparar(args) {
  if (process.platform !== "win32") return args;
  return args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a));
}

/** Ejecuta una sentencia contra la D1 indicada y devuelve lo que devuelva. */
export function d1(sqlText, { remote }) {
  const flag = remote ? "--remote" : "--local";
  const args = [
    "scripts/with-secrets.mjs",
    "--",
    "npx",
    "wrangler",
    "d1",
    "execute",
    "prz-tours",
    flag,
    "--command",
    sqlText,
    "--json",
  ];
  try {
    const out = execFileSync("node", preparar(args), {
      cwd: REPO,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(out);
  } catch (err) {
    // Se avisa en modo silencioso: el llamador decide si es grave.
    if (process.env.PRZ_DEBUG_D1) {
      console.error("[cleanup] d1 fallo:", String(err.stderr ?? err.message).slice(0, 300));
    }
    return null;
  }
}

/** Escapa un valor para meterlo con seguridad en una sentencia. */
const sql = (v) => `'${String(v).replace(/'/g, "''")}'`;

/**
 * NÃ‚Âº de filas afectadas por una sentencia.
 *
 * Un DELETE no devuelve filas, asÃƒÂ­ que el nÃƒÂºmero va en `meta.changes`. Antes de
 * contar se mira el resultado de la consulta; si no hay `changes` se devuelve
 * `null` en vez de un `0` inventado (un borrado que no se pudo ejecutar y uno
 * que no borrÃƒÂ³ nada deben verse distinto).
 */
function cambios(resultado) {
  const bloque = Array.isArray(resultado) ? resultado[0] : resultado;
  if (!bloque) return null;
  // `wrangler d1 --local` no devuelve `meta`, solo la duraciÃ³n, asÃ­ que contra
  // local no hay forma de saber cuÃ¡ntas filas se han borrado. Se dice que la
  // sentencia se ejecutÃ³, sin inventar un nÃºmero.
  if (typeof bloque.meta?.changes === "number") return bloque.meta.changes;
  if (typeof bloque.changes === "number") return bloque.changes;
  return null;
}

/**
 * Crea un limpiador para un origen concreto.
 *
 *   const limpiar = crearLimpiador("https://perez-tours.com");
 *   limpiar.reserva("PRZ-ABC123");
 *   ...
 *   await limpiar.ejecutar();
 */
export function crearLimpiador(origin) {
  const remote = !/localhost|127\.0\.0\.1/.test(origin);

  const reservas = new Set();
  const usuarios = new Set();
  const mensajes = new Set();
  const categorias = new Set();
  const cupones = new Set();

  return {
    remote,

    /** Referencia de una reserva creada por la prueba (p. ej. `PRZ-ABC123`). */
    reserva(referencia) {
      if (referencia) reservas.add(referencia);
    },

    /** Correo de un usuario creado por la prueba. */
    usuario(correo) {
      if (correo) usuarios.add(correo);
    },

    /** Correo de un mensaje de contacto creado por la prueba. */
    mensaje(correo) {
      if (correo) mensajes.add(correo);
    },

    /** Etiqueta de una categorÃƒÂ­a de tour creada por la prueba. */
    categoria(etiqueta) {
      if (etiqueta) categorias.add(etiqueta);
    },

    /** CÃƒÂ³digo de un cupÃƒÂ³n creado por la prueba. */
    cupon(codigo) {
      if (codigo) cupones.add(codigo);
    },

    /** Lo que se va a borrar, para poder enseÃƒÂ±arlo antes. */
    resumen() {
      return {
        reservas: [...reservas],
        usuarios: [...usuarios],
        mensajes: [...mensajes],
        categorias: [...categorias],
        cupones: [...cupones],
      };
    },

    /**
     * Borra lo apuntado. Devuelve un texto con lo que hizo, para que el
     * script lo imprima.
     */
    ejecutar() {
      const hecho = [];
      const fallado = [];

      // Ã¢â€â‚¬Ã¢â€â‚¬ Reservas Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
      if (reservas.size > 0) {
        const lista = [...reservas].map(sql).join(",");
        // Los hijos primero: eventos y cupones cuelgan de la reserva.
        for (const [tabla, etiqueta] of [
          ["booking_events", "eventos"],
          ["coupons", "cupones de la reserva"],
        ]) {
          const r = d1(
            `DELETE FROM ${tabla} WHERE booking_id IN (SELECT id FROM bookings WHERE reference IN (${lista}));`,
            { remote },
          );
          if (r) hecho.push(`${etiqueta}: ${cambios(r) ?? "hecho"}`);
          else fallado.push(etiqueta);
        }
        const r = d1(`DELETE FROM bookings WHERE reference IN (${lista});`, { remote });
        if (r) hecho.push(`reservas: ${cambios(r) ?? "hecho"}`);
        else fallado.push("reservas");
      }

      // Ã¢â€â‚¬Ã¢â€â‚¬ Cupones sueltos (sin reserva) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
      if (cupones.size > 0) {
        const r = d1(
          `DELETE FROM coupons WHERE code IN (${[...cupones].map(sql).join(",")});`,
          { remote },
        );
        if (r) hecho.push(`cupones: ${cambios(r) ?? "hecho"}`);
        else fallado.push("cupones");
      }

      // Ã¢â€â‚¬Ã¢â€â‚¬ Usuarios Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
      if (usuarios.size > 0) {
        const lista = [...usuarios].map(sql).join(",");
        // Notificaciones, passkeys y suscripciones push cuelgan del usuario.
        for (const tabla of [
          "notifications",
          "webauthn_credentials",
          "push_subscriptions",
        ]) {
          d1(`DELETE FROM ${tabla} WHERE user_id IN (SELECT id FROM users WHERE email IN (${lista}));`, {
            remote,
          });
        }
        const r = d1(`DELETE FROM users WHERE email IN (${lista});`, { remote });
        if (r) hecho.push(`usuarios: ${cambios(r) ?? "hecho"}`);
        else fallado.push("usuarios");
      }

      // Ã¢â€â‚¬Ã¢â€â‚¬ Mensajes de contacto Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
      if (mensajes.size > 0) {
        const lista = [...mensajes].map(sql).join(",");
        const r = d1(`DELETE FROM messages WHERE email IN (${lista});`, { remote });
        if (r) hecho.push(`mensajes: ${cambios(r) ?? "hecho"}`);
        else fallado.push("mensajes");
      }

      // Ã¢â€â‚¬Ã¢â€â‚¬ CategorÃƒÂ­as de tour Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
      if (categorias.size > 0) {
        // La columna se llama `label_es`, no `label`: se usaba `label` y SQLite
        // fallaba con Â«no such columnÂ», asÃ­ que la categorÃ­a no se borraba nunca.
        const lista = [...categorias].map(sql).join(",");
        const r = d1(`DELETE FROM tour_categories WHERE label_es IN (${lista});`, {
          remote,
        });
        if (r) hecho.push(`categorÃƒÂ­as: ${cambios(r) ?? "hecho"}`);
        else fallado.push("categorÃƒÂ­as");
      }

      const destino = remote ? "producciÃƒÂ³n" : "local";
      if (hecho.length > 0) {
        console.log(`\nÃ‚Â· Limpiado en ${destino}: ${hecho.join(", ")}`);
      }
      if (fallado.length > 0) {
        console.log(
          `\nÃ¢Å¡Â  No se pudo limpiar de ${destino}: ${fallado.join(", ")}.\n` +
            `  Se puede borrar a mano con:\n` +
            `  node scripts/with-secrets.mjs -- npx wrangler d1 execute prz-tours ${remote ? "--remote" : "--local"} --command "Ã¢â‚¬Â¦"\n` +
            `  Lo pendiente es: ${JSON.stringify(this.resumen())}`,
        );
      }
      return { hecho, fallado };
    },
  };
}