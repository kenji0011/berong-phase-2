"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, BookOpen, Eye } from "lucide-react";

interface Manual {
  id: string;
  title: string;
  filename: string;
  description: string;
  category: string;
}

export function ManualsDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const manuals: Manual[] = [
    {
      id: "1",
      title: "PFE Community Relations Agenda",
      filename: "Volume-0-PFE-The-BFP-Community-Relations-Agenda.pdf",
      description: "Community relations agenda for the Bureau of Fire Protection",
      category: "Policy"
    },
    {
      id: "2",
      title: "Fire Safety For Children",
      filename: "Volume-1-Fire-Safety-For-Children.pdf",
      description: "Age-appropriate fire safety guidelines for children",
      category: "Education"
    },
    {
      id: "3",
      title: "Fire Safety for Teenagers",
      filename: "Volume-2-Fire-Safety-for-Teenagers.pdf",
      description: "Fire safety guidelines tailored for teenage audiences",
      category: "Education"
    },
    {
      id: "4",
      title: "Fire Safety for Young Adults",
      filename: "Volume-3-Fire-Safety-for-Young-Adults.pdf",
      description: "Fire safety guidelines for young adult demographics",
      category: "Education"
    },
    {
      id: "5",
      title: "Fire Safety for General Public",
      filename: "Volume-4-Fire-Safety-for-General-Public.pdf",
      description: "General fire safety guidelines for public awareness",
      category: "Public Safety"
    },
    {
      id: "6",
      title: "Fire Safety for Business Establishments",
      filename: "Volume-5-Fire-Safety-for-Business-Establishments.pdf",
      description: "Fire safety requirements and guidelines for businesses",
      category: "Regulatory"
    },
    {
      id: "7",
      title: "Fire Safety for Special Care and Vulnerable Individuals",
      filename: "Volume-6-Fire-Safety-for-Special-Care-and-Vulnerable-Individuals.pdf",
      description: "Specialized fire safety protocols for vulnerable populations",
      category: "Specialized"
    }
  ];

  const handleView = (filename: string) => {
    window.open(`/modules/bfp_manuals/${filename}`, '_blank');
  };

  const handleDownload = (filename: string) => {
    // Create a temporary link to trigger the download
    const link = document.createElement('a');
    link.href = `/modules/bfp_manuals/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-secondary p-2 rounded-lg">
              <BookOpen className="h-6 w-6 text-secondary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-2xl">BFP Standard Operating Procedures</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-muted-foreground">
            Access comprehensive manuals covering firefighting operations, emergency response protocols, and safety procedures.
          </p>

          <div className="grid gap-4">
            {manuals.map((manual) => (
              <Card key={manual.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <h3 className="font-semibold text-foreground line-clamp-2">{manual.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{manual.description}</p>
                      <Badge variant="secondary" className="text-xs">
                        {manual.category}
                      </Badge>
                    </div>
                    <div className="flex gap-2 sm:ml-0 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(manual.filename)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(manual.filename)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
