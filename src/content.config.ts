import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const produkty = defineCollection({
  loader: file('src/data/produkty.json'),
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
      price: z.number(),
      description: z.string(),
      category: z.enum(['kuze', 'mech', 'vence']),
      images: z.array(image()).nonempty(),
    }),
});

export const collections = { produkty };
