-- Das Karriereende eines Spielers [§C40 in CLAUDE.md].
--
-- Einmal im Supabase-Dashboard ausführen (SQL Editor). Die App schreibt
-- danach beim Knopf „Karriere beenden" den Zeitpunkt in diese Spalte und
-- beim Knopf „Karriere fortsetzen" wieder NULL. Mehr wird nicht gespeichert:
-- Profil, Insignium und Rekorde zum Zeitpunkt des Karriereendes rechnet die
-- App aus den Partien bis dorthin.
--
-- Ohne diese Spalte meldet der Knopf, dass sie fehlt, und ändert nichts.
-- Bestehende Daten bleiben unberührt: die Spalte ist für alle Spieler leer.

alter table public.players
  add column if not exists retired_at timestamptz;
