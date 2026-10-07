/**
 * Contenido inicial de Perez Tours & Transfers.
 *
 * Única fuente de verdad para el seed de la base de datos.
 * Texto tomado del sitio original (pereztours.cloud), corregido, normalizado
 * y traducido al español.
 *
 * Las imágenes son rutas dentro de /public (ver public/img).
 */

export const settings = {
  site_name: "Perez Tours & Transfers",
  site_tagline: "Unforgettable adventures in Puerto Plata",
  site_description:
    "Tours, excursiones y traslados en Puerto Plata, República Dominicana. Cascadas, ATV, City Tour, Monkey Jungle, dune buggy, esnórquel y Cayo Arena con guías locales certificados.",
  phone_display: "+1 (809) 835-4101",
  whatsapp: "18098354101",
  email: "asistencia@perez-tours.com",
  // Avisos generales (contacto, cambios de estado y copia BCC de constancia de
  // todo lo que sale de la web). Separada por comas; si se borra, quedan solo
  // los de `email`.
  notify_emails: "asistencia@perez-tours.com",
  // Aviso de RESERVA NUEVA (tours y traslados): a esta lista SOLO le llega el
  // mensaje cuando se confirma una reserva, no el resto de correos de la web.
  notify_booking_emails: "pereztoursandtransfer@gmail.com",
  address: "Puerto Plata, República Dominicana",
  hours: "Lun – Sáb · 7:00 AM – 8:00 PM",
  hours_es: "Lun – Sáb · 7:00 AM – 8:00 PM",
  hours_en: "Mon – Sat · 7:00 AM – 8:00 PM",
  currency: "USD",
  instagram: "https://instagram.com/pereztours",
  facebook: "https://facebook.com/pereztours",
  mission:
    "En Perez Tours & Transfers nuestra misión es ofrecer experiencias de transporte y turismo seguras, confiables y personalizadas que muestren la verdadera belleza y cultura de la República Dominicana. Nos dedicamos a prestar un servicio excepcional, con comodidad y hospitalidad, para que cada huésped disfrute de un recorrido fluido, memorable y auténtico de principio a fin.",
};

export const tours = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "damajagua-waterfalls",
    price: 60,
    priceUnit: "person",
    durationMinutes: 480,
    category: "water",
    difficulty: "moderate",
    ageMin: null,
    maxGroup: 20,
    isFeatured: 1,
    cruiseFriendly: 1,
    sortOrder: 1,
    translations: {
      es: {
        title: "Cascadas de Damajagua",
        summary:
          "Desliza, salta y nada por 27 cascadas en plena selva tropical dominicana.",
        description:
          "Prepárate para un día incomparable explorando las famosas Cascadas de Damajagua, uno de los lugares naturales más emocionantes de Puerto Plata. Caminarás por una selva tropical exuberante y descenderás saltando, deslizándote y nadando por cascadas de agua cristalina, siempre acompañado por nuestro equipo local profesional.\n\nLa aventura es perfecta para quienes buscan emoción, naturaleza y una experiencia auténtica. Es apta para familias y grupos, con rutas disponibles para todos los niveles de preparación física.\n\nAl terminar, disfrutas de un delicioso almuerzo típico dominicano y de tiempo libre para relajarte antes de volver. En el camino podrás apreciar vistas montañosas y escenas de la vida rural local. Incluimos transporte de ida y vuelta, equipo de seguridad y guías expertos: solo tienes que traer tu bañador, una toalla y ganas de aventura.",
        seoTitle: "Cascadas de Damajagua en Puerto Plata | Tour desde $60",
        seoDescription:
          "Aventura en las 27 cascadas de Damajagua con guía local, almuerzo, equipo de seguridad y transporte desde tu hotel. Reserva desde $60 por persona.",
      },
      en: {
        title: "Damajagua Waterfalls Adventure",
        summary:
          "Slide, jump and swim through 27 waterfalls in the heart of the Dominican rainforest.",
        description:
          "Get ready for an unforgettable day exploring the famous Waterfalls of Damajagua — one of the most exciting natural attractions in Puerto Plata. You'll hike through lush tropical forest and descend by jumping, sliding and swimming down crystal-clear cascades, guided at every step by our professional local team.\n\nThis adventure is perfect for thrill-seekers, nature lovers and anyone who wants to experience the real Dominican Republic. It suits families and groups, with routes available for every fitness level.\n\nAfter the adventure you'll enjoy a delicious Dominican-style lunch and some free time to relax before heading back. Along the way you'll take in stunning mountain views and scenes of local countryside life. Round-trip transportation, safety equipment and expert guides are all included — all you need to bring is your swimsuit, a towel and an adventurous spirit.",
        seoTitle: "Damajagua Waterfalls Tour in Puerto Plata | From $60",
        seoDescription:
          "Jump, slide and swim through the 27 waterfalls of Damajagua with a certified local guide, lunch, safety gear and hotel pickup. From $60 per person.",
      },
    },
    images: [
      {
        url: "/img/waterfall-hero.png",
        alt: "Cascada principal de Damajagua rodeada de selva tropical",
      },
      {
        url: "/img/waterfall-card.jpg",
        alt: "Piscina natural de agua turquesa en las cascadas",
      },
      {
        url: "/img/waterfall-trail.jpeg",
        alt: "Sendero de tierra entre la vegetación de las cascadas",
      },
    ],
    included: {
      es: [
        "Recogida y regreso en tu hotel o terminal de cruceros",
        "Guía local profesional y certificado",
        "Entrada a las cascadas",
        "Equipo de seguridad",
        "Agua embotellada",
        "Almuerzo típico dominicano",
      ],
      en: [
        "Hotel or cruise-port pickup and drop-off",
        "Professional certified local guide",
        "Waterfall entrance fees",
        "Safety equipment",
        "Bottled water",
        "Dominican-style lunch",
      ],
    },
    excluded: {
      es: ["Propinas", "Bebidas alcohólicas", "Gastos personales"],
      en: ["Tips / gratuities", "Alcoholic beverages", "Personal expenses"],
    },
    bring: {
      es: [
        "Bañador cómodo",
        "Zapatos de agua o zapatillas con buen agarre (obligatorio)",
        "Protector solar y repelente de insectos",
        "Botella de agua extra",
        "Sombrero, lentes de sol y toalla",
        "Efectivo para recuerdos o propinas (opcional)",
      ],
      en: [
        "Comfortable swimwear",
        "Water shoes or sneakers with good grip (mandatory)",
        "Sunscreen and insect repellent",
        "Extra water bottle",
        "Hat, sunglasses and towel",
        "Cash for souvenirs or tips (optional)",
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "atv-adventure",
    price: 60,
    priceUnit: "person",
    durationMinutes: 240,
    category: "adventure",
    difficulty: "easy",
    ageMin: null,
    maxGroup: 20,
    isFeatured: 1,
    cruiseFriendly: 1,
    sortOrder: 2,
    translations: {
      es: {
        title: "Aventura en ATV",
        summary:
          "Conduce tu propio quad por ríos, caminos de tierra y pueblos del campo de Puerto Plata.",
        description:
          "Prepárate para una experiencia cargada de adrenalina mientras exploras por tu cuenta los senderos del campo de Puerto Plata en tu propio quad. Conduce a través de ríos, caminos de tierra y pueblos locales mientras disfrutas de vistas panorámicas y aire fresco.\n\nEste tour es perfecto para quienes buscan diversión, naturaleza y un poco de barro. No se requiere experiencia previa: nuestros guías te darán todas las instrucciones y el equipo de seguridad antes de comenzar.\n\nTermina el día relajándote junto a la piscina, con la opción de comprar fotos y recuerdos de la aventura.",
        seoTitle: "Tour en ATV (Quad) en Puerto Plata | Desde $60",
        seoDescription:
          "Conduce tu propio quad por el campo de Puerto Plata. Guía local, casco y equipo de seguridad incluidos. Desde $60 por persona.",
      },
      en: {
        title: "ATV Adventure Ride",
        summary:
          "Ride your own quad bike through rivers, dirt roads and villages in the Puerto Plata countryside.",
        description:
          "Get ready for an adrenaline-filled experience as you explore Puerto Plata's countryside trails on your own ATV! Ride through rivers, dirt roads and local villages while taking in breathtaking mountain scenery and fresh country air.\n\nThis tour is perfect for adventure lovers looking for fun, nature and a little mud! No experience is required — our guides give you full instructions and safety gear before the ride begins.\n\nFinish the day relaxing by the pool, with the option to purchase photos and souvenirs of your adventure.",
        seoTitle: "ATV Quad Tour in Puerto Plata | From $60",
        seoDescription:
          "Ride your own ATV through the Puerto Plata countryside. Local guide, helmet and safety gear included. From $60 per person, no experience needed.",
      },
    },
    images: [
      { url: "/img/atv-hero.jpg", alt: "Quad ATV estacionado en un camino de tierra" },
      { url: "/img/atv-ride.jpg", alt: "Rider recorriendo un sendero rural en ATV" },
      { url: "/img/about-local.jpg", alt: "Paisaje montanoso del campo dominicano" },
    ],
    included: {
      es: [
        "Recogida y regreso en tu hotel",
        "Guía local profesional",
        "Uso del ATV",
        "Casco y equipo de seguridad",
        "Agua embotellada",
      ],
      en: [
        "Hotel pickup and drop-off",
        "Professional local guide",
        "Use of the ATV",
        "Safety helmet and equipment",
        "Bottled water",
      ],
    },
    excluded: {
      es: [
        "Propinas",
        "Comidas y bebidas",
        "Fotos y recuerdos",
        "Gastos personales",
      ],
      en: [
        "Tips / gratuities",
        "Food and drinks",
        "Photos and souvenirs",
        "Personal expenses",
      ],
    },
    bring: {
      es: [
        "Ropa cómoda que no te importe ensuciar",
        "Zapatos cerrados",
        "Protector solar y lentes de sol",
        "Efectivo para fotos o propinas",
      ],
      en: [
        "Comfortable clothes you don't mind getting dirty",
        "Closed-toe shoes",
        "Sunscreen and sunglasses",
        "Cash for photos or tips",
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "puerto-plata-city-tour",
    price: 40,
    priceUnit: "person",
    durationMinutes: 240,
    category: "culture",
    difficulty: "easy",
    ageMin: null,
    maxGroup: 20,
    isFeatured: 1,
    cruiseFriendly: 1,
    sortOrder: 3,
    translations: {
      es: {
        title: "City Tour de Puerto Plata",
        summary:
          "Fortaleza de San Felipe, Umbrella Street, ron Brugal y el Museo del Ámbar con guía experto.",
        description:
          "Explora la cultura vibrante, la historia fascinante y el encanto inigualable de Puerto Plata de la mano de nuestro guía local experto. Este recorrido te lleva al corazón de una de las ciudades costeras más hermosas de República Dominicana, donde la arquitectura colonial se encuentra con la vida caribeña colorida.\n\nCamina por las calles históricas del centro y descubre lugares icónicos como la Fortaleza de San Felipe, una fortaleza española del siglo XVI que domina el Atlántico, construida para proteger la ciudad de piratas e invasores. Pasea por el Parque Central rodeado de edificios de estilo victoriano, visita la Catedral de San Felipe y disfruta de la cálida hospitalidad de su gente.\n\nLa aventura continúa con la famosa Umbrella Street y Pink Street, dos de los puntos más fotografiados del Caribe. Disfruta de una cata guiada en la fábrica de ron Brugal, donde aprenderás cómo se fabrica uno de los rones más populares del país, y explora el Museo del Ámbar, hogar de fascinantes fósiles ancestrales atrapados en resina dorada.\n\nIdeal para viajeros que quieran conectar con la cultura local, disfrutar de la historia y capturar las fotos más icónicas de Puerto Plata. Ya sea que llegues en un crucero o que te hospedes en la ciudad, este tour promete una mezcla perfecta de aprendizaje, ocio y descubrimiento.",
        seoTitle: "City Tour Puerto Plata con guía | Desde $40",
        seoDescription:
          "Recorre el centro histórico de Puerto Plata: Fortaleza de San Felipe, Umbrella Street, Pink Street, fábrica de ron Brugal y Museo del Ámbar. Desde $40 por persona.",
      },
      en: {
        title: "Puerto Plata City Tour",
        summary:
          "San Felipe Fortress, Umbrella Street, Brugal rum and the Amber Museum with an expert local guide.",
        description:
          "Explore the vibrant culture, fascinating history and breathtaking charm of Puerto Plata with your expert local guide. This city tour takes you through the heart of one of the Dominican Republic's most beautiful coastal towns, where colonial architecture meets colourful Caribbean life.\n\nWalk the historic streets of downtown and discover iconic landmarks such as the San Felipe Fortress, a 16th-century Spanish stronghold overlooking the Atlantic Ocean, built to protect the city from pirates and invaders. Stroll through the lively Central Park surrounded by Victorian-style buildings, visit the Cathedral of San Felipe and experience the warm hospitality of the local people.\n\nYour adventure continues at the famous Umbrella Street and Pink Street — two of the most Instagram-worthy spots in the Caribbean. Enjoy a guided tasting at the Brugal rum factory, where you'll learn how one of the country's most popular rums is made, and explore the Amber Museum, home to fascinating ancient fossils trapped in golden resin. Along the colourful boulevard you'll find plenty of chances to browse handmade crafts, jewellery and local souvenirs.\n\nIdeal for travellers who want to connect with local culture, enjoy history and capture unforgettable photos of the city's most iconic attractions. Whether you're arriving from a cruise ship or staying in town, this tour promises a perfect blend of learning, leisure and discovery.",
        seoTitle: "Puerto Plata City Tour with Guide | From $40",
        seoDescription:
          "Walk historic downtown Puerto Plata: San Felipe Fortress, Umbrella Street, Pink Street, Brugal rum factory and the Amber Museum. From $40 per person.",
      },
    },
    images: [
      { url: "/img/city-card.png", alt: "Calle colorida del centro histórico de Puerto Plata" },
      { url: "/img/city-pinkstreet.jpeg", alt: "Umbrella Street y Pink Street en Puerto Plata" },
      { url: "/img/city-walk.jpeg", alt: "Mural colorido pintado en el centro de Puerto Plata" },
    ],
    included: {
      es: [
        "Recogida y regreso en tu hotel o puerto de cruceros",
        "Guía profesional",
        "Entradas a la fortaleza, la fábrica de ron y el Museo del Ámbar",
        "Cata de ron",
        "Agua embotellada",
      ],
      en: [
        "Hotel or cruise-port pickup and drop-off",
        "Professional guide",
        "Entrance to the fortress, rum factory and Amber Museum",
        "Guided rum tasting",
        "Bottled water",
      ],
    },
    excluded: {
      es: ["Almuerzo", "Propinas", "Compras personales"],
      en: ["Lunch", "Tips / gratuities", "Personal shopping"],
    },
    bring: {
      es: [
        "Sombrero y lentes de sol",
        "Zapatos cómodos para caminar",
        "Cámara o teléfono para fotos",
        "Efectivo para recuerdos",
      ],
      en: [
        "Hat and sunglasses",
        "Comfortable walking shoes",
        "Camera or phone for pictures",
        "Cash for souvenirs",
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "monkey-jungle",
    price: 60,
    priceUnit: "person",
    durationMinutes: 240,
    category: "wildlife",
    difficulty: "easy",
    ageMin: null,
    maxGroup: 20,
    isFeatured: 0,
    cruiseFriendly: 1,
    sortOrder: 4,
    translations: {
      es: {
        title: "Monkey Jungle Adventure",
        summary:
          "Conoce de cerca a los monos ardilla en un santuario ecológico con tirolina incluida.",
        description:
          "Entra en la naturaleza y disfruta del encanto de los residentes más simpáticos de República Dominicana en Monkey Jungle. Ubicado en el exuberante campo cerca de Puerto Plata, este santuario ecológico es hogar de adorables monos ardilla que adoran conocer a los visitantes.\n\nCamina por jardines tropicales mientras decenas de monos juguetones se suben a tus hombros, comen suavemente de tus manos y te llenan de alegría. Es un encuentro mágico y conmovedor para familias, parejas y amantes de los animales de todas las edades.\n\nAprende hechos fascinantes sobre estas criaturas inteligentes de la mano de nuestros guías especializados mientras disfrutas del ambiente tranquilo del santuario. También tendrás la oportunidad de tomar fotos increíbles y observar cómo interactúan libremente los monos en un entorno seguro y protegido. Monkey Jungle apoya a una fundación local que ofrece atención médica y dental gratuita a las comunidades cercanas, así que tu visita no solo trae alegría: también marca una diferencia real.",
        seoTitle: "Monkey Jungle y tirolina en Puerto Plata | Desde $60",
        seoDescription:
          "Visita el santuario de monos ardilla en las afueras de Puerto Plata con entrada, tirolina, guías y transporte. Apoya una fundación local. Desde $60.",
      },
      en: {
        title: "Monkey Jungle Adventure",
        summary:
          "Meet squirrel monkeys up close in an eco-sanctuary, with the zipline included.",
        description:
          "Step into nature and experience the charm of the Dominican Republic's friendliest residents at Monkey Jungle! Set in the lush countryside near Puerto Plata, this eco-sanctuary is home to adorable squirrel monkeys who love meeting visitors.\n\nWalk through beautiful tropical gardens as dozens of playful monkeys climb onto your shoulders, gently eat from your hands and bring endless smiles. It's a magical and heartwarming encounter for families, couples and animal lovers of all ages.\n\nLearn fascinating facts about these intelligent creatures from our knowledgeable guides while enjoying the peaceful surroundings of the sanctuary. You'll also have the chance to take incredible photos and watch how the monkeys interact freely in a safe, protected environment. Monkey Jungle supports a local foundation that provides free medical and dental care to nearby communities — so your visit not only brings joy, it also makes a real difference.",
        seoTitle: "Monkey Jungle & Zipline in Puerto Plata | From $60",
        seoDescription:
          "Visit the squirrel monkey sanctuary outside Puerto Plata. Entry, zipline, guides and transport included. Supports a local foundation. From $60 per person.",
      },
    },
    images: [
      { url: "/img/monkey-card.jpg", alt: "Mono ardilla en el santuario Monkey Jungle" },
      { url: "/img/monkey-sanctuary.webp", alt: "Jardín tropical del santuario de monos" },
      { url: "/img/monkey-zip.jpeg", alt: "Tirolesa dentro del parque de aventura" },
      { url: "/img/monkey-close.jpeg", alt: "Mono ardilla interactuando con un visitante" },
    ],
    included: {
      es: [
        "Transporte ida y vuelta desde tu hotel",
        "Entrada a Monkey Jungle y a la tirolina",
        "Guías profesionales",
        "Equipo de seguridad",
      ],
      en: [
        "Round-trip transportation from your hotel",
        "Entry to Monkey Jungle and the zipline",
        "Professional guides",
        "Safety equipment",
      ],
    },
    excluded: {
      es: [
        "Comidas y bebidas",
        "Fotos o videos (compra opcional)",
        "Gastos personales",
      ],
      en: [
        "Meals and drinks",
        "Photos or videos (optional purchase)",
        "Personal expenses",
      ],
    },
    bring: {
      es: [
        "Ropa cómoda y transpirable",
        "Zapatos cerrados aptos para caminar",
        "Protector solar y repelente de insectos",
        "Mochila pequeña para tus cosas",
        "Efectivo para recuerdos o propinas",
      ],
      en: [
        "Comfortable, breathable clothing",
        "Closed shoes suitable for walking",
        "Sunscreen and insect repellent",
        "Small backpack for essentials",
        "Cash for souvenirs or tips",
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "dune-buggy",
    price: 60,
    priceUnit: "person",
    durationMinutes: 240,
    category: "adventure",
    difficulty: "easy",
    ageMin: null,
    maxGroup: 20,
    isFeatured: 1,
    cruiseFriendly: 1,
    sortOrder: 5,
    translations: {
      es: {
        title: "Dune Buggy",
        summary:
          "Conduce tu propio dune buggy por el barro, los ríos y una playa apartada.",
        description:
          "¡Prepárate para una aventura divertida y llena de barro por el campo de Puerto Plata! La excursión en dune buggy es una de las formas más emocionantes de explorar la belleza natural y la vida local de República Dominicana. Conduce tu propio buggy para dos personas —o viaja como pasajero— mientras recorres caminos todoterreno, atraviesas charcos de barro y pasas por pueblos locales, fincas tropicales y paisajes montañosos. Siente la descarga de adrenalina mientras conduces por ríos, caminos de tierra y vegetación verde.\n\nEn el camino nos detenemos para tomar fotos, conocer a lugareños amigables y visitar una playa hermosa y aislada donde podrás relajarte y disfrutar de la brisa del mar. Nuestros guías profesionales se encargarán de tu seguridad y comodidad mientras nos guían por las mejores rutas panorámicas de la región.\n\nYa seas amante de la adrenalina, vengas en pareja o en familia en busca de diversión, este tour es la combinación perfecta de emoción, naturaleza y cultura dominicana auténtica. Prepárate para ensuciarte, reír mucho y crear recuerdos que quedarán grabados para siempre.",
        seoTitle: "Excursión en Dune Buggy en Puerto Plata | Desde $60",
        seoDescription:
          "Conduce tu propio dune buggy 4x2 por caminos todoterreno, ríos y una playa apartada. Incluye transporte, guía, casco y agua. Desde $60.",
      },
      en: {
        title: "Dune Buggy Excursion",
        summary:
          "Drive your own dune buggy through mud, rivers and a secluded beach in the Dominican countryside.",
        description:
          "Get ready for an exciting and muddy adventure through the stunning countryside of Puerto Plata! The dune buggy excursion is one of the most thrilling ways to explore the Dominican Republic's natural beauty and local life. Drive your own 2-passenger buggy — or ride as a passenger — as you tackle off-road trails, splash through muddy puddles and pass local villages, tropical farms and breathtaking mountain landscapes. Feel the adrenaline rush as you power through rivers, dirt roads and lush green terrain.\n\nAlong the way we'll stop to take photos, meet friendly locals and visit a beautiful secluded beach where you can relax and enjoy the ocean breeze. Our professional guides will ensure your safety and comfort while leading us along the best scenic routes around Puerto Plata.\n\nWhether you're an adventure seeker, a couple or a family looking for fun, this tour is the perfect mix of excitement, nature and authentic Dominican culture. Expect to get dirty, laugh a lot and make memories that last forever.",
        seoTitle: "Dune Buggy Tour in Puerto Plata | From $60",
        seoDescription:
          "Drive your own 4x4 dune buggy over off-road trails and rivers, ending at a secluded beach. Transport, guide, helmet and water included. From $60.",
      },
    },
    images: [
      { url: "/img/buggy-hero.jpeg", alt: "Dune buggy listo para una excursión todoterreno" },
      { url: "/img/buggy-beach.jpg", alt: "Buggy estacionado en la playa al atardecer" },
    ],
    included: {
      es: [
        "Transporte ida y vuelta desde tu hotel o puerto de cruceros",
        "Charla de seguridad e instrucciones de conducción",
        "Guía local profesional",
        "Uso del buggy y del casco",
        "Agua embotellada durante el recorrido",
      ],
      en: [
        "Round-trip transport from your hotel or cruise port",
        "Safety briefing and driving instructions",
        "Professional local guide",
        "Use of the buggy and helmet",
        "Bottled water during the tour",
      ],
    },
    excluded: {
      es: [
        "Comidas y bebidas",
        "Fotos de recuerdo (compra opcional)",
        "Propinas",
        "Pañuelos para el polvo (disponibles para comprar)",
      ],
      en: [
        "Food and drinks",
        "Souvenir photos (available for purchase)",
        "Tips / gratuities",
        "Bandanas for dust (available for purchase)",
      ],
    },
    bring: {
      es: [
        "Ropa cómoda (¡te vas a ensuciar!)",
        "Zapatos cerrados",
        "Protector solar y repelente de insectos",
        "Sombrero, lentes de sol y pañuelo para el polvo",
        "Botella de agua extra",
        "Efectivo para fotos, bebidas o propinas",
      ],
      en: [
        "Comfortable clothes (you will get dirty!)",
        "Closed-toe shoes",
        "Sunscreen and insect repellent",
        "Hat, sunglasses and a bandana for dust",
        "Extra water bottle",
        "Cash for photos, drinks or tips",
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "sosua-snorkeling",
    price: 70,
    priceUnit: "person",
    durationMinutes: 300,
    category: "water",
    difficulty: "easy",
    ageMin: null,
    maxGroup: 20,
    isFeatured: 1,
    cruiseFriendly: 1,
    sortOrder: 6,
    translations: {
      es: {
        title: "Snorkeling en Sosúa",
        summary:
          "Dos arrecifes de coral, aguas calmadas y equipo completo con guía local.",
        description:
          "Sumérgete en las aguas turquesas de la Bahía de Sosúa y explora uno de los ecosistemas marinos más vibrantes de República Dominicana. Esta excursión de esnórquel guiada te lleva a dos de los mejores arrecifes de coral de Sosúa, donde nadarás entre peces tropicales de colores, jardines de coral y aguas cristalinas perfectas para fotos subacuáticas.\n\nYa seas un esnorquelista con experiencia o lo pruebes por primera vez, nuestros guías profesionales te proporcionarán todo el equipo y la asistencia que necesitas para una experiencia segura e inolvidable. Las aguas calmadas y poco profundas de Sosúa la hacen un destino ideal para familias, parejas o viajeros solitarios.\n\nDespués de la sesión de esnórquel, disfruta de tiempo libre para relajarte en la playa de arena dorada, tomar una bebida refrescante o explorar las tiendas y restaurantes locales a lo largo de la bahía. También podrás apreciar las vistas costeras durante el trayecto desde Puerto Plata hasta Sosúa. Esta excursión combina perfectamente aventura, relajación y encanto local. ¡Descubre por qué Sosúa es considerada uno de los mejores destinos de esnórquel del Caribe!",
        seoTitle: "Excursión de Snorkeling en Sosúa | Desde $70",
        seoDescription:
          "Explora dos arrecifes de coral de la Bahía de Sosúa con guía, equipo completo y transporte desde Puerto Plata. Desde $70 por persona.",
      },
      en: {
        title: "Sosúa Snorkeling Adventure",
        summary:
          "Two coral reefs, calm shallow waters and full equipment included with a local guide.",
        description:
          "Dive into the turquoise waters of Sosúa Bay and explore one of the most vibrant marine ecosystems in the Dominican Republic! This guided snorkeling adventure takes you to two of Sosúa's best coral reefs, where you'll swim among colourful tropical fish, coral gardens and crystal-clear waters made for underwater photography.\n\nWhether you're an experienced snorkeler or trying it for the first time, our professional guides provide all the equipment and hands-on assistance you need for a safe and unforgettable experience. Sosúa's calm, shallow waters make it ideal for families, couples or solo travellers.\n\nAfter your session, enjoy free time to relax on the golden-sand beach, grab a refreshing drink, or browse the shops and restaurants along the bay. You'll also take in the coastal views on the drive from Puerto Plata to Sosúa. This excursion perfectly combines adventure, relaxation and local charm — come discover why Sosúa counts as one of the Caribbean's best snorkeling destinations.",
        seoTitle: "Sosúa Snorkeling Excursion | From $70",
        seoDescription:
          "Explore two coral reefs in Sosúa Bay with a local guide, full gear and transport from Puerto Plata. From $70 per person.",
      },
    },
    images: [
      { url: "/img/snorkel-sosua.webp", alt: "Snorkeler en la playa de Sosúa" },
      { url: "/img/snorkel-reef.jpg", alt: "Arrecife de coral de la Bahía de Sosúa" },
      { url: "/img/snorkel-fish.jpg", alt: "Peces tropicales rodeando a un esnorquelista" },
    ],
    included: {
      es: [
        "Transporte ida y vuelta desde tu hotel",
        "Equipo de esnórquel (máscara, aletas y chaleco salvavidas)",
        "Guía profesional",
        "Visita a dos puntos de esnórquel",
        "Agua embotellada",
      ],
      en: [
        "Round-trip transportation",
        "Snorkeling gear (mask, fins and life vest)",
        "Professional guide",
        "Visit to two snorkeling spots",
        "Bottled water",
      ],
    },
    excluded: {
      es: [
        "Comidas y bebidas",
        "Sillas y sombrillas de playa",
        "Gastos personales",
      ],
      en: [
        "Meals and drinks",
        "Beach chairs or umbrellas",
        "Personal expenses",
      ],
    },
    bring: {
      es: [
        "Bañador y toalla",
        "Protector solar y lentes de sol",
        "Cámara acuática (opcional)",
        "Efectivo para comida o recuerdos",
      ],
      en: [
        "Swimsuit and towel",
        "Sunscreen and sunglasses",
        "Waterproof camera (optional)",
        "Cash for food or souvenirs",
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "paradise-island",
    price: 125,
    priceUnit: "person",
    durationMinutes: 540,
    category: "beach",
    difficulty: "easy",
    ageMin: null,
    maxGroup: 20,
    isFeatured: 1,
    cruiseFriendly: 0,
    sortOrder: 7,
    translations: {
      es: {
        title: "Paradise Island (Cayo Arena)",
        summary:
          "Travesía en lancha rápida, esnórquel en Cayo Arena y buffet dominicano junto a Monte Cristi.",
        description:
          "Descubre uno de los tesoros naturales más preciosos de República Dominicana: Paradise Island, también conocida como Cayo Arena. Esta pequeña isla de coral frente a la costa de Punta Rucia es una joya tropical rodeada de aguas turquesas y una vida marina vibrante.\n\nTu aventura comienza con un paseo panorámico por el exuberante campo norteño antes de abordar una lancha rápida para un viaje emocionante por el Caribe. Al acercarte a la isla, las arenas blancas y el agua azul cristalina te dejarán sin palabras: es como entrar en una postal.\n\nPasa el tiempo esnórquelando en arrecifes poco profundos repletos de peces tropicales de colores, guiado por expertos locales. Relájate en la arena suave, nada en aguas cálidas o simplemente disfruta del sol con una bebida fría en la mano. Después de la visita a la isla, continuamos hacia la zona del Parque Nacional de Monte Cristi para un delicioso buffet típico dominicano y tiempo libre para descansar.\n\nEsta excursión de día completo combina relajación, aventura y belleza natural. Con transporte de ida y vuelta, equipo de esnórquel y guías profesionales incluidos, solo tienes que traer tu sentido de la maravilla y la cámara.",
        seoTitle: "Excursión a Paradise Island / Cayo Arena | Desde $125",
        seoDescription:
          "Lanchazo a Cayo Arena, esnórquel en arrecifes poco profundos y buffet dominicano cerca de Monte Cristi. Transporte y equipo incluidos. Desde $125.",
      },
      en: {
        title: "Paradise Island Excursion",
        summary:
          "Speedboat ride to Cayo Arena, shallow-reef snorkeling and a Dominican buffet by Monte Cristi.",
        description:
          "Discover one of the Dominican Republic's most breathtaking natural wonders — Paradise Island, also known as Cayo Arena! This tiny coral island off the coast of Punta Rucia is a true tropical gem surrounded by turquoise water and vibrant marine life.\n\nYour adventure begins with a scenic drive through the lush northern countryside before you board a speedboat for a thrilling ride across the Caribbean. As you approach, the white sand and crystal-clear blue water will leave you speechless — it's like stepping into a postcard.\n\nSpend your time snorkeling in shallow coral reefs teeming with colourful tropical fish, guided by local experts. Relax on the soft sand, swim in the warm water or simply soak up the sun with a cold drink in hand. After the island visit we continue to the Monte Cristi National Park area for a delicious Dominican-style buffet lunch and time to unwind.\n\nThis full-day excursion perfectly combines relaxation, adventure and natural beauty. With round-trip transport, snorkeling gear and professional guides included, all you have to do is bring your sense of wonder and your camera.",
        seoTitle: "Paradise Island & Cayo Arena Excursion | From $125",
        seoDescription:
          "Speedboat to Cayo Arena, shallow-reef snorkeling and a Dominican buffet near Monte Cristi. Transport, gear and guides included. From $125 per person.",
      },
    },
    images: [
      { url: "/img/island-hero.jpg", alt: "Isla coralina de Cayo Arena vista desde el mar" },
      { url: "/img/island-punta-rucia.jpg", alt: "Cayo Arena visto desde Punta Rucia" },
      { url: "/img/island-beach.jpg", alt: "Playa de arena blanca y aguas turquesas" },
    ],
    included: {
      es: [
        "Transporte ida y vuelta desde tu hotel o puerto de cruceros",
        "Paseo en lancha rápida hacia Paradise Island",
        "Guía profesional",
        "Equipo de esnórquel (máscara, aletas y chaleco salvavidas)",
        "Buffet típico dominicano con bebidas",
        "Agua embotellada y refrescos durante la excursión",
      ],
      en: [
        "Round-trip transportation from your hotel or cruise port",
        "Speedboat ride to Paradise Island",
        "Professional guide",
        "Snorkeling gear (mask, fins and life vest)",
        "Dominican buffet lunch with beverages",
        "Bottled water and soft drinks during the excursion",
      ],
    },
    excluded: {
      es: ["Bebidas alcohólicas", "Toallas", "Propinas", "Souvenirs o fotos"],
      en: ["Alcoholic beverages", "Towels", "Tips / gratuities", "Souvenirs or photos"],
    },
    bring: {
      es: [
        "Bañador y toalla",
        "Protector solar y lentes de sol",
        "Sombrero o gorra",
        "Cámara acuática o funda para el teléfono",
        "Ropa cómoda y chanclas para la lancha",
        "Efectivo para recuerdos o propinas",
      ],
      en: [
        "Swimsuit and towel",
        "Sunscreen and sunglasses",
        "Hat or cap for sun protection",
        "Waterproof camera or phone case",
        "Comfortable clothes and flip-flops for the boat",
        "Cash for souvenirs or tips",
      ],
    },
  },
];

export const transferRoutes = [
  {
    originKey: "POP",
    originLabel: "Puerto Plata (POP)",
    originAirport: "Aeropuerto Internacional Gregorio Luperón",
    destination: "Playa Dorada, Iberostar, Marien",
    price15: 35,
    price611: 50,
    priceNote: null,
    sortOrder: 1,
  },
  {
    originKey: "POP",
    originLabel: "Puerto Plata (POP)",
    originAirport: "Aeropuerto Internacional Gregorio Luperón",
    destination: "Cofresí, Lifestyle, Senator, Playa Bachata",
    price15: 50,
    price611: 70,
    priceNote: null,
    sortOrder: 2,
  },
  {
    originKey: "STI",
    originLabel: "Santiago (STI)",
    originAirport: "Aeropuerto Internacional del Cibao",
    destination:
      "Playa Dorada, Iberostar, Marien, Lifestyle, Senator, Playa Bachata",
    price15: 100,
    price611: 130,
    priceNote: null,
    sortOrder: 3,
  },
  {
    originKey: "SDQ",
    originLabel: "Santo Domingo (SDQ)",
    originAirport: "Aeropuerto Internacional Las Américas",
    destination:
      "Playa Bachata, Senator, Playa Dorada, Costa Dorada, City Center",
    price15: 210,
    price611: 250,
    priceNote: null,
    sortOrder: 4,
  },
  {
    originKey: "PUJ",
    originLabel: "Punta Cana (PUJ)",
    originAirport: "Aeropuerto Internacional de Punta Cana",
    destination: "Puerto Plata",
    price15: 400,
    price611: 500,
    priceNote: null,
    sortOrder: 5,
  },
  {
    originKey: "AZS",
    originLabel: "Samaná (AZS)",
    originAirport: "Aeropuerto Internacional El Catey",
    destination: "Puerto Plata",
    price15: 215,
    price611: 240,
    priceNote: null,
    sortOrder: 6,
  },
  {
    originKey: "MOC",
    originLabel: "Moca / Jarabacoa",
    originAirport: null,
    destination: "Puerto Plata",
    price15: 140,
    price611: 160,
    priceNote: "Rango $140–160 (1–5 pax) · $160–180 (6–11 pax)",
    sortOrder: 7,
  },
];

export const testimonials = [
  {
    authorName: "Sarah & Michael",
    authorOrigin: "Estados Unidos",
    rating: 5,
    tourSlug: "damajagua-waterfalls",
    textEs:
      "La excursión de las cascadas fue el mejor día de nuestras vacaciones. Nuestro guía fue increíble con los niños y el almuerzo típico dominicano estaba delicioso. Muy recomendado.",
    textEn:
      "The waterfalls trip was the best day of our vacation. Our guide was amazing with the kids and the Dominican lunch was delicious. Highly recommended.",
  },
  {
    authorName: "Laura M.",
    authorOrigin: "España",
    rating: 5,
    tourSlug: "puerto-plata-city-tour",
    textEs:
      "Hicimos el city tour saliendo del crucero y fue perfecto. Nos mostró todo el centro histórico con muy buenas recomendaciones. El transfer desde el puerto fue puntual.",
    textEn:
      "We did the city tour straight from the cruise ship and it was perfect. He showed us all of the historic centre with great recommendations. The port transfer was punctual.",
  },
  {
    authorName: "James R.",
    authorOrigin: "Reino Unido",
    rating: 5,
    tourSlug: "atv-adventure",
    textEs:
      "El ATV fue súper divertido, te ensucias pero vale la pena. Salimos a las 8:00 a. m. y volvimos sin problemas al hotel. Organización de primera.",
    textEn:
      "The ATV was so much fun — you get dirty but it's worth it. We left at 8am and got back to the hotel with no issues. First-rate organisation.",
  },
  {
    authorName: "Ana & Carlos P.",
    authorOrigin: "Venezuela",
    rating: 5,
    tourSlug: "paradise-island",
    textEs:
      "Cayo Arena es increíble. Todo el día bien organizado: la lancha, el esnórquel y el almuerzo en Monte Cristi. Volveremos sin duda.",
    textEn:
      "Cayo Arena is incredible. The whole day was well organised — the boat, the snorkeling and the lunch at Monte Cristi. We'll definitely come back.",
  },
  {
    authorName: "Kathy T.",
    authorOrigin: "Canadá",
    rating: 5,
    tourSlug: "monkey-jungle",
    textEs:
      "A mis hijos les encantó ver los monos. El personal muy servicial y el lugar bien cuidado. La tirolina incluida es un plus.",
    textEn:
      "My kids loved seeing the monkeys. The staff were very helpful and the place is well looked after. The included zipline is a great bonus.",
  },
  {
    authorName: "Daniel G.",
    authorOrigin: "Argentina",
    rating: 5,
    tourSlug: "dune-buggy",
    textEs:
      "Excelente relación precio-calidad. El buggy es divertido incluso con barro. El guía fue muy paciente con nosotros, que nunca habíamos conducido uno.",
    textEn:
      "Excellent value for money. The buggy is fun even with the mud. The guide was very patient with us — we'd never driven one before.",
  },
];

export const gallery = [
  {
    url: "/img/gallery-1.jpeg",
    alt: "Grupo de viajeros disfrutando de una excursión con Perez Tours",
    caption: "Grupo saliendo del hotel",
  },
  {
    url: "/img/gallery-2.jpeg",
    alt: "Guía local con un grupo de turistas",
    caption: "Nuestro equipo de guías",
  },
  {
    url: "/img/gallery-3.jpeg",
    alt: "Paseo por la costa dominicana",
    caption: "La costa norte",
  },
  {
    url: "/img/gallery-4.jpeg",
    alt: "Vegetación tropical de República Dominicana",
    caption: "Selva dominicana",
  },
  {
    url: "/img/gallery-5.jpeg",
    alt: "Atardecer en Puerto Plata",
    caption: "Atardecer en Puerto Plata",
  },
  {
    url: "/img/buggy-beach.jpg",
    alt: "Dune buggy en la playa",
    caption: "Aventura todoterreno",
  },
  {
    url: "/img/island-beach.jpg",
    alt: "Aguas turquesas de Cayo Arena",
    caption: "Cayo Arena",
  },
  {
    url: "/img/about-quality.jpg",
    alt: "Guía local durante una excursión",
    caption: "Atención personalizada",
  },
];

export const faqs = [
  {
    questionEs: "¿Buscan y devuelven al hotel?",
    answerEs:
      "Sí. Todos nuestros tours y traslados incluyen recogida y regreso en tu hotel, resort o terminal de cruceros de la zona de Puerto Plata. Solo indícanos dónde te hospedas al reservar.",
    questionEn: "Do you pick up and drop off at the hotel?",
    answerEn:
      "Yes. All our tours and transfers include pickup and drop-off at your hotel, resort or cruise terminal in the Puerto Plata area. Just tell us where you're staying when you book.",
    sortOrder: 1,
  },
  {
    questionEs: "¿Cómo confirmo mi reserva?",
    answerEs:
      "Al reservar recibirás un número de referencia y un enlace de WhatsApp. Escríbenos por ahí y te confirmamos en minutos. También puedes consultar el estado cuando quieras en la página Mi reserva.",
    questionEn: "How do I confirm my booking?",
    answerEn:
      "When you book you'll get a reference number and a WhatsApp link. Message us there and we'll confirm within minutes. You can also check the status anytime on the My booking page.",
    sortOrder: 2,
  },
  {
    questionEs: "¿Qué debo llevar a los tours?",
    answerEs:
      "Depende del tour: cada ficha indica qué incluye y qué llevar. En general: bañador, toalla, protector solar, zapatos cómodos y efectivo para recuerdos o propinas. Nosotros ponemos el equipo de seguridad y los guías.",
    questionEn: "What should I bring on the tours?",
    answerEn:
      "It depends on the tour: each page lists what's included and what to bring. Generally: swimwear, towel, sunscreen, comfortable shoes and cash for souvenirs or tips. We provide the safety gear and guides.",
    sortOrder: 3,
  },
  {
    questionEs: "¿Los tours sirven si llego en crucero?",
    answerEs:
      "Sí. Los tours marcados como aptos para cruceros están calculados para volver al puerto con margen. Indícanos tu barco y hora de salida al reservar y lo coordinamos.",
    questionEn: "Do the tours work if I arrive by cruise ship?",
    answerEn:
      "Yes. Tours marked as cruise friendly are timed to get you back to port with margin. Tell us your ship and departure time when you book and we'll coordinate.",
    sortOrder: 4,
  },
  {
    questionEs: "¿Cómo funcionan los traslados?",
    answerEs:
      "Traslados privados puerta a puerta desde cualquier aeropuerto del país. El precio es por trayecto según el tamaño del grupo (1–5 o 6–11 personas). Te esperamos con un cartel con tu nombre.",
    questionEn: "How do transfers work?",
    answerEn:
      "Private door-to-door transfers from any airport in the country. The price is per trip based on group size (1–5 or 6–11 people). We'll be waiting with a sign with your name.",
    sortOrder: 5,
  },
  {
    questionEs: "¿Cómo cancelo o pido el reembolso de mi viaje o tour?",
    answerEs:
      "Puedes cancelar hasta 48 horas antes del evento: abre el menú de WhatsApp, elige «Cancelar reserva», selecciona cuál (o escríbenos tu referencia) y la gestionamos. Pasadas esas 48 horas previas ya no se aceptan cancelaciones ni reembolsos, porque el transporte y los guías están asignados. Si pagaste anticipo, el reembolso vuelve por el mismo medio de pago.",
    questionEn: "How do I cancel or get a refund for my trip or tour?",
    answerEn:
      "You can cancel up to 48 hours before the event: open the WhatsApp menu, choose “Cancel booking”, pick which one (or send us your reference) and we'll handle it. After that 48-hour window we can't accept cancellations or refunds, as transport and guides are already assigned. If you paid a deposit, the refund goes back through the same payment method.",
    sortOrder: 6,
  },
];

export const articles = [
  {
    slug: "que-hacer-puerto-plata",
    coverUrl: "/img/city-card.png",
    sortOrder: 1,
    translations: {
      es: {
        title: "Qué hacer en Puerto Plata: guía de un día perfecto",
        excerpt:
          "Cascadas por la mañana, centro histórico al mediodía y playa al atardecer: así se arma el día ideal en la costa norte.",
        description:
          "Empieza temprano en las Cascadas de Damajagua, cuando el agua está más fresca y hay menos gente. Al mediodía recorre el centro histórico: Fortaleza de San Felipe, Umbrella Street y una cata de ron. Cierra el día en la playa de Sosúa o con un paseo por el malecón.\n\nSi vienes en crucero, el city tour de medio día te devuelve al puerto con margen de sobra. Y si te quedas varios días, reserva Cayo Arena para el mejor día de playa de tu viaje.",
        seoTitle: "Qué hacer en Puerto Plata en 1 día | Guía local",
        seoDescription:
          "Guía local de un día perfecto en Puerto Plata: cascadas, centro histórico y playa, con tiempos y consejos.",
      },
      en: {
        title: "What to do in Puerto Plata: a perfect-day guide",
        excerpt:
          "Waterfalls in the morning, historic downtown at noon, beach at sunset: how to build the ideal day on the north coast.",
        description:
          "Start early at the Damajagua Waterfalls, when the water is freshest and crowds are thinnest. At noon walk the historic center: San Felipe Fortress, Umbrella Street and a rum tasting. End the day at Sosúa beach or strolling the boardwalk.\n\nIf you're arriving by cruise ship, the half-day city tour gets you back to port with plenty of margin. And if you're staying several days, save Cayo Arena for the best beach day of your trip.",
        seoTitle: "What to do in Puerto Plata in 1 day | Local guide",
        seoDescription:
          "Local guide to a perfect day in Puerto Plata: waterfalls, historic center and beach, with timing and tips.",
      },
    },
  },
  {
    slug: "damajagua-consejos",
    coverUrl: "/img/waterfall-hero.png",
    sortOrder: 2,
    translations: {
      es: {
        title: "Damajagua sin estrés: 7 consejos antes de ir",
        excerpt:
          "Zapatos, nivel de agua, qué salto evitar y cómo sale la foto: todo lo que conviene saber antes de las 27 cascadas.",
        description:
          "Primero: los zapatos de agua con buen agarre son obligatorios, no opcionales. Segundo: no necesitas saber nadar como profesional, pero sí sentirte cómodo en el agua; hay rutas para todos los niveles. Tercero: lleva poco encima, todo se moja.\n\nNuestros guías hacen el recorrido todos los días y adaptan la ruta al grupo. Después del descenso te espera un almuerzo típico dominicano que entra de maravilla.",
        seoTitle: "Consejos para las Cascadas de Damajagua | Qué llevar",
        seoDescription:
          "7 consejos prácticos para disfrutar las 27 cascadas de Damajagua: zapatos, niveles, fotos y almuerzo.",
      },
      en: {
        title: "Damajagua stress-free: 7 tips before you go",
        excerpt:
          "Shoes, water levels, which jump to skip and how the photo turns out: everything worth knowing before the 27 waterfalls.",
        description:
          "First: grippy water shoes are mandatory, not optional. Second: you don't need to swim like a pro, but you should feel comfortable in the water; there are routes for every level. Third: carry little with you — everything gets wet.\n\nOur guides run the route every day and adapt it to the group. After the descent, a Dominican lunch hits the spot.",
        seoTitle: "Tips for the Damajagua Waterfalls | What to bring",
        seoDescription:
          "7 practical tips for enjoying the 27 waterfalls of Damajagua: shoes, levels, photos and lunch.",
      },
    },
  },
];
