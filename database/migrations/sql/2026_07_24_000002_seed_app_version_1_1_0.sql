-- PlanTim verzija 1.1.0 — changelog i aktivna verzija
UPDATE app_versions SET is_active = 0, is_latest = 0 WHERE version = '1.0.0';

INSERT INTO app_versions (version, version_name, changelog, release_notes, is_active, is_latest, released_at, created_at, updated_at)
SELECT
  '1.1.0',
  'UI i moduli',
  JSON_ARRAY(
    'Hijerarhijski prikaz dozvola modula i podmodula u administraciji',
    'Animirane kartice Planika podmodula umjesto statičnih brojeva',
    'Brisanje kredita u Planika Finansije modulu',
    'Automatski backup baze i projekta s internim schedulerom',
    'Podmoduli u meniju (Planika → Finansije → Krediti)',
    'Informativni prozor verzije s animiranim changelogom'
  ),
  'Nova verzija donosi poboljšanja administracije, Planika modula, backupa i prikaz informacija o verziji aplikacije.',
  1,
  1,
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM app_versions WHERE version = '1.1.0');

UPDATE app_versions
SET
  version_name = 'UI i moduli',
  changelog = JSON_ARRAY(
    'Hijerarhijski prikaz dozvola modula i podmodula u administraciji',
    'Animirane kartice Planika podmodula umjesto statičnih brojeva',
    'Brisanje kredita u Planika Finansije modulu',
    'Automatski backup baze i projekta s internim schedulerom',
    'Podmoduli u meniju (Planika → Finansije → Krediti)',
    'Informativni prozor verzije s animiranim changelogom'
  ),
  release_notes = 'Nova verzija donosi poboljšanja administracije, Planika modula, backupa i prikaz informacija o verziji aplikacije.',
  is_active = 1,
  is_latest = 1,
  released_at = COALESCE(released_at, NOW()),
  updated_at = NOW()
WHERE version = '1.1.0';
