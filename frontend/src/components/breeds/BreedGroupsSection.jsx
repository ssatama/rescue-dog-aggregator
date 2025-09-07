"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BreedGroupsSection({ breedGroups }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Listen for expand all event from Popular Breeds section
  useEffect(() => {
    const handleExpandAll = () => {
      setExpanded(true);
      // Expand all groups
      const allGroupNames = breedGroups.map(g => g.name);
      setExpandedGroups(new Set(allGroupNames));
    };

    window.addEventListener('expandAllBreedGroups', handleExpandAll);
    return () => window.removeEventListener('expandAllBreedGroups', handleExpandAll);
  }, [breedGroups]);

  if (!breedGroups || breedGroups.length === 0) {
    return null;
  }

  // Show 4 groups initially, all when expanded
  const displayGroups = expanded ? breedGroups : breedGroups.slice(0, 4);

  const toggleGroup = (groupName) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const getGroupStyles = (groupName) => {
    const styles = {
      'Hound Group': { 
        bg: 'bg-orange-50 dark:bg-orange-950 hover:bg-orange-100 dark:hover:bg-orange-900', 
        border: 'border-orange-200 dark:border-orange-800', 
        text: 'text-orange-700 dark:text-orange-300',
        icon: 'bg-orange-100 dark:bg-orange-900' 
      },
      'Sporting Group': { 
        bg: 'bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900', 
        border: 'border-emerald-200 dark:border-emerald-800', 
        text: 'text-emerald-700 dark:text-emerald-300',
        icon: 'bg-emerald-100 dark:bg-emerald-900' 
      },
      'Herding Group': { 
        bg: 'bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900', 
        border: 'border-purple-200 dark:border-purple-800', 
        text: 'text-purple-700 dark:text-purple-300',
        icon: 'bg-purple-100 dark:bg-purple-900' 
      },
      'Working Group': { 
        bg: 'bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900', 
        border: 'border-blue-200 dark:border-blue-800', 
        text: 'text-blue-700 dark:text-blue-300',
        icon: 'bg-blue-100 dark:bg-blue-900' 
      },
      'Terrier Group': { 
        bg: 'bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900', 
        border: 'border-red-200 dark:border-red-800', 
        text: 'text-red-700 dark:text-red-300',
        icon: 'bg-red-100 dark:bg-red-900' 
      },
      'Toy Group': { 
        bg: 'bg-pink-50 dark:bg-pink-950 hover:bg-pink-100 dark:hover:bg-pink-900', 
        border: 'border-pink-200 dark:border-pink-800', 
        text: 'text-pink-700 dark:text-pink-300',
        icon: 'bg-pink-100 dark:bg-pink-900' 
      }
    };

    return styles[groupName] || {
      bg: 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800',
      border: 'border-gray-200 dark:border-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      icon: 'bg-gray-100 dark:bg-gray-800'
    };
  };

  return (
    <section id="breed-groups" className="py-12 bg-gray-50 dark:bg-gray-950" aria-labelledby="breed-groups-heading">
      <div className="container mx-auto px-4">
        <h2 id="breed-groups-heading" className="text-3xl font-bold mb-8 text-center dark:text-white">
          Explore by Breed Group
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayGroups.map((group) => {
            const styles = getGroupStyles(group.name);
            const isExpanded = expandedGroups.has(group.name);
            const testId = `breed-group-${group.name.toLowerCase().replace(/\s+/g, '-')}`;

            return (
              <div key={group.name} className="space-y-3">
                <div
                  data-testid={testId}
                  onClick={() => toggleGroup(group.name)}
                  className={`p-6 rounded-lg border-2 ${styles.bg} ${styles.border} cursor-pointer transition-all duration-200 hover:shadow-md`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-lg ${styles.icon} text-2xl`}>
                      {group.icon}
                    </div>
                    <div className="flex items-center">
                      {isExpanded ? (
                        <ChevronUp className={`h-5 w-5 ${styles.text}`} />
                      ) : (
                        <ChevronDown className={`h-5 w-5 ${styles.text}`} />
                      )}
                    </div>
                  </div>
                  
                  <h3 className={`text-lg font-semibold ${styles.text}`}>
                    {group.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-2">
                    {group.description}
                  </p>
                  <p className={`text-2xl font-bold ${styles.text}`}>
                    {group.count} dogs
                  </p>
                </div>

                {/* Expandable Top Breeds */}
                {isExpanded && group.top_breeds && (
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                    {group.top_breeds.map((breed) => (
                      <Link
                        key={breed.slug}
                        href={`/breeds/${breed.slug}`}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          {breed.image_url ? (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                              <Image
                                src={breed.image_url}
                                alt={breed.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <span className="text-xs text-gray-500 dark:text-gray-400">🐕</span>
                            </div>
                          )}
                          <span className="font-medium text-sm group-hover:text-primary">{breed.name}</span>
                        </div>
                        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                          {breed.count} available
                          <span className="text-red-500">❤️</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Show More/Less Button */}
        {breedGroups.length > 4 && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 mx-auto"
            >
              {expanded ? (
                <>
                  Show Less
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Show More Groups
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}