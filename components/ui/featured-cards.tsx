'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PermissionGuard } from '@/components/permission-guard';
import TiltedCard from '@/components/ui/tilted-card';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Briefcase, Users, Baby } from 'lucide-react';

// Define the type for a featured card item
type FeaturedCardItem = {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  requiredPermission: 'accessKids' | 'accessAdult' | 'accessProfessional' | 'isAdmin';
  icon: React.ReactNode;
  color: string;
};

// Mock data for featured cards - this will be replaced by dynamic data fetching
const mockFeaturedCards: FeaturedCardItem[] = [
  {
    id: 1,
    title: 'For Professionals',
    description: 'Access comprehensive fire safety codes, standards, and professional training materials.',
    imageUrl: '/professional_card.png',
    link: '/professional',
    requiredPermission: 'accessProfessional',
    icon: <Briefcase className="h-6 w-6" />,
    color: 'from-blue-500 to-blue-700',
  },
  {
    id: 2,
    title: 'For Adults',
    description: 'Learn essential fire safety practices for your home, family, and workplace.',
    imageUrl: '/adult_card.png',
    link: '/adult',
    requiredPermission: 'accessAdult',
    icon: <Users className="h-6 w-6" />,
    color: 'from-orange-500 to-red-600',
  },
  {
    id: 3,
    title: 'For Kids',
    description: 'Fun and interactive modules to teach children about fire safety.',
    imageUrl: '/kids_card.png.jpg',
    link: '/kids',
    requiredPermission: 'accessKids',
    icon: <Baby className="h-6 w-6" />,
    color: 'from-green-500 to-emerald-600',
  },
];

export function FeaturedCards() {
  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Mobile: Horizontal compact cards */}
      <div className="md:hidden space-y-3">
        {mockFeaturedCards.map((card) => (
          <PermissionGuard key={card.id} requiredPermission={card.requiredPermission} targetPath={card.link}>
            <Link href={card.link} prefetch={false}>
              <Card className="overflow-hidden hover:shadow-lg transition-all active:scale-[0.98]">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    {/* Icon Section */}
                    <div className={`bg-gradient-to-br ${card.color} p-4 flex items-center justify-center text-white`}>
                      {card.icon}
                    </div>
                    {/* Content */}
                    <div className="flex-1 py-3 pr-4">
                      <h3 className="font-bold text-base text-gray-900">{card.title}</h3>
                      <p className="text-xs text-gray-600 line-clamp-1">{card.description}</p>
                    </div>
                    {/* Arrow */}
                    <ArrowRight className="h-5 w-5 text-gray-400 mr-4 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </PermissionGuard>
        ))}
      </div>

      {/* Tablet & Desktop: Tilted cards */}
      <div className="hidden md:grid md:grid-cols-3 gap-8 p-4">
        {mockFeaturedCards.map((card) => (
          <PermissionGuard key={card.id} requiredPermission={card.requiredPermission} targetPath={card.link}>
            <div className="flex flex-col items-center">
              <TiltedCard
                imageSrc={card.imageUrl}
                altText={card.title}
                captionText={card.title}
                containerHeight="320px"
                containerWidth="100%"
                imageHeight="280px"
                imageWidth="100%"
                scaleOnHover={1.08}
                rotateAmplitude={12}
                showMobileWarning={false}
                showTooltip={true}
                displayOverlayContent={true}
                overlayContent={
                  <div className="text-white">
                    <h3 className="text-xl font-bold mb-2 drop-shadow-lg">{card.title}</h3>
                    <p className="text-sm text-gray-200 mb-3 line-clamp-2">{card.description}</p>
                    <Link href={card.link} prefetch={false}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full bg-white/90 hover:bg-white text-gray-900 backdrop-blur-sm"
                      >
                        Learn More
                      </Button>
                    </Link>
                  </div>
                }
              />
            </div>
          </PermissionGuard>
        ))}
      </div>
    </div>
  );
}

