import { prisma } from '@/lib/prisma'; // Import the prisma client instance
import { HeroCarouselClient } from './hero-carousel-client';

type CarouselImage = {
  id: number;
  title: string;
  altText: string | null;
  imageUrl: string;
  order: number;
  isActive: boolean;
};

async function getCarouselImages(): Promise<CarouselImage[]> {
  try {
    // Fetch data from the database using Prisma
    const dbImages = await prisma.carouselImage.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    // Map the database result to the CarouselImage type
    return dbImages.map((img) => ({
      id: img.id,
      title: img.title,
      altText: img.altText,
      imageUrl: img.imageUrl,
      order: img.order,
      isActive: img.isActive,
    }));
  } catch (error) {
    console.error("Failed to fetch carousel images:", error);
    return [];
  }
}

export async function HeroCarousel() {
  const images = await getCarouselImages();

  if (images.length === 0) {
    return <div className="w-full h-96 bg-gray-200 flex items-center justify-center">No Carousel Images Available</div>;
  }

  return <HeroCarouselClient images={images} />;
}
