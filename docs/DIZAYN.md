# Dizayn tizimi va sahifalar tuzilishi

## 1. Brend

| Token | Qiymat | Qo‘llanilishi |
|---|---|---|
| `--navy` | `#020B24` | Asosiy fon |
| `--navy-2` | `#061638` | Kartalar, panel fonlari |
| `--royal` | `#0B45A0` | Gradientlar, ikkilamchi urg‘u |
| `--gold` | `#FFF000` | Asosiy tugmalar, raqamlar, urg‘u so‘zlar |
| `--cyan` | `#24D8FF` | Mayin yorug‘lik, kristallar, fokus halqasi |
| `--text` | `#EAF0FF` | Asosiy matn |
| `--muted` | `#A9B6D6` | Izohlar |

* Sarlavhalar — **Manrope ExtraBold (800)**, oddiy matn — **Inter (400/500/600)**.
* Fon — chuqur ko‘k gradient, ustida 2–3 ta katta, juda xira radial yorug‘lik (royal va cyan). Neon faqat urg‘u uchun.
* Burchak radiusi: kartalar 20px, tugmalar 999px (kapsula), maydonlar 12px.
* Soyalar: `0 20px 50px -20px rgba(0,0,0,.6)`; sariq tugmada hover paytida sariq yorug‘lik.
* Logotip shakli va nisbati o‘zgartirilmaydi: faqat balandligi beriladi (`height: 44px; width: auto`). Logotip admin panelidan yuklanadi.

## 2. Sahifalar xaritasi

```
/                     Bosh sahifa: Hero (3D) → Kurslar → Nega biz → Natijalar → Ustozlar → Fikrlar → Chaqiruv → Aloqa
/kurslar              Barcha kurslar
/kurslar/:slug        Kurs haqida batafsil + yozilish
/ustozlar             Ustozlar
/natijalar            O‘quvchilar natijalari (faqat admin kiritgan haqiqiy ma’lumotlar)
/biz-haqimizda        Markaz haqida, afzalliklar, fikrlar
/aloqa                Filiallar, xarita, telefon, Telegram, ijtimoiy tarmoqlar, ariza shakli
/admin                Boshqaruv paneli (admin, menejer)
/kabinet              O‘quvchi shaxsiy kabineti
/sitemap.xml, /robots.txt
```

Har bir sahifada: yopishqoq menyu, “Kursga yozilish” modal shakli, pastki qism (footer).

## 3. Komponentlar

* **Tugmalar**: `btn-gold` (asosiy, sariq yorug‘lik + yaltirash), `btn-ghost` (shaffof, chegarali).
* **Kurs kartasi**: 3D belgi (gradientli plitka + oltin belgi), nom, qisqa tavsif, davomiylik, narx, “Batafsil” va “Yozilish”.
* **Bo‘lim sarlavhasi**: kichik yozuv (eyebrow) + katta sarlavha + izoh.
* **Bo‘sh holat**: ma’lumot hali kiritilmagan bo‘limlarda halol xabar (“tez orada joylanadi”) — soxta raqamlar ko‘rsatilmaydi.
* **Ariza shakli**: ism, telefon (+998 niqobi), kurs, qulay vaqt, izoh; xatolar maydon ostida o‘zbek tilida.

## 4. Animatsiyalar

* Hero: Three.js sahnasi — oltin kubok, kitoblar, kristallar; sekin suzish, sichqonchaga yengil parallaks. Ekrandan chiqqanda va tab yashirilganda to‘xtaydi.
* Sarlavhalar va kartalar ko‘rinish maydoniga kirganda yumshoq paydo bo‘ladi (IntersectionObserver).
* Kartalar hover’da 6px ko‘tariladi; sariq tugmalarda yorug‘lik.
* Sahifalararo o‘tish — View Transitions API (JS’siz).
* Telefonda: past piksel zichligi, parallaks yo‘q, hover effektlari o‘chiq. `prefers-reduced-motion` yoqilgan bo‘lsa barcha harakatlar to‘xtatiladi.

## 5. Ruxsat darajalari

| Imkoniyat | Admin | Menejer | O‘quvchi |
|---|:-:|:-:|:-:|
| Arizalar, o‘quvchilar, guruhlar, davomat, to‘lovlar, testlar, vazifalar, materiallar | ✔ | ✔ | — |
| Kurslar, ustozlar, natijalar, fikrlar, filiallar, sayt matnlari | ✔ | — | — |
| Foydalanuvchilarni boshqarish | ✔ | — | — |
| Shaxsiy kabinet (o‘z jadvali, davomati, testlari, vazifalari, to‘lovlari, materiallari) | — | — | ✔ |
