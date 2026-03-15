export function calculateInvoiceTotal(
    amount: string | number,
    paidAmount: string | number = "0",
    vatRate: string | number = "0",
    discountRate: string | number = "0"
): number {
    const subtotal = Number(amount) || 0;
    const paid = Number(paidAmount) || 0;
    const vat = Number(vatRate) || 0;
    const disc = Number(discountRate) || 0;

    const vatAmount = subtotal * (vat / 100);
    const discountAmount = subtotal * (disc / 100);

    return Math.max(0, subtotal + vatAmount - discountAmount - paid);
}
