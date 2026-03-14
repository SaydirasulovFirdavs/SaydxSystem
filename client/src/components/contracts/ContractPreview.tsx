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

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white p-8 md:p-12 text-slate-900 shadow-2xl rounded-none border-none min-h-[1100px] overflow-visible">
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

        <section>
          <h2 className="font-black text-blue-600 border-b border-blue-100 pb-1 mb-3 uppercase tracking-widest text-xs">3. TOMONLARNING MAJBURIYATLARI</h2>
          <p>
            3.1. Bajaruvchi xizmatlarni sifatli va belgilangan muddatlarda (<b>{formatDate(contract.endDate)}</b> gacha) bajarishi shart.
          </p>
          <p>
            3.2. Buyurtmachi Bajaruvchiga xizmat ko'rsatish uchun zarur bo'lgan barcha ma'lumotlarni o'z vaqtida taqdim etishi shart.
          </p>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-slate-100">
        <div className="space-y-3">
          <h4 className="font-black text-blue-600 uppercase tracking-widest text-[10px]">BAJARUVCHI</h4>
          <div className="text-xs space-y-1 text-slate-600">
            <div className="font-bold text-slate-900">{settings?.companyName}</div>
            <div>Manzil: {settings?.address}</div>
            <div>Tel: {settings?.phone}</div>
            <div>H/r: {settings?.accountNumber}</div>
            <div>Bank: {settings?.bankName}</div>
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="font-black text-blue-600 uppercase tracking-widest text-[10px]">BUYURTMACHI</h4>
          <div className="text-xs space-y-1 text-slate-600">
            <div className="font-bold text-slate-900">{contract.company || client?.name}</div>
            <div>Mijoz: {client?.name}</div>
            <div>To'lov turi: {contract.paymentType || "O'tkazma"}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end mt-20">
        <div className="relative w-32 h-32 border-[3px] border-double border-blue-900/30 rounded-full flex flex-col items-center justify-center -rotate-12 opacity-80">
            <div className="text-blue-900/40 font-black text-lg tracking-tighter">SAYD.X</div>
            <div className="text-[8px] font-bold text-blue-900/40 border border-blue-900/20 px-1 uppercase scale-90">SHARTNOMA UCHUN</div>
        </div>
        <div className="text-right">
          <img src="/imzo.PNG" alt="Signature" className="h-12 ml-auto mb-2 mix-blend-multiply" />
          <div className="font-bold text-slate-900">{settings?.authorizedName}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{settings?.authorizedPosition}</div>
        </div>
      </div>
    </Card>
  );
}
