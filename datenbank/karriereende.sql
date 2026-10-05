-- Das Karriereende eines Spielers [§C40 in CLAUDE.md].
--
-- Einmal im Supabase-Dashboard ausführen (SQL Editor). Beide Befehle sind
-- wiederholbar: wer die erste Fassung schon ausgeführt hat, führt die Datei
-- einfach noch einmal aus, und es kommt nur die zweite Spalte dazu.
--
-- retired_at     Der Zeitpunkt des Karriereendes. „Karriere beenden"
--                schreibt ihn, „Karriere fortsetzen" setzt ihn auf NULL.
-- retired_stand  Der Stand des Profils in diesem Moment: Prestige mit
--                Insignium, Rekorde, Rang und Auszeichnungen. Damit sieht
--                das Profil eines Ruheständlers in zwei Jahren aus wie am
--                Tag seines Abschieds, auch wenn die App inzwischen neue
--                Rekorde oder Auszeichnungen kennt. Die App schreibt ihn
--                zusammen mit dem Zeitpunkt und leert ihn bei der Rückkehr.
--                Fehlt die Spalte, rechnet die App den Stand aus den Partien.
--
-- Ohne retired_at meldet der Knopf, dass die Spalte fehlt, und ändert
-- nichts. Bestehende Daten bleiben unberührt: beide Spalten sind für alle
-- Spieler leer.

alter table public.players
  add column if not exists retired_at timestamptz;

alter table public.players
  add column if not exists retired_stand jsonb;
