import { describe, expect, it } from 'vitest';

import { calmCaps, tidyAddress } from './text';

describe('text people type', () => {
  it('turns a text typed in capitals into sentences, in Latin and Cyrillic', () => {
    expect(calmCaps('DASTURXON VA PARDALAR')).toBe('Dasturxon va pardalar');
    expect(calmCaps('OSH VA SALAT. JUDA MAZALI!\nHAR KUNI 9:00 DAN')).toBe('Osh va salat. Juda mazali!\nHar kuni 9:00 dan');
    expect(calmCaps('O‘ZBEK MILLIY TAOMLARI')).toBe('O‘zbek milliy taomlari');
    expect(calmCaps('ДАСТУРХОНЫ И ШТОРЫ НА ЗАКАЗ')).toBe('Дастурхоны и шторы на заказ');
  });

  it('leaves short brand names and ordinary texts alone', () => {
    expect(calmCaps('KFC COMBO')).toBe('KFC COMBO');
    expect(calmCaps('Osh va salat. Juda mazali!')).toBe('Osh va salat. Juda mazali!');
    expect(calmCaps('NFC kartalar va QR kodlar do‘koni')).toBe('NFC kartalar va QR kodlar do‘koni');
  });

  it('writes the same address the same way', () => {
    expect(tidyAddress('Andijon Shahar')).toBe('Andijon shahar');
    expect(tidyAddress('andijon shahar')).toBe('Andijon shahar');
    expect(tidyAddress('Farobiy Ko‘chasi, 44')).toBe('Farobiy ko‘chasi, 44');
    expect(tidyAddress('  Amir Temur   1 ')).toBe('Amir Temur 1');
    expect(tidyAddress('Shahar markazi, 5-uy')).toBe('Shahar markazi, 5-uy');
    expect(tidyAddress('YUNUSOBOD TUMANI, 4-MAVZE')).toBe('Yunusobod tumani, 4-mavze');
  });
});
