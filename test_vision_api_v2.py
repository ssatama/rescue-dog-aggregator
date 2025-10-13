#!/usr/bin/env python3
"""
Test script for vision API photo analysis with v2 prompt.
Tests 10 new images.
"""

import asyncio
import json
from services.llm.llm_client import LLMClient
from services.llm.photo_analysis_models import PhotoAnalysisResponse

# Test images with their URLs
TEST_IMAGES = [
    {
        "id": 5579,
        "name": "Gigi",
        "url": "https://images.rescuedogs.me/rescue_dogs/dogs_trust/gigi_427a15b8.jpg"
    },
    {
        "id": 1291,
        "name": "Mara",
        "url": "https://images.rescuedogs.me/rescue_dogs/misis_animal_rescue/mara_ba167c62.jpg"
    },
    {
        "id": 2791,
        "name": "Rupert",
        "url": "https://images.rescuedogs.me/rescue_dogs/dogs_trust/rupert_13ca263b.jpg"
    },
    {
        "id": 2456,
        "name": "Rita",
        "url": "https://images.rescuedogs.me/rescue_dogs/dogs_trust/rita_ced60922.jpg"
    },
    {
        "id": 2283,
        "name": "Moon",
        "url": "https://images.rescuedogs.me/rescue_dogs/many_tears_animal_rescue/moon_406352fc.jpg"
    },
    {
        "id": 2030,
        "name": "Beauty",
        "url": "https://images.rescuedogs.me/rescue_dogs/santer_paws_bulgarian_rescue/beauty_bd5d63e6.jpg"
    },
    {
        "id": 729,
        "name": "Calipso",
        "url": "https://images.rescuedogs.me/rescue_dogs/tierschutzverein_europa_e.v./calipso_bd2b76fb.jpg"
    },
    {
        "id": 711,
        "name": "Benji",
        "url": "https://images.rescuedogs.me/rescue_dogs/tierschutzverein_europa_e.v./benji_979e4c61.jpg"
    },
    {
        "id": 1356,
        "name": "Zoe",
        "url": "https://images.rescuedogs.me/rescue_dogs/the_underdog/zoe_3b6fdbbb.jpg"
    },
    {
        "id": 2686,
        "name": "Paddy",
        "url": "https://images.rescuedogs.me/rescue_dogs/dogs_trust/paddy_7087e4f7.jpg"
    }
]


async def test_vision_api_v2():
    """Test vision API v2 on 10 new images."""
    # Load v2 prompt
    with open("prompts/instagram/photo_quality_analysis_v2.txt", "r") as f:
        prompt = f.read()

    # Initialize client
    client = LLMClient()

    print("Testing Vision API with v2 prompt on 10 new images...")
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
    print("SUMMARY OF RESULTS - V2 PROMPT")
    print("=" * 80)

    for result in results:
        if "error" not in result:
            scores = result['scores']
            print(f"\n{result['dog']} (ID: {result['id']})")
            print(f"  Q:{scores['quality']} V:{scores['visibility']} "
                  f"A:{scores['appeal']} B:{scores['background']} → "
                  f"Overall: {scores['overall']}")
            print(f"  IG-Ready: {result['ig_ready']} | Confidence: {result['confidence']}")
            if result['flags']:
                print(f"  Flags: {', '.join(result['flags'])}")
        else:
            print(f"\n{result['dog']} (ID: {result['id']}): ERROR - {result['error']}")

    # Save results to file
    with open("vision_api_test_results_v2.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Results saved to vision_api_test_results_v2.json")


if __name__ == "__main__":
    asyncio.run(test_vision_api_v2())
