

## Muammo tahlili

Admin panelda `withdrawal_referral` sozlamalari `callAdmin` (edge function) orqali saqlanadi. Lekin muammo shundaki:

1. **Checkbox toggle** — `callAdmin` orqali yaxshi ishlaydi, lekin `appSettings` ni local yangilaydi va serverdan qaytgan natijani tekshirmaydi
2. **Edge function** — `update_settings` aslida to'g'ri ishlaydi (upsert + select), lekin Admin frontend javobni ignore qiladi — `then(() => toast.success("Saqlandi"))` bilan tugaydi, serverdan kelgan haqiqiy qiymatni `appSettings` ga qaytarmaydi
3. **Withdraw sahifasi** — `app_settings` dan to'g'ri o'qiydi, lekin agar DB da `withdrawal_referral` key umuman mavjud bo'lmasa, hech narsa yuklanmaydi

## Reja

### 1. Admin panelda `withdrawal_referral` ni to'liq qayta yozish (directDB approach)

`callAdmin` o'rniga `directToggleSetting` ga o'xshash **to'g'ridan-to'g'ri Supabase upsert** ishlatiladi. Har bir o'zgartirish:
- DB ga `upsert` qiladi (key: `withdrawal_referral`, value: `{ enabled, required_count, consume_referrals }`)
- Qaytib o'qiydi (`.select().single()`)
- `appSettings` ni haqiqiy DB qiymati bilan yangilaydi

Barcha 3 ta kontrol (checkbox, input, radio) uchun bitta `saveRefSetting` helper funksiyasi yoziladi:

```ts
const saveRefSetting = async (updates: Partial<{enabled: boolean, required_count: number, consume_referrals: boolean}>) => {
  const current = appSettings.withdrawal_referral || { enabled: false, required_count: 1, consume_referrals: false };
  const newValue = { ...current, ...updates };
  
  const { error } = await supabase.from("app_settings")
    .upsert({ key: "withdrawal_referral", value: newValue, updated_at: new Date().toISOString() }, { onConflict: "key" });
  
  if (error) { toast.error("Xatolik"); return; }
  
  const { data } = await supabase.from("app_settings").select("value").eq("key", "withdrawal_referral").single();
  setAppSettings(prev => ({ ...prev, withdrawal_referral: data?.value || newValue }));
  toast.success("Saqlandi");
};
```

### 2. Withdraw sahifasida `handleWithdraw` da live tekshiruv

`handleWithdraw` ichida pul chiqarishdan oldin `withdrawal_referral` ni ham serverdan yangilab olinadi (xuddi `withdrawal_control` tekshiruviga o'xshash):

```ts
const { data: liveRef } = await supabase.from("app_settings").select("value").eq("key", "withdrawal_referral").single();
const liveRefVal = liveRef?.value as any;
if (liveRefVal?.enabled && referralCount < (liveRefVal?.required_count || 0)) {
  toast.error("Referal yetarli emas");
  return;
}
```

### 3. Default qiymatlar

Agar DB da `withdrawal_referral` key mavjud bo'lmasa, default holat: `{ enabled: false, required_count: 1, consume_referrals: false }` ishlatiladi — ya'ni o'chirilgan holda boshlanadi.

### O'zgartirilgan fayllar:
- `src/pages/Admin.tsx` — referral sozlamalar bo'limini to'liq qayta yozish (direct DB)
- `src/pages/Withdraw.tsx` — handleWithdraw ichida live referral tekshiruv qo'shish

