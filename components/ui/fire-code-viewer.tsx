"use client";

import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, ChevronRight, ChevronDown, BookOpen } from "lucide-react";
// Remove the import since we're defining the interface locally

interface FireCodeViewerProps {
  initialParentId?: number | null;
}

interface FireCodeSection {
  id: string;
  title: string;
  sectionNum: string;
  content: string;
  parentSectionId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export function FireCodeViewer({ initialParentId = null }: FireCodeViewerProps) {
  const [sections, setSections] = useState<FireCodeSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<FireCodeSection | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load sections from the API
  useEffect(() => {
    const loadSections = async () => {
      try {
        setLoading(true);
        const parentIdParam = initialParentId !== null ? `?parentId=${initialParentId}` : '';
        const response = await fetch(`/api/content/fire-codes${parentIdParam}`);
        
        if (response.ok) {
          const data = await response.json();
          setSections(data);
        } else {
          setError('Failed to load fire code sections');
        }
      } catch (err) {
        setError('Error loading fire code sections');
        console.error('Error loading fire code sections:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSections();
  }, [initialParentId]);

  // Load a specific section if search returns a single result
  useEffect(() => {
    if (searchQuery.trim() && sections.length === 1) {
      setSelectedSection(sections[0]);
    }
  }, [sections, searchQuery]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/content/fire-codes/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (response.ok) {
        const data = await response.json();
        setSections(data);
        // If there's only one result, select it
        if (data.length === 1) {
          setSelectedSection(data[0]);
        } else {
          setSelectedSection(null);
        }
      } else {
        setError('Failed to search fire code sections');
      }
    } catch (err) {
      setError('Error searching fire code sections');
      console.error('Error searching fire code sections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionClick = async (section: FireCodeSection) => {
    setSelectedSection(section);
    
    // If the section has sub-sections, load them
    try {
      const response = await fetch(`/api/content/fire-codes?parentId=${section.id}`);
      if (response.ok) {
        const subSections = await response.json();
        if (subSections.length > 0) {
          setExpandedSections(prev => new Set(prev).add(section.id));
        }
      }
    } catch (err) {
      console.error('Error loading sub-sections:', err);
    }
  };

  const renderSectionContent = () => {
    if (!selectedSection) {
      return (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Select a Fire Code Section</h3>
          <p className="text-muted-foreground">Choose a section from the list to view its content</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold text-foreground">{selectedSection.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {selectedSection.sectionNum}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date(selectedSection.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <div className="prose max-w-none">
          <div 
            className="text-foreground"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedSection.content.replace(/\n/g, '<br />')) }} 
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel - TOC and search */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Fire Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, section, or content..."
                    className="flex-1"
                  />
                  <Button type="submit" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Table of Contents */}
          <Card className="h-[500px]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Fire Code Table of Contents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[440px]">
                <div className="p-4 space-y-2">
                  {loading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading fire code sections...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <p className="text-destructive">{error}</p>
                    </div>
                  ) : sections.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No fire code sections found</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {sections.map((section) => (
                        <div key={section.id} className="space-y-1">
                          <div 
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors ${
                              selectedSection?.id === section.id ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => handleSectionClick(section)}
                          >
                            {section.sectionNum && (
                              <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                {section.sectionNum}
                              </span>
                            )}
                            <span className="text-sm font-medium truncate">{section.title}</span>
                            {expandedSections.has(section.id) ? (
                              <ChevronDown className="h-4 w-4 ml-auto" />
                            ) : (
                              <ChevronRight className="h-4 w-4 ml-auto" />
                            )}
                          </div>
                          
                          {expandedSections.has(section.id) && (
                            <div className="ml-6 pl-2 border-l space-y-1">
                              {/* Placeholder for sub-sections - would be populated when expanded */}
                              <div className="text-xs text-muted-foreground p-2">
                                Sub-sections will appear here
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right panel - Content viewer */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedSection ? selectedSection.title : 'Fire Code Viewer'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {renderSectionContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
