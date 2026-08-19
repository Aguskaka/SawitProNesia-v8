export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(value);
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactRupiah(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })} jt`;
  }
  return formatRupiah(value);
}
