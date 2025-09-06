'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function BreedStatistics({ breedData, className = "" }) {
  const stats = [
    {
      label: "Available Dogs",
      value: breedData.count || 0,
      icon: "🐕",
      color: "orange",
      description: "Currently available for adoption"
    },
    {
      label: "Organizations",
      value: breedData.organizations?.length || 0,
      icon: "🏠",
      color: "blue",
      description: "Rescue organizations with this breed"
    },
    {
      label: "Countries",
      value: breedData.countries?.length || 1,
      icon: "🌍",
      color: "green",
      description: "Countries where available"
    },
    {
      label: "Avg. Age",
      value: breedData.average_age || "2-5 years",
      icon: "📅",
      color: "purple",
      description: "Typical age range"
    }
  ];
  
  return (
    <div className={`breed-statistics ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ stat, index }) {
  const colorClasses = {
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700"
  };
  
  return (
    <div 
      className={`stat-card p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 hover:shadow-md ${
        colorClasses[stat.color] || colorClasses.orange
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl" role="img" aria-label={stat.label}>
          {stat.icon}
        </span>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </div>
        </div>
      </div>
      <div className="text-sm font-medium mb-1">{stat.label}</div>
      <div className="text-xs opacity-75">{stat.description}</div>
    </div>
  );
}

export function BreedInfo({ breedData, className = "" }) {
  const handleScrollToDogs = () => {
    document.getElementById('dogs-grid')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSaveAlert = () => {
    console.log('Save breed alert for', breedData.primary_breed);
  };
  
  return (
    <div className={`breed-info space-y-6 ${className}`}>
      <div>
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {breedData.primary_breed}
        </h1>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {breedData.breed_group && breedData.breed_group !== "Unknown" && (
            <Badge variant="secondary" className="text-sm">
              {breedData.breed_group} Group
            </Badge>
          )}
          <Badge variant="outline" className="text-sm">
            {breedData.breed_type}
          </Badge>
          {breedData.count >= 50 && (
            <Badge variant="default" className="bg-green-600 text-sm">
              Popular Breed
            </Badge>
          )}
        </div>
      </div>
      
      <BreedStatistics breedData={breedData} />
      
      <div>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          {breedData.description}
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          size="lg" 
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          onClick={handleScrollToDogs}
        >
          View All {breedData.count} {breedData.primary_breed}s
        </Button>
        
        <Button 
          variant="outline" 
          size="lg" 
          className="sm:w-auto"
          onClick={handleSaveAlert}
        >
          ❤️ Save Breed Alert
        </Button>
      </div>
    </div>
  );
}