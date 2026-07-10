export interface Category {
  slug: 'kuze' | 'mech' | 'vence';
  label: string;
  seoTitle: string;
  seoDescription: string;
}

export const categories: Category[] = [
  {
    slug: 'kuze',
    label: 'Kůže',
    seoTitle: 'Kožené výrobky – peněženky, popruhy, pouzdra',
    seoDescription:
      'Ručně vyráběné kožené peněženky, popruhy na fotoaparát, pouzdra na brýle a další doplňky z kvalitní kůže. Poctivá česká ruční výroba BB Craft.',
  },
  {
    slug: 'mech',
    label: 'Mech',
    seoTitle: 'Dekorace z mechu a přírodnin',
    seoDescription:
      'Originální mechové dekorace a přírodní aranžmá pro váš interiér. Ručně vyráběné dekorace z mechu, dřeva a sušených květin od BB Craft.',
  },
  {
    slug: 'vence',
    label: 'Věnce',
    seoTitle: 'Věnce na dveře a stůl z přírodních materiálů',
    seoDescription:
      'Ručně vázané věnce na dveře i na stůl z přírodních materiálů. Celoroční i sezónní dekorace z české dílny BB Craft.',
  },
];
