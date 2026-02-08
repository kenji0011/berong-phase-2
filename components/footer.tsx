"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FooterDialogContent } from '@/components/ui/footer-dialog';
import { useState } from 'react';
import Image from 'next/image';

// Define types for footer links
type FooterLink = {
  name: string;
  url: string;
  dialogType?: 'contact' | 'about' | 'faq' | 'report' | 'privacy' | 'terms';
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

// Mock data for footer columns - this will be replaced by dynamic data or defined constants
const footerColumns: FooterColumn[] = [
  {
    title: 'Customer Support',
    links: [
      { name: 'Contact Us', url: '#', dialogType: 'contact' },
      { name: 'FAQs', url: '#', dialogType: 'faq' },
      { name: 'Report an Issue', url: '#', dialogType: 'report' },
    ],
  },
  {
    title: 'Products & Solutions',
    links: [
      { name: 'For Professionals', url: '/professional' },
      { name: 'For Adults', url: '/adult' },
      { name: 'For Kids', url: '/kids' },
    ],
  },
  {
    title: 'Quick Links',
    links: [
      { name: 'Home', url: '/' },
      { name: 'About Us', url: '/about' },
      { name: 'Privacy Policy', url: '#', dialogType: 'privacy' },
      { name: 'Terms of Service', url: '#', dialogType: 'terms' },
    ],
  },
];

// Social media links
const socialMediaLinks = [
  { name: 'Facebook', url: 'https://www.facebook.com/bfpsantacruzfslaguna' },
];

export function Footer() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'contact' | 'about' | 'faq' | 'report' | 'privacy' | 'terms' | null>(null);

  const handleLinkClick = (link: FooterLink) => {
    if (link.dialogType) {
      setDialogType(link.dialogType);
      setDialogOpen(true);
    } else if (link.url && link.url.startsWith('/')) {
      // For navigation links, use next/link behavior
      window.location.href = link.url;
    } else if (link.url && link.url.startsWith('http')) {
      // For external links, open in new tab
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <footer className="bg-gray-900 text-white py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* BFP Logo and Description Column */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <div className="flex items-center">
              <Image
                src="/RD Logo.png"
                alt="BFP Berong Logo"
                width={64}
                height={64}
                className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
              />
              <div className="ml-3 sm:ml-4">
                <h3 className="text-base sm:text-lg font-bold">BFP Berong</h3>
                <p className="text-xs sm:text-sm text-gray-400">Fire Safety Education Platform</p>
              </div>
            </div>
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400">
              Empowering communities with knowledge and skills for fire safety.
            </p>
            <div className="mt-3 sm:mt-4 flex space-x-4">
              {socialMediaLinks.map((social, index) => (
                <Link key={index} href={social.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-black border-gray-600 hover:bg-gray-700 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
                    {social.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Footer Link Columns */}
          {footerColumns.map((column, index) => (
            <div key={index} className="col-span-1">
              <h4 className="text-sm sm:text-lg font-semibold mb-2 sm:mb-4">{column.title}</h4>
              <ul className="space-y-1 sm:space-y-2">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <button
                      onClick={() => handleLinkClick(link)}
                      className="text-gray-400 hover:text-white transition-colors block text-left w-full text-xs sm:text-sm py-1"
                    >
                      {link.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-800 text-center">
          <p className="text-xs sm:text-sm text-gray-400">
            &copy; {new Date().getFullYear()} BFP Sta.Cruz Laguna. All rights reserved.
          </p>
        </div>
      </div>
      {dialogOpen && (
        <FooterDialogContent
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          contentType={dialogType}
        />
      )}
    </footer>
  );
}
