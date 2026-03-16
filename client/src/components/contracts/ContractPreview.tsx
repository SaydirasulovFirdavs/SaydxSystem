import React from "react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { uz } from "date-fns/locale";

type ContractPreviewProps = {
  contract: any;
  settings: any;
  client?: any;
};

export function ContractPreview({ contract, settings, client }: ContractPreviewProps) {
  const formatDate = (date: any) => {
    if (!date) return "---";
    return format(new Date(date), "dd.MM.yyyy", { locale: uz });
  };

  const amount = Number(contract.amount) || 0;
  const advance = Number(contract.advancePayment) || 0;
  const remaining = Number(contract.remainingAmount) || (amount - advance);

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amt) + " " + (contract.currency || "UZS");
  };

  const splitToList = (text: string) => {
    if (!text) return [];
    return text.split(/[,\n]/).map(item => item.trim()).filter(item => item.length > 0);
  };

  return (
    <div className="flex flex-col gap-12 bg-slate-100 p-8 min-h-screen">
      {/* PAGE 1: SHARTNOMA */}
      <Card className="w-full max-w-4xl mx-auto bg-white p-8 md:p-12 text-slate-900 shadow-2xl rounded-none border-none min-h-[1100px] overflow-visible relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none select-none">
          <div className="text-4xl font-black rotate-45">SAYD.X OFFICIAL</div>
        </div>
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <img src="/LOGO2.png" alt="Logo" className="h-10 object-contain" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tighter mb-2">HAMKORLIK SHARTNOMASI</h1>
          <div className="text-lg font-bold">№ {contract.contractNumber}</div>
        </div>

        <div className="flex justify-between font-bold mb-8">
          <div>Toshkent sh.</div>
          <div>{formatDate(contract.startDate)} y.</div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-justify">
          <p>
            Bir tomondan, <b className="font-extrabold uppercase tracking-tight">"{settings?.companyName || "SAYD.X LLC"}"</b> (keyingi o'rinlarda "Bajaruvchi" deb yuritiladi), o'zining Nizomi asosida ish yurituvchi rahbari {settings?.authorizedName} timsolida, va ikkinchi tomondan <b className="font-extrabold uppercase tracking-tight">"{contract.company || client?.name || 'Mijoz'}"</b> (keyingi o'rinlarda "Buyurtmachi" deb yuritiladi), quyidagilar haqida ushbu shartnomani tuzdilar:
          </p>

          <section>
            <h2 className="font-black text-blue-600 border-b border-blue-100 pb-1 mb-3 uppercase tracking-widest text-xs">1. SHARTNOMA PREDMETI</h2>
            <p>
              1.1. Bajaruvchi Buyurtmachining topshirig'iga binoan quyidagi xizmatlarni ko'rsatish majburiyatini oladi: <b>{contract.description || 'Loyiha ishlab chiqish'}</b>.
            </p>
            <p>
              1.2. Buyurtmachi Bajaruvchi tomonidan ko'rsatilgan xizmatlarni qabul qilish va ushbu shartnomada belgilangan tartibda to'lovni amalga oshirish majburiyatini oladi.
            </p>
          </section>

          <section>
            <h2 className="font-black text-blue-600 border-b border-blue-100 pb-1 mb-3 uppercase tracking-widest text-xs">2. SHARTNOMA SUMMASI VA TO'LOV TARTIBI</h2>
            <p>
              2.1. Ushbu shartnomaning umumiy qiymati <b>{formatAmount(amount)}</b> loyini tashkil etadi.
            </p>
            <p>
              2.2. Buyurtmachi shartnoma imzolangan kundan boshlab 3 bank ish kuni ichida umumiy summaning 50 foizi miqdorida, ya'ni <b>{formatAmount(advance)}</b> miqdorida avans to'lovini amalga oshiradi.
            </p>
            <p>
              2.3. Qolgan 50 foiz to'lov, ya'ni <b>{formatAmount(remaining)}</b> ishlar to'liq topshirilib, qabul qilish-topshirish dalolatnomasi imzolanganidan so'ng 3 bank ish kuni ichida to'lanadi.
            </p>
          </section>
          
          <p className="text-[10px] italic text-slate-400">
            * Batafsil shartlar va ish rejasi ilova qilingan OFFER hujjatida ko'rsatilgan.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-slate-100">
          <div className="space-y-3">
            <h4 className="font-black text-blue-600 uppercase tracking-widest text-[10px]">BAJARUVCHI</h4>
            <div className="text-xs space-y-1 text-slate-600">
              <div className="font-bold text-slate-900">{settings?.companyName}</div>
              <div>Manzil: {settings?.address}</div>
              <div>Tel: {settings?.phone}</div>
              <div>H/r: {settings?.accountNumber}</div>
              {settings?.bankName && <div>Bank: {settings?.bankName}</div>}
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-blue-600 uppercase tracking-widest text-[10px]">BUYURTMACHI</h4>
            <div className="text-xs space-y-1 text-slate-600">
              <div className="font-bold text-slate-900">{contract.company || client?.name}</div>
              {contract.clientAddress && <div>Manzil: {contract.clientAddress}</div>}
              {contract.clientPhone && <div>Tel: {contract.clientPhone}</div>}
              <div>To'lov turi: {contract.paymentType || "O'tkazma"}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end mt-20">
          <div className="relative w-32 h-32 border-[3px] border-double border-blue-900/30 rounded-full flex flex-col items-center justify-center -rotate-12 opacity-80">
              <div className="text-blue-900/40 font-black text-lg tracking-tighter uppercase">SAYD.X</div>
              <div className="text-[8px] font-bold text-blue-900/40 border border-blue-900/20 px-1 uppercase scale-90">SHARTNOMA UCHUN</div>
          </div>
          <div className="text-right">
            <img src="/imzo.PNG" alt="Signature" className="h-12 ml-auto mb-2 mix-blend-multiply" />
            <div className="font-bold text-slate-900">{settings?.authorizedName}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{settings?.authorizedPosition}</div>
          </div>
        </div>
      </Card>

      {/* PAGE 2: OFFER */}
      <Card className="w-full max-w-4xl mx-auto bg-white p-8 md:p-12 text-slate-900 shadow-2xl rounded-none border-none min-h-[1100px] overflow-visible flex flex-col">
        <div className="flex justify-between items-start mb-12">
          <div className="flex flex-col gap-2">
             <img src="/LOGO2.png" alt="Logo" className="h-10 object-contain w-fit" />
             <div className="text-4xl font-black tracking-tighter text-indigo-900">SAYD.X</div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-black text-indigo-500/20 uppercase tracking-tighter mb-2">OFFER</div>
            <div className="text-sm font-bold text-slate-400">Sana: {formatDate(contract.startDate)} y.</div>
          </div>
        </div>

        <div className="mb-10">
          <div className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-2">HURMATLI:</div>
          <div className="text-3xl font-black text-slate-900 uppercase tracking-tight">
            {contract.company || client?.name || "MIJOZ"}
          </div>
        </div>

        <div className="bg-indigo-50 p-6 rounded-2xl border-l-4 border-indigo-500 mb-8 text-sm leading-relaxed text-justify italic">
          Biz, "SAYD.X" jamoasi sizning biznesingizni yangi bosqichga olib chiqish, jarayonlarni avtomatlashtirish va raqamli texnologiyalar imkoniyatlaridan maksimal darajada foydalanishni taklif etamiz. Ushbu hujjat sizga taqdim etilayotgan barcha xizmatlar va hamkorlik shartlarini o'z ichiga oladi.
        </div>

        <div className="grid grid-cols-1 gap-4 mb-10 text-xs">
          {[
            { label: "Korxona nomi", value: contract.company || client?.name },
            { label: "Bizning ish joyi manzilimiz", value: settings?.address || "Toshkent sh." },
            { label: "Shartnoma muddati", value: `${formatDate(contract.startDate)} — ${formatDate(contract.endDate)}` },
            { label: "Ish grafigi", value: contract.workSchedule || "Dushanba - Shanba, 10:00 - 19:00" },
            { label: "To'lov summasi", value: formatAmount(amount) },
            { label: "To'lov tartibi (Oldindan)", value: formatAmount(advance) },
            { label: "Qolgan qismi", value: formatAmount(remaining) },
            { label: "Ta'rif", value: contract.description || "---" },
            { label: "Biriktirilgan menedjer", value: settings?.authorizedName || "---" },
            { label: "Menedjer telfoni", value: contract.managerPhone || settings?.phone || "---" },
            { label: "Ishlar olib borish tartibi", value: (contract.workMethod || "Offline").toUpperCase() },
            { label: "To'lov shartlari", value: (contract.paymentType || "Card").toUpperCase() },
            { label: "Click orqali to'lov uchun", value: contract.clickDetails || "---" },
            { label: "Muammoli holatda bog'lanish", value: contract.issueContact || settings?.phone || "---" },
            { label: "Loyiha boshlangan kun", value: formatDate(contract.startDate) },
            { label: "Loyiha topshirish vaqti", value: formatDate(contract.endDate) },
            { label: "Ketadigan vaqt", value: contract.projectDurationInfo || "---" },
          ].map((item, i) => (
            <div key={i} className="flex border-b border-slate-100 pb-2">
              <div className="w-1/3 font-black text-indigo-900/40 uppercase tracking-tighter">{item.label}:</div>
              <div className="w-2/3 font-bold text-slate-800">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-auto">
          <div>
            <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-indigo-500" /> TAKLIF QILINAYOTGAN XIZMATLAR
            </h4>
            <div className="space-y-2">
              {splitToList(contract.proposedServices || "Sayt yaratish, Bot integratsiyasi").map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-bold text-slate-600">
                  <span className="text-indigo-400">•</span> {s}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-indigo-500" /> XIZMATNING AFZALLIKLARI
            </h4>
            <div className="space-y-2">
              {splitToList(contract.advantages || "Tezkor, Sifatli, 24/7 yordam").map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-4 h-4 rounded border border-indigo-200 bg-indigo-50 flex items-center justify-center text-[10px] text-indigo-500">✓</div> {a}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-indigo-100 flex justify-between items-center">
           <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">SAYD.X PROFESSIONAL SERVICES</div>
           <div className="text-[10px] font-bold text-indigo-400">www.saydx.uz</div>
        </div>
      </Card>
    </div>
  );
}
