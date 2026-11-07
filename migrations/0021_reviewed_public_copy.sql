-- Correcciones editoriales verificadas. Las imágenes y tarifas permanecen intactas.

INSERT INTO content_translation_cache (source_hash, translated_text, status)
SELECT '163e37d51a45e605968fc096ffb7e606587df9d5710fa27e17b3ac4aecf20e9b', 'Private airport transfers in Puerto Plata, Dominican Republic', 'translated'
WHERE EXISTS (SELECT 1 FROM gallery_images WHERE id = 69 AND alt = 'Private Airport Transfers in Puerto Plata, Dominican Republic')
ON CONFLICT (source_hash) DO NOTHING;

UPDATE gallery_images SET alt = 'Traslados privados al aeropuerto en Puerto Plata, República Dominicana'
WHERE id = 69 AND alt = 'Private Airport Transfers in Puerto Plata, Dominican Republic';

INSERT INTO content_translation_cache (source_hash, translated_text, status)
SELECT '39ff747c54c53ef6d3ad759d5b0fb940101fedb34e3bd7a8b2211801ff613f5e', 'Air conditioning and comfort', 'translated'
WHERE EXISTS (SELECT 1 FROM gallery_images WHERE id = 71 AND alt = 'Good air conditioner and confort')
ON CONFLICT (source_hash) DO NOTHING;

UPDATE gallery_images SET alt = 'Aire acondicionado y comodidad'
WHERE id = 71 AND alt = 'Good air conditioner and confort';

UPDATE tour_translations
SET seo_title = 'Cascadas de Damajagua en Puerto Plata',
    seo_description = 'Aventura en las 27 cascadas de Damajagua con guía local, almuerzo, equipo de seguridad y transporte desde tu hotel.'
WHERE tour_id = (SELECT id FROM tours WHERE slug = 'damajagua-waterfalls')
  AND locale = 'es'
  AND seo_title = 'Cascadas de Damajagua en Puerto Plata | Tour desde $60'
  AND seo_description = 'Aventura en las 27 cascadas de Damajagua con guía local, almuerzo, equipo de seguridad y transporte desde tu hotel. Reserva desde $60 por persona.';

UPDATE tour_translations
SET seo_title = 'Damajagua Waterfalls Tour in Puerto Plata',
    seo_description = 'Jump, slide and swim through the 27 waterfalls of Damajagua with a certified local guide, lunch, safety gear and hotel pickup.'
WHERE tour_id = (SELECT id FROM tours WHERE slug = 'damajagua-waterfalls')
  AND locale = 'en'
  AND seo_title = 'Damajagua Waterfalls Tour in Puerto Plata | From $60'
  AND seo_description = 'Jump, slide and swim through the 27 waterfalls of Damajagua with a certified local guide, lunch, safety gear and hotel pickup. From $60 per person.';

UPDATE tour_translations
SET seo_title = 'Excursión en Dune Buggy en Puerto Plata',
    seo_description = 'Conduce tu propio dune buggy por caminos todoterreno, ríos y una playa apartada. Incluye transporte, guía, casco y agua.'
WHERE tour_id = (SELECT id FROM tours WHERE slug = 'dune-buggy')
  AND locale = 'es'
  AND seo_title = 'Excursión en Dune Buggy en Puerto Plata | Desde $60'
  AND seo_description = 'Conduce tu propio dune buggy 4x2 por caminos todoterreno, ríos y una playa apartada. Incluye transporte, guía, casco y agua. Desde $60.';

UPDATE tour_translations
SET seo_title = 'Dune Buggy Tour in Puerto Plata',
    seo_description = 'Drive your own dune buggy over off-road trails and rivers, ending at a secluded beach. Transport, guide, helmet and water included.'
WHERE tour_id = (SELECT id FROM tours WHERE slug = 'dune-buggy')
  AND locale = 'en'
  AND seo_title = 'Dune Buggy Tour in Puerto Plata | From $60'
  AND seo_description = 'Drive your own 4x4 dune buggy over off-road trails and rivers, ending at a secluded beach. Transport, guide, helmet and water included. From $60.';
