/**
 * O'zbekiston Respublikasi ma'muriy-hududiy bo'linishi: viloyatlar va ularning
 * asosiy tuman/shaharlari. `center` — viloyat markazining taxminiy
 * koordinatasi (E6, ya'ni gradus * 1_000_000), aniq geokodlash provayderi
 * yo'qligi sababli yangi biznes uchun boshlang'ich nuqta sifatida ishlatiladi.
 */
export type UzbekistanRegion = {
  name: string;
  center: { latitudeE6: number; longitudeE6: number };
  districts: string[];
};

export const UZBEKISTAN_REGIONS: UzbekistanRegion[] = [
  {
    name: 'Toshkent shahri',
    center: { latitudeE6: 41_311_200, longitudeE6: 69_279_300 },
    districts: ['Bektemir', 'Chilonzor', 'Mirobod', 'Mirzo Ulug‘bek', 'Olmazor', 'Sergeli', 'Shayxontohur', 'Uchtepa', 'Yakkasaroy', 'Yangihayot', 'Yashnobod', 'Yunusobod'],
  },
  {
    name: 'Toshkent viloyati',
    center: { latitudeE6: 41_004_300, longitudeE6: 69_204_900 },
    districts: ['Angren', 'Bekobod', 'Bo‘ka', 'Bo‘stonliq', 'Chinoz', 'Ohangaron', 'Oqqo‘rg‘on', 'Parkent', 'Piskent', 'Quyichirchiq', 'Toshkent tumani', 'Yangiyo‘l', 'Zangiota'],
  },
  {
    name: 'Andijon viloyati',
    center: { latitudeE6: 40_782_100, longitudeE6: 72_344_400 },
    districts: ['Andijon shahri', 'Asaka', 'Baliqchi', 'Bo‘z', 'Buloqboshi', 'Izboskan', 'Jalaquduq', 'Xo‘jaobod', 'Marhamat', 'Oltinko‘l', 'Paxtaobod', 'Shahrixon', 'Ulug‘nor'],
  },
  {
    name: 'Farg‘ona viloyati',
    center: { latitudeE6: 40_385_600, longitudeE6: 71_787_200 },
    districts: ['Farg‘ona shahri', 'Marg‘ilon', 'Qo‘qon', 'Beshariq', 'Bog‘dod', 'Buvayda', 'Dang‘ara', 'Furqat', 'Oltiariq', 'Quva', 'Rishton', 'So‘x', 'Toshloq', 'Uchko‘prik', 'Yozyovon'],
  },
  {
    name: 'Namangan viloyati',
    center: { latitudeE6: 41_001_000, longitudeE6: 71_670_800 },
    districts: ['Namangan shahri', 'Chortoq', 'Chust', 'Kosonsoy', 'Mingbuloq', 'Norin', 'Pop', 'To‘raqo‘rg‘on', 'Uchqo‘rg‘on', 'Uychi', 'Yangiqo‘rg‘on'],
  },
  {
    name: 'Samarqand viloyati',
    center: { latitudeE6: 39_654_200, longitudeE6: 66_959_700 },
    districts: ['Samarqand shahri', 'Bulung‘ur', 'Ishtixon', 'Jomboy', 'Kattaqo‘rg‘on', 'Narpay', 'Nurobod', 'Oqdaryo', 'Pastdarg‘om', 'Payariq', 'Paxtachi', 'Qo‘shrabot', 'Tayloq', 'Urgut'],
  },
  {
    name: 'Buxoro viloyati',
    center: { latitudeE6: 39_774_200, longitudeE6: 64_428_200 },
    districts: ['Buxoro shahri', 'Vobkent', 'G‘ijduvon', 'Jondor', 'Kogon', 'Olot', 'Peshku', 'Qorako‘l', 'Qorovulbozor', 'Romitan', 'Shofirkon'],
  },
  {
    name: 'Qashqadaryo viloyati',
    center: { latitudeE6: 38_861_200, longitudeE6: 65_789_500 },
    districts: ['Qarshi shahri', 'Dehqonobod', 'G‘uzor', 'Kasbi', 'Kitob', 'Koson', 'Mirishkor', 'Muborak', 'Nishon', 'Qamashi', 'Shahrisabz', 'Yakkabog‘'],
  },
  {
    name: 'Surxondaryo viloyati',
    center: { latitudeE6: 37_935_600, longitudeE6: 67_570_700 },
    districts: ['Termiz shahri', 'Angor', 'Bandixon', 'Boysun', 'Denov', 'Jarqo‘rg‘on', 'Muzrabot', 'Oltinsoy', 'Sariosiyo', 'Sherobod', 'Sho‘rchi', 'Uzun'],
  },
  {
    name: 'Jizzax viloyati',
    center: { latitudeE6: 40_125_800, longitudeE6: 67_842_400 },
    districts: ['Jizzax shahri', 'Arnasoy', 'Baxmal', 'Do‘stlik', 'Forish', 'G‘allaorol', 'Mirzacho‘l', 'Paxtakor', 'Yangiobod', 'Zafarobod', 'Zarbdor', 'Zomin'],
  },
  {
    name: 'Sirdaryo viloyati',
    center: { latitudeE6: 40_838_900, longitudeE6: 68_661_400 },
    districts: ['Guliston shahri', 'Boyovut', 'Guliston tumani', 'Mirzaobod', 'Oqoltin', 'Sardoba', 'Sayxunobod', 'Shirin', 'Xovos'],
  },
  {
    name: 'Navoiy viloyati',
    center: { latitudeE6: 40_104_500, longitudeE6: 65_378_900 },
    districts: ['Navoiy shahri', 'Karmana', 'Konimex', 'Nurota', 'Qiziltepa', 'Tomdi', 'Uchquduq', 'Xatirchi'],
  },
  {
    name: 'Xorazm viloyati',
    center: { latitudeE6: 41_378_400, longitudeE6: 60_363_800 },
    districts: ['Urganch shahri', 'Bog‘ot', 'Gurlan', 'Xiva', 'Xonqa', 'Qo‘shko‘pir', 'Shovot', 'Urganch tumani', 'Yangiariq', 'Yangibozor'],
  },
  {
    name: 'Qoraqalpog‘iston Respublikasi',
    center: { latitudeE6: 42_460_000, longitudeE6: 59_614_000 },
    districts: ['Nukus shahri', 'Amudaryo', 'Beruniy', 'Chimboy', 'Ellikqal’a', 'Kegeyli', 'Mo‘ynoq', 'Nukus tumani', 'Qanlikko‘l', 'Qo‘ng‘irot', 'Qorao‘zak', 'Shumanay', 'Taxtako‘pir', 'To‘rtko‘l', 'Xo‘jayli'],
  },
];

export function findRegion(name: string | undefined) {
  return UZBEKISTAN_REGIONS.find((region) => region.name === name);
}

export function isValidDistrict(regionName: string | undefined, districtName: string | undefined) {
  const region = findRegion(regionName);
  return Boolean(region && districtName && region.districts.includes(districtName));
}
