-- Reparaciones editoriales revisadas. Solo se aplican al contenido auditado.
UPDATE tour_translations SET title = 'Cascadas de Damajagua con almuerzo'
WHERE tour_id = 10 AND locale = 'es' AND EXISTS (SELECT 1 FROM tours WHERE id = 10 AND slug = 'damajagua-waterfalls' AND is_published = 1) AND title = 'Damajagua waterfalls with Lunch';

UPDATE tour_translations SET title = 'Tour privado por Puerto Plata: ron, chocolate, historia y cultura',
  description = '¡Explora lo mejor de Puerto Plata con un guía local!

Visita Umbrella Street, Pink Street, el Parque Central y la histórica catedral. Disfruta de degustaciones de ron y chocolate dominicanos, conoce el arte de elaborar cigarros y visita las conocidas fábricas de ámbar y larimar.

Descubre la cultura, la historia, los sabores y la belleza de República Dominicana con un servicio personalizado y oportunidades para tomar fotos inolvidables.

Reserva tu recorrido y conoce el auténtico Puerto Plata.',
  seo_title = 'Tour privado por la ciudad de Puerto Plata',
  seo_description = 'Explora el centro histórico de Puerto Plata: Fortaleza de San Felipe, Umbrella Street, Pink Street, una fábrica de ron y el Museo del Ámbar.'
WHERE tour_id = 12 AND locale = 'es' AND EXISTS (SELECT 1 FROM tours WHERE id = 12 AND slug = 'puerto-plata-city-tour' AND is_published = 1) AND title = 'Puerto Plata Private City Tour: Rum, Chocolate, History & Culture'
  AND description = 'Explore the best of Puerto Plata with a local guide!' || char(13,10) || '' || char(13,10) || ' Visit the famous Umbrella Street, Pink Street, Central Park, and the historic Cathedral. Enjoy Dominican rum and chocolate tastings, discover the art of cigar making, and visit the famous amber and larimar factories.' || char(13,10) || '' || char(13,10) || 'Experience the culture, history, flavors, and beauty of the Dominican Republic with personalized service and unforgettable photo opportunities.' || char(13,10) || '' || char(13,10) || ' Book your City Tour today and discover the real Puerto Plata!'
  AND seo_title = 'Puerto Plata Private city tour |  $40' AND seo_description = 'Explore Puerto Plata''s historic center: San Felipe Fortress, Umbrella Street, Pink Street, a rum factory, the Amber Museum, and more. 40 us per persone';

UPDATE tour_translations SET title = 'Aventura en Monkey Jungle',
  summary = 'Conoce de cerca a los monos ardilla en el santuario ecológico de Monkey Jungle.'
WHERE tour_id = 13 AND locale = 'es' AND EXISTS (SELECT 1 FROM tours WHERE id = 13 AND slug = 'monkey-jungle-puertoplata' AND is_published = 1) AND title = 'Monkey Jungle Adventure' AND summary = '';

INSERT INTO tour_translations (tour_id, locale, title, summary, description, seo_title, seo_description)
SELECT tour_id, 'es', 'Paseo a caballo por la playa y el campo de Puerto Plata',
  'Recorre a caballo la playa de Bergantín y el campo de Puerto Plata.',
  'Disfruta de un paseo a caballo por la playa de Bergantín y continúa por el campo. Admira los paisajes tropicales y aprovecha para tomar fotos. Hay un bar frente a la playa.

Una experiencia para parejas, familias y grupos de amigos.',
  'Paseo a caballo por la playa de Bergantín en Puerto Plata',
  'Cabalgata por la playa de Bergantín y el campo de Puerto Plata, entre paisajes tropicales y vistas al mar.'
FROM tour_translations WHERE tour_id = 17 AND locale = 'en' AND EXISTS (SELECT 1 FROM tours WHERE id = 17 AND slug = 'horseback-puerto-plata' AND is_published = 1)
  AND title = 'Beach,countryside Horseback Riding Adventure in Puerto Plata' AND description = 'Horseback Riding Adventure' || char(13,10) || '' || char(13,10) || 'Enjoy an unforgettable horseback ride along the stunning Bergantín Beach before heading through the lush countryside. Admire the tropical landscapes, capture incredible photos. They have a beachfront bar.' || char(13,10) || '' || char(13,10) || 'Perfect for couples, families, and friends.'
  AND NOT EXISTS (SELECT 1 FROM tour_translations WHERE tour_id = 17 AND locale = 'es');

UPDATE tour_translations SET summary = CASE WHEN trim(summary) = '' THEN 'Ride along Bergantín Beach and through the Puerto Plata countryside.' ELSE summary END,
  seo_description = CASE WHEN NULLIF(trim(seo_description), '') IS NULL
    THEN 'Ride a horse along Bergantín Beach and through the tropical countryside of Puerto Plata.' ELSE seo_description END
WHERE tour_id = 17 AND locale = 'en' AND EXISTS (SELECT 1 FROM tours WHERE id = 17 AND slug = 'horseback-puerto-plata' AND is_published = 1) AND description = 'Horseback Riding Adventure' || char(13,10) || '' || char(13,10) || 'Enjoy an unforgettable horseback ride along the stunning Bergantín Beach before heading through the lush countryside. Admire the tropical landscapes, capture incredible photos. They have a beachfront bar.' || char(13,10) || '' || char(13,10) || 'Perfect for couples, families, and friends.';
