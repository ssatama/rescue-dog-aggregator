# ❤️ Swipe Dogs Feature - Complete Implementation Plan

# 💕 Mobile Swipe Feature - Complete Implementation Plan

## Project Context

**Current State**:

- ~900 dogs across 8 organizations
- Basic favorites feature working
- Rich JSONB properties field with some behavioral data
- Planning to expand to 2,500-5,000 dogs

**Why Swipe Interface**:

- Mobile users need quick, visual browsing
- Reduces choice paralysis through one-at-a-time presentation
- Generates engagement data for future LLM matching
- Creates addictive, app-like experience on mobile web

**Key Constraints**:

- Mobile-only feature (hidden on desktop)
- Must work in browser (no native app)
- Requires enriched data for meaningful cards
- Performance critical for smooth swiping

**Prerequisites**:

- ✅ Phase 1: Organization Expansion (to get quality dogs)
- ✅ Phase 2: Enhanced Favorites (completed)
- 📍 **Phase 3: Mobile Swipe Interface** (this document)
- 🔜 Phase 4: LLM Matching Chat

---

## Executive Summary

- **Mobile-first Tinder-style UI** - Quick decisions on one dog at a time
- **LLM-enriched data** - Extract personality traits for better cards
- **Smart queue management** - Preload and filter for quality
- **Analytics integration** - Track patterns for future matching

---

## Phase 1: Data Enrichment Pipeline

### LLM Feature Extraction

python

`*# scripts/enrich_swipe_data.py*
import httpx
from typing import Dict, List

class SwipeDataEnricher:
    def __init__(self):
        self.client = httpx.Client(
            base_url="https://openrouter.ai/api/v1",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
        )

    async def extract_swipe_features(self, dog: Dict) -> Dict:
        """Extract key features for swipe cards using LLM."""

        prompt = f"""
        Extract key features for a dog adoption swipe card from this data:
        Name: {dog['name']}
        Breed: {dog['breed']}
        Age: {dog['age_text']}
        Description: {dog['properties'].get('description', '')}

        Return JSON with exactly these fields:
        {{
            "personality_summary": "2-3 key personality traits in 5 words",
            "energy_level": "low|medium|high",
            "best_for": "apartment|house|farm",
            "experience_needed": "first-time|some|experienced",
            "special_trait": "one unique/endearing quality in 3-5 words",
            "swipe_tagline": "catchy one-liner under 10 words"
        }}

        Be concise and adoption-focused. Example:
        {{
            "personality_summary": "Gentle, playful, loves cuddles",
            "energy_level": "medium",
            "best_for": "house",
            "experience_needed": "first-time",
            "special_trait": "Gives paw for treats",
            "swipe_tagline": "Your new couch potato buddy!"
        }}
        """

        response = await self.client.post("/chat/completions", json={
            "model": "anthropic/claude-3-haiku",  *# Fast & cheap*
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 200
        })

        return json.loads(response.json()["choices"][0]["message"]["content"])`

### Database Schema Updates

sql

- `*- Add swipe-specific fields to animals table*
ALTER TABLE animals ADD COLUMN IF NOT EXISTS swipe_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS swipe_score NUMERIC(3,2);
ALTER TABLE animals ADD COLUMN IF NOT EXISTS swipe_features JSONB DEFAULT '{}';
ALTER TABLE animals ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP;
*- Create swipe events table*
CREATE TABLE IF NOT EXISTS swipe_events ( id SERIAL PRIMARY KEY, session_hash VARCHAR(64) NOT NULL, *- Same anonymous hash as favorites* dog_id INTEGER NOT NULL REFERENCES animals(id), action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'like', 'pass', 'detail')), swipe_duration_ms INTEGER, *- How long they looked before swiping* created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*- Indexes for performance*
CREATE INDEX idx_swipe_events_session ON swipe_events(session_hash);
CREATE INDEX idx_swipe_events_dog ON swipe_events(dog_id);
CREATE INDEX idx_swipe_events_created ON swipe_events(created_at);
CREATE INDEX idx_animals_swipe_ready ON animals(swipe_ready) WHERE swipe_ready = true;`

### Swipe Eligibility Criteria

python

`def calculate_swipe_score(dog: Dict) -> float:
    """Calculate if dog is suitable for swipe interface."""
    score = 0.0

    *# Image quality (40% weight)*
    if dog.get('primary_image_url'):
        score += 0.4  *# Assume images are good if they exist*

    *# Data completeness (30% weight)*
    if dog.get('breed') and dog['breed'] != 'Unknown':
        score += 0.1
    if dog.get('age_text'):
        score += 0.1
    if len(dog.get('properties', {}).get('description', '')) > 100:
        score += 0.1

    *# Enrichment quality (30% weight)*
    if dog.get('swipe_features'):
        features = dog['swipe_features']
        if features.get('personality_summary'):
            score += 0.15
        if features.get('swipe_tagline'):
            score += 0.15

    return min(score, 1.0)

*# Only dogs with score > 0.7 are swipe-ready*`

---

## Phase 2: Frontend Implementation

### Route Structure

typescript

`*// app/swipe/page.tsx*
export default function SwipePage() {
  *// Server component - check if mobile*
  const isMobile = headers().get('user-agent')?.includes('Mobile');

  if (!isMobile) {
    return <DesktopRedirect />;
  }

  return <SwipeInterface />;
}`

### Core Swipe Component

tsx

`*// components/swipe/SwipeInterface.tsx*
'use client';

import { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useFavorites } from '@/hooks/useFavorites';
import { motion, AnimatePresence } from 'framer-motion';

interface SwipeDog extends Dog {
  swipe_features: {
    personality_summary: string;
    energy_level: 'low' | 'medium' | 'high';
    best_for: string;
    swipe_tagline: string;
  };
}

export default function SwipeInterface() {
  const [queue, setQueue] = useState<SwipeDog[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { addFavorite } = useFavorites();

  *// Swipe handlers*
  const handlers = useSwipeable({
    onSwipedLeft: () => handleSwipe('pass'),
    onSwipedRight: () => handleSwipe('like'),
    onSwipedUp: () => handleSwipe('detail'),
    preventScrollOnSwipe: true,
    trackMouse: false
  });

  *// Load initial queue*
  useEffect(() => {
    loadSwipeQueue();
  }, []);

  *// Preload when running low*
  useEffect(() => {
    if (queue.length - currentIndex < 3) {
      loadMoreDogs();
    }
  }, [currentIndex]);

  const handleSwipe = async (action: 'like' | 'pass' | 'detail') => {
    const dog = queue[currentIndex];

    *// Track swipe*
    await trackSwipeEvent(dog.id, action);

    *// Handle action*
    if (action === 'like') {
      await addFavorite(dog.id);
      showToast('Added to favorites! 💕', 'success');
    } else if (action === 'detail') {
      router.push(`/dogs/${dog.id}`);
      return;
    }

    *// Move to next*
    setCurrentIndex(prev => prev + 1);
  };

  const currentDog = queue[currentIndex];

  if (!currentDog) {
    return <NoMoreDogs />;
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden" {...handlers}>
      <SwipeHeader />

      <div className="relative h-full pb-20">
        <AnimatePresence mode="wait">
          <SwipeCard key={currentDog.id} dog={currentDog} />
        </AnimatePresence>

        {*/* Peek next card */*}
        {queue[currentIndex + 1] && (
          <div className="absolute inset-0 -z-10 scale-95 opacity-50">
            <SwipeCard dog={queue[currentIndex + 1]} />
          </div>
        )}
      </div>

      <SwipeActions onSwipe={handleSwipe} />
    </div>
  );
}`

### Swipe Card Design

tsx

`*// components/swipe/SwipeCard.tsx*
export default function SwipeCard({ dog }: { dog: SwipeDog }) {
  return (
    <motion.div
      className="h-full p-4"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: 300 }}
    >
      <div className="bg-white rounded-2xl shadow-xl h-full overflow-hidden">
        {*/* Image - 60% of card */*}
        <div className="h-[60%] relative">
          <img
            src={dog.primary_image_url}
            alt={dog.name}
            className="w-full h-full object-cover"
          />

          {*/* Gradient overlay for text readability */*}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {*/* Name and age */*}
          <div className="absolute bottom-4 left-4 text-white">
            <h2 className="text-3xl font-bold">{dog.name}</h2>
            <p className="text-lg opacity-90">{dog.age_text}</p>
          </div>
        </div>

        {*/* Info - 40% of card */*}
        <div className="h-[40%] p-4 space-y-3">
          {*/* Tagline */*}
          <p className="text-lg font-medium text-gray-900">
            {dog.swipe_features.swipe_tagline}
          </p>

          {*/* Key traits */*}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {dog.swipe_features.personality_summary}
            </Badge>
            <Badge variant={getEnergyColor(dog.swipe_features.energy_level)}>
              {dog.swipe_features.energy_level} energy
            </Badge>
          </div>

          {*/* Quick facts */*}
          <div className="space-y-1 text-sm text-gray-600">
            <p>📏 {dog.standardized_size || dog.size}</p>
            <p>🏠 Best for: {dog.swipe_features.best_for}</p>
            <p>📍 {dog.organization.city}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}`

### Onboarding Flow

tsx

`*// components/swipe/SwipeOnboarding.tsx*
export default function SwipeOnboarding({ onComplete }: { onComplete: (prefs: Preferences) => void }) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<Preferences>({});

  const steps = [
    {
      question: "What size dog are you looking for?",
      options: [
        { value: 'small', label: 'Small (under 25 lbs)', icon: '🐕' },
        { value: 'medium', label: 'Medium (25-60 lbs)', icon: '🐕‍🦺' },
        { value: 'large', label: 'Large (over 60 lbs)', icon: '🦮' },
        { value: 'any', label: 'Any size works!', icon: '✨' }
      ]
    },
    {
      question: "How active are you?",
      options: [
        { value: 'low', label: 'Couch potato', icon: '🛋️' },
        { value: 'medium', label: 'Weekend warrior', icon: '🚶' },
        { value: 'high', label: 'Marathon runner', icon: '🏃' }
      ]
    },
    {
      question: "Your experience with dogs?",
      options: [
        { value: 'first-time', label: 'First time!', icon: '🌟' },
        { value: 'some', label: 'Had dogs before', icon: '👍' },
        { value: 'experienced', label: 'Dog expert', icon: '🏆' }
      ]
    }
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-pink-400 to-purple-600 p-4">
      <div className="h-full flex flex-col justify-center">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl p-6"
        >
          <h2 className="text-2xl font-bold mb-6">
            {steps[step].question}
          </h2>

          <div className="space-y-3">
            {steps[step].options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setPreferences(prev => ({
                    ...prev,
                    [steps[step].key]: option.value
                  }));

                  if (step < steps.length - 1) {
                    setStep(step + 1);
                  } else {
                    onComplete(preferences);
                  }
                }}
                className="w-full p-4 border rounded-xl hover:bg-gray-50
                         flex items-center gap-3 transition-colors"
              >
                <span className="text-2xl">{option.icon}</span>
                <span className="text-lg">{option.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}`

---

## Phase 3: Performance & UX

### Queue Management

typescript

`*// hooks/useSwipeQueue.ts*
export function useSwipeQueue(preferences: Preferences) {
  const [queue, setQueue] = useState<SwipeDog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSwipeQueue = async () => {
    *// Get dogs that match preferences and are swipe-ready*
    const params = new URLSearchParams({
      swipe_ready: 'true',
      limit: '20',
      ...buildPreferenceFilters(preferences)
    });

    const response = await fetch(`/api/dogs?${params}`);
    const dogs = await response.json();

    *// Shuffle for variety*
    const shuffled = dogs.sort(() => Math.random() - 0.5);
    setQueue(shuffled);
  };

  const preloadImages = (dogs: SwipeDog[]) => {
    *// Preload next 3 images*
    dogs.slice(0, 3).forEach(dog => {
      const img = new Image();
      img.src = dog.primary_image_url;
    });
  };

  return { queue, loadMore: loadSwipeQueue, isLoading };
}`

### Analytics Tracking

typescript

`*// utils/swipeAnalytics.ts*
export async function trackSwipeEvent(
  dogId: number,
  action: 'view' | 'like' | 'pass' | 'detail',
  duration?: number
) {
  *// Get or create session*
  const sessionId = getOrCreateSession();

  try {
    await fetch('/api/swipe/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({
        dog_id: dogId,
        action,
        swipe_duration_ms: duration
      })
    });
  } catch (error) {
    *// Silent fail - don't interrupt UX*
    console.error('Failed to track swipe:', error);
  }
}`

### Mobile-Specific Optimizations

css

`*/* styles/swipe.module.css */*
.swipe-container {
  */* Prevent scroll bounce on iOS */*
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;

  */* Full viewport height accounting for mobile bars */*
  height: 100vh;
  height: 100dvh;

  */* Disable text selection */*
  user-select: none;
  -webkit-user-select: none;
}

.swipe-card {
  */* Hardware acceleration */*
  transform: translateZ(0);
  will-change: transform;

  */* Smooth image loading */*
  img {
    background-color: #f3f4f6;
    transition: opacity 0.3s;
  }
}

*/* Haptic feedback via CSS */*
.swipe-button:active {
  transform: scale(0.95);
  transition: transform 0.1s;
}`

---

## Phase 4: Testing Strategy

### Jest Tests (No E2E needed!)

**1. useSwipeQueue.test.ts**

- Queue loading with preferences
- Image preloading
- Shuffle functionality
- Error handling

**2. SwipeCard.test.tsx**

- Renders all dog information
- Handles missing enrichment data
- Energy level badge colors
- Responsive image sizing

**3. SwipeInterface.test.tsx**

- Swipe gesture handling
- Queue progression
- Analytics tracking calls
- Empty queue state

**4. SwipeOnboarding.test.tsx**

- Step progression
- Preference collection
- Skip option
- Completion callback

### Manual QA Checklist

- [ ]  Test on real iPhone (Safari)
- [ ]  Test on real Android (Chrome)
- [ ]  Verify swipe gestures feel natural
- [ ]  Check image loading performance
- [ ]  Validate offline behavior
- [ ]  Test with slow 3G throttling

---

## Phase 5: Deployment & Monitoring

### Rollout Strategy

**Week 1: Data Preparation**

bash

`*# Run enrichment on top dogs*
python scripts/enrich_swipe_data.py --limit 1000

*# Verify quality*
SELECT COUNT(*) FROM animals WHERE swipe_ready = true;
-- Target: 500+ dogs ready`

**Week 2: Soft Launch**

- Deploy to 10% of mobile users
- Monitor engagement metrics
- Collect feedback via toast prompt

**Week 3: Full Launch**

- Enable for all mobile users
- Add prominent entry points
- A/B test onboarding flow

### Success Metrics

**Engagement**

- Swipe session length: >2 minutes
- Cards per session: >10
- Like rate: 15-25%
- Detail tap rate: >5%

**Technical**

- Card load time: <200ms
- Swipe response: <16ms (60fps)
- Image load time: <1s on 4G
- Queue API response: <500ms

**Business Impact**

- Mobile engagement increase: >30%
- Favorites from swipes: >40%
- Return visits: >25% within 7 days

### Cost Analysis

**OpenRouter API Costs**

- Claude 3 Haiku: $0.25 per 1M input tokens
- Average enrichment: ~500 tokens per dog
- 5,000 dogs = 2.5M tokens = $0.63
- **Total cost: Under $1**

---

## Summary

**Key Differentiators**:

- ✅ LLM-enriched personality summaries
- ✅ Smart preference-based filtering
- ✅ Anonymous analytics for future ML
- ✅ Butter-smooth mobile performance

**Development Estimate**:

- Data enrichment: 3 days
- Frontend implementation: 5 days
- Testing & polish: 2 days
- **Total: 2 weeks**

**Business Value**:

- Increases mobile engagement dramatically
- Generates rich interaction data
- Reduces choice paralysis
- Creates addictive, shareable experience

---

*The swipe interface transforms passive browsing into active engagement, setting up perfect data collection for the future LLM matching feature.*
