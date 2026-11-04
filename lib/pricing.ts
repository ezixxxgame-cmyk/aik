import { pricing as p } from "@/config/pricing";
import { ageMonths, type Car } from "@/lib/catalog";

export function calcPrice(car: Car, city = p.defaultCity) {
  const eur = p.rates.EUR;
  const age = ageMonths(car);
  const carRub = car.price * p.rates[car.currency];

  let duty: number;
  if (age < 36) {
    duty = Math.max(carRub * p.dutyUnder3.rate, car.cc * p.dutyUnder3.minEurPerCc * eur);
  } else if (age < 60) {
    const rate = p.dutyEurPerCc35.find(([max]) => car.cc <= max)![1];
    duty = car.cc * rate * eur;
  } else {
    duty = car.cc * p.dutyEurPerCcOver5 * eur;
  }

  const util =
    car.hp > p.utilPowerLimit ? p.utilHighPower : age < 36 ? p.util.under3 : p.util.over3;

  const rows = [
    { label: `Авто (${car.currency} по курсу ${p.rates[car.currency]} ₽)`, value: carRub },
    { label: car.country === "KR" ? "Доставка до порта и море" : "Доставка до границы", value: p.toRussia[car.country] },
    { label: `Доставка по РФ: ${city}`, value: p.cities[city] ?? p.cities[p.defaultCity] },
    { label: "Таможенная пошлина", value: duty },
    { label: "Утильсбор", value: util },
    { label: "Брокер и СВХ", value: p.brokerSvh },
    { label: `Комиссия A.I.K. (${p.commissionRate * 100}%)`, value: carRub * p.commissionRate },
  ];

  return { rows, total: rows.reduce((s, r) => s + r.value, 0) };
}
