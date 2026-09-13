# Brigados MVP

Testinė PWA 3–4 žmonių brigadai. Next.js + Supabase.

## Kas jau veikia
- Email/password Auth
- Bendri objektai per Supabase DB
- Testinis objektas „Plungė“
- Darbo taškų kūrimas/sąrašas
- Pastaba, GPS, Google Maps nuoroda
- Nuotrauka į privatų Supabase Storage bucket
- Darbo taško redagavimas
- Audit/pakeitimų istorija
- RLS duomenims ir Storage
- PWA manifestas + service worker
- Realtime darbo taškų atnaujinimas

## Paleidimas
1. Sukurk Supabase projektą.
2. SQL Editor paleisk `supabase/schema.sql`.
3. Authentication > Users rankiniu būdu sukurk 3–4 testinius naudotojus su slaptažodžiais.
4. `supabase/add-test-users.sql` pakeisk testiniais el. paštais ir paleisk.
5. Supabase projekto Connect lange pasiimk Project URL ir Publishable key.
6. Nukopijuok `.env.example` į `.env.local` ir įrašyk reikšmes.
7. Terminale: `npm install` ir `npm run dev`.
8. Telefone testavimui reikia HTTPS. Paprasčiausia deploy'inti į Vercel ir ten pridėti tas pačias Environment Variables.

## Pastaba
Push ir CSV sąmoningai neįgyvendinti šiame MVP.
