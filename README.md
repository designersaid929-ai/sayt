# O‘quv markazi web-sayti

Premium ko‘k-sariq dizayndagi o‘quv markazi sayti: ommaviy sahifalar (3D hero, kurslar, ustozlar, natijalar, fikrlar, aloqa),
“Kursga yozilish” arizalari, administrator paneli va o‘quvchi shaxsiy kabineti.

Dizayn tizimi va sahifalar xaritasi: [docs/DIZAYN.md](docs/DIZAYN.md).

## Texnologiyalar

| Qism | Texnologiya |
|---|---|
| Server | Node.js 22.13+ (tavsiya: 24 LTS), Express 5 |
| Ma’lumotlar bazasi | SQLite (Node’ning o‘rnatilgan `node:sqlite` moduli, WAL rejimi) — alohida server kerak emas |
| Sahifalar | Serverda tayyorlanadigan HTML (SEO uchun), toza CSS, kichik JS |
| 3D | Three.js, esbuild bilan yig‘ilgan (`public/js/hero3d.js`) |
| Xavfsizlik | scrypt parol xeshi, HttpOnly sessiya cookie, CSP, CSRF himoyasi, so‘rovlar chegarasi |

## Ishga tushirish (kompyuterda)

```bash
npm install
```

```bash
npm run dev
```

Sayt: <http://localhost:3000>, boshqaruv paneli: <http://localhost:3000/admin>, o‘quvchi kabineti: <http://localhost:3000/kabinet>.

Birinchi ishga tushirishda administrator hisobi yaratiladi. `.env` faylida `ADMIN_PASSWORD` berilmagan bo‘lsa, login va
tasodifiy parol `data/BIRINCHI-KIRISH.txt` fayliga yoziladi. Kirgach parolni o‘zgartiring (**Tizim → Parolni o‘zgartirish**) va bu faylni o‘chiring.

Parol unutilsa:

```bash
npm run create-user -- --login admin --password "YangiParol2026" --role admin
```

## Birinchi sozlash (administrator)

1. **Sayt → Sayt matnlari**: telefon, Telegram, ijtimoiy tarmoqlar, manzil va matnlar. BilimZiyo logotipi saytga o‘rnatilgan
   (`public/assets/brand/`: `logo-dark.png` — qorong‘i fon uchun asl, `logo-light.png` — yorug‘ fon uchun yozuvi to‘q ko‘k). Kerak bo‘lsa, boshqa variantlarni shu bo‘limdan yuklash mumkin.
2. **Kurslar**: narx va davomiylikni kiriting (boshlang‘ich kurslarda ular ataylab bo‘sh — saytda “Narx bo‘yicha maslahat oling” yozuvi chiqadi). 3D belgini tanlang.
3. **Ustozlar, Natijalar, O‘quvchilar fikrlari, Filiallar**: faqat haqiqiy ma’lumotlarni kiriting. Bo‘sh bo‘limlarda saytda halol “tez orada” xabari ko‘rinadi.
   Filial xaritasi uchun Google Maps → Ulashish → “Xaritani joylashtirish” iframe kodini to‘liq qo‘ying.
4. **Tizim → Foydalanuvchilar**: menejerlar uchun hisob oching.

## Qorong‘i va yorug‘ rejim

Sayt, boshqaruv paneli va kabinetda rejim almashtirish tugmasi (☀/☾) bor. Birinchi kirishda qurilmaning tizim sozlamasi olinadi,
foydalanuvchi tanlovi brauzerda eslab qolinadi. Ranglar `public/css/site.css` boshidagi tokenlarda (`:root` va `:root[data-theme="light"]`).

## Ruxsat darajalari

| | Administrator | Menejer | O‘quvchi |
|---|:-:|:-:|:-:|
| Arizalar, o‘quvchilar, guruhlar, davomat, to‘lovlar, testlar, uy vazifalari, materiallar | ✔ | ✔ | — |
| Kurslar, ustozlar, natijalar, fikrlar, filiallar, sayt matnlari | ✔ | — | — |
| Xodimlar hisoblari | ✔ | — | — |
| Shaxsiy kabinet: jadval, davomat, testlar, vazifalar, to‘lovlar, materiallar | — | — | ✔ |

O‘quvchiga kabinet ochish: **O‘quvchilar** → o‘quvchini tanlang → **Kabinet ochish** (login va parol beriladi).
Arizani o‘quvchiga aylantirish: **Arizalar** → arizani oching → **O‘quvchiga aylantirish**.

## Serverga joylash (production)

Talab: Linux server (VPS) yoki doimiy diskli hosting, Node.js 22.13+.

```bash
cp .env.example .env
```

`.env` da `SITE_URL` (masalan `https://markaz.uz`), `ADMIN_PASSWORD` va kerak bo‘lsa `PORT` ni to‘ldiring. So‘ng:

```bash
npm ci --omit=dev
```

```bash
npm start
```

Doimiy ishlashi uchun `pm2` yoki `systemd` dan foydalaning:

```bash
npx pm2 start npm --name markaz -- start
```

HTTPS uchun oldiga Nginx yoki Caddy qo‘ying va `.env` da `TRUST_PROXY=1` qiling. Caddy misoli (`/etc/caddy/Caddyfile`):

```
markaz.uz {
    reverse_proxy 127.0.0.1:3000
}
```

Muhim:

* `data/` (baza) va `uploads/` (rasmlar) papkalari **doimiy diskda** bo‘lishi shart. Diski vaqtinchalik bo‘lgan hostinglarda
  (masalan, Vercel, Netlify) bu sayt ishlamaydi; Railway/Render’da “volume/disk” ulab, `DATA_DIR` va `UPLOAD_DIR` ni shu diskka yo‘naltiring.
* Zaxira nusxa: `data/markaz.db` va `uploads/` ni har kuni nusxalang. Bazani ishlab turgan holda xavfsiz nusxalash:
  `sqlite3 data/markaz.db ".backup backup-$(date +%F).db"`.
* Production rejimida (`NODE_ENV=production`) cookie faqat HTTPS orqali yuboriladi — sayt HTTPS’da ochilishi kerak.

## Vercel’da namoyish

Loyiha Vercel’ga ham joylanadi (, ), lekin **faqat namoyish uchun**: Vercel’da doimiy disk yo‘q,
shuning uchun baza va yuklangan rasmlar  da turadi va server “uxlab” qolganda yoki qayta joylanganda o‘chib ketadi.
Admin panelda bu haqda ogohlantirish chiqadi. Kerakli muhit o‘zgaruvchilari:

| O‘zgaruvchi | Qiymat |
|---|---|
|  |  |
|  |  |
| ,  | administrator kirish ma’lumotlari (har ishga tushganda qayta yaratiladi) |
|  |  |
|  |  |
|  |  |
|  | Vercel manzili |

Haqiqiy ish uchun doimiy diskli hostingdan foydalaning (yuqoridagi bo‘lim).

## 3D sahnani o‘zgartirish

Manba: `src/hero3d.js`. O‘zgartirgandan keyin qayta yig‘ing (natija `public/js/hero3d.js` ga yoziladi):

```bash
npm run build
```

Sahna sahifa to‘liq yuklangandan keyin, bo‘sh vaqtda yuklanadi; ekrandan chiqqanda va tab yashirilganda to‘xtaydi; telefonda
sifat pasaytiriladi; `prefers-reduced-motion` yoqilgan bo‘lsa harakatsiz bitta kadr chiziladi. WebGL bo‘lmasa SVG kubok ko‘rinadi.

## Loyiha tuzilishi

```
server/
  index.js          Express ilovasi, xavfsizlik sarlavhalari, marshrutlar
  db.js             SQLite ulanishi va migratsiyalar
  auth.js           Parollar, sessiyalar, rollar, CSRF, so‘rovlar chegarasi
  resources.js      Admin bo‘limlari ta’rifi (maydonlar = tekshiruv + shakllar uchun yagona manba)
  validate.js       Maydonlarni tekshirish (o‘zbekcha xato xabarlari)
  settings.js       Sayt matnlari
  views.js          Ommaviy sahifalar HTML’i
  routes/           pages (sayt), api (ariza, kirish, kabinet), admin (panel API)
  seed.js           Boshlang‘ich kurslar va birinchi administrator
public/
  css/site.css      Sayt dizayni      css/app.css   Panel va kabinet
  js/site.js        Menyu, animatsiyalar, ariza shakli
  js/admin.js       Boshqaruv paneli   js/kabinet.js O‘quvchi kabineti
src/hero3d.js       3D sahna manbasi
```

## Keyingi bosqich uchun g‘oyalar

* Yangi ariza kelganda Telegram botga xabar yuborish.
* Onlayn to‘lov tizimlari (Click, Payme) bilan integratsiya.
* O‘quvchilarga uy vazifasini kabinet orqali topshirish (fayl yuklash).
