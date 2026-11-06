// Проверка разбора описания авто: node --test lib/bot.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { parseCar, template } from "./bot.ts";

test("шаблон разбирается целиком", () => {
  assert.deepEqual(parseCar(template), {
    errors: [],
    car: {
      country: "KR",
      make: "Kia",
      model: "K5",
      grade: "2.0 Prestige",
      year: 2022,
      month: 3,
      mileage: 45000,
      cc: 1999,
      hp: 160,
      fuel: "бензин",
      transmission: "автомат",
      price: 21500000,
      currency: "KRW",
    },
  });
});

test("литры, «млн», юани, ё/е в ключах", () => {
  const { car } = parseCar(template.replace("Объём: 1999", "объем: 2,0 л").replace("21 500 000 вон", "21,5 млн юаней"));
  assert.equal(car.cc, 2000);
  assert.equal(car.price, 21_500_000);
  assert.equal(car.currency, "CNY");
  assert.equal(car.country, "CN");
});

test("ошибки вместо авто", () => {
  const { car, errors } = parseCar("Марка: Kia\nВыпуск: 2022\nЦена: 100");
  assert.equal(car, undefined);
  assert.ok(errors.includes("нет поля «Модель»"));
  assert.ok(errors.includes("Выпуск: месяц и год, например 03.2022"));
  assert.ok(errors.includes("Цена: укажите валюту — вон или юань"));
});
