// Проверка каталога и расчёта под ключ: node --test lib/customs.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { engine, modelName } from "./autohome.ts";
import { turnkey } from "./customs.ts";

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
});

test("под ключ", () => {
  const r = { cny: 10, eur: 100, date: "" };
  const trim = { year: 2026, cc: 2000, hp: 204, power: "ice", drive: "" };
  assert.deepEqual(turnkey({ ...trim, price: 200_000 }, r), {
    car: 2_000_000, delivery: 100_000, customs: 1_100_000, recycling: 952_800, total: 4_152_800,
  });
  assert.equal(turnkey({ ...trim, price: 100_000, cc: 1500, hp: 150 }, r).total, 1_000_000 + 50_000 + 525_000 + 3_400);
  assert.equal(turnkey({ ...trim, price: 200_000, power: "ev", cc: 0 }, r), null);
});
