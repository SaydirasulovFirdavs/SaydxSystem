import React, { Fragment } from "react";
import { format } from "date-fns";
import type { InvoiceSettingsType, PaymentDetailLine } from "./InvoiceSettingsForm";

type InvoicePreviewProps = {
    language: "uz" | "en" | "ru";
    invoiceNumber: string;
    status: "paid" | "pending" | "unpaid";
    dueDate: string;
    currency: string;
    clientName: string;
    company: string;
    billToContact: string;
    projectName: string;
    contractPartner?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    invoiceRows: any[];
    totalFromRows: number;
    settings: InvoiceSettingsType;
};

export function InvoicePreview({
    language,
    invoiceNumber,
    status,
    dueDate,
    currency,
    clientName,
    company,
    billToContact,
    projectName,
    contractPartner,
    contractStartDate,
    contractEndDate,
    invoiceRows,
    totalFromRows,
    settings,
}: InvoicePreviewProps) {
    const t = (key: string) => {
        const T: Record<string, Record<string, string>> = {
            officialInvoice: { uz: "RASMIY HISOB-FAKTURA", en: "OFFICIAL INVOICE", ru: "ОФИЦИАЛЬНЫЙ СЧЁТ" },
            issueDate: { uz: "Sana", en: "Issue Date", ru: "Дата" },
            dueDateLabel: { uz: "Muddat", en: "Due Date", ru: "Срок" },
            statusPaid: { uz: "To'langan", en: "Paid", ru: "Оплачено" },
            statusUnpaid: { uz: "To'lanmadi", en: "Unpaid", ru: "Не оплачено" },
            statusPending: { uz: "Kutilmoqda", en: "Pending", ru: "Ожидает оплаты" },
            from: { uz: "Bajaruvchi", en: "From / Contractor", ru: "От / Исполнитель" },
            billTo: { uz: "Buyurtmachi", en: "Bill To / Client", ru: "Кому / Заказчик" },
            project: { uz: "Loyiha", en: "Project", ru: "Проект" },
            serviceDesc: { uz: "XIZMAT TA'RIFI", en: "SERVICE DESCRIPTION", ru: "ОПИСАНИЕ УУСЛУГИ" },
            start: { uz: "Boshlanish", en: "Start", ru: "Начало" },
            days: { uz: "Kun", en: "Days", ru: "Дней" },
            end: { uz: "Tugash", en: "End", ru: "Окон." },
            price: { uz: "Narxi (Summa)", en: "Price (Amount)", ru: "Цена (Сумма)" },
            paymentDetails: { uz: "To'lov Rekvizitlari", en: "Payment Details", ru: "Реквизиты оплаты" },
            totalServices: { uz: "Jami xizmatlar", en: "Total Services", ru: "Всего услуг" },
            grandTotal: { uz: "Jami To'lov", en: "Grand Total", ru: "Итоговая сумма" },
            noServices: { uz: "Xizmatlar qo'shilganda ko'rinadi...", en: "Services appear here...", ru: "Услуги появятся здесь..." },
            contractDetails: { uz: "Shartnoma ma'lumotlari", en: "Contract Details", ru: "Данные договора" },
            contractParty: { uz: "Shartnoma tomoni", en: "Contracting Party", ru: "Сторона договора" },
            city: { uz: "Toshkent", en: "Tashkent", ru: "Ташкент" },
        };
        return T[key]?.[language] || key;
    };

    const invoiceNum = invoiceNumber || "INV-001";
    const dateFormatted = format(new Date(), "dd.MM.yyyy");
    const dueDateFormatted = dueDate ? format(new Date(dueDate), "dd.MM.yyyy") : "---";

    return (
        <div className="invoice-preview bg-white text-slate-900 shadow-xl w-full max-w-[750px] border border-slate-200 h-fit mb-12" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Premium Header */}
            <div className="bg-[#0f172a] text-white p-10 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-4 z-10">
                    <img src="/LOGO2.png" alt="Logo" className="h-16 w-auto brightness-0 invert" />
                </div>
                <div className="text-right z-10">
                    <div className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-50 mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {t('officialInvoice')}
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight leading-none" style={{ fontFamily: "'Outfit', sans-serif" }}>№ {invoiceNum}</h2>
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* Dates */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border ${status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        status === 'unpaid' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                        {status === 'paid' ? t('statusPaid') : status === 'unpaid' ? t('statusUnpaid') : t('statusPending')}
                    </div>
                    <div className="flex gap-6 text-xs">
                        <div>
                            <span className="text-slate-400 font-bold uppercase tracking-tighter mr-2">{t('issueDate')}:</span>
                            <span className="font-black text-[#0f172a]">{dateFormatted}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-bold uppercase tracking-tighter mr-2">{t('dueDateLabel')}:</span>
                            <span className="font-black text-[#0f172a]">{dueDateFormatted}</span>
                        </div>
                    </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1.5 inline-block" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {t('from')}
                        </h4>
                        <div className="space-y-1">
                            <p className="text-xl font-black text-[#0f172a] leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>{settings.companyName}</p>
                            <div className="space-y-0.5 text-[11px] text-slate-500 font-medium leading-relaxed">
                                <p className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-blue-400" />{settings.address}</p>
                                <p className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-blue-400" />{settings.email}</p>
                                <p className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-blue-400" />{settings.phone}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1.5 inline-block" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {t('billTo')}
                        </h4>
                        <div className="space-y-1">
                            <p className="text-xl font-black text-[#0f172a] leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>{clientName}</p>
                            <div className="space-y-1 text-[11px] font-medium leading-relaxed">
                                <p className="text-blue-600 font-black uppercase tracking-wider text-[9px] bg-blue-50 w-fit px-2 py-0.5 rounded-md">
                                    {t('project')}: {projectName}
                                </p>
                                <div className="space-y-0.5 text-slate-500 mt-2">
                                    <p className="font-bold text-slate-600">{company}</p>
                                    <p>{billToContact}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contract Details */}
                {(contractPartner || contractStartDate || contractEndDate) && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1 bg-blue-500 h-full" />
                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest" style={{ fontFamily: "'Outfit', sans-serif" }}>{t('contractDetails')}</h4>
                        <div className="grid grid-cols-2 gap-8 text-[12px]">
                            <div>
                                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1 text-[9px]">{t('contractParty')}</span>
                                <span className="font-bold text-[#0f172a] text-sm">{contractPartner || '---'}</span>
                            </div>
                            <div className="flex gap-8">
                                <div>
                                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1 text-[9px]">{t('start')}</span>
                                    <span className="font-bold text-[#0f172a]">{contractStartDate ? format(new Date(contractStartDate), 'dd.MM.yyyy') : '---'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1 text-[9px]">{t('end')}</span>
                                    <span className="font-bold text-[#0f172a]">{contractEndDate ? format(new Date(contractEndDate), 'dd.MM.yyyy') : '---'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Services Table */}
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px] w-8">#</th>
                                <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">{t('serviceDesc')}</th>
                                <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-center">{t('start')}</th>
                                <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-center">{t('days')}</th>
                                <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-center">{t('end')}</th>
                                <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-right">{t('price')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const validRows = (invoiceRows || []).filter(r => r.title && r.title.trim());
                                if (validRows.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">{t('noServices')}</td>
                                        </tr>
                                    );
                                }

                                const expandedRows: any[] = [];
                                validRows.forEach(row => {
                                    const repeats = Math.max(1, Number(row.paidQuantity) || 1);
                                    const duration = Math.max(1, Number(row.quantity) || 1);
                                    const unitPrice = Number(row.unitPrice) || 0;
                                    const type = (row.serviceType || 'row').toLowerCase();

                                    if (row.startDate) {
                                        let currentStart = new Date(row.startDate);
                                        for (let i = 0; i < repeats; i++) {
                                            const end = new Date(currentStart);
                                            end.setDate(end.getDate() + duration);

                                            expandedRows.push({
                                                title: row.title,
                                                subTitle: (type === 'api' || type === 'server') ? type.toUpperCase() : '',
                                                startDate: currentStart,
                                                endDate: end,
                                                days: duration,
                                                price: unitPrice
                                            });
                                            // Next start is this end
                                            currentStart = new Date(end);
                                        }
                                    } else {
                                        // Row with no start date - just repeat with placeholders if needed, 
                                        // but usually we just show it as is with multiplier if no dates
                                        expandedRows.push({
                                            title: row.title,
                                            subTitle: (type === 'api' || type === 'server') ? type.toUpperCase() : '',
                                            startDate: null,
                                            endDate: null,
                                            days: duration,
                                            price: unitPrice * repeats,
                                            isMerged: repeats > 1
                                        });
                                    }
                                });

                                return expandedRows.map((row, idx) => {
                                    const startFormatted = row.startDate ? format(row.startDate, "dd.MM.yyyy") : "---";
                                    const endFormatted = row.endDate ? format(row.endDate, "dd.MM.yyyy") : "---";
                                    
                                    return (
                                        <tr key={idx} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-4 font-bold text-slate-300">{idx + 1}</td>
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-[#0f172a] uppercase">{row.title}</p>
                                                {row.subTitle && (
                                                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{row.subTitle}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center font-medium text-slate-500">{startFormatted}</td>
                                            <td className="px-4 py-4 text-center font-bold text-[#0f172a]">{row.days}</td>
                                            <td className="px-4 py-4 text-center font-black text-blue-600">{endFormatted}</td>
                                            <td className="px-4 py-4 text-right font-black text-[#0f172a]">
                                                {new Intl.NumberFormat("uz-UZ").format(row.price)} {currency}
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="bg-slate-50 bg-opacity-50 p-4 rounded-xl space-y-3">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {t('paymentDetails')}
                        </h4>
                        <div className="text-[10px] space-y-1">
                            {(settings.paymentDetailLines || []).map((l, i) => (
                                <div key={i} className="flex gap-2">
                                    <span className="text-slate-400 font-bold min-w-[70px]">{l.title}:</span>
                                    <span className="font-black text-[#0f172a]">{l.value}</span>
                                </div>
                            ))}
                            <div className="pt-2 mt-2 border-t border-slate-200 text-blue-600 font-black italic">{settings.paymentNote}</div>
                        </div>
                    </div>
                    <div className="flex flex-col justify-end space-y-2 pb-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400 font-bold">{t('totalServices')}</span>
                            <span className="font-black text-[#0f172a]">{new Intl.NumberFormat("uz-UZ").format(totalFromRows)} {currency}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">{t('grandTotal')}</span>
                            <span className="text-2xl font-black text-blue-600 tracking-tighter">{new Intl.NumberFormat("uz-UZ").format(totalFromRows)} {currency}</span>
                        </div>
                    </div>
                </div>

                {/* Signature & Seal */}
                <div className="pt-8 mt-4 border-t border-slate-100 flex justify-between items-end relative">
                    <div className="flex flex-col items-center gap-2 translate-x-4">
                        <div className="w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 border-double rotate-[-15deg] relative border-blue-600/30 text-blue-600/40">
                            <div className="absolute inset-0 rounded-full border border-current opacity-20 transform scale-[0.85]" />
                            <span className="text-xl font-black tracking-tighter leading-none text-blue-600/60" style={{ fontFamily: "'Outfit', sans-serif" }}>SAYD.X</span>
                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {status === 'paid' ? t('statusPaid') : status === 'unpaid' ? t('statusUnpaid') : t('statusPending')}
                            </span>
                            <span className="text-[7px] mt-1 font-mono opacity-50">{invoiceNum}</span>
                        </div>
                    </div>
                    <div className="text-right space-y-2">
                        <div className="relative inline-block">
                            <img src="/imzo.PNG" alt="Signature" className="h-14 w-auto mix-blend-multiply opacity-90" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#0f172a]">{settings.authorizedName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{settings.authorizedPosition}</p>
                        </div>
                        <p className="text-[9px] text-slate-300 italic">{t('city')}, {dateFormatted} y.</p>
                    </div>
                </div>

                <div className="text-center pt-8 opacity-30">
                    <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">
                        {settings.website.toUpperCase()} &nbsp; | &nbsp; {settings.email.toUpperCase()} &nbsp; | &nbsp; {settings.phone}
                    </div>
                    <p className="text-[8px] mt-2">&copy; {new Date().getFullYear()} SAYD.X DIGITAL SOLUTIONS. {language === 'en' ? 'Generated by ERP system.' : language === 'ru' ? 'Сгенерировано системой ERP.' : 'ERP tizimi orqali yaratildi.'}</p>
                </div>
            </div>
        </div>
    );
}
