// Проверка шагов бота: node --test lib/bot.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { nextStep, num, steps, toCar } from "./bot.ts";

const parse = (key, text) => steps.find((s) => s.key === key).parse(text);

test("числа из текста", () => {
  assert.equal(num("2 450 000 ₽"), 2_450_000);
  assert.equal(num("2,45 млн"), 2_450_000);
  assert.equal(num("45000 км"), 45_000);
});

test("разбор значений шагов", () => {
  assert.equal(parse("price", "2 450 000"), "2450000");
  assert.equal(parse("price", "дорого"), null);
  assert.equal(parse("cc", "1.6"), "1600");
  assert.equal(parse("cc", "1998"), "1998");
  assert.equal(parse("year", "1850"), null);
});

test("электро пропускает объём, итог собирается в авто", () => {
  assert.equal(nextStep({ fuel: "Электро" }, "fuel").key, "hp");
  assert.equal(nextStep({ fuel: "Бензин" }, "fuel").key, "cc");
  assert.equal(nextStep({}, "price"), undefined);
  const car = toCar({ country: "Китай", make: "Geely", model: "Monjaro", year: "2023", mileage: "12000", fuel: "Бензин", cc: "1969", hp: "238", transmission: "Автомат", drive: "Полный", price: "3990000" }, "x", ["p1"]);
  assert.equal(car.country, "CN");
  assert.equal(car.price, 3_990_000);
  assert.equal(car.grade, "");
});
