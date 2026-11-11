// Проверка каталога и расчёта под ключ: node --test lib/customs.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { engine, modelName } from "./autohome.ts";
import { pick, turnkey } from "./customs.ts";

test("двигатель из заголовка autohome", () => {
  assert.deepEqual(engine("2.0升 涡轮增压 204马力"), { power: "ice", cc: 2000, hp: 204 });
  assert.deepEqual(engine("1.5升 发动机:101马力 电动机:163马力"), { power: "phev", cc: 1500, hp: 264 });
  assert.deepEqual(engine("电动 340马力"), { power: "ev", cc: 0, hp: 340 });
  assert.deepEqual(engine("增程式 408马力"), { power: "erev", cc: 0, hp: 408 });
});

test("названия моделей", () => {
  assert.equal(modelName("海豹05 DM-i"), "Seal 05 DM-i");
  assert.equal(modelName("瑞虎8 PLUS"), "Tiggo 8 PLUS");
  assert.equal(modelName("星越L"), "Monjaro");
  assert.equal(modelName("坦克300新能源"), "300");
  assert.equal(modelName("红旗金葵花国礼"), "");
  assert.equal(modelName("汉兰达"), "Highlander");
  assert.equal(modelName("卡罗拉锐放"), "Corolla Cross");
  assert.equal(modelName("RAV4荣放"), "RAV4");
  assert.equal(modelName("马自达3 昂克赛拉"), "3");
  assert.equal(modelName("宏光MINIEV"), "Hongguang MINIEV");
});

test("отбор в каталог", () => {
  const r = { cny: 10, eur: 100, date: "" };
  const t = (price, hp, cc = 1500, power = "ice") => ({ year: 2026, price, cc, hp, power, drive: "" });
  const m = (id, ...trims) => ({ id, brand: "B", name: id, level: "", photo: "", trims });
  const order = ["big", "mixed", "mini", "lux"];
  const picked = pick(
    [
      m("big", t(300_000, 300, 2500)), // утильсбор 2,6 млн — не берём
      m("mixed", t(100_000, 150), t(100_000, 300, 2500)), // остаётся комплектация с льготным утилем
      m("mini", t(30_000, 40, 0, "ev")), // под ключ до 1 млн
      m("lux", t(400_000, 200, 2000)), // дороже 4 млн, утиль 952 800
    ],
    r,
    (x) => order.indexOf(x.id),
  );
  assert.deepEqual(picked.map((x) => x.id), ["mini", "mixed", "lux"]);
  assert.equal(picked[1].trims.length, 1);
});

test("под ключ", () => {
  const r = { cny: 10, eur: 100, date: "" };
  const trim = { year: 2026, price: 200_000, cc: 2000, hp: 204, power: "ice", drive: "" };
  // авто 2 000 000, пошлина max(48%, 5,5 €/см³) = 11 000 € + сбор 13 541, утиль 952 800, комиссия 5%
  assert.deepEqual(turnkey(trim, r), {
    car: 2_000_000, delivery: 265_000, customs: 1_113_541, recycling: 952_800, services: 95_000, commission: 100_000,
    total: 4_526_341,
  });
  // льготный утильсбор: до 160 л. с. и до 3 л
  assert.equal(turnkey({ ...trim, price: 100_000, cc: 1500, hp: 150 }, r).total, 1_943_324);
  // электро: 15% + акциз 1 711 ₽/л. с. + НДС 22%, утиль по мощности
  assert.equal(Math.round(turnkey({ ...trim, power: "ev", cc: 0, hp: 340 }, r).total), 7_637_264);
  // EREV: пошлина ЕТС за 1,5 л, утиль как у электро
  assert.equal(turnkey({ ...trim, power: "erev", cc: 0, hp: 408 }, r).total, 7_081_541);
});
