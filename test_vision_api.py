#!/usr/bin/env python3
"""
Test script for vision API photo analysis.
Tests the prompt on 5 sample images.
"""

import asyncio
import json
from services.llm.llm_client import LLMClient
from services.llm.photo_analysis_models import PhotoAnalysisResponse

# Test images with their URLs
TEST_IMAGES = [
    {
        "id": 726,
        "name": "Bruno",
        "url": "https://images.rescuedogs.me/rescue_dogs/tierschutzverein_europa_e.v./bruno_52990c56.jpg"
    },
    {
        "id": 2025,
        "name": "Otter",
        "url": "https://images.rescuedogs.me/rescue_dogs/santer_paws_bulgarian_rescue/otter_ca73477f.jpg"
    },
    {
        "id": 1436,
        "name": "Eliot",
        "url": "https://images.rescuedogs.me/rescue_dogs/animal_rescue_bosnia/eliot_7f766982.jpg"
    },
    {
        "id": 2383,
        "name": "Toastie",
        "url": "https://images.rescuedogs.me/rescue_dogs/many_tears_rescue/toastie_c5eb33ee.jpg"
    },
    {
        "id": 4958,
        "name": "Bruce",
        "url": "https://images.rescuedogs.me/rescue_dogs/dogs_trust/bruce_dbd81bd1.jpg"
    }
]


async def test_vision_api():
    """Test vision API on sample images."""
    # Load prompt
    with open("prompts/instagram/photo_quality_analysis_v1.txt", "r") as f:
        prompt = f.read()

    # Initialize client
    client = LLMClient()

    print("Testing Vision API on 5 sample images...")
    print("=" * 80)

    results = []

    for img in TEST_IMAGES:
        print(f"\nAnalyzing: {img['name']} (ID: {img['id']})")
        print(f"URL: {img['url']}")
        print("-" * 80)

        try:
            # Call vision API
            response_data = await client.call_vision_api(
                image_url=img['url'],
                prompt=prompt,
                temperature=0.3,
                max_tokens=1000
            )

            # Validate with Pydantic model
            analysis = PhotoAnalysisResponse(**response_data)

            # Print results
            print(f"✅ SUCCESS")
            print(f"Quality: {analysis.quality_score}/10")
            print(f"Visibility: {analysis.visibility_score}/10")
            print(f"Appeal: {analysis.appeal_score}/10")
            print(f"Background: {analysis.background_score}/10")
            print(f"Overall: {analysis.overall_score}/10")
            print(f"IG-Ready: {analysis.ig_ready}")
            print(f"Confidence: {analysis.confidence}")
            print(f"Reasoning: {analysis.reasoning}")
            if analysis.flags:
                print(f"Flags: {', '.join(analysis.flags)}")

            results.append({
                "dog": img['name'],
                "id": img['id'],
                "scores": {
                    "quality": analysis.quality_score,
                    "visibility": analysis.visibility_score,
                    "appeal": analysis.appeal_score,
                    "background": analysis.background_score,
                    "overall": analysis.overall_score
                },
                "ig_ready": analysis.ig_ready,
                "confidence": analysis.confidence,
                "reasoning": analysis.reasoning,
                "flags": analysis.flags
            })

        except Exception as e:
            print(f"❌ ERROR: {e}")
            results.append({
                "dog": img['name'],
                "id": img['id'],
                "error": str(e)
            })

    print("\n" + "=" * 80)
    print("SUMMARY OF RESULTS")
    print("=" * 80)

    for result in results:
        if "error" not in result:
            scores = result['scores']
            print(f"\n{result['dog']} (ID: {result['id']})")
            print(f"  Q:{scores['quality']} V:{scores['visibility']} "
                  f"A:{scores['appeal']} B:{scores['background']} → "
                  f"Overall: {scores['overall']}")
            print(f"  IG-Ready: {result['ig_ready']} | Confidence: {result['confidence']}")
        else:
            print(f"\n{result['dog']} (ID: {result['id']}): ERROR - {result['error']}")

    # Save results to file
    with open("vision_api_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Results saved to vision_api_test_results.json")


if __name__ == "__main__":
    asyncio.run(test_vision_api())
